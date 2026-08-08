from __future__ import annotations

import importlib.util
from pathlib import Path
import types
import unittest


ROOT = Path(__file__).resolve().parents[1]


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


hermes = load_module("necktie_hermes", ROOT / "__init__.py")


class HermesTests(unittest.TestCase):
    def test_core_and_command_rewrite(self):
        context = hermes.build_injected_context()
        self.assertIn("active for every response", context)
        self.assertIn("Mammon is internal only", context)
        event = types.SimpleNamespace(text="/necktie assess this policy", source="trusted")
        result = hermes.rewrite_gateway_command(event=event)
        self.assertEqual(result["action"], "rewrite")
        self.assertIn("necktie:necktie", result["text"])
        self.assertIn("assess this policy", result["text"])

    def test_retired_loop_command_is_not_rewritten(self):
        event = types.SimpleNamespace(text="/necktie-review candidate", source="trusted")
        self.assertIsNone(hermes.rewrite_gateway_command(event=event))

    def test_registers_one_skill_command_and_two_hooks(self):
        class Context:
            def __init__(self):
                self.skills, self.commands, self.hooks = [], [], []
            def register_skill(self, name, path): self.skills.append(name)
            def register_command(self, name, handler, **kwargs): self.commands.append(name)
            def register_hook(self, name, handler): self.hooks.append(name)
        ctx = Context()
        hermes.register(ctx)
        self.assertEqual(ctx.skills, ["necktie"])
        self.assertEqual(ctx.commands, ["necktie"])
        self.assertEqual(sorted(ctx.hooks), ["pre_gateway_dispatch", "pre_llm_call"])


if __name__ == "__main__":
    unittest.main()
