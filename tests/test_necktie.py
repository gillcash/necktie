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


def config_environment(directory: str) -> dict[str, str]:
    return {"APPDATA": directory} if os.name == "nt" else {"XDG_CONFIG_HOME": directory}


class HermesTests(unittest.TestCase):
    def setUp(self):
        hermes._current_mode = None

    def test_generated_mode_contexts_and_default(self):
        self.assertEqual(hermes.MODES, ("lite", "full", "ultra"))
        with tempfile.TemporaryDirectory() as directory:
            self.assertEqual(hermes.resolve_mode(env=config_environment(directory))["mode"], "full")
        lite = hermes.build_injected_context("lite")
        full = hermes.build_injected_context("full")
        ultra = hermes.build_injected_context("ultra")
        self.assertIn("level: lite", lite)
        self.assertNotIn("Private ambition pass", lite)
        self.assertIn("Private ambition pass", full)
        self.assertNotIn("Private counter-rebuttal", full)
        self.assertIn("Private counter-rebuttal", ultra)
        with self.assertRaises(ValueError):
            hermes.build_injected_context("off")

    def test_resolution_and_atomic_default_write(self):
        with tempfile.TemporaryDirectory() as directory:
            env = config_environment(directory)
            target = Path(directory) / "necktie" / "config.json"
            target.parent.mkdir(parents=True)
            target.write_text(json.dumps({"defaultMode": "lite", "keep": True}), encoding="utf-8")
            self.assertEqual(hermes.resolve_mode(env=env)["mode"], "lite")
            self.assertEqual(hermes.resolve_mode(session_mode="ultra", env=env)["mode"], "ultra")
            self.assertEqual(hermes.resolve_mode(requested_mode="FULL", session_mode="ultra", env=env)["mode"], "full")
            written = hermes.write_default_mode("ultra", env)
            self.assertEqual(written["mode"], "ultra")
            self.assertEqual(json.loads(target.read_text(encoding="utf-8")), {"defaultMode": "ultra", "keep": True})
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
            self.assertIn("Current session remains lite", hermes._handle_mode_command("default ultra"))
            self.assertEqual(hermes.resolve_default_mode()["mode"], "ultra")
            self.assertIn("current lite; configured default ultra", hermes._handle_mode_command(""))
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
        event = types.SimpleNamespace(text="/necktie --mode ultra assess this policy", source="trusted")
        result = hermes.rewrite_gateway_command(event=event)
        self.assertEqual(result["action"], "rewrite")
        self.assertIn("necktie:necktie", result["text"])
        self.assertIn("--mode ultra assess this policy", result["text"])
        self.assertIsNone(hermes.rewrite_gateway_command(event=types.SimpleNamespace(
            text="/necktie-mode lite", source="trusted"
        )))

    def test_registers_one_skill_two_commands_and_two_hooks(self):
        class Context:
            def __init__(self):
                self.skills, self.commands, self.hooks = [], [], []

            def register_skill(self, name, path):
                self.skills.append(name)

            def register_command(self, name, handler, **kwargs):
                self.commands.append(name)

            def register_hook(self, name, handler):
                self.hooks.append(name)

        ctx = Context()
        hermes.register(ctx)
        self.assertEqual(ctx.skills, ["necktie"])
        self.assertEqual(ctx.commands, ["necktie", "necktie-mode"])
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
            for requested, session in [(None, None), (None, "ultra"), ("full", "lite")]:
                javascript = subprocess.check_output(
                    ["node", "-e", script, requested or "-", session or "-"],
                    cwd=ROOT,
                    env=environment,
                    text=True,
                )
                python = hermes.resolve_mode(requested, session, config_environment(directory))["mode"]
                self.assertEqual(javascript, python)


if __name__ == "__main__":
    unittest.main()
