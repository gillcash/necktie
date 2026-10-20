from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import types
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "skills" / "necktie-research" / "scripts"


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module  # Match the host loader so relative package imports work.
    spec.loader.exec_module(module)
    return module


hermes = load_module("necktie_hermes", ROOT / "__init__.py")
research_loop = load_module("research_state", SCRIPTS / "research_state.py")


class HermesTests(unittest.TestCase):
    def test_sole_context_ignores_legacy_settings_without_writing_them(self):
        policy = (ROOT / "skills" / "necktie" / "references" / "policy.md").read_text(encoding="utf-8-sig").strip()
        self.assertTrue(policy.startswith("NECKTIE ACTIVE."))
        self.assertIn("Let Necktie decide", policy)
        self.assertRegex(policy, r"most increases the beneficiary['’]s\s+expected net wealth")
        self.assertIn("take the authorized next action", policy)
        self.assertIn("Useful action pass", policy)
        self.assertNotRegex(policy, r"(?i)mammon|level:|Then rebut")
        with tempfile.TemporaryDirectory() as directory:
            config = Path(directory) / "necktie" / "config.json"
            config.parent.mkdir()
            config.write_text('{"defaultMode":"lite","keep":true}', encoding="utf-8")
            previous = config.read_bytes()
            with patch.dict(os.environ, {"APPDATA": directory, "XDG_CONFIG_HOME": directory,
                                         "NECKTIE_DEFAULT_MODE": "off"}):
                self.assertEqual(hermes.build_injected_context(), policy)
                for session in ("first", "second"):
                    self.assertEqual(hermes._pre_llm_call(session_id=session), {"context": policy})
            self.assertEqual(config.read_bytes(), previous)
            self.assertEqual(sorted(path.relative_to(directory).as_posix() for path in Path(directory).rglob("*")),
                             ["necktie", "necktie/config.json"])
        for name in ("MODES", "DEFAULT_MODE", "normalize_mode", "config_path", "resolve_mode", "write_default_mode",
                     "_current_mode", "_handle_mode_command"):
            self.assertFalse(hasattr(hermes, name), name)
        with self.assertRaises(TypeError):
            hermes.build_injected_context("lite")

    def test_gateway_authorization_and_registration(self):
        event = types.SimpleNamespace(text="/necktie assess this policy", source="trusted")
        result = hermes.rewrite_gateway_command(event=event)
        self.assertEqual(result["action"], "rewrite")
        self.assertIn("necktie:necktie", result["text"])
        self.assertIn("User arguments: assess this policy", result["text"])
        checker = Mock(return_value=None)
        self.assertEqual(hermes.rewrite_gateway_command(event, types.SimpleNamespace(_check_slash_access=checker)), result)
        checker.assert_called_once_with("trusted", "necktie")
        for checker in (Mock(return_value="denied"), Mock(side_effect=RuntimeError("denied"))):
            self.assertIsNone(hermes.rewrite_gateway_command(event, types.SimpleNamespace(_check_slash_access=checker)))
        for text in ("/necktie-mode lite", "/other question", "necktie question", ""):
            event.text = text
            self.assertIsNone(hermes.rewrite_gateway_command(event))
        ctx = Mock()
        hermes.register(ctx)
        self.assertEqual([call.args[0] for call in ctx.register_skill.call_args_list], ["necktie", "necktie-research"])
        self.assertEqual([call.args[0] for call in ctx.register_command.call_args_list], ["necktie"])
        self.assertEqual([call.args[0] for call in ctx.register_hook.call_args_list], ["pre_llm_call", "pre_gateway_dispatch"])
        handler = ctx.register_command.call_args_list[0].args[1]
        self.assertIn("Queued", handler("question"))
        ctx.inject_message.assert_called_once_with(hermes._skill_prompt("question"))
        for outcome in (False, RuntimeError("offline")):
            ctx.inject_message.side_effect = outcome if isinstance(outcome, Exception) else None
            ctx.inject_message.return_value = outcome
            self.assertEqual(handler("question"), hermes._skill_prompt("question"))

    def test_python_and_javascript_policy_parity(self):
        script = "process.stdout.write(require('./lib/necktie-policy.cjs').buildInstructions());"
        javascript = subprocess.check_output(["node", "-e", script], cwd=ROOT, text=True, encoding="utf-8")
        self.assertEqual(javascript, hermes.build_injected_context())


