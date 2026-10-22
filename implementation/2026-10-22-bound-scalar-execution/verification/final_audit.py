#!/usr/bin/env python3
"""Static audit of the bound-scalar implementation's preserved evidence."""

from __future__ import annotations

import hashlib
import json
import math
import pathlib
import re
import subprocess
import sys


ROOT = pathlib.Path(__file__).resolve().parents[3]
UNIT = ROOT / "implementation/2026-10-22-bound-scalar-execution"
VERIFY = UNIT / "verification"
PROOFS = UNIT / "proof-canvas-v2"


def read_json(path: pathlib.Path):
    text = path.read_text(encoding="utf-8")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Preserve and tolerate the recorded literal `\n` suffix in this launcher receipt.
        return json.loads(text.removesuffix(r"\n").rstrip())


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha_file(path: pathlib.Path) -> str:
    return sha_bytes(path.read_bytes())


def gate(number: int):
    return VERIFY / f"darwin-v{number}"


def by_name(receipt, name: str):
    return next(step for step in receipt["steps"] if step["name"] == name)


def log_for(directory: pathlib.Path, receipt, name: str) -> str:
    step = by_name(receipt, name)
    return (directory / step["log"]).read_text(encoding="utf-8", errors="replace")


def phase_counts(receipt):
    return {key: sum(step["status"] == key for step in receipt["steps"])
            for key in ("PASS", "FAIL", "SKIPPED_DEPENDENCY_FAILED")}


def compiled_fixtures(receipt):
    return [step for step in receipt["steps"]
            if re.fullmatch(r"compiled-\d{2}", step["name"])]


def test_summary(log: str):
    match = re.search(r"FAILED \| (\d+) passed \| (\d+) failed", log)
    if match:
        return {"passed": int(match.group(1)), "failed": int(match.group(2))}
    match = re.search(r"(\d+) passed; (\d+) failed", log)
    if match:
        return {"passed": int(match.group(1)), "failed": int(match.group(2))}
    match = re.search(r"(\d+) passed", log)
    return {"passed": int(match.group(1)), "failed": 0} if match else None


