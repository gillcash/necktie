from __future__ import annotations

import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import types
import unittest
from contextlib import redirect_stderr
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


hermes = load_module("necktie_hermes", ROOT / "__init__.py")
research_loop = load_module(
    "necktie_research_loop",
    ROOT / "skills" / "necktie-research" / "scripts" / "research_prompt_loop.py",
)


def config_environment(directory: str) -> dict[str, str]:
    return {"APPDATA": directory} if os.name == "nt" else {"XDG_CONFIG_HOME": directory}


class HermesTests(unittest.TestCase):
    def setUp(self):
        hermes._current_mode = None

    def test_generated_mode_contexts_and_default(self):
        self.assertEqual(hermes.MODES, ("lite", "full", "mammon"))
        with tempfile.TemporaryDirectory() as directory:
            self.assertEqual(hermes.resolve_mode(env=config_environment(directory))["mode"], "full")
        lite = hermes.build_injected_context("lite")
        full = hermes.build_injected_context("full")
        mammon = hermes.build_injected_context("mammon")
        self.assertIn("level: lite", lite)
        self.assertNotIn("Ambition pass", lite)
        self.assertIn("Ambition pass", full)
        self.assertIn("Useful action pass", full)
        self.assertIn("Mammon is the sole final perspective", mammon)
        self.assertNotIn("Then rebut", mammon)
        with self.assertRaises(ValueError):
            hermes.build_injected_context("off")

    def test_resolution_and_atomic_default_write(self):
        with tempfile.TemporaryDirectory() as directory:
            env = config_environment(directory)
            target = Path(directory) / "necktie" / "config.json"
            target.parent.mkdir(parents=True)
            target.write_text(json.dumps({"defaultMode": "lite", "keep": True}), encoding="utf-8")
            self.assertEqual(hermes.resolve_mode(env=env)["mode"], "lite")
            self.assertEqual(hermes.resolve_mode(session_mode="mammon", env=env)["mode"], "mammon")
            self.assertEqual(hermes.resolve_mode(requested_mode="FULL", session_mode="mammon", env=env)["mode"], "full")
            written = hermes.write_default_mode("mammon", env)
            self.assertEqual(written["mode"], "mammon")
            self.assertEqual(json.loads(target.read_text(encoding="utf-8")), {"defaultMode": "mammon", "keep": True})
            overridden = hermes.write_default_mode("lite", {**env, "NECKTIE_DEFAULT_MODE": "full"})
            self.assertEqual(overridden["written_mode"], "lite")
            self.assertEqual(overridden["mode"], "full")
            self.assertEqual(overridden["configured_mode"], "lite")
            self.assertEqual(list(target.parent.glob("*.tmp")), [])

    def test_mode_command_status_session_default_and_invalid(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(
            os.environ,
            config_environment(directory),
            clear=True,
        ):
            self.assertIn("current full; configured default full", hermes._handle_mode_command("status"))
            self.assertEqual(hermes._handle_mode_command("lite"), "Necktie mode set to lite for this session.")
            self.assertIn("Current session remains lite", hermes._handle_mode_command("default mammon"))
            self.assertEqual(hermes.resolve_default_mode()["mode"], "mammon")
            self.assertIn("current lite; configured default mammon", hermes._handle_mode_command(""))
            self.assertEqual(hermes._handle_mode_command("off"), hermes.MODE_USAGE)
            self.assertEqual(hermes._current_mode, "lite")

    def test_pre_llm_hook_reports_invalid_environment_default(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(
            os.environ,
            {**config_environment(directory), "NECKTIE_DEFAULT_MODE": "off"},
            clear=True,
        ):
            diagnostics = io.StringIO()
            with redirect_stderr(diagnostics):
                result = hermes._pre_llm_call()
            self.assertIn("level: full", result["context"])
            self.assertIn("NECKTIE_DEFAULT_MODE", diagnostics.getvalue())

    def test_core_and_decision_command_rewrite(self):
        event = types.SimpleNamespace(text="/necktie --mode mammon assess this policy", source="trusted")
        result = hermes.rewrite_gateway_command(event=event)
        self.assertEqual(result["action"], "rewrite")
        self.assertIn("necktie:necktie", result["text"])
        self.assertIn("--mode mammon assess this policy", result["text"])
        self.assertIsNone(hermes.rewrite_gateway_command(event=types.SimpleNamespace(
            text="/necktie-mode lite", source="trusted"
        )))

    def test_registers_two_skills_two_commands_and_two_hooks(self):
        class Context:
            def __init__(self):
                self.skills, self.commands, self.command_metadata, self.hooks = [], [], {}, []

            def register_skill(self, name, path):
                self.skills.append(name)

            def register_command(self, name, handler, **kwargs):
                self.commands.append(name)
                self.command_metadata[name] = kwargs

            def register_hook(self, name, handler):
                self.hooks.append(name)

        ctx = Context()
        hermes.register(ctx)
        self.assertEqual(ctx.skills, ["necktie", "necktie-research"])
        self.assertEqual(ctx.commands, ["necktie", "necktie-mode"])
        self.assertNotIn("mammon", json.dumps(ctx.command_metadata).lower())
        self.assertNotIn("mammon", hermes.MODE_USAGE.lower())
        self.assertEqual(sorted(ctx.hooks), ["pre_gateway_dispatch", "pre_llm_call"])

    def test_python_and_javascript_resolvers_have_mode_parity(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "necktie" / "config.json"
            target.parent.mkdir(parents=True)
            target.write_text(json.dumps({"defaultMode": "lite"}), encoding="utf-8")
            environment = os.environ.copy()
            environment.pop("NECKTIE_DEFAULT_MODE", None)
            environment.update(config_environment(directory))
            script = (
                "const p=require('./lib/necktie-policy.cjs');"
                "const requested=process.argv[1]==='-'?undefined:process.argv[1];"
                "const session=process.argv[2]==='-'?undefined:process.argv[2];"
                "process.stdout.write(p.resolveMode({requestedMode:requested,sessionMode:session}).mode);"
            )
            for requested, session in [(None, None), (None, "mammon"), ("full", "lite")]:
                javascript = subprocess.check_output(
                    ["node", "-e", script, requested or "-", session or "-"],
                    cwd=ROOT,
                    env=environment,
                    text=True,
                )
                python = hermes.resolve_mode(requested, session, config_environment(directory))["mode"]
                self.assertEqual(javascript, python)


class ResearchPromptLoopTests(unittest.TestCase):
    def advance_to_review(self, packet):
        for state in ("discover", "fingerprint", "critique", "blueprint", "draft", "review"):
            research_loop.transition(packet, state, "tested")

    def test_happy_path_reaches_complete_after_verification(self):
        packet = research_loop.new_packet("Build a controlling research brief", "standard", "full")
        self.advance_to_review(packet)
        research_loop.record_review(packet, "APPROVE", "Every material prompt criterion passed", "")
        self.assertEqual(packet["state"], "verify")
        research_loop.record_verification(packet, "PASS", "Fresh-session simulation passed", "")
        self.assertEqual(packet["state"], "complete")

    def test_hidden_origin_and_same_issue_circuit_breaker(self):
        packet = research_loop.new_packet("Build a market-control research brief", "deep", "mammon")
        self.advance_to_review(packet)
        for attempt in range(3):
            research_loop.record_review(packet, "REVISE", "Required schema is still absent", "schema-gap")
            if attempt < 2:
                research_loop.transition(packet, "review", "revised")
        self.assertEqual(packet["origin_mode"], "mammon")
        self.assertEqual(packet["state"], "blocked")
        self.assertEqual(packet["circuit_breaker"], "same-issue-three-times")

    def test_round_trip_packet_contains_no_prompt_body_by_default(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "research-prompt.json"
            packet = research_loop.new_packet("Test persistence", "standard", "full")
            research_loop.save_packet(path, packet)
            loaded = research_loop.load_packet(path)
            self.assertEqual(loaded["run_id"], packet["run_id"])
            self.assertEqual(loaded["prompt_path"], "")


if __name__ == "__main__":
    unittest.main()
