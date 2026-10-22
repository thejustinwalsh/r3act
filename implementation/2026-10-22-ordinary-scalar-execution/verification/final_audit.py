#!/usr/bin/env python3
"""Read-only audit of the ordinary-scalar-execution evidence bundle."""

from __future__ import annotations

import hashlib
import json
import math
import re
from collections import Counter
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
UNIT = ROOT / "implementation/2026-10-22-ordinary-scalar-execution"
VERIFICATION = UNIT / "verification"
PROOF = UNIT / "proof-canvas-v1"
checks: list[dict[str, Any]] = []


def read_json(path: Path) -> Any:
    return json.loads(path.read_text())


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check(name: str, ok: bool, details: Any = None) -> None:
    checks.append({"name": name, "status": "PASS" if ok else "FAIL", "details": details})


def supervisor(name: str) -> dict[str, Any]:
    return read_json(VERIFICATION / f"{name}-supervisor.json")


def manifest_map(path: Path) -> dict[str, str]:
    return {item["path"]: item["sha256"] for item in read_json(path)["inputs"]}


def median(values: list[float]) -> float:
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2


def nearest_rank_p95(values: list[float]) -> float:
    ordered = sorted(values)
    return ordered[math.ceil(0.95 * len(ordered)) - 1]


def match_count(rows: list[dict[str, Any]]) -> tuple[int, int]:
    return sum(row.get("matches") is True for row in rows), len(rows)


def source_hash_status(before: Path, after: Path) -> dict[str, Any]:
    before_rows = read_json(before)["inputs"]
    after_rows = read_json(after)["inputs"]
    a = {row["path"]: row["sha256"] for row in before_rows}
    b = {row["path"]: row["sha256"] for row in after_rows}
    return {
        "beforeCount": len(a),
        "afterCount": len(b),
        "samePaths": set(a) == set(b),
        "matchingHashes": sum(a.get(path) == digest for path, digest in b.items()),
        "added": sorted(set(b) - set(a)),
        "removed": sorted(set(a) - set(b)),
        "changed": sorted(path for path in set(a) & set(b) if a[path] != b[path]),
    }


# Preserve both failed attempts and the successful corrective gate.
v1 = supervisor("darwin-v1")
v1_out = (VERIFICATION / "darwin-v1-supervisor.stdout.log").read_text()
v1_err = (VERIFICATION / "darwin-v1-supervisor.stderr.log").read_text()
check("darwin-v1-preserved-launcher-failure", v1["exitCode"] == 1 and
      "Expected --name value pairs" in v1_err and not v1_out and
      v1["command"][-1] == ".", {"exitCode": v1["exitCode"], "wallSeconds": v1["wallSeconds"],
                                  "failure": "trailing positional dot; verifier argument parser rejected it"})

v2 = supervisor("darwin-v2")
v2_receipt = read_json(VERIFICATION / "darwin-v2/receipt.json")
v2_failures = {step["name"]: step for step in v2_receipt["steps"] if step["status"] == "FAIL"}
v2_source_audit = v2_receipt["sourceAudit"]
v2_archive = read_json(VERIFICATION / "darwin-v2/source-archive.json")
v2_before = read_json(VERIFICATION / "darwin-v2/source-before.json")
v2_after = read_json(VERIFICATION / "darwin-v2/source-after.json")
v2_archive_runner = {item["path"]: item["sha256"] for item in v2_archive["inputs"]
                     if item.get("kind") == "runner-input"}
v2_before_map = {item["path"]: item["sha256"] for item in v2_before["inputs"]}
v2_exact_archive_matches = sum(v2_archive_runner.get(path) == digest
                               for path, digest in v2_before_map.items())