def sorted_median(values):
    values = sorted(values)
    n = len(values)
    return (values[n // 2 - 1] + values[n // 2]) / 2 if n % 2 == 0 else values[n // 2]


def nearest_rank_p95(values):
    return sorted(values)[math.ceil(0.95 * len(values)) - 1]


def doc_has(path: pathlib.Path, phrases):
    data = "".join(path.read_text(encoding="utf-8").split()).lower()
    return {phrase: phrase.lower().replace(" ", "") in data for phrase in phrases}


def git_blob(path: str) -> bytes:
    return subprocess.run(["git", "show", f"HEAD:{path}"], cwd=ROOT,
                          check=True, stdout=subprocess.PIPE).stdout


def audit():
    errors = []
    checks = {}

    # Four preserved consolidated attempts, including their actual phase receipts.
    gates = {}
    expected_phase_counts = {
        1: {"PASS": 11, "FAIL": 62, "SKIPPED_DEPENDENCY_FAILED": 1},
        2: {"PASS": 70, "FAIL": 3, "SKIPPED_DEPENDENCY_FAILED": 1},
        3: {"PASS": 73, "FAIL": 1, "SKIPPED_DEPENDENCY_FAILED": 0},
        4: {"PASS": 74, "FAIL": 0, "SKIPPED_DEPENDENCY_FAILED": 0},
    }
    for number in range(1, 5):
        directory = gate(number)
        receipt = read_json(directory / "receipt.json")
        counts = phase_counts(receipt)
        fixtures = compiled_fixtures(receipt)
        before = read_json(directory / "source-before.json")["inputs"]
        after = read_json(directory / "source-after.json")["inputs"]
        archive = read_json(directory / "source-archive.json")
        source_match = receipt.get("sourceAudit", {}).get("status") == "MATCH"
        gates[f"darwin-v{number}"] = {
            "status": receipt["status"],
            "actual": receipt.get("actual"),
            "phaseCounts": counts,
            "phaseCount": len(receipt["steps"]),
            "compiledFixturePhases": len(fixtures),
            "compiledFixtureStatusCounts": {
                status: sum(step["status"] == status for step in fixtures)
                for status in ("PASS", "FAIL")
            },
            "deno": {
                "status": by_name(receipt, "deno-full")["status"],
                "testSummary": test_summary(log_for(directory, receipt, "deno-full")),
                "runtimeAssertionsExecuted": number >= 3,
            },
            "rustTests": test_summary(log_for(directory, receipt, "cargo-test")),
            "rustBuild": by_name(receipt, "cargo-debug")["status"],
            "sourceBeforeCount": len(before),
            "sourceAfterCount": len(after),
            "sourceAuditMatch": source_match,
            "archiveInputCount": len(archive["inputs"]),
            "archiveUnavailableContextCount": len(archive.get("unavailableContext", [])),
        }
        if counts != expected_phase_counts[number]:
            errors.append(f"darwin-v{number}: unexpected phase counts {counts}")
        if len(receipt["steps"]) != 74 or len(before) != 1910 or len(after) != 1910:
            errors.append(f"darwin-v{number}: unexpected phase/source inventory count")
        if not source_match or len(archive["inputs"]) != 1920 or archive.get("unavailableContext"):
            errors.append(f"darwin-v{number}: source archive/audit mismatch")
        if number in (1, 2, 3, 4) and len(fixtures) != 54:
            errors.append(f"darwin-v{number}: expected 54 compiled fixture phases")

    v1, v2, v3, v4 = (read_json(gate(n) / "receipt.json") for n in range(1, 5))
    v1log = log_for(gate(1), v1, "deno-full")
    v1compiled = log_for(gate(1), v1, "compiled-54")
    v2log = log_for(gate(2), v2, "native-tooling")
    v3log = log_for(gate(3), v3, "deno-full")
    v3test = (gate(3) / "source-before/files/src/component_retained_store_child_test.ts")
    v3lines = v3test.read_text(encoding="utf-8").splitlines()
    v4deno = log_for(gate(4), v4, "deno-full")
    gate_root_causes = {
        "launcher": read_json(VERIFY / "launcher-failure.json"),
        "darwinV1": {
            "syntaxFailure": "src/vdom_snapshot_runtime.ts:4280" in v1log,
            "denoTestSummary": test_summary(v1log),
            "compiled54ImportSyntaxFailure": "ERR_INVALID_TYPESCRIPT_SYNTAX" in v1compiled,
            "rust105": test_summary(log_for(gate(1), v1, "cargo-test")),
        },
        "darwinV2": {
            "regionIndexTypeFailure": "regionIndex" in v2log and "Owner" in v2log,
            "denoTestSummary": test_summary(log_for(gate(2), v2, "deno-full")),
        },
        "darwinV3": {
            "denoTestSummary": test_summary(v3log),
            "failedAssertionLine102": len(v3lines) >= 102 and
                'assert(total("store.bound-input.reused-rows") >= 1);' in v3lines[101],
            "correctedDiagnosis": "actual failed line102 was `store.bound-input.reused-rows >= 1`" in
                (UNIT / "source-review.md").read_text(encoding="utf-8"),
        },
        "darwinV4": {
            "denoTestSummary": test_summary(v4deno),
            "allCompiled54Pass": all(step["status"] == "PASS" for step in compiled_fixtures(v4)),
            "packagingValidation": by_name(v4, "package-consumer")["status"],
        },
    }
    checks["gates"] = gates
    checks["preservedFailureInterpretation"] = gate_root_causes
    if not gate_root_causes["darwinV1"]["syntaxFailure"] or not gate_root_causes["darwinV1"]["compiled54ImportSyntaxFailure"]:
        errors.append("v1 root cause or compiled import failure not confirmed")
    if not gate_root_causes["darwinV2"]["regionIndexTypeFailure"]:
        errors.append("v2 regionIndex failure not confirmed")
    if not gate_root_causes["darwinV3"]["failedAssertionLine102"]:
        errors.append("v3 reused-input assertion line 102 not confirmed")
    if not gate_root_causes["darwinV3"]["correctedDiagnosis"]:
        errors.append("v3 corrected root cause is not documented")
    if gate_root_causes["darwinV4"]["denoTestSummary"] != {"passed": 1223, "failed": 0}:
        errors.append("v4 Deno count does not match expected 1223/0")
    if gate_root_causes["darwinV4"]["packagingValidation"] != "PASS":
        errors.append("v4 package consumer/packaging validation did not pass")

    # Launcher and first browser launch are preserved but are not product-gate failures.
    launch = read_json(UNIT / "proof-canvas-v1/canvas-proof-one-shot.json")
    recovery = read_json(VERIFY / "browser-launch-recovery.json")
    proof = read_json(UNIT / "proof-canvas-v2/canvas-proof-one-shot.json")
    v1_build = UNIT / "proof-canvas-v1/build-proof.json"
    v2_build = UNIT / "proof-canvas-v2/build-proof.json"
    v1_lock = UNIT / "proof-canvas-v1/input-lock.json"
    v2_lock = UNIT / "proof-canvas-v2/input-lock.json"
    proof_build_sha = sha_file(UNIT / "proof-canvas-v2/build-proof.json")
    proof_lock_sha = sha_file(UNIT / "proof-canvas-v2/input-lock.json")
    proof_record_sha = sha_file(UNIT / "proof-canvas-v2/canvas-proof-one-shot.json")
    delivery = proof.get("compiledDelivery") or {}
    proof_arms = proof.get("arms", []) + proof.get("deliveryArms", [])
    native_variants = [arm for arm in proof_arms if arm["mode"] in
                       ("native", "native-minified", "native-rebundled")]
    counters_valid = True
    for arm in native_variants:
        result = arm["result"]
        samples = result["warmupSamples"] + result["samples"]
        if len(samples) != 72:
            counters_valid = False
            break
        first = result["firstUpdate"]["counters"]
        if first.get("store.owned-data.verified-rows") != 257:
            counters_valid = False
            break
        for sample in samples:
            c = sample["counters"]
            e = sample["epoch"]
            expected = {
                "store.owned-data.rows": 257 * e,
                "store.owned-data.verified-rows": 257 * e,
                "store.owned-data.batches": e,
                "store.owned-data.enclosed-batches": e,
                "publication.immediate.runs": e,
                "store.numeric-kernel.rows": 0,
                "store.numeric-kernel.runs": 0,
                "publication.deferred-adapters": 0,
                "owner.component-renders": 0,
            }
            if any((c.get(k) or 0) != v for k, v in expected.items()):
                counters_valid = False
                break
            if (c.get("store.bound-input.new-rows") or 0) != first.get("store.bound-input.new-rows", 0):
                counters_valid = False
                break
            if ((c.get("store.bound-input.reused-rows") or 0) !=
                    first.get("store.bound-input.reused-rows", 0) + 257 * (e - 1)):
                counters_valid = False
                break
            if (c.get("store.mounted-scalar.cold-rows") or 0) != first.get("store.mounted-scalar.cold-rows", 0):
                counters_valid = False
                break
            if ((c.get("store.mounted-scalar.warm-rows") or 0) !=
                    first.get("store.mounted-scalar.warm-rows", 0) + 257 * (e - 1)):
                counters_valid = False
                break

    output_signatures = []
    for arm in proof_arms:
        result = arm["result"]
        output_signatures.append([
            (sample["epoch"], sample["checksum"], sample["pixelChecksum"], sample["litPixels"])
            for sample in result["samples"]
        ])
    proof_source_before = proof.get("sourceBefore", [])
    proof_source_after = proof.get("sourceAfter", [])
    proof_resources = [arm["result"]["teardown"] for arm in proof_arms]
    csp_variants = {arm["mode"]: arm.get("csp") for arm in proof.get("deliveryArms", [])}
    proof_details = {
        "v1LaunchOnlyFailure": {
            "status": launch.get("status"),
            "contextsStarted": len(launch.get("arms", [])) + len(launch.get("deliveryArms", [])),
            "sourceBeforeMatches": sum(item["matches"] for item in launch.get("sourceBefore", [])),
            "sourceAfterCount": len(launch.get("sourceAfter", [])),
            "chromeSigabrtEpRem": any("SIGABRT" in error and "EPERM" in error
                                       for error in launch.get("errors", [])),
            "noTimingPhase": not (UNIT / "proof-canvas-v1/canvas-timing-one-shot.json").exists(),
        },
        "proofV2": {
            "status": proof.get("status"),
            "sameBuildProofBytesAsV1": v1_build.read_bytes() == v2_build.read_bytes(),
            "sameInputLockBytesAsV1": v1_lock.read_bytes() == v2_lock.read_bytes(),
            "buildProofSha256": proof_build_sha,
            "inputLockSha256": proof_lock_sha,
            "proofSha256": proof_record_sha,
            "referencesOriginalV1Assets": recovery.get("assetPaths", "").startswith("The unchanged records continue to reference original absolute v1"),
            "contexts": len(proof_arms),
            "closedContexts": sum(arm.get("contextClosed") is True for arm in proof_arms),
            "baselineArms": [arm["mode"] for arm in proof.get("arms", [])],
            "deliveryArms": [arm["mode"] for arm in proof.get("deliveryArms", [])],
            "perSampleOutputsMatch": bool(output_signatures) and all(x == output_signatures[0] for x in output_signatures[1:]),
            "resourceExpected": sum(item["resourcesExpected"] for item in proof_resources),
            "resourceDisposed": sum(item["resourcesDisposed"] for item in proof_resources),
            "duplicateDisposals": sum(item["duplicateDisposalEvents"] for item in proof_resources),
            "sourceBefore": {"count": len(proof_source_before), "matched": sum(x["matches"] for x in proof_source_before)},
            "sourceAfter": {"count": len(proof_source_after), "matched": sum(x["matches"] for x in proof_source_after)},
            "compiledDelivery": delivery,
            "deliveryCsp": csp_variants,
            "frameCompiler": proof.get("frameCompilerOutcome", {}).get("status"),
            "motionCompiled": proof.get("frameCompilerOutcome", {}).get("motionCompiled"),
            "all257RowsVerifiedAndWarmAfterFirstFrame": counters_valid,
            "finalNativeCounters": {
                arm["mode"]: {
                    key: arm["result"]["samples"][-1]["counters"].get(key, 0)
                    for key in ("store.owned-data.verified-rows", "store.owned-data.batches",
                                "store.bound-input.reused-rows", "store.mounted-scalar.warm-rows",
                                "store.mounted-scalar.cold-rows")
                } for arm in native_variants
            },
            "errorCounts": {key: len(proof.get(key, [])) for key in
                            ("errors", "pageErrors", "consoleErrors", "blockedRequests", "requestFailures", "cleanupErrors")},
            "browserClosed": proof.get("browserClosed"),
        },
    }
    checks["proof"] = proof_details
    if launch.get("status") != "INCOMPLETE" or proof_details["v1LaunchOnlyFailure"]["contextsStarted"] != 0 or not proof_details["v1LaunchOnlyFailure"]["chromeSigabrtEpRem"]:
        errors.append("proof-v1 launch-only failure is misclassified or not preserved")
    if not proof_details["v1LaunchOnlyFailure"]["noTimingPhase"]:
        errors.append("unexpected v1 timing phase appeared")
    p2 = proof_details["proofV2"]
    if p2["status"] != "PASS_R3F_FRAME_BASELINES_CANVAS_UNTIMED_PROOF" or not p2["sameBuildProofBytesAsV1"] or not p2["sameInputLockBytesAsV1"]:
        errors.append("proof-v2 status or immutable build/input binding failed")
    if p2["contexts"] != 6 or p2["closedContexts"] != 6 or p2["resourceExpected"] != 3072 or p2["resourceDisposed"] != 3072 or p2["duplicateDisposals"] != 0:
        errors.append("proof-v2 context/resource lifecycle mismatch")
    if p2["sourceBefore"] != {"count": 12396, "matched": 12396} or p2["sourceAfter"] != {"count": 12396, "matched": 12396}:
        errors.append("proof-v2 source checks do not all match")
    if not p2["perSampleOutputsMatch"] or not p2["all257RowsVerifiedAndWarmAfterFirstFrame"]:
        errors.append("proof-v2 output parity or all-257-row reuse invariant failed")
    if p2["frameCompiler"] != "PASS" or p2["motionCompiled"] != {"Position": True, "Rotation": True}:
        errors.append("actual React frame compiler route is not confirmed")
    for variant in ("native-minified", "native-rebundled"):
        if csp_variants.get(variant) != {"blocked": True, "violations": ["eval"]}:
            errors.append(f"{variant} CSP probe does not show only the explicit eval violation")

    # Authorized timing: recompute from the raw 60 samples, not the rendered summary.
    timing_path = PROOFS / "canvas-timing-one-shot.json"
    timing = read_json(timing_path)
    timing_hash = sha_file(timing_path)
    timing_receipt = read_json(VERIFY / "canvas-timing-v1-supervisor.json")
    auth_path = PROOFS / "canvas-timing-authorization.json"
    auth_hash = sha_file(auth_path)
    expected_hashes = {
        "buildProofSha256": proof_build_sha,
        "inputLockSha256": proof_lock_sha,
        "priorProofSha256": proof_record_sha,
    }
    bindings_ok = all(timing.get(key) == value for key, value in expected_hashes.items())
    metrics = ("publishMs", "updateThroughDrawMs", "stateAgeMs", "callbackMs", "rafIntervalMs")
    stats = {}
    timing_valid = True
    for arm in timing.get("arms", []):
        result = arm["result"]
        samples = result["samples"]
        timing_valid &= (arm.get("contextClosed") is True and result.get("warmup") == 12
                         and result.get("measured") == 60 and len(result.get("warmupSamples", [])) == 12
                         and len(samples) == 60 and all(sample.get("counters") is None for sample in samples))
        stats[arm["mode"]] = {}
        for metric in metrics:
            values = [sample.get(metric) for sample in samples]
            if len(values) != 60 or not all(isinstance(value, (int, float)) for value in values):
                stats[arm["mode"]][metric] = None
                timing_valid = False
                continue
            stats[arm["mode"]][metric] = {
                "n": len(values),
                "median": sorted_median(values),
                "p95NearestRank": nearest_rank_p95(values),
            }
    native = stats.get("native", {})
    react = stats.get("react", {})
    parity = {
        metric: {
            "nativeMedianAtOrBelowReact": native[metric]["median"] <= react[metric]["median"],
            "nativeP95AtOrBelowReact": native[metric]["p95NearestRank"] <= react[metric]["p95NearestRank"],
        } for metric in ("publishMs", "updateThroughDrawMs")
    }
    parity_pass = all(item["nativeMedianAtOrBelowReact"] and item["nativeP95AtOrBelowReact"] for item in parity.values())
    evidence_summary = read_json(UNIT / "evidence/timing-summary.json")
    summary_matches = True
    for arm_name, metrics_summary in evidence_summary["arms"].items():
        for metric, expected in metrics_summary.items():
            actual = stats.get(arm_name, {}).get(metric)
            if (actual is None or actual["n"] != expected["n"]
                    or abs(actual["median"] - expected["median"]) > 1e-9
                    or abs(actual["p95NearestRank"] - expected["p95NearestRank"]) > 1e-9):
                summary_matches = False
    timing_source_before = timing.get("sourceBefore", [])
    timing_source_after = timing.get("sourceAfter", [])
    timing_arms = timing.get("arms", [])
    timing_resources = [arm["result"]["teardown"] for arm in timing_arms]
    checks["timing"] = {
        "status": timing.get("status"),
        "supervisorExit": timing_receipt.get("exitCode"),
        "supervisorStop": timing_receipt.get("stop"),
        "supervisorWallSeconds": timing_receipt.get("wallSeconds"),
        "authorizationSha256": auth_hash,
        "authorizationStatus": read_json(auth_path).get("status"),
        "timingRecordSha256": timing_hash,
        "buildProofSha256": timing.get("buildProofSha256"),
        "inputLockSha256": timing.get("inputLockSha256"),
        "priorProofSha256": timing.get("priorProofSha256"),
        "authorizedBindingsMatch": bindings_ok and timing.get("authorizationSha256") == auth_hash,
        "contexts": len(timing_arms),
        "armOrder": [arm["mode"] for arm in timing_arms],
        "allContextsClosed": all(arm.get("contextClosed") is True for arm in timing_arms) and timing.get("browserClosed") is True,
        "deliveryContexts": len(timing.get("deliveryArms", [])),
        "all12Warmup60MeasuredNullCounter": timing_valid and len(timing_arms) == 4 and not timing.get("deliveryArms"),
        "metricsMs": stats,
        "nativeReactParity": {"status": "PASS" if parity_pass else "FAIL", "checks": parity},
        "summaryDocumentMatchesRaw": summary_matches,
        "sourceBefore": {"count": len(timing_source_before), "matched": sum(x["matches"] for x in timing_source_before)},
        "sourceAfter": {"count": len(timing_source_after), "matched": sum(x["matches"] for x in timing_source_after)},
        "resourcesExpected": sum(item["resourcesExpected"] for item in timing_resources),
        "resourcesDisposed": sum(item["resourcesDisposed"] for item in timing_resources),
        "duplicateDisposals": sum(item["duplicateDisposalEvents"] for item in timing_resources),
        "errorCounts": {key: len(timing.get(key, [])) for key in
                        ("errors", "pageErrors", "consoleErrors", "blockedRequests", "requestFailures", "cleanupErrors")},
    }
    if timing.get("status") != "PASS_R3F_FRAME_BASELINES_CANVAS_DESCRIPTIVE_TIMING" or timing_receipt.get("exitCode") != 0 or timing_receipt.get("stop") is not None:
        errors.append("timing result/supervisor is not a completed pass")
    if not bindings_ok or timing.get("authorizationSha256") != auth_hash:
        errors.append("timing authorization/build/input/proof hash chain does not bind")
    if not timing_valid or len(timing_arms) != 4 or timing.get("deliveryArms"):
        errors.append("timing contexts/warmup/sample/counter contract mismatch")
    if not summary_matches:
        errors.append("timing-summary.json disagrees with raw central-two median/nearest-rank p95")
    if timing["sourceBefore"] != timing["sourceAfter"] or len(timing_source_before) != 12396 or not all(x["matches"] for x in timing_source_before + timing_source_after):
        errors.append("timing source before/after checks are not all matched")
    if len(timing_arms) != 4 or any(item["resourcesExpected"] != 512 or item["resourcesDisposed"] != 512 or item["duplicateDisposalEvents"] != 0 for item in timing_resources):
        errors.append("timing resource lifecycle mismatch")
    if parity_pass:
        errors.append("reported Native/React parity should fail for the registered intervals")

    # Compare the v4 gate inventory with current files without turning docs into source drift.
    gate_inputs = read_json(gate(4) / "source-before.json")["inputs"]
    current_changed = []
    missing = []
    for item in gate_inputs:
        path = ROOT / item["path"]
        if not path.is_file():
            missing.append(item["path"])
        elif sha_file(path) != item["sha256"]:
            current_changed.append(item["path"])
    expected_inventory_docs = ["README.md", "implementation/2026-10-22-bound-scalar-execution/source-review.md"]
    allowed_context_doc_changes = [
        "README.md", "implementation/2026-10-22-bound-scalar-execution/source-review.md",
        "final-master-plan.md", "implementation-checkpoint.md", "HANDOFF-PROMPT.txt",
        "RESEARCH-GUIDE.md", "docs/native-authoring-reference.md",
    ]
    archive_inputs = read_json(gate(4) / "source-archive.json")["inputs"]
    archive_paths = {item["path"] for item in archive_inputs}
    archive_changed = []
    archive_missing = []
    for item in archive_inputs:
        path = ROOT / item["path"]
        if not path.is_file():
            archive_missing.append(item["path"])
        elif sha_file(path) != item["sha256"]:
            archive_changed.append(item["path"])
    inventory_current = {
        "gateV4Inputs": len(gate_inputs),
        "currentMismatches": current_changed,
        "missing": missing,
        "mismatchSetIsDocumentationOnly": sorted(current_changed) == sorted(expected_inventory_docs),
        "contextArchiveInputs": len(archive_inputs),
        "contextualDocChangesSinceArchive": archive_changed,
        "contextMissing": archive_missing,
        "knownContextDocChangeSet": sorted(archive_changed) == sorted(allowed_context_doc_changes),
        "overallCurrentRepositoryInventoryMatch": False,
        "claimWholeCurrentInventoryMatch": False,
        "supplementalOrOutsideSnapshot": [
            path for path in ("paper.md", "research.ipynb", "implementation/2026-10-22-bound-scalar-execution/results.md",
                              "implementation/2026-10-22-bound-scalar-execution/evidence/timing-summary.json",
                              "implementation/2026-10-22-bound-scalar-execution/verification/browser-launch-recovery.json")
            if path not in archive_paths
        ],
    }
    checks["currentVersusGateInventory"] = inventory_current
    if missing or archive_missing or not inventory_current["mismatchSetIsDocumentationOnly"] or not inventory_current["knownContextDocChangeSet"]:
        errors.append("current-vs-gate inventory contains unexpected non-document drift or missing files")

    # Exact copied consumer basis, intentional tool changes, and generated wrapper restoration.
    initial_copy = read_json(UNIT / "initial-copy.json")["entries"]
    copied_changed = []
    for item in initial_copy:
        path = ROOT / item["copy"]
        if not path.is_file() or sha_file(path) != item["sha256"]:
            copied_changed.append(item["copy"])
    tool_changes = sorted(path for path in copied_changed if path.endswith(("/prepare.mjs", "/verify.mjs")))
    non_tool_changes = sorted(set(copied_changed) - set(tool_changes))
    wrappers = read_json(UNIT / "evidence/generated-followons/receipt.json")["entries"]
    wrapper_checks = []
    for item in wrappers:
        archived = UNIT / "evidence/generated-followons" / pathlib.Path(item["archive"]).name
        current = ROOT / item["path"]
        head = git_blob(item["path"])
        wrapper_checks.append({
            "path": item["path"],
            "archiveGeneratedHashMatches": sha_file(archived) == item["generatedSha256"],
            "currentRestoredHashMatchesHead": sha_file(current) == item["restoredHeadSha256"] == sha_bytes(head),
        })
    checks["consumerAndWrapperPreservation"] = {
        "initialCopyEntryCount": len(initial_copy),
        "intentionalToolDifferences": tool_changes,
        "otherConsumerSourcePackageOrWorkloadDifferences": non_tool_changes,
        "buildScriptUnchanged": not any(item.endswith("/build.mjs") for item in copied_changed),
        "allOtherCopiedInputsUnchanged": not non_tool_changes,
        "generatedTrackedWrappersArchivedAndRestored": len(wrappers) == 4 and
            all(item["archiveGeneratedHashMatches"] and item["currentRestoredHashMatchesHead"] for item in wrapper_checks),
        "wrapperCount": len(wrappers),
    }
    if len(initial_copy) != 31 or non_tool_changes or not all(path.endswith(("/prepare.mjs", "/verify.mjs")) for path in tool_changes):
        errors.append("consumer copy changed beyond preparation/proof tools")
    if not checks["consumerAndWrapperPreservation"]["generatedTrackedWrappersArchivedAndRestored"]:
        errors.append("generated wrapper archive/restoration receipt did not verify")

    # Notebook prefix preservation and documentation claims / explicit limitations.
    notebook_current = json.loads((ROOT / "research.ipynb").read_text(encoding="utf-8"))
    notebook_head = json.loads(git_blob("research.ipynb"))
    prefix_unchanged = notebook_current["cells"][:len(notebook_head["cells"])] == notebook_head["cells"]
    new_cells = notebook_current["cells"][len(notebook_head["cells"]):]
    section_documents = [
        "README.md", "RESEARCH-GUIDE.md", "HANDOFF-PROMPT.txt", "final-master-plan.md",
        "implementation-checkpoint.md", "docs/native-authoring-reference.md", "paper.md",
    ]
    numeric_summary_docs = {"README.md", "RESEARCH-GUIDE.md", "paper.md"}
    docs_checked = {}
    for rel in section_documents:
        path = ROOT / rel
        text = path.read_text(encoding="utf-8")
        docs_checked[rel] = {
            "hasBoundScalarSection": "bound scalar" in text.lower(),
            "hasNegativeParityDisposition": "realtime parity" in text.lower() and "fail" in text.lower(),
            "containsNativeReactResult": "7.35/8.10" in "".join(text.split()) and "0.80/0.90" in "".join(text.split()),
            "numericSummaryExpected": rel in numeric_summary_docs,
        }
    results_text = (UNIT / "results.md").read_text(encoding="utf-8")
    source_review_text = (UNIT / "source-review.md").read_text(encoding="utf-8")
    normalized_results = "".join(results_text.split())
    doc_claims = {
        "resultsHasCorrectFinalDisposition": "CorrectnessPASS;bound/compileddeliveryPASS;realtimeparityFAIL.".lower() in normalized_results.lower(),
        "resultsIncludesV1ToV4History": all(f"Darwin-v{i}" in results_text for i in range(1, 5)),
        "resultsIncludesCorrectedV3Assertion": "reused-inputcounter" in normalized_results.lower() and "notthelatercold-rowassertion" in normalized_results.lower(),
        "resultsIncludesOpenLimits": all(term in normalized_results.lower() for term in ("causalcomparison", "presentation", "cold/setup/retained", "independent-device")),
        "sourceReviewCorrectsV3Assertion": "actual failed line102 was `store.bound-input.reused-rows >= 1`" in source_review_text,
        "sourceReviewStatesParityFail": "parity FAIL" in source_review_text,
    }
    doc_claims["numericSummaryDocsMatchRawMedian"] = all(
        item["containsNativeReactResult"] for item in docs_checked.values() if item["numericSummaryExpected"])
    checks["documentationAndNotebook"] = {
        "checkedDocuments": docs_checked,
        "resultsAndReviewClaims": doc_claims,
        "notebook": {
            "headCellCount": len(notebook_head["cells"]),
            "currentCellCount": len(notebook_current["cells"]),
            "oldPrefixUnchanged": prefix_unchanged,
            "newCellCount": len(new_cells),
            "newCellHasFinalGateAndParity": bool(new_cells) and all(
                phrase in "".join(new_cells[0].get("source", [])).lower()
                for phrase in ("darwin-v4", "1223", "7.35/8.10", "parity fail")),
        },
        "remainingQualificationGaps": [
            "full-plan HMR delivery", "broader structural/reveal behavior", "cold/setup/retained-memory qualification",
            "independent-device qualification", "human maintenance evidence",
        ],
        "inventoryCaveat": "Documentation, paper, notebook and post-gate recovery/proof artifacts are supplemental; current whole-repository inventory is not claimed to match the gate snapshot.",
    }
    if not prefix_unchanged or len(notebook_head["cells"]) != 245 or len(notebook_current["cells"]) != 246 or not checks["documentationAndNotebook"]["notebook"]["newCellHasFinalGateAndParity"]:
        errors.append("research notebook append/prefix preservation mismatch")
    if not all(doc_claims.values()):
        errors.append("results, source review, paper or maintained guide claims do not align")

    return {
        "schemaVersion": 1,
        "unit": "2026-10-22-bound-scalar-execution",
        "status": "FAIL" if errors else "PASS",
        "disposition": {"correctness": "PASS", "boundAndCompiledDelivery": "PASS", "realtimeParity": "FAIL"},
        "auditScope": "Static evidence audit only; no workload, test, build, browser, gate or timing rerun.",
        "checks": checks,
        "findings": errors,
    }


def main():
    result = audit()
    detailed_path = VERIFY / "final-audit.json"
    detailed_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    summary = {
        "schemaVersion": result["schemaVersion"],
        "unit": result["unit"],
        "status": result["status"],
        "disposition": result["disposition"],
        "gateHistory": {
            name: {"status": record["status"], "phaseCounts": record["phaseCounts"],
                  "runtime": record["deno"]["testSummary"],
                  "rust": record["rustTests"],
                  "compiledFixtures": record["compiledFixtureStatusCounts"]}
            for name, record in result["checks"]["gates"].items()
        },
        "untimedProof": {
            "status": result["checks"]["proof"]["proofV2"]["status"],
            "contexts": result["checks"]["proof"]["proofV2"]["contexts"],
            "verifiedWarmRowsAfterFirstFrame": result["checks"]["proof"]["proofV2"]["all257RowsVerifiedAndWarmAfterFirstFrame"],
            "sourceChecks": result["checks"]["proof"]["proofV2"]["sourceAfter"],
        },
        "timing": {
            "status": result["checks"]["timing"]["status"],
            "recordSha256": result["checks"]["timing"]["timingRecordSha256"],
            "metricsMs": result["checks"]["timing"]["metricsMs"],
            "nativeReactParity": result["checks"]["timing"]["nativeReactParity"],
        },
        "currentInventoryCaveat": {
            "gateV4InputMismatches": result["checks"]["currentVersusGateInventory"]["currentMismatches"],
            "contextArchiveDocChanges": result["checks"]["currentVersusGateInventory"]["contextualDocChangesSinceArchive"],
            "wholeCurrentRepositoryMatchClaimed": False,
        },
        "findings": result["findings"],
    }
    (VERIFY / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": result["status"], "findings": result["findings"],
                      "summary": str(VERIFY / "summary.json")}, indent=2))
    return 0 if result["status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
