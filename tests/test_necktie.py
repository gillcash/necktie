from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import types
import unittest
import zipfile


ROOT = Path(__file__).resolve().parents[1]


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


loop = load_module("necktie_loop", ROOT / "skills/necktie/scripts/necktie_loop.py")
sources = load_module("necktie_sources", ROOT / "skills/necktie/scripts/necktie_sources.py")
review = load_module("validate_review", ROOT / "skills/necktie-review/scripts/validate_review.py")
contract = load_module(
    "verify_artifact_contract",
    ROOT / "skills/necktie-review/scripts/verify_artifact_contract.py",
)
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

    def test_schema_two_packet_migrates_without_losing_history(self):
        packet = loop.new_packet("Migrate this packet")
        packet["schema_version"] = "2.0"
        del packet["discovery"]
        del packet["deliverable_contract"]
        migrated = loop.validate_packet(packet)
        self.assertEqual(migrated["schema_version"], "3.0")
        self.assertIn("discovery", migrated)
        self.assertIn("deliverable_contract", migrated)
        self.assertEqual(migrated["history"][-1]["kind"], "schema-migrated")

    def test_metadata_candidate_needs_content_approval(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "research.md"
            source.write_text("research", encoding="utf-8")
            packet = loop.new_packet("Use an inbox candidate")
            packet["discovery"]["candidates"].append({
                "id": "C001", "location": str(source), "origin": "configured-inbox",
                "kind": "file", "access": "metadata", "status": "candidate", "sha256": "",
            })
            with self.assertRaisesRegex(loop.LoopError, "approve-content"):
                loop.decide_source(packet, "C001", "ACCEPT", "evidence", "Support claims", False)
            loop.decide_source(packet, "C001", "ACCEPT", "evidence", "Support claims", True)
            self.assertEqual(packet["sources"][0]["id"], "S001")
            self.assertTrue(packet["discovery"]["candidates"][0]["content_approved"])

    def test_packet_rejects_malformed_embedded_contract(self):
        packet = loop.new_packet("Reject malformed state")
        packet["deliverable_contract"]["schema_version"] = "unexpected"
        with self.assertRaisesRegex(loop.LoopError, "deliverable_contract schema"):
            loop.validate_packet(packet)

    def test_packet_rejects_unknown_embedded_contract_field(self):
        packet = loop.new_packet("Reject an expanded contract schema")
        packet["deliverable_contract"]["scan_home"] = True
        with self.assertRaisesRegex(loop.LoopError, "unknown contract fields"):
            loop.validate_packet(packet)

    def test_contract_reference_must_be_constraint_or_prior_output(self):
        packet = loop.new_packet("Classify reference authority")
        packet["sources"].append({"id": "S001", "kind": "evidence"})
        value = contract.validate_contract({
            "schema_version": "1.0", "reference_sources": ["S001"],
            "required_files": [], "markdown": [], "csv": [], "evidence_rules": [],
        })
        with self.assertRaisesRegex(loop.LoopError, "constraint or prior-output"):
            loop.record_contract(packet, value)

    def test_contract_verification_keeps_failed_check_details(self):
        packet = loop.new_packet("Keep the audit trail")
        for state in ("baseline", "critique", "reverse", "execute"):
            loop.transition(packet, state, "tested")
        loop.record_contract_verification(packet, {
            "decision": "FAIL", "artifact_root": "output", "failure_count": 1,
            "checks": [{
                "id": "V001", "passed": False,
                "requirement": "required file: report.md", "evidence": "missing",
            }],
        })
        self.assertEqual(packet["verification"][0]["failed_checks"], [{
            "id": "V001", "requirement": "required file: report.md", "evidence": "missing",
        }])

    def test_structural_contract_blocks_approval_until_latest_verification_passes(self):
        packet = loop.new_packet("Enforce the review gate")
        loop.record_contract(packet, contract.validate_contract({
            "schema_version": "1.0", "reference_sources": [],
            "required_files": [{"path": "report.md", "kind": "file", "min_bytes": 1}],
            "markdown": [], "csv": [], "evidence_rules": [],
        }))
        self.advance_to_review(packet)
        with self.assertRaisesRegex(loop.LoopError, "latest artifact contract verification"):
            loop.record_review(packet, "APPROVE", "Looks complete", "")
        loop.record_contract_verification(packet, {
            "decision": "FAIL", "artifact_root": "output", "failure_count": 1,
            "checks": [{"id": "V001", "passed": False, "requirement": "report", "evidence": "missing"}],
        })
        with self.assertRaisesRegex(loop.LoopError, "latest artifact contract verification"):
            loop.record_review(packet, "APPROVE", "Looks complete", "")
        loop.record_contract_verification(packet, {
            "decision": "PASS", "artifact_root": "output", "failure_count": 0,
            "checks": [{"id": "V001", "passed": True, "requirement": "report", "evidence": "present"}],
        })
        loop.record_review(packet, "APPROVE", "The complete contract passed", "")
        self.assertEqual(packet["state"], "verify")

    def test_contract_verification_rejects_inconsistent_result(self):
        packet = loop.new_packet("Reject a false verification result")
        for state in ("baseline", "critique", "reverse", "execute"):
            loop.transition(packet, state, "tested")
        with self.assertRaisesRegex(loop.LoopError, "inconsistent with its checks"):
            loop.record_contract_verification(packet, {
                "decision": "PASS", "failure_count": 1,
                "checks": [{"id": "V001", "passed": False}],
            })

    def test_completion_requires_approval(self):
        packet = loop.new_packet("Do not bypass review")
        packet["state"] = "verify"
        with self.assertRaisesRegex(loop.LoopError, "recorded APPROVE"):
            loop.transition(packet, "complete", "bypass")


class SourceDiscoveryTests(unittest.TestCase):
    def test_no_scope_performs_no_discovery(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "unrelated.txt").write_text("private", encoding="utf-8")
            result = sources.discover(workspace=root)
            self.assertEqual(result["authorizations"], [])
            self.assertEqual(result["candidates"], [])

    def test_explicit_file_is_content_authorized_and_hashed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            evidence = root / "evidence.md"
            evidence.write_text("eligible evidence", encoding="utf-8")
            result = sources.discover(workspace=root, inputs=[str(evidence)])
            self.assertEqual(len(result["candidates"]), 1)
            candidate = result["candidates"][0]
            self.assertEqual(candidate["origin"], "explicit")
            self.assertEqual(candidate["access"], "content")
            self.assertEqual(len(candidate["sha256"]), 64)

    def test_explicit_url_is_recorded_but_not_fetched(self):
        result = sources.discover(
            workspace=ROOT, inputs=["https://example.test/research"],
        )
        self.assertEqual(result["candidates"][0]["kind"], "remote-reference")
        self.assertIn("not-fetched-by-discovery", result["candidates"][0]["warnings"])
        self.assertEqual(result["authorizations"][0]["root"], "https://example.test/research")
        self.assertTrue(result["authorizations"][0]["exact"])

    def test_configured_inbox_defaults_to_metadata_and_honors_patterns(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            inbox = root / "inbox"
            inbox.mkdir()
            (inbox / "brief.md").write_text("brief", encoding="utf-8")
            (inbox / "ignore.txt").write_text("ignore", encoding="utf-8")
            hidden = inbox / ".private"
            hidden.mkdir()
            (hidden / "secret.md").write_text("secret", encoding="utf-8")
            config_dir = root / ".necktie"
            config_dir.mkdir()
            config_path = config_dir / "sources.json"
            config_path.write_text(json.dumps({
                "version": "1.0",
                "inboxes": [{"path": "../inbox", "include": ["*.md"]}],
                "search_roots": [],
            }), encoding="utf-8")
            result = sources.discover(workspace=root)
            self.assertEqual([item["name"] for item in result["candidates"]], ["brief.md"])
            self.assertEqual(result["candidates"][0]["access"], "metadata")
            self.assertEqual(result["candidates"][0]["sha256"], "")

    def test_configured_content_root_does_not_read_every_file_during_inventory(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            inbox = root / "inbox"
            inbox.mkdir()
            evidence = inbox / "evidence.md"
            evidence.write_text("accepted later", encoding="utf-8")
            config = root / "sources.json"
            config.write_text(json.dumps({
                "version": "1.0",
                "inboxes": [{"path": "inbox", "access": "content"}],
                "search_roots": [],
            }), encoding="utf-8")
            result = sources.discover(workspace=root, config_path=config)
            self.assertEqual(result["candidates"][0]["access"], "content")
            self.assertEqual(result["candidates"][0]["sha256"], "")
            packet = loop.new_packet("Accept the relevant source")
            loop.record_discovery(packet, result)
            loop.decide_source(
                packet, "C001", "ACCEPT", "evidence", "Support a material claim", False,
            )
            self.assertEqual(len(packet["sources"][0]["sha256"]), 64)

    def test_configured_archive_ignore_omits_zip_candidate(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            inbox = root / "inbox"
            inbox.mkdir()
            with zipfile.ZipFile(inbox / "package.zip", "w") as handle:
                handle.writestr("report.md", "report")
            (inbox / "brief.md").write_text("brief", encoding="utf-8")
            config = root / "sources.json"
            config.write_text(json.dumps({
                "version": "1.0",
                "inboxes": [{"path": "inbox", "archives": "ignore"}],
                "search_roots": [],
            }), encoding="utf-8")
            result = sources.discover(workspace=root, config_path=config)
            self.assertEqual([item["name"] for item in result["candidates"]], ["brief.md"])

    def test_user_profile_is_rejected_without_broad_root_override(self):
        result = sources.discover(workspace=ROOT, search_roots=[str(Path.home())])
        self.assertEqual(result["candidates"], [])
        self.assertTrue(any("broad-root-not-authorized" in item for item in result["errors"]))

    def test_zip_traversal_is_blocked_without_extraction(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            archive = root / "package.zip"
            with zipfile.ZipFile(archive, "w") as handle:
                handle.writestr("report.md", "safe")
                handle.writestr("../escape.txt", "unsafe")
            result = sources.discover(workspace=root, inputs=[str(archive)])
            inventory = result["candidates"][0]["archive"]
            self.assertEqual(inventory["status"], "blocked")
            blocked = next(item for item in inventory["members"] if item["name"] == "../escape.txt")
            self.assertIn("unsafe-path", blocked["blocked_reasons"])
            self.assertFalse((root.parent / "escape.txt").exists())

    def test_nested_and_duplicate_archive_members_are_blocked(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / "package.zip"
            with zipfile.ZipFile(archive, "w") as handle:
                handle.writestr("nested.tar.xz", "nested")
                handle.writestr("REPORT.md", "one")
                handle.writestr("report.md", "two")
            inventory = sources.inventory_zip(archive)
            self.assertEqual(inventory["status"], "blocked")
            nested = next(item for item in inventory["members"] if item["name"] == "nested.tar.xz")
            duplicate = next(item for item in inventory["members"] if item["name"] == "report.md")
            self.assertIn("nested-archive", nested["blocked_reasons"])
            self.assertIn("duplicate-name", duplicate["blocked_reasons"])

    def test_archive_file_size_limit_blocks_before_inventory(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / "package.zip"
            with zipfile.ZipFile(archive, "w") as handle:
                handle.writestr("report.md", "safe")
            result = sources.inventory_zip(archive, max_total_bytes=1)
            self.assertEqual(result["status"], "blocked")
            self.assertTrue(any(
                item.startswith("archive-file-size-limit:") for item in result["warnings"]
            ))
            self.assertEqual(result["members"], [])

    def test_blocked_archive_cannot_be_accepted(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            archive = root / "package.zip"
            with zipfile.ZipFile(archive, "w") as handle:
                handle.writestr("../escape.txt", "unsafe")
            packet = loop.new_packet("Reject an unsafe archive")
            loop.record_discovery(packet, sources.discover(workspace=root, inputs=[str(archive)]))
            with self.assertRaisesRegex(loop.LoopError, "blocked archive"):
                loop.decide_source(
                    packet, "C001", "ACCEPT", "prior-output", "Reference structure", False,
                )

    def test_explicit_path_through_link_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / "target"
            target.mkdir()
            (target / "evidence.md").write_text("evidence", encoding="utf-8")
            link = root / "linked"
            try:
                link.symlink_to(target, target_is_directory=True)
            except OSError as exc:
                self.skipTest(f"link creation is unavailable: {exc}")
            result = sources.discover(
                workspace=root, inputs=[str(link / "evidence.md")],
            )
            self.assertEqual(result["candidates"], [])
            self.assertTrue(any("link or junction" in item for item in result["errors"]))

    def test_unknown_configuration_field_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sources.json"
            path.write_text(json.dumps({
                "version": "1.0", "inboxes": [], "search_roots": [], "scan_home": True,
            }), encoding="utf-8")
            with self.assertRaisesRegex(sources.DiscoveryError, "unknown configuration fields"):
                sources.load_config(path)

    def test_configuration_rejects_coerced_numeric_limit(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sources.json"
            path.write_text(json.dumps({
                "version": "1.0",
                "inboxes": [{"path": ".", "max_files": "500"}],
                "search_roots": [],
            }), encoding="utf-8")
            with self.assertRaisesRegex(sources.DiscoveryError, "positive integer"):
                sources.load_config(path)


class ArtifactContractTests(unittest.TestCase):
    def sample_contract(self):
        return {
            "schema_version": "1.0",
            "reference_sources": [],
            "required_files": [{"path": "report.md", "kind": "file", "min_bytes": 10}],
            "markdown": [{
                "path": "report.md", "required_headings": ["Executive answer"], "min_words": 4,
            }],
            "csv": [{
                "path": "master.csv", "required_columns": ["KPI", "Formula"],
                "min_data_rows": 2,
            }],
            "evidence_rules": ["Every material claim maps to an accepted evidence source."],
        }

    def test_contract_passes_for_matching_artifact(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "report.md").write_text(
                "# Executive answer\n\nA sufficiently complete report exists.\n", encoding="utf-8"
            )
            (root / "master.csv").write_text(
                "KPI,Formula\nUtilization,Rented/Available\nRevenue,Sum(lines)\n",
                encoding="utf-8",
            )
            result = contract.verify_contract(self.sample_contract(), root)
            self.assertEqual(result["decision"], "PASS")

    def test_small_artifact_fails_reference_file_inventory(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "only-one.md").write_text("small", encoding="utf-8")
            value = contract.validate_contract({
                "schema_version": "1.0",
                "reference_sources": [],
                "required_files": [
                    {"path": f"expected-{index:02d}.csv", "kind": "file", "min_bytes": 1}
                    for index in range(1, 23)
                ],
                "markdown": [], "csv": [], "evidence_rules": [],
            })
            result = contract.verify_contract(value, root)
            self.assertEqual(result["decision"], "FAIL")
            self.assertEqual(result["failure_count"], 22)

    def test_contract_rejects_path_traversal(self):
        value = self.sample_contract()
        value["required_files"][0]["path"] = "../outside.md"
        with self.assertRaisesRegex(contract.ContractError, "stay relative"):
            contract.validate_contract(value)

    def test_contract_rejects_coerced_numeric_minimum(self):
        value = self.sample_contract()
        value["required_files"][0]["min_bytes"] = "10"
        with self.assertRaisesRegex(contract.ContractError, "non-negative integer"):
            contract.validate_contract(value)

    def test_contract_rejects_alternate_data_stream_path(self):
        value = self.sample_contract()
        value["required_files"][0]["path"] = "report.md:hidden"
        with self.assertRaisesRegex(contract.ContractError, "stay relative"):
            contract.validate_contract(value)

    def test_contract_rejects_target_through_link(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / "target"
            target.mkdir()
            (target / "report.md").write_text("report", encoding="utf-8")
            link = root / "linked"
            try:
                link.symlink_to(target, target_is_directory=True)
            except OSError as exc:
                self.skipTest(f"link creation is unavailable: {exc}")
            value = self.sample_contract()
            value["required_files"][0]["path"] = "linked/report.md"
            value["markdown"] = []
            value["csv"] = []
            result = contract.verify_contract(value, root)
            self.assertEqual(result["decision"], "FAIL")
            self.assertIn("link-like target", result["checks"][0]["evidence"])

    def test_contract_rejects_linked_artifact_root(self):
        with tempfile.TemporaryDirectory() as directory:
            parent = Path(directory)
            target = parent / "target"
            target.mkdir()
            link = parent / "linked-root"
            try:
                link.symlink_to(target, target_is_directory=True)
            except OSError as exc:
                self.skipTest(f"link creation is unavailable: {exc}")
            with self.assertRaisesRegex(contract.ContractError, "link or junction"):
                contract.verify_contract(self.sample_contract(), link)


class KpiSessionRegressionTests(unittest.TestCase):
    def test_empty_workspace_then_configured_inbox_preserves_full_package_contract(self):
        with tempfile.TemporaryDirectory() as directory:
            sandbox = Path(directory)
            workspace = sandbox / "work"
            workspace.mkdir()
            unapproved = sandbox / "unapproved"
            unapproved.mkdir()
            secret = unapproved / "personal.txt"
            secret.write_text("must remain invisible", encoding="utf-8")

            empty = sources.discover(workspace=workspace)
            self.assertEqual(empty["candidates"], [])

            inbox = workspace / "research-inbox"
            inbox.mkdir()
            (inbox / "controlling-brief.md").write_text(
                "# Controlling brief\nRequire a report and machine-readable tables.\n",
                encoding="utf-8",
            )
            (inbox / "deep-research-report.md").write_text(
                "# Eligible research\nClaims trace to primary sources.\n",
                encoding="utf-8",
            )
            expected_names = [f"table-{index:02d}.csv" for index in range(1, 21)] + [
                "report.md", "report.html",
            ]
            package = inbox / "expected-package.zip"
            with zipfile.ZipFile(package, "w") as handle:
                for name in expected_names:
                    handle.writestr(name, "KPI,Formula\nExample,Value\n")

            local = workspace / ".necktie"
            local.mkdir()
            (local / "sources.json").write_text(json.dumps({
                "version": "1.0",
                "inboxes": [{
                    "path": "../research-inbox", "access": "metadata",
                    "include": ["*.md", "*.zip"], "max_depth": 1,
                }],
                "search_roots": [],
            }), encoding="utf-8")

            discovered = sources.discover(workspace=workspace)
            names = {item["name"] for item in discovered["candidates"]}
            self.assertEqual(names, {
                "controlling-brief.md", "deep-research-report.md", "expected-package.zip",
            })
            self.assertNotIn(str(secret), {item["location"] for item in discovered["candidates"]})
            archive = next(
                item["archive"] for item in discovered["candidates"]
                if item["name"] == "expected-package.zip"
            )
            self.assertEqual(archive["status"], "ok")
            self.assertEqual(archive["member_count"], 22)

            packet = loop.new_packet("Rebuild the KPI data-reliability research package")
            loop.record_discovery(packet, discovered)
            classifications = {
                "controlling-brief.md": ("constraint", "Defines required scope"),
                "deep-research-report.md": ("evidence", "Supports material claims"),
                "expected-package.zip": ("prior-output", "Defines the reference structure"),
            }
            reference_source = ""
            for candidate in packet["discovery"]["candidates"]:
                kind, use = classifications[candidate["name"]]
                loop.decide_source(packet, candidate["id"], "ACCEPT", kind, use, True)
                if candidate["name"] == "expected-package.zip":
                    reference_source = candidate["source_id"]

            contract_value = contract.validate_contract({
                "schema_version": "1.0",
                "reference_sources": [reference_source],
                "required_files": [
                    {"path": name, "kind": "file", "min_bytes": 1}
                    for name in expected_names
                ],
                "markdown": [], "csv": [],
                "evidence_rules": ["Reference structure cannot corroborate its own claims."],
            })
            loop.record_contract(packet, contract_value)
            for state in ("baseline", "critique", "reverse", "execute"):
                loop.transition(packet, state, "regression test")

            output = workspace / "output"
            output.mkdir()
            (output / "report.md").write_text("# Small methodology\n", encoding="utf-8")
            result = contract.verify_contract(packet["deliverable_contract"], output)
            self.assertEqual(result["decision"], "FAIL")
            self.assertEqual(result["failure_count"], 21)
            loop.record_contract_verification(packet, result)
            loop.transition(packet, "review", "candidate frozen")
            loop.record_review(
                packet, "REVISE", "The candidate omits 21 required files.", "contract-incomplete",
            )
            self.assertEqual(packet["state"], "revise")


class CommandLineForwardTests(unittest.TestCase):
    def test_cli_completes_authorized_source_and_contract_workflow(self):
        controller = ROOT / "skills/necktie/scripts/necktie_loop.py"

        def run_cli(*arguments: object) -> subprocess.CompletedProcess[str]:
            result = subprocess.run(
                [sys.executable, str(controller), *(str(item) for item in arguments)],
                cwd=ROOT, capture_output=True, text=True, check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
            return result

        with tempfile.TemporaryDirectory() as directory:
            workspace = Path(directory)
            brief = workspace / "controlling-brief.md"
            brief.write_text("# Brief\n\nRequire one verified report.\n", encoding="utf-8")
            artifact = workspace / "output"
            artifact.mkdir()
            (artifact / "report.md").write_text(
                "# Result\n\nKPI output is complete.\n", encoding="utf-8",
            )
            contract_path = workspace / "contract.json"
            contract_path.write_text(json.dumps({
                "schema_version": "1.0", "reference_sources": ["S001"],
                "required_files": [
                    {"path": "report.md", "kind": "file", "min_bytes": 1},
                ],
                "markdown": [{
                    "path": "report.md", "required_headings": ["Result"], "min_words": 3,
                }],
                "csv": [],
                "evidence_rules": ["The brief controls structure, not factual corroboration."],
            }), encoding="utf-8")
            packet_path = workspace / "run.json"

            run_cli("init", "--goal", "Build a KPI reliability report", "--output", packet_path)
            run_cli(
                "discover", "--file", packet_path, "--workspace", workspace,
                "--input", brief,
            )
            run_cli(
                "source", "--file", packet_path, "--candidate", "C001",
                "--decision", "ACCEPT", "--kind", "constraint",
                "--use", "Define the required report",
            )
            run_cli("contract", "--file", packet_path, "--input", contract_path)
            for state in ("baseline", "critique", "reverse", "execute"):
                run_cli("transition", "--file", packet_path, "--to", state, "--note", "tested")
            run_cli("verify-contract", "--file", packet_path, "--artifact-root", artifact)
            run_cli("transition", "--file", packet_path, "--to", "review", "--note", "frozen")
            run_cli(
                "review", "--file", packet_path, "--decision", "APPROVE",
                "--reason", "The complete artifact contract passed.",
            )
            run_cli(
                "transition", "--file", packet_path, "--to", "complete",
                "--note", "verification passed",
            )

            packet = json.loads(packet_path.read_text(encoding="utf-8"))
            self.assertEqual(packet["state"], "complete")
            self.assertEqual(packet["verification"][0]["decision"], "PASS")
            self.assertEqual(packet["sources"][0]["kind"], "constraint")


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