v2_added_after = sorted(set(item["path"] for item in v2_after["inputs"]) - set(v2_before_map))
v2_compiled_failure_text = {
    name: (VERIFICATION / "darwin-v2" / step["log"]).read_text()
    for name, step in v2_failures.items() if name.startswith("compiled-")
}
check("darwin-v2-preserved-failure", v2["exitCode"] == 1 and
      set(v2_failures) == {"deno-full", "compiled-02", "compiled-03", "compiled-09"} and
      "src/vdom_store_prop_cut_test.ts:56:80" in
      (VERIFICATION / "darwin-v2/logs/deno-full.log").read_text() and
      v2_source_audit["status"] == "MISMATCH" and
      v2_source_audit["changed"] == ["implementation/2026-10-22-astra-gap-followup/source-lock.json"],
      {"exitCode": v2["exitCode"], "failedPhases": sorted(v2_failures),
       "denoSyntaxFailure": "src/vdom_store_prop_cut_test.ts:56:80",
       "compiledFailures": v2_compiled_failure_text,
       "sourceAudit": v2_source_audit, "archiveRunnerInputs": len(v2_archive_runner),
       "beforeInputs": len(v2_before_map), "afterInputs": len(v2_after["inputs"]),
       "archiveMatchesBefore": v2_exact_archive_matches, "addedAfter": v2_added_after})

v3 = supervisor("darwin-v3")
v3_dir = VERIFICATION / "darwin-v3"
v3_receipt = read_json(v3_dir / "receipt.json")
v3_steps = v3_receipt["steps"]
v3_counts = Counter(step["status"] for step in v3_steps)
deno_log = (v3_dir / "logs/deno-full.log").read_text()
rust_log = (v3_dir / "logs/cargo-test.log").read_text()
deno_match = re.search(r"ok \| (\d+) passed \| (\d+) failed", deno_log)
rust_match = re.search(r"test result: ok\. (\d+) passed; 0 failed", rust_log)
compiled_steps = [step for step in v3_steps if re.fullmatch(r"compiled-\d+", step["name"])]
v3_source = v3_receipt["source"]
v3_source_audit = v3_receipt["sourceAudit"]
v3_archive = read_json(v3_dir / "source-archive.json")
v3_before_map = manifest_map(v3_dir / "source-before.json")
v3_after_map = manifest_map(v3_dir / "source-after.json")
v3_archive_runner = {item["path"]: item["sha256"] for item in v3_archive["inputs"]
                     if item.get("kind") == "runner-input"}
v3_context = [item for item in v3_archive["inputs"] if item.get("kind") == "context"]
v3_archive_matches = sum(v3_archive_runner.get(path) == digest for path, digest in v3_before_map.items())
v3_manifest_equal = v3_before_map == v3_after_map
v3_summ = {
    "supervisorExit": v3["exitCode"],
    "phaseCount": len(v3_steps),
    "phaseStatuses": dict(v3_counts),
    "deno": {"passed": int(deno_match.group(1)), "failed": int(deno_match.group(2))} if deno_match else None,
    "rustPassed": int(rust_match.group(1)) if rust_match else None,
    "compiledFixtures": {"count": len(compiled_steps), "passed": sum(s["status"] == "PASS" for s in compiled_steps)},
    "runnerInputs": v3_source["rawArchive"]["runnerInputs"],
    "contextInputs": v3_source["rawArchive"]["contextInputs"],
    "archiveEntryCount": len(v3_archive["inputs"]),
    "archiveRunnerMatchesBefore": v3_archive_matches,
    "beforeAfterSame": v3_manifest_equal,
    "sourceAudit": v3_source_audit,
    "manifestHashes": {name: sha(v3_dir / name) for name in
                       ("source-before.json", "source-after.json", "source-archive.json")},
}
check("darwin-v3-consolidated-gate", v3["exitCode"] == 0 and len(v3_steps) == 73 and
      v3_counts == Counter({"PASS": 73}) and deno_match and deno_match.groups() == ("1176", "0") and
      rust_match and rust_match.group(1) == "101" and len(compiled_steps) == 53 and
      all(step["status"] == "PASS" for step in compiled_steps) and
      v3_source["rawArchive"]["runnerInputs"] == 1784 and len(v3_context) == 10 and
      len(v3_archive["inputs"]) == 1794 and v3_archive_matches == 1784 and v3_manifest_equal and
      v3_source_audit == {"changed": [], "status": "MATCH"}, v3_summ)