class ResearchPromptLoopTests(unittest.TestCase):
    def packet(self, depth="standard"):
        packet = research_loop.new_packet("Build a controlling research brief", depth)
        self.assertNotIn("origin_mode", packet)
        for state in research_loop.PHASES[1:]:
            research_loop.transition(packet, state, "tested")
        return packet

    def test_decisions_and_circuit_breakers(self):
        for depth, limit in research_loop.REVISION_LIMITS.items():
            for decision, breaker in (("REVISE", "revision-limit-exceeded"),
                                      ("FAIL", "verification-failed-after-revision-limit"),
                                      ("MIXED", "verification-failed-after-revision-limit")):
                packet = self.packet(depth)
                for attempt in range(limit + 1):
                    if decision == "REVISE" or (decision == "MIXED" and attempt == 0):
                        research_loop.record_review(packet, "REVISE", "Fix schema", str(attempt))
                    else:
                        research_loop.record_review(packet, "APPROVE", "Reviewed", "")
                        research_loop.record_verification(packet, "FAIL", "Fix schema", str(attempt))
                    self.assertEqual(packet["state"], "blocked" if attempt == limit else "revise")
                    if attempt < limit:
                        research_loop.transition(packet, "review", "revised")
                self.assertEqual(packet["circuit_breaker"], breaker)
        packet = self.packet()
        for attempt in range(3):
            research_loop.record_review(packet, "REVISE", "Missing schema", "schema-gap")
            if attempt < 2:
                research_loop.transition(packet, "review", "revised")
        self.assertEqual(packet["circuit_breaker"], "same-issue-three-times")
        research_loop.validate_packet(packet)
        packet = self.packet()
        research_loop.record_review(packet, "BLOCK", "Evidence unavailable", "")
        self.assertEqual(packet["circuit_breaker"], "reviewer-blocked")

    def test_invalid_packets_and_decisions_do_not_mutate_state(self):
        for key, value in (("state", []), ("goal", ""), ("depth", "off"), ("review_history", [None]),
                           ("review_history", [{"decision": "REVISE"}]), ("verification_history", [{"result": []}])):
            packet = self.packet()
            packet[key] = value
            with self.subTest(key=key, value=value), self.assertRaises(research_loop.LoopError):
                research_loop.validate_packet(packet)
        for decision, reason, signature in (("UNKNOWN", "Reason", ""), ("APPROVE", "", ""), ("REVISE", "Reason", "")):
            packet = self.packet()
            before = json.dumps(packet)
            with self.assertRaises(research_loop.LoopError):
                research_loop.record_review(packet, decision, reason, signature)
            self.assertEqual(json.dumps(packet), before)

    def test_failed_atomic_writes_preserve_old_file_and_cleanup(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "packet.json"
            packet = self.packet()
            research_loop.save_packet(target, packet)
            previous = target.read_bytes()
            with patch.object(Path, "replace", side_effect=OSError("disk failure")), self.assertRaises(OSError):
                research_loop.save_packet(target, packet)
            self.assertEqual(target.read_bytes(), previous)
            self.assertEqual(list(target.parent.glob("*.tmp")), [])

    def test_copied_skill_cli_round_trip_and_terminal_guard(self):
        with tempfile.TemporaryDirectory() as directory:
            copied = Path(directory) / "scripts"
            shutil.copytree(SCRIPTS, copied, ignore=shutil.ignore_patterns("__pycache__"))
            path = Path(directory) / "packet.json"
            def run(*args):
                return subprocess.run([sys.executable, str(copied / "research_prompt_loop.py"), *args], cwd=directory, capture_output=True, text=True)
            result = run("init", "--goal", "Test persistence", "--output", str(path))
            self.assertEqual(result.returncode, 0, result.stderr)
            packet = json.loads(path.read_text())
            self.assertNotIn("origin_mode", packet)
            packet["origin_mode"] = "legacy-value"
            path.write_text(json.dumps(packet), encoding="utf-8")
            previous = path.read_bytes()
            self.assertEqual(json.loads(run("show", "--file", str(path)).stdout)["origin_mode"], "legacy-value")
            self.assertEqual(path.read_bytes(), previous)
            rejected = Path(directory) / "rejected.json"
            self.assertEqual(run("init", "--goal", "Old command", "--origin-mode", "full", "--output", str(rejected)).returncode, 2)
            self.assertFalse(rejected.exists())
            for state in research_loop.PHASES[1:]:
                self.assertEqual(run("transition", "--file", str(path), "--to", state).returncode, 0)
            self.assertEqual(run("review", "--file", str(path), "--decision", "APPROVE", "--reason", "Reviewed").returncode, 0)
            self.assertEqual(run("verify", "--file", str(path), "--result", "PASS", "--reason", "Checked").returncode, 0)
            before = path.read_bytes()
            packet = json.loads(run("show", "--file", str(path)).stdout)
            self.assertEqual((packet["state"], packet["prompt_path"], packet["origin_mode"]), ("complete", "", "legacy-value"))
            self.assertEqual(len(packet["history"]), 9)
            self.assertEqual(run("transition", "--file", str(path), "--to", "review").returncode, 2)
            self.assertEqual(path.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
