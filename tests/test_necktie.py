from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import tempfile
import types
import unittest


ROOT = Path(__file__).resolve().parents[1]


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


loop = load_module("necktie_loop", ROOT / "skills/necktie/scripts/necktie_loop.py")
review = load_module("validate_review", ROOT / "skills/necktie-review/scripts/validate_review.py")
hermes = load_module("necktie_hermes", ROOT / "__init__.py")


class LoopTests(unittest.TestCase):
    def advance_to_review(self, packet):
        for state in ("baseline", "critique", "reverse", "execute", "review"):
            loop.transition(packet, state, "tested")

    def test_happy_path_uses_exact_phases(self):
        packet = loop.new_packet("Create a reliable artifact")
        self.assertEqual(packet["state"], "frame")
        self.advance_to_review(packet)
        loop.record_review(packet, "APPROVE", "All material criteria pass", "")
        self.assertEqual(packet["state"], "verify")
        loop.transition(packet, "complete", "verification passed")
        transitions = [item["state"] for item in packet["history"] if item["kind"] == "transition"]
        self.assertEqual(transitions, ["baseline", "critique", "reverse", "execute", "review", "complete"])

    def test_same_issue_opens_circuit(self):
        packet = loop.new_packet("Create a reliable artifact")
        self.advance_to_review(packet)
        for attempt in range(3):
            loop.record_review(packet, "REVISE", "Evidence remains absent", "missing-evidence")
            if attempt < 2:
                loop.transition(packet, "review", "revised")
        self.assertEqual(packet["state"], "blocked")
        self.assertEqual(packet["circuit_breaker"], "same-issue-three-times")

    def test_fixed_revision_limit_opens_circuit(self):
        packet = loop.new_packet("Create a reliable artifact")
        self.advance_to_review(packet)
        for attempt, signature in enumerate(("one", "two", "three")):
            loop.record_review(packet, "REVISE", "A material issue remains", signature)
            if attempt < 2:
                loop.transition(packet, "review", "revised")
        self.assertEqual(packet["state"], "blocked")
        self.assertEqual(packet["circuit_breaker"], "revision-limit-reached")

    def test_round_trip(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "run.json"
            packet = loop.new_packet("Test persistence")
            loop.save_packet(path, packet)
            self.assertEqual(loop.load_packet(path)["run_id"], packet["run_id"])


class ReviewTests(unittest.TestCase):
    def approval(self):
        return {
            "decision": "APPROVE",
            "summary": "Every material criterion passed.",
            "findings": [],
            "strongest_unasked_question": "Will the source remain current?",
            "question_consequence": "A source change may require another review.",
            "confidence": "high",
        }

    def test_valid_approval(self):
        self.assertEqual(review.validate_review(self.approval()), [])

    def test_rejects_approval_with_major_finding(self):
        value = self.approval()
        value["findings"] = [{
            "id": "N001", "severity": "major", "criterion": "Claims need support.",
            "location": "Section 2", "evidence": "No source is cited.",
            "required_change": "Add an eligible source or remove the claim.",
        }]
        self.assertIn("APPROVE cannot contain critical or major findings", review.validate_review(value))


class HermesTests(unittest.TestCase):
    def test_core_and_command_rewrite(self):
        self.assertIn("active for every response", hermes.build_injected_context())
        event = types.SimpleNamespace(text="/necktie-review candidate", source="trusted")
        result = hermes.rewrite_gateway_command(event=event)
        self.assertEqual(result["action"], "rewrite")
        self.assertIn("necktie:necktie-review", result["text"])

    def test_registers_four_skills_commands_and_two_hooks(self):
        class Context:
            def __init__(self):
                self.skills, self.commands, self.hooks = [], [], []
            def register_skill(self, name, path): self.skills.append(name)
            def register_command(self, name, handler, **kwargs): self.commands.append(name)
            def register_hook(self, name, handler): self.hooks.append(name)
        ctx = Context()
        hermes.register(ctx)
        expected = ["necktie", "necktie-critique", "necktie-reverse", "necktie-review"]
        self.assertEqual(sorted(ctx.skills), sorted(expected))
        self.assertEqual(sorted(ctx.commands), sorted(expected))
        self.assertEqual(sorted(ctx.hooks), ["pre_gateway_dispatch", "pre_llm_call"])


if __name__ == "__main__":
    unittest.main()