# Installed preparation/build, untimed semantic proof and the single timing run.
installed = supervisor("installed-v1")
proof_gate = supervisor("proof-v1")
timing_gate = supervisor("timing-v1")
lock_path = PROOF / "input-lock.json"
build_path = PROOF / "build-proof.json"
proof_path = PROOF / "canvas-proof-one-shot.json"
timing_path = PROOF / "canvas-timing-one-shot.json"
auth_path = PROOF / "canvas-timing-authorization.json"
lock = read_json(lock_path)
build = read_json(build_path)
proof = read_json(proof_path)
timing = read_json(timing_path)
auth = read_json(auth_path)
hashes = {"inputLock": sha(lock_path), "buildProof": sha(build_path),
          "untimedProof": sha(proof_path), "authorization": sha(auth_path), "timing": sha(timing_path)}
check("installed-preparation-and-build", installed["exitCode"] == 0 and
      lock["status"] == "PASS_R3F_FRAME_BASELINES_CANVAS_PREPARATION" and
      build["status"] == "PASS_R3F_FRAME_BASELINES_CANVAS_BUILD" and
      build["inputLockSha256"] == hashes["inputLock"],
      {"preparationExit": installed["exitCode"], "lockStatus": lock["status"],
       "buildStatus": build["status"], "inputs": len(lock["inputs"]),
       "staged": len(lock["staged"]), "packageSources": len(lock["packageSources"]),
       "rendererSourceBasis": len(lock["rendererSourceBasis"]), "tarballs": len(lock["tarballs"]),
       "compiler": build["compiler"], "hashes": hashes})

compiler_events = proof["frameCompilerOutcome"].get("compilerEvents", [])
expected_functions = {"Position", "Rotation", "FrameMarker", "RenderTakeover", "App"}
transform_artifacts = [item for rows in build["transforms"].values() for item in rows]
asset_artifacts = [item for rows in build["assets"].values() for item in rows]
transform_hashes_match = all(Path(item["path"]).is_file() and sha(Path(item["path"])) == item["sha256"]
                             for item in transform_artifacts)
asset_hashes_match = all(Path(item["path"]).is_file() and sha(Path(item["path"])) == item["sha256"]
                         for item in asset_artifacts)
compiler_artifact = build["compiler"]
compiler_hashes_match = Path(compiler_artifact["path"]).is_file() and \
    sha(Path(compiler_artifact["path"])) == compiler_artifact["sha256"] and \
    sha(Path(compiler_artifact["archivePath"])) == compiler_artifact["sha256"]
source_checks_before = match_count(proof["sourceBefore"])
source_checks_after = match_count(proof["sourceAfter"])
arm_modes = [arm["mode"] for arm in proof["arms"]]
proof_checks: list[dict[str, Any]] = []
native = next(arm for arm in proof["arms"] if arm["mode"] == "native")
for sample in [*native["result"]["warmupSamples"], *native["result"]["samples"]]:
    epoch = sample["epoch"]
    counters = sample.get("counters") or {}
    proof_checks.append({
        "epoch": epoch,
        "rows": counters.get("store.owned-data.rows") == 257 * epoch,
        "batches": counters.get("store.owned-data.batches") == epoch,
        "immediateCore": counters.get("publication.immediate.runs") == epoch,
        "noDeferredAdapter": counters.get("publication.deferred-adapters", 0) == 0,
        "noNumericKernel": counters.get("store.numeric-kernel.rows", 0) == 0 and
                            counters.get("store.numeric-kernel.runs", 0) == 0,
    })
