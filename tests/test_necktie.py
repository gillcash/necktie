from __future__ import annotations

import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import types
import unittest
from contextlib import redirect_stderr
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


class IsolatedConfig(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.env = {"APPDATA" if os.name == "nt" else "XDG_CONFIG_HOME": self.directory.name}
        self.target = Path(self.directory.name) / "necktie" / "config.json"
        self.addCleanup(patch.stopall)
        patch.dict(os.environ, self.env).start()
        os.environ.pop("NECKTIE_DEFAULT_MODE", None)
        hermes._current_mode = None

    def config(self, value):
        self.target.parent.mkdir(parents=True, exist_ok=True)
        self.target.write_text(json.dumps(value), encoding="utf-8")


class HermesTests(IsolatedConfig):
    def test_context_and_resolution(self):
        self.assertEqual(hermes.MODES, ("lite", "full", "mammon"))
        self.assertEqual(hermes.resolve_mode()["mode"], "full")
        for mode in hermes.MODES:
            context = hermes.build_injected_context(mode)
            self.assertIn(f"level: {mode}", context)
            self.assertEqual("Ambition pass" in context, mode == "full")
        self.assertIn("Useful action pass", hermes.build_injected_context("full"))
        self.assertIn("Mammon is the sole final perspective", hermes.build_injected_context("mammon"))
        self.assertNotIn("Then rebut", hermes.build_injected_context("mammon"))
        with self.assertRaises(ValueError):
            hermes.build_injected_context("off")
        self.config({"defaultMode": "lite", "keep": True})
        for requested, session, expected in [(None, None, "lite"), (None, "mammon", "mammon"), ("FULL", "mammon", "full")]:
            self.assertEqual(hermes.resolve_mode(requested, session)["mode"], expected)
        self.assertEqual(hermes.write_default_mode("mammon")["mode"], "mammon")
        self.assertEqual(json.loads(self.target.read_text()), {"defaultMode": "mammon", "keep": True})
        written = hermes.write_default_mode("lite", {**self.env, "NECKTIE_DEFAULT_MODE": "full"})
        self.assertEqual((written["written_mode"], written["configured_mode"], written["mode"]), ("lite", "lite", "full"))
        self.assertEqual(list(self.target.parent.glob("*.tmp")), [])

    def test_commands_preserve_session_when_changing_defaults(self):
        self.assertIn("current full; configured default full", hermes._handle_mode_command("status"))
        self.assertEqual(hermes._handle_mode_command("lite"), "Necktie mode set to lite for this session.")
        self.assertIn("Current session remains lite", hermes._handle_mode_command("default mammon"))
        self.assertIn("current lite; configured default mammon", hermes._handle_mode_command(""))
        self.assertEqual(hermes._handle_mode_command("off"), hermes.MODE_USAGE)
        hermes._current_mode = None
        self.assertIn("Current session remains mammon", hermes._handle_mode_command("default full"))
        self.assertIn("level: mammon", hermes._pre_llm_call()["context"])
        hermes._current_mode = None
        self.assertIn("level: full", hermes._pre_llm_call()["context"])
        hermes.write_default_mode("lite")
        self.assertIn("level: full", hermes._pre_llm_call()["context"])

    def test_invalid_defaults_and_session_are_reported(self):
        for value in ([], {"defaultMode": "off"}):
            self.config(value)
            self.assertEqual(hermes.resolve_mode(session_mode="off")["mode"], "full")
            self.assertEqual(len(hermes.resolve_mode(session_mode="off")["warnings"]), 2)
        os.environ["NECKTIE_DEFAULT_MODE"] = "off"
        diagnostics = io.StringIO()
        with redirect_stderr(diagnostics):
            self.assertIn("level: full", hermes._pre_llm_call()["context"])
        self.assertIn("NECKTIE_DEFAULT_MODE", diagnostics.getvalue())

    def test_gateway_authorization_and_registration(self):
        event = types.SimpleNamespace(text="/necktie --mode mammon assess this policy", source="trusted")
        result = hermes.rewrite_gateway_command(event=event)
        self.assertEqual(result["action"], "rewrite")
        self.assertIn("necktie:necktie", result["text"])
        self.assertIn("--mode mammon assess this policy", result["text"])
        for checker in (Mock(return_value="denied"), Mock(side_effect=RuntimeError("denied"))):
            self.assertIsNone(hermes.rewrite_gateway_command(event, types.SimpleNamespace(_check_slash_access=checker)))
        event.text = "/necktie-mode lite"
        self.assertIsNone(hermes.rewrite_gateway_command(event))
        ctx = Mock()
        hermes.register(ctx)
        self.assertEqual([call.args[0] for call in ctx.register_skill.call_args_list], ["necktie", "necktie-research"])
        self.assertEqual([call.args[0] for call in ctx.register_command.call_args_list], ["necktie", "necktie-mode"])
        self.assertEqual([call.args[0] for call in ctx.register_hook.call_args_list], ["pre_llm_call", "pre_gateway_dispatch"])
        self.assertNotIn("mammon", str(ctx.register_command.call_args_list).lower())
        self.assertNotIn("mammon", hermes.MODE_USAGE)
        handler = ctx.register_command.call_args_list[0].args[1]
        self.assertIn("Queued", handler("question"))
        ctx.inject_message.side_effect = RuntimeError("offline")
        self.assertIn("User arguments: question", handler("question"))

    def test_python_and_javascript_mode_parity(self):
        self.config({"defaultMode": "lite"})
        script = (
            "const p=require('./lib/necktie-policy.cjs');"
            "process.stdout.write(p.resolveMode({requestedMode:JSON.parse(process.argv[1]),"
            "sessionMode:JSON.parse(process.argv[2])}).mode);"
        )
        for requested, session in [(None, None), (None, "mammon"), ("full", "lite"), (None, "off")]:
            javascript = subprocess.check_output(["node", "-e", script, json.dumps(requested), json.dumps(session)], cwd=ROOT, text=True)
            self.assertEqual(javascript, hermes.resolve_mode(requested, session)["mode"])

    def test_failed_atomic_writes_preserve_old_file_and_cleanup(self):
        self.config({"defaultMode": "lite"})
        packet = research_loop.new_packet("Test persistence", "standard", "full")
        for save in (lambda: hermes.write_default_mode("full"), lambda: research_loop.save_packet(self.target, packet)):
            previous = self.target.read_bytes()
            with patch.object(Path, "replace", side_effect=OSError("disk failure")), self.assertRaises(OSError):
                save()
            self.assertEqual(self.target.read_bytes(), previous)
            self.assertEqual(list(self.target.parent.glob("*.tmp")), [])


class ResearchPromptLoopTests(unittest.TestCase):
    def packet(self, depth="standard"):
        packet = research_loop.new_packet("Build a controlling research brief", depth, "mammon")
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
        for key, value in (("state", []), ("goal", ""), ("review_history", [None]),
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

    def test_copied_skill_cli_round_trip_and_terminal_guard(self):
        with tempfile.TemporaryDirectory() as directory:
            copied = Path(directory) / "scripts"
            shutil.copytree(SCRIPTS, copied, ignore=shutil.ignore_patterns("__pycache__"))
            path = Path(directory) / "packet.json"
            def run(*args):
                return subprocess.run([sys.executable, str(copied / "research_prompt_loop.py"), *args], cwd=directory, capture_output=True, text=True)
            result = run("init", "--goal", "Test persistence", "--output", str(path))
            self.assertEqual(result.returncode, 0, result.stderr)
            for state in research_loop.PHASES[1:]:
                self.assertEqual(run("transition", "--file", str(path), "--to", state).returncode, 0)
            self.assertEqual(run("review", "--file", str(path), "--decision", "APPROVE", "--reason", "Reviewed").returncode, 0)
            self.assertEqual(run("verify", "--file", str(path), "--result", "PASS", "--reason", "Checked").returncode, 0)
            before = path.read_bytes()
            packet = json.loads(run("show", "--file", str(path)).stdout)
            self.assertEqual((packet["state"], packet["prompt_path"]), ("complete", ""))
            self.assertEqual(len(packet["history"]), 9)
            self.assertEqual(run("transition", "--file", str(path), "--to", "review").returncode, 2)
            self.assertEqual(path.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