measured_outputs = [
    [tuple(sample.get(key) for key in ("epoch", "checksum", "pixelChecksum", "litPixels"))
     for sample in arm["result"]["samples"]]
    for arm in proof["arms"]
]
proof_arms = []
for arm in proof["arms"]:
    result = arm["result"]
    teardown = result["teardown"]
    proof_arms.append({"mode": arm["mode"], "contextClosed": arm["contextClosed"],
                       "warmup": result["warmup"], "measured": result["measured"],
                       "retainedAllMeasuredSamples": all(s.get("retained") is True and s.get("count") == 256
                                                          for s in result["samples"]),
                       "resourcesExpected": teardown["resourcesExpected"],
                       "resourcesDisposed": teardown["resourcesDisposed"],
                       "duplicateDisposals": teardown["duplicateDisposalEvents"],
                       "cleanup": teardown["cleanup"]})
proof_semantics = {
    "status": proof["status"], "armOrder": arm_modes,
    "actualReactCompilerEvents": [(e.get("fnName"), e.get("kind")) for e in compiler_events],
    "sourceBeforeMatches": source_checks_before, "sourceAfterMatches": source_checks_after,
    "nativeEpochs": len(proof_checks),
    "nativeRowsBatchesImmediateAdaptersKernelsAllCorrect": all(
        all(item.values()) for item in proof_checks),
    "nativeLastCounters": native["result"]["teardown"]["cleanup"].get("counters"),
    "allFourMeasuredOutputSequencesEqual": all(out == measured_outputs[0] for out in measured_outputs[1:]),
    "arms": proof_arms,
    "errors": {key: len(proof.get(key, [])) for key in
                ("blockedRequests", "requestFailures", "pageErrors", "consoleErrors", "errors", "cleanupErrors")},
    "browserClosed": proof["browserClosed"],
    "nativeCleanupComplete": native["result"]["teardown"]["cleanup"].get("sceneChildren") == 0 and
        native["result"]["teardown"]["cleanup"].get("registeredSetters") == 0 and
        native["result"]["teardown"]["cleanup"].get("ownerCount") == 0 and
        native["result"]["teardown"]["cleanup"].get("pending") == 0,
    "frameCleanupComplete": next(arm["result"]["teardown"]["cleanup"] for arm in proof["arms"]
                                  if arm["mode"] == "react-frame").get("registeredFrameCallbacks") == 0 and
        next(arm["result"]["teardown"]["cleanup"] for arm in proof["arms"]
             if arm["mode"] == "react-frame").get("rootStopped") is True,
}
check("installed-untimed-four-arm-proof", proof_gate["exitCode"] == 0 and
      proof["status"] == "PASS_R3F_FRAME_BASELINES_CANVAS_UNTIMED_PROOF" and
      arm_modes == ["native", "react", "react-frame", "imperative"] and
      proof["frameCompilerOutcome"]["status"] == "PASS" and
      {e.get("fnName") for e in compiler_events if e.get("kind") == "CompileSuccess"} == expected_functions and
      source_checks_before == (12378, 12378) and source_checks_after == (12378, 12378) and
      proof_semantics["nativeEpochs"] == 72 and proof_semantics["nativeRowsBatchesImmediateAdaptersKernelsAllCorrect"] and
      proof_semantics["allFourMeasuredOutputSequencesEqual"] and
      proof_semantics["nativeCleanupComplete"] and proof_semantics["frameCleanupComplete"] and
      all(arm["contextClosed"] and arm["retainedAllMeasuredSamples"] and arm["resourcesExpected"] == 512 and
          arm["resourcesDisposed"] == 512 and arm["duplicateDisposals"] == 0 for arm in proof_arms) and
      proof_semantics["browserClosed"] and all(v == 0 for v in proof_semantics["errors"].values()),
      proof_semantics)

check("installed-transform-and-compiler-bytes", len(transform_artifacts) == 8 and
      len(asset_artifacts) >= 4 and transform_hashes_match and asset_hashes_match and compiler_hashes_match and
      proof["buildProofSha256"] == hashes["buildProof"] and proof["inputLockSha256"] == hashes["inputLock"],
      {"transformCount": len(transform_artifacts), "assetCount": len(asset_artifacts),
       "transformHashesMatch": transform_hashes_match, "assetHashesMatch": asset_hashes_match,
       "compilerHashesMatch": compiler_hashes_match,
       "proofBuildHashMatches": proof.get("buildProofSha256") == hashes["buildProof"],
       "proofLockHashMatches": proof.get("inputLockSha256") == hashes["inputLock"]})

auth_expected = {
    "buildProofSha256": hashes["buildProof"],
    "inputLockSha256": hashes["inputLock"],
    "proofSha256": hashes["untimedProof"],
}
timing_summary: dict[str, Any] = {
    "status": timing["status"], "phase": timing["phase"], "order": timing["order"],
    "warmup": 12, "measuredPerArm": 60,
    "rawSha256": hashes["timing"], "authorizationSha256": hashes["authorization"],
    "authorization": auth,
    "buildProofSha256": timing.get("buildProofSha256"),
    "inputLockSha256": timing.get("inputLockSha256"),
    "priorProofSha256": timing.get("priorProofSha256"),
    "recordAuthorizationSha256": timing.get("authorizationSha256"),
    "sourceBeforeMatches": match_count(timing["sourceBefore"]),
    "sourceAfterMatches": match_count(timing["sourceAfter"]),
    "arms": [],
    "errors": {key: len(timing.get(key, [])) for key in
                ("blockedRequests", "requestFailures", "pageErrors", "consoleErrors", "errors", "cleanupErrors")},
    "browserClosed": timing["browserClosed"],
}
for arm in timing["arms"]:
    result = arm["result"]
    metrics: dict[str, Any] = {}
    for field, label in (("publishMs", "updatePublish"), ("updateThroughDrawMs", "throughDraw"),
                         ("stateAgeMs", "stateAge"), ("callbackMs", "callback"),
                         ("rafIntervalMs", "rafInterval")):
        values = [sample[field] for sample in result["samples"] if isinstance(sample.get(field), (int, float))]
        metrics[label] = {"n": len(values), "medianMs": median(values),
                          "nearestRankP95Ms": nearest_rank_p95(values)} if values else {"n": 0}
    timing_summary["arms"].append({"mode": arm["mode"], "contextClosed": arm["contextClosed"],
                                   "warmup": result["warmup"], "measured": result["measured"],
                                   "allMeasuredCountersNull": all(s.get("counters") is None for s in result["samples"]),
                                   "metrics": metrics,
                                   "resourcesExpected": result["teardown"]["resourcesExpected"],
                                   "resourcesDisposed": result["teardown"]["resourcesDisposed"],
                                   "duplicateDisposals": result["teardown"]["duplicateDisposalEvents"],
                                   "cleanup": result["teardown"]["cleanup"]})
timing_inputs_equal = timing.get("buildProofSha256") == hashes["buildProof"] and \
    timing.get("inputLockSha256") == hashes["inputLock"] and \
    timing.get("priorProofSha256") == hashes["untimedProof"]
auth_match = auth.get("status") == "APPROVED_FOR_ONE_R3F_FRAME_BASELINES_CANVAS_TIMING_COMPARISON" and \
    auth.get("buildProofSha256") == hashes["buildProof"] and \
    auth.get("inputLockSha256") == hashes["inputLock"] and \
    auth.get("proofSha256") == hashes["untimedProof"]
check("single-authorized-timing-phase", timing_gate["exitCode"] == 0 and
      timing["status"] == "PASS_R3F_FRAME_BASELINES_CANVAS_DESCRIPTIVE_TIMING" and
      auth_match and timing_inputs_equal and timing["order"] == ["native", "react", "react-frame", "imperative"] and
      timing.get("authorizationSha256") == hashes["authorization"] and
      all(arm["warmup"] == 12 and arm["measured"] == 60 and arm["allMeasuredCountersNull"] and
          arm["contextClosed"] and arm["resourcesExpected"] == 512 and arm["resourcesDisposed"] == 512 and
          arm["duplicateDisposals"] == 0 for arm in timing_summary["arms"]) and
      timing_summary["sourceBeforeMatches"] == (12378, 12378) and
      timing_summary["sourceAfterMatches"] == (12378, 12378) and timing_summary["browserClosed"] and
      all(v == 0 for v in timing_summary["errors"].values()), timing_summary)

# The fixed initial-copy manifest permits the installed preparation and proof driver to evolve;
# all authored arm, scene, HTML, and package inputs must retain their original bytes.
initial_copy = read_json(UNIT / "initial-copy.json")
allowed_initial_copy_changes = {
    "implementation/2026-10-22-ordinary-scalar-execution/consumer/prepare.mjs",
    "implementation/2026-10-22-ordinary-scalar-execution/consumer/verify.mjs",
}
initial_results = []
for item in initial_copy["entries"]:
    current = ROOT / item["copy"]
    current_hash = sha(current)
    initial_results.append({"copy": item["copy"], "expected": item["sha256"],
                            "actual": current_hash,
                            "allowedChange": item["copy"] in allowed_initial_copy_changes,
                            "matches": current_hash == item["sha256"]})
unchanged_initial = [row for row in initial_results if not row["allowedChange"]]
allowed_changed_initial = [row["copy"] for row in initial_results if row["allowedChange"] and not row["matches"]]
check("initial-copy-workload-preserved", len(initial_results) == 31 and
      all(row["matches"] for row in unchanged_initial) and
      all(row["allowedChange"] for row in initial_results if not row["matches"]),
      {"entries": len(initial_results), "unchangedEntries": sum(row["matches"] for row in unchanged_initial),
       "allowedChanges": allowed_changed_initial, "allowedChangePaths": sorted(allowed_initial_copy_changes)})

# Verify all fourteen fresh four-arm consumer files against both the lock and archived bytes.
consumer_lock_rows = [row for row in lock["inputs"] if "/consumer/" in row["path"]]
consumer_rows = []
for row in consumer_lock_rows:
    source = Path(row["path"])
    archived = Path(row["archivePath"])
    source_hash = sha(source)
    archive_hash = sha(archived)
    consumer_rows.append({"path": str(source), "archivePath": str(archived),
                          "locked": row["sha256"], "source": source_hash, "archive": archive_hash,
                          "matches": source_hash == row["sha256"] == archive_hash})
check("four-arm-consumer-inputs-locked", len(consumer_lock_rows) == 14 and
      all(row["matches"] for row in consumer_rows),
      {"count": len(consumer_rows), "matches": sum(row["matches"] for row in consumer_rows),
       "allowedInitialCopyUpdates": allowed_changed_initial, "rows": consumer_rows})

# Primary's closeout inventories the exact permitted post-gate source/document changes.
closeout = read_json(VERIFICATION / "primary-closeout.json")
allowed_closeout_changes = {
    "README.md", "final-master-plan.md", "implementation-checkpoint.md", "HANDOFF-PROMPT.txt",
    "RESEARCH-GUIDE.md", "implementation/2026-10-22-ordinary-scalar-execution/source-review.md",
}
allowed_closeout_additions = {
    "implementation/2026-10-22-ordinary-scalar-execution/results.md",
    "implementation/2026-10-22-ordinary-scalar-execution/summary.json",
}
closeout_changed = {row["path"] for row in closeout["changed"]}
closeout_added = {row["path"] for row in closeout["added"]}
check("primary-closeout-source-inventory", closeout["status"] == "PASS_PRIMARY_CLOSEOUT_SOURCE_AUDIT" and
      closeout["archiveCounts"]["total"] == 1794 and closeout["archiveCounts"]["runner"] == 1784 and
      closeout["archiveCounts"]["context"] == 10 and closeout["archiveCounts"]["currentInputAndContext"] == 1795 and
      closeout["missing"] == [] and closeout_changed == allowed_closeout_changes and
      closeout_added <= allowed_closeout_additions,
      {"archiveCounts": closeout["archiveCounts"], "changed": sorted(closeout_changed),
       "added": sorted(closeout_added), "missing": closeout["missing"],
       "maintainedDocuments": closeout["maintainedDocuments"],
       "notebookCells": closeout["notebookCells"], "notebookLastCellId": closeout["notebookLastCellId"]})

# Cross-check closeout's selected inputs and context against the full v3 archive.
v3_archive_map = {item["path"]: item["sha256"] for item in v3_archive["inputs"]}
current_drift = []
for rel, expected in v3_archive_map.items():
    path = ROOT / rel
    if not path.is_file():
        current_drift.append({"path": rel, "kind": "missing"})
    elif sha(path) != expected:
        current_drift.append({"path": rel, "kind": "markdown" if path.suffix.lower() == ".md" else "non-markdown",
                              "expected": expected, "actual": sha(path)})
current_drift_paths = {row["path"] for row in current_drift}
check("post-gate-native-source-drift", current_drift_paths == closeout_changed,
      {"drift": current_drift, "expectedChanges": sorted(closeout_changed)})

# The primary archived generated cache follow-ons and restored tracked bytes before this audit.
generated_receipt_path = UNIT / "evidence/generated-followons/receipt.json"
generated_rows = read_json(generated_receipt_path)
generated_audit = []
for row in generated_rows:
    archived = ROOT / row["archivedPath"]
    restored = ROOT / row["path"]
    archived_hash = sha(archived)
    restored_hash = sha(restored)
    generated_audit.append({"path": row["path"], "archivedPath": row["archivedPath"],
                            "generatedExpected": row["generatedSha256"], "generatedActual": archived_hash,
                            "restoredHeadExpected": row["restoredHeadSha256"], "restoredActual": restored_hash,
                            "archiveMatches": archived_hash == row["generatedSha256"],
                            "restoredMatchesHead": restored_hash == row["restoredHeadSha256"],
                            "bytes": archived.stat().st_size})
check("generated-cache-followons-preserved-and-restored", len(generated_audit) == 4 and
      all(row["archiveMatches"] and row["restoredMatchesHead"] for row in generated_audit),
      {"count": len(generated_audit), "totalArchivedBytes": sum(row["bytes"] for row in generated_audit),
       "files": generated_audit})

failures = [item for item in checks if item["status"] != "PASS"]
audit = {
    "schemaVersion": 1,
    "status": "PASS" if not failures else "FAIL",
    "scope": "read-only evidence audit; no tests, builds, browser runs, or timing runs",
    "checks": checks,
    "timingSummary": timing_summary,
    "gateSummary": {"darwinV1": {"exitCode": v1["exitCode"], "failure": "launcher argv had trailing positional dot"},
                    "darwinV2": v2_failures.keys() and v2_receipt["status"],
                    "darwinV3": v3_summ},
    "hashes": hashes,
    "generatedFollowons": generated_audit,
    "postGateSourceDrift": current_drift,
    "primaryCloseout": closeout,
    "failures": failures,
}
summary = {
    "status": audit["status"],
    "failedAuditChecks": [item["name"] for item in failures],
    "nativeCorrectness": {"phases": 73, "passed": 73, "deno": 1176, "rust": 101, "compiled": 53,
                          "runnerInputs": 1784, "contextInputs": 10, "archiveEntries": 1794},
    "installedProof": {"status": proof["status"], "sourceBefore": source_checks_before,
                        "sourceAfter": source_checks_after, "arms": len(proof["arms"])},
    "timing": {"status": timing["status"], "rawSha256": hashes["timing"],
               "warmup": 12, "measuredPerArm": 60, "order": timing["order"],
               "arms": [{"mode": arm["mode"], "metrics": arm["metrics"]} for arm in timing_summary["arms"]]},
    "generatedCacheArchive": {"files": len(generated_audit),
                              "bytes": sum(row["bytes"] for row in generated_audit),
                              "allArchiveAndRestoreChecksPass": all(row["archiveMatches"] and row["restoredMatchesHead"]
                                                                     for row in generated_audit)},
    "postGateDocumentDrift": sorted(current_drift_paths),
}
(VERIFICATION / "final-audit.json").write_text(json.dumps(audit, indent=2) + "\n")
(VERIFICATION / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))
