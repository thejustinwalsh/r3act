#!/usr/bin/env python3
"""Read-only final evidence audit for the enclosed scalar pipeline."""

import hashlib
import json
import math
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
UNIT = ROOT / "implementation/2026-10-22-owned-scalar-pipeline"
VERIFY = UNIT / "verification"
PROOF = UNIT / "proof-canvas-v1"
EXPECTED_POST_GATE_DOCS = {
    "README.md",
    "HANDOFF-PROMPT.txt",
    "RESEARCH-GUIDE.md",
    "final-master-plan.md",
    "implementation-checkpoint.md",
    "implementation/2026-10-22-owned-scalar-pipeline/source-review.md",
}
MODES = ["native", "react", "react-frame", "imperative"]
METRICS = ["publishMs", "updateThroughDrawMs", "stateAgeMs", "callbackMs", "rafIntervalMs"]


def sha_bytes(data):
    return hashlib.sha256(data).hexdigest()


def sha_file(path):
    return sha_bytes(Path(path).read_bytes())


def read_json(path):
    return json.loads(Path(path).read_text())


def check(name, condition, detail=None):
    return {"name": name, "status": "PASS" if condition else "FAIL", "detail": detail}


def git_head_bytes(path):
    return subprocess.check_output(["git", "show", f"HEAD:{path}"], cwd=ROOT)


def median_p95(values):
    ordered = sorted(values)
    if not ordered:
        return {"count": 0, "median": None, "p95NearestRank": None}
    n = len(ordered)
    median = (ordered[n // 2 - 1] + ordered[n // 2]) / 2 if n % 2 == 0 else ordered[n // 2]
    return {"count": n, "median": median, "p95NearestRank": ordered[math.ceil(0.95 * n) - 1]}


def normalized(text):
    return re.sub(r"\s+", "", text)


checks = []
details = {}

# Preserve both corrected and failed consolidated attempts, without rerunning them.
v2_dir = VERIFY / "darwin-v2"
v2_receipt = read_json(v2_dir / "receipt.json")
v2_archive = read_json(v2_dir / "source-archive.json")
v2_archive_bytes = (v2_dir / "source-archive.json").read_bytes()
v2_archive_sha = sha_bytes(v2_archive_bytes)
steps = v2_receipt["steps"]
step_statuses = {}
for step in steps:
    step_statuses[step["status"]] = step_statuses.get(step["status"], 0) + 1
compiled_steps = [s for s in steps if re.fullmatch(r"compiled-\d+", s["name"])]
deno_log = (v2_dir / "logs/deno-full.log").read_text()
rust_log = (v2_dir / "logs/cargo-test.log").read_text()
deno_match = re.search(r"ok \|\s*(\d+) passed \|\s*(\d+) failed", deno_log)
rust_match = re.search(r"test result: ok\.\s*(\d+) passed;\s*(\d+) failed", rust_log)
runtime_tests = int(deno_match.group(1)) if deno_match else None
rust_tests = int(rust_match.group(1)) if rust_match else None
details["correctedGate"] = {
    "status": v2_receipt.get("status"),
    "phaseCount": len(steps),
    "phaseStatuses": step_statuses,
    "deno": {"passed": runtime_tests, "failed": int(deno_match.group(2)) if deno_match else None},
    "rust": {"passed": rust_tests, "failed": int(rust_match.group(2)) if rust_match else None},
    "compiledFixtureCount": len(compiled_steps),
    "allCompiledFixturesPass": all(s["status"] == "PASS" for s in compiled_steps),
    "sourceAuditAtGate": v2_receipt.get("sourceAudit"),
    "runnerInputs": v2_receipt.get("source", {}).get("inputCount"),
    "archivedRunnerAndContextFiles": len(v2_archive.get("inputs", [])),
    "runnerInputsInArchive": sum(x.get("kind") == "runner-input" for x in v2_archive.get("inputs", [])),
    "contextInputsInArchive": sum(x.get("kind") == "context" for x in v2_archive.get("inputs", [])),
    "sourceArchiveSha256": v2_archive_sha,
    "sourceArchiveManifestSha256Expected": "7721053784b9a62c7f64c0ea9f4b795cdec9efbef4c9a29d658301dc5f2f91e4",
    "sourceBeforeManifestSha256Expected": "43a8c1a5717745eb42d19774f5684ba95b3e036e3c57f30a9fb89fb6b12c1c8f",
}
checks.extend([
    check("darwin-v2-all-73-phases-pass", v2_receipt.get("status") == "PASS" and len(steps) == 73 and step_statuses == {"PASS": 73}, step_statuses),
    check("darwin-v2-1191-deno-tests", runtime_tests == 1191 and deno_match and deno_match.group(2) == "0", details["correctedGate"]["deno"]),
    check("darwin-v2-101-rust-tests", rust_tests == 101 and rust_match and rust_match.group(2) == "0", details["correctedGate"]["rust"]),
    check("darwin-v2-53-compiled-fixtures", len(compiled_steps) == 53 and details["correctedGate"]["allCompiledFixturesPass"], len(compiled_steps)),
    check("gate-time-source-audit-matched-1825-runner-inputs", v2_receipt.get("sourceAudit", {}).get("status") == "MATCH" and v2_receipt.get("source", {}).get("inputCount") == 1825 and len(v2_archive.get("inputs", [])) == 1835, details["correctedGate"]),
    check("corrected-v2-archive-manifest-hash", v2_archive_sha == details["correctedGate"]["sourceArchiveManifestSha256Expected"]),
])

v1 = read_json(VERIFY / "darwin-v1/receipt.json")
v1_failures = [s["name"] for s in v1.get("steps", []) if s["status"] == "FAIL"]
v1_log = (VERIFY / "darwin-v1/logs/deno-full.log").read_text()
details["preservedV1Failure"] = {
    "status": v1.get("status"),
    "failedPhases": v1_failures,
    "consumerStatus": next((s["status"] for s in v1.get("steps", []) if s["name"] == "package-consumer"), None),
    "containsFirstTypeFailure": "src/async_store_runtime.ts:221" in v1_log,
    "containsMalformedRequestTypeFailure": "src/closed_store_execution_test.ts:275" in v1_log,
    "artifactPath": "implementation/2026-10-22-owned-scalar-pipeline/verification/darwin-v1",
}
checks.append(check("darwin-v1-failure-preserved", v1.get("status") == "FAIL" and {"deno-full", "native-tooling", "package-build"}.issubset(v1_failures) and details["preservedV1Failure"]["consumerStatus"] == "SKIPPED_DEPENDENCY_FAILED" and details["preservedV1Failure"]["containsFirstTypeFailure"] and details["preservedV1Failure"]["containsMalformedRequestTypeFailure"], details["preservedV1Failure"]))

# A current checkout comparison is deliberately separate from the historical gate-time MATCH.
current_mismatches = []
archive_match_count = 0
runner_match_count = 0
context_match_count = 0
for item in v2_archive.get("inputs", []):
    source_path = ROOT / item["path"]
    archived_path = v2_dir / "source-before/files" / item["path"]
    current_hash = sha_file(source_path) if source_path.is_file() else None
    archive_hash = sha_file(archived_path) if archived_path.is_file() else None
    exact = current_hash == item["sha256"] and archive_hash == item["sha256"] and source_path.stat().st_size == item["bytes"]
    if exact:
        archive_match_count += 1
        if item.get("kind") == "runner-input":
            runner_match_count += 1
        else:
            context_match_count += 1
    else:
        current_mismatches.append({"path": item["path"], "kind": item.get("kind"), "gateSha256": item["sha256"], "currentSha256": current_hash, "archiveSha256": archive_hash})
actual_mismatch_paths = {x["path"] for x in current_mismatches}
details["currentVsDarwinV2Archive"] = {
    "comparisonTime": "after gate, installed proof, timing, results/review/docs updates and generated-cache preservation",
    "baselineEntries": len(v2_archive.get("inputs", [])),
    "exactCurrentMatches": archive_match_count,
    "runnerInputMatches": runner_match_count,
    "contextMatches": context_match_count,
    "intendedPostGateDocumentMismatches": current_mismatches,
    "expectedDocumentMismatchPaths": sorted(EXPECTED_POST_GATE_DOCS),
    "unexpectedMismatchPaths": sorted(actual_mismatch_paths - EXPECTED_POST_GATE_DOCS),
    "expectedButAbsentDocumentMismatchPaths": sorted(EXPECTED_POST_GATE_DOCS - actual_mismatch_paths),
    "postGateSupplementalFilesOutsideRunnerInventory": [
        {"path": rel, "presentInRunnerInventory": any(x.get("path") == rel for x in v2_archive.get("inputs", [])), "sha256": sha_file(ROOT / rel) if (ROOT / rel).is_file() else None}
        for rel in [
            "paper.md",
            "research.ipynb",
            "implementation/2026-10-22-owned-scalar-pipeline/results.md",
            "implementation/2026-10-22-owned-scalar-pipeline/evidence/generated-followons/receipt.json",
            "implementation/2026-10-22-owned-scalar-pipeline/evidence/generated-followons/namespace-three-authored.mjs",
            "implementation/2026-10-22-owned-scalar-pipeline/evidence/generated-followons/native-promise-store-race.mjs",
            "implementation/2026-10-22-owned-scalar-pipeline/evidence/generated-followons/native-queue-execution.mjs",
            "implementation/2026-10-22-owned-scalar-pipeline/evidence/generated-followons/native-task-transition.mjs",
        ]
    ],
    "claimBoundary": "The gate-time sourceAudit MATCH is historical. Current checkout has documented post-gate changes; this is not a whole-inventory MATCH claim.",
}
checks.append(check("only-intended-postgate-source-archive-differences", actual_mismatch_paths == EXPECTED_POST_GATE_DOCS and archive_match_count == 1829, details["currentVsDarwinV2Archive"]))

# Recheck every source and archived copy bound by the installed proof lock.
lock = read_json(PROOF / "input-lock.json")
source_lock_groups = ["inputs", "staged", "packageSources", "rendererSourceBasis", "tarballs", "installed"]
proof_lock_groups = {}
proof_lock_mismatches = []
for group in source_lock_groups:
    items = lock.get(group, [])
    exact_sources = 0
    exact_archives = 0
    for item in items:
        src = Path(item["path"])
        if src.is_file() and sha_file(src) == item["sha256"] and src.stat().st_size == item.get("bytes", src.stat().st_size):
            exact_sources += 1
        else:
            proof_lock_mismatches.append({"group": group, "path": item["path"], "side": "current", "expected": item["sha256"], "actual": sha_file(src) if src.is_file() else None})
        if item.get("archivePath"):
            archive_path = Path(item["archivePath"])
            if archive_path.is_file() and sha_file(archive_path) == item["sha256"] and archive_path.stat().st_size == item.get("bytes", archive_path.stat().st_size):
                exact_archives += 1
            else:
                proof_lock_mismatches.append({"group": group, "path": item["archivePath"], "side": "archive", "expected": item["sha256"], "actual": sha_file(archive_path) if archive_path.is_file() else None})
    proof_lock_groups[group] = {"count": len(items), "currentExact": exact_sources, "archiveExact": exact_archives if any(x.get("archivePath") for x in items) else None}
for group in ["report", "compiler"]:
    item = lock.get(group)
    if item:
        src = Path(item["path"])
        archived = Path(item["archivePath"])
        src_ok = src.is_file() and sha_file(src) == item["sha256"] and src.stat().st_size == item["bytes"]
        archive_ok = archived.is_file() and sha_file(archived) == item["sha256"] and archived.stat().st_size == item["bytes"]
        proof_lock_groups[group] = {"count": 1, "currentExact": int(src_ok), "archiveExact": int(archive_ok)}
        if not src_ok:
            proof_lock_mismatches.append({"group": group, "path": item["path"], "side": "current", "expected": item["sha256"], "actual": sha_file(src) if src.is_file() else None})
        if not archive_ok:
            proof_lock_mismatches.append({"group": group, "path": item["archivePath"], "side": "archive", "expected": item["sha256"], "actual": sha_file(archived) if archived.is_file() else None})
details["proofInputLock"] = {"status": lock.get("status"), "groups": proof_lock_groups, "mismatchCount": len(proof_lock_mismatches), "mismatches": proof_lock_mismatches}
checks.append(check("installed-proof-input-lock-current-and-archive-hashes", lock.get("status") == "PASS_R3F_FRAME_BASELINES_CANVAS_PREPARATION" and not proof_lock_mismatches, details["proofInputLock"]))

build_bytes = (PROOF / "build-proof.json").read_bytes()
lock_bytes = (PROOF / "input-lock.json").read_bytes()
proof_bytes = (PROOF / "canvas-proof-one-shot.json").read_bytes()
authorization_bytes = (PROOF / "canvas-timing-authorization.json").read_bytes()
timing_bytes = (PROOF / "canvas-timing-one-shot.json").read_bytes()
build = json.loads(build_bytes)
proof = json.loads(proof_bytes)
authorization = json.loads(authorization_bytes)
timing = json.loads(timing_bytes)
hashes = {"buildProof": sha_bytes(build_bytes), "inputLock": sha_bytes(lock_bytes), "untimedProof": sha_bytes(proof_bytes), "timingAuthorization": sha_bytes(authorization_bytes), "timing": sha_bytes(timing_bytes)}
details["proofHashes"] = hashes

native_capture = read_json(PROOF / "capture-native.json")
react_capture = read_json(PROOF / "capture-react.json")
frame_capture = read_json(PROOF / "capture-react-frame.json")
def compile_success(capture, names):
    successes = {e.get("fnName") for e in capture.get("compilerEvents", []) if e.get("kind") == "CompileSuccess"}
    return set(names).issubset(successes)
owned_names = {owner.get("component") for owner in native_capture.get("storeOwners", []) if owner.get("schemaVersion") == 7 and owner.get("executionKind") == "owned-data"}
details["installedRouteEvidence"] = {
    "nativeCapture": native_capture.get("status"),
    "nativeOwnedDataComponents": sorted(owned_names),
    "reactCapture": react_capture.get("status"),
    "reactCompilerPositionRotation": compile_success(react_capture, ["Position", "Rotation"]),
    "reactFrameCapture": frame_capture.get("status"),
    "reactFrameCompilerPositionRotation": compile_success(frame_capture, ["Position", "Rotation"]),
    "reactFrameMotionCompiled": frame_capture.get("motionCompiled"),
    "fallbackReviewExists": (PROOF / "frame-compiler-review.json").exists(),
}
checks.append(check("installed-actual-compiler-and-native-owned-route-captured", native_capture.get("status") == "PASS" and {"Position", "Rotation"}.issubset(owned_names) and react_capture.get("status") == "PASS" and compile_success(react_capture, ["Position", "Rotation"]) and frame_capture.get("status") == "PASS" and compile_success(frame_capture, ["Position", "Rotation"]) and frame_capture.get("motionCompiled") == {"Position": True, "Rotation": True} and not details["installedRouteEvidence"]["fallbackReviewExists"], details["installedRouteEvidence"]))

details["proofRun"] = {}
for label, record in [("untimed", proof), ("timing", timing)]:
    source_before = record.get("sourceBefore", [])
    source_after = record.get("sourceAfter", [])
    arms = record.get("arms", [])
    modes_seen = [x.get("mode") for x in arms]
    arm_summaries = []
    for arm in arms:
        result = arm.get("result", {})
        samples = result.get("samples", [])
        warmups = result.get("warmupSamples", [])
        all_samples = warmups + samples
        teardown = result.get("teardown", {})
        cleanup = teardown.get("cleanup", {})
        arm_summaries.append({
            "mode": arm.get("mode"), "contextClosed": arm.get("contextClosed"),
            "warmupCount": len(warmups), "sampleCount": len(samples),
            "firstUpdateEpoch": result.get("firstUpdate", {}).get("epoch"),
            "firstMeasuredEpoch": samples[0].get("epoch") if samples else None,
            "lastMeasuredEpoch": samples[-1].get("epoch") if samples else None,
            "retained256EverySample": bool(samples) and all(s.get("count") == 256 and s.get("retained") is True for s in samples),
            "litPixelsEverySample": bool(samples) and all(s.get("litPixels", 0) > 0 for s in samples),
            "countersNullEverySample": all(s.get("counters") is None for s in all_samples),
            "teardown": {"resourcesExpected": teardown.get("resourcesExpected"), "resourcesDisposed": teardown.get("resourcesDisposed"), "duplicateDisposalEvents": teardown.get("duplicateDisposalEvents"), "sceneChildren": cleanup.get("sceneChildren"), "ownerCount": cleanup.get("ownerCount"), "pending": cleanup.get("pending"), "registeredSetters": cleanup.get("registeredSetters"), "registeredFrameCallbacks": cleanup.get("registeredFrameCallbacks"), "rootStopped": cleanup.get("rootStopped")},
        })
    # Every arm must match the Native semantic checksum and pixel stream.
    comparisons = []
    if len(arms) == 4 and all(len(a.get("result", {}).get("samples", [])) == 60 for a in arms):
        base = arms[0]["result"]["samples"]
        for arm in arms[1:]:
            other = arm["result"]["samples"]
            comparisons.append({"mode": arm["mode"], "sameEpochChecksum": [(s["epoch"], s["checksum"]) for s in base] == [(s["epoch"], s["checksum"]) for s in other], "sameEpochPixels": [(s["epoch"], s["pixelChecksum"], s["litPixels"]) for s in base] == [(s["epoch"], s["pixelChecksum"], s["litPixels"]) for s in other]})
    details["proofRun"][label] = {
        "status": record.get("status"), "buildProofSha256": record.get("buildProofSha256"), "inputLockSha256": record.get("inputLockSha256"),
        "authorizationSha256": record.get("authorizationSha256"), "priorProofSha256": record.get("priorProofSha256"),
        "browser": record.get("browser"), "browserClosed": record.get("browserClosed"), "sourceBeforeCount": len(source_before), "sourceBeforeMatches": sum(bool(x.get("matches")) for x in source_before), "sourceAfterCount": len(source_after), "sourceAfterMatches": sum(bool(x.get("matches")) for x in source_after),
        "blockedRequests": len(record.get("blockedRequests", [])), "requestFailures": len(record.get("requestFailures", [])), "pageErrors": len(record.get("pageErrors", [])), "consoleErrors": len(record.get("consoleErrors", [])), "errors": len(record.get("errors", [])), "cleanupErrors": len(record.get("cleanupErrors", [])),
        "armOrder": modes_seen, "arms": arm_summaries, "semanticComparisons": comparisons,
    }
    record_checks = [
        record.get("browserClosed") is True,
        modes_seen == MODES,
        len(source_before) == 12378 and all(x.get("matches") for x in source_before),
        len(source_after) == 12378 and all(x.get("matches") for x in source_after),
        all(a.get("contextClosed") is True for a in arms),
        all(len(a.get("result", {}).get("warmupSamples", [])) == 12 and len(a.get("result", {}).get("samples", [])) == 60 for a in arms),
        all(a.get("result", {}).get("teardown", {}).get("resourcesExpected") == 512 and a.get("result", {}).get("teardown", {}).get("resourcesDisposed") == 512 and a.get("result", {}).get("teardown", {}).get("duplicateDisposalEvents") == 0 for a in arms),
        all(x["sameEpochChecksum"] and x["sameEpochPixels"] for x in comparisons),
        not any(record.get(k) for k in ["blockedRequests", "requestFailures", "pageErrors", "consoleErrors", "errors", "cleanupErrors"]),
    ]
    if label == "untimed":
        native = next((a for a in arms if a.get("mode") == "native"), {})
        nr = native.get("result", {})
        first = nr.get("firstUpdate", {}).get("counters", {})
        rows_ok = first.get("store.owned-data.rows") == 257 and first.get("store.owned-data.enclosed-batches") == 1 and first.get("publication.immediate.runs") == 1
        every_epoch_ok = True
        for s in nr.get("warmupSamples", []) + nr.get("samples", []):
            e, c = s.get("epoch"), s.get("counters", {})
            every_epoch_ok &= c.get("store.owned-data.rows") == 257 * e and c.get("store.owned-data.enclosed-batches") == e and c.get("store.owned-data.batches") == e and c.get("publication.immediate.runs") == e and c.get("store.numeric-kernel.rows", 0) == 0 and c.get("store.numeric-kernel.runs", 0) == 0 and c.get("publication.deferred-adapters", 0) == 0 and c.get("owner.component-renders", 0) == 0
        details["proofRun"][label]["nativePerEpochRouteCounts"] = {"firstEpochExact": rows_ok, "all72EpochsExact": bool(every_epoch_ok), "epoch72Counters": nr.get("samples", [{}])[-1].get("counters") if nr.get("samples") else None}
        frame = next((a for a in arms if a.get("mode") == "react-frame"), {})
        frame_ok = all((s.get("counters") or {}).get("frameCallbacks") == 257 and (s.get("counters") or {}).get("motionCallbacks") == 256 and (s.get("counters") or {}).get("markerCallbacks") == 1 and (s.get("counters") or {}).get("renderTakeovers") == 1 and (s.get("counters") or {}).get("controlCommitsDuringUpdate") == 0 and (s.get("counters") or {}).get("drawsDuringAdvance") == 0 for s in frame.get("result", {}).get("warmupSamples", []) + frame.get("result", {}).get("samples", []))
        details["proofRun"][label]["reactFrameRouteCountsExact"] = bool(frame_ok)
        record_checks.extend([rows_ok, bool(every_epoch_ok), bool(frame_ok)])
    else:
        record_checks.append(all(a.get("countersNullEverySample") for a in arm_summaries))
    checks.append(check(f"{label}-proof-artifacts-and-cleanup", record.get("status") == ("PASS_R3F_FRAME_BASELINES_CANVAS_UNTIMED_PROOF" if label == "untimed" else "PASS_R3F_FRAME_BASELINES_CANVAS_DESCRIPTIVE_TIMING") and all(record_checks), details["proofRun"][label]))

# Recompute, don't copy, the central-two median and nearest-rank p95 statistics.
timing_rows = {}
for arm in timing.get("arms", []):
    samples = arm.get("result", {}).get("samples", [])
    timing_rows[arm.get("mode")] = {metric: median_p95([s[metric] for s in samples]) for metric in METRICS}
details["recomputedTiming"] = {"method": "median: average of two central sorted samples; p95: nearest rank ceil(0.95*n)", "sampleCountPerArm": 60, "rows": timing_rows}
expected_rounded = {
    "native": {"publishMs": (3.00, 3.70), "updateThroughDrawMs": (5.60, 6.30), "stateAgeMs": (3.10, 3.70), "callbackMs": (5.60, 6.30), "rafIntervalMs": (16.70, 16.70)},
    "react": {"publishMs": (0.70, 0.90), "updateThroughDrawMs": (3.25, 3.90), "stateAgeMs": (0.80, 1.00), "callbackMs": (3.25, 3.90), "rafIntervalMs": (16.70, 16.70)},
    "react-frame": {"publishMs": (3.05, 3.50), "updateThroughDrawMs": (5.85, 6.70), "stateAgeMs": (3.10, 3.60), "callbackMs": (5.85, 6.70), "rafIntervalMs": (16.70, 16.70)},
    "imperative": {"publishMs": (0.10, 0.20), "updateThroughDrawMs": (3.60, 6.20), "stateAgeMs": (0.20, 0.40), "callbackMs": (3.60, 6.20), "rafIntervalMs": (16.70, 16.70)},
}
timing_calc_match = set(timing_rows) == set(expected_rounded)
for mode, row in expected_rounded.items():
    timing_calc_match &= mode in timing_rows
    if mode in timing_rows:
        for metric, pair in row.items():
            got = timing_rows[mode].get(metric, {})
            timing_calc_match &= round(got.get("median", -999), 2) == pair[0] and round(got.get("p95NearestRank", -999), 2) == pair[1] and got.get("count") == 60
details["recomputedTiming"]["matchesPublishedFigures"] = bool(timing_calc_match)
checks.append(check("timing-table-recomputed-from-existing-samples", timing_calc_match, details["recomputedTiming"]))

# Verify tracked cache evidence was archived, then restored byte-for-byte to HEAD.
cache_receipt = read_json(UNIT / "evidence/generated-followons/receipt.json")
cache_results = []
for item in cache_receipt.get("entries", []):
    archive = ROOT / item["archive"]
    current = ROOT / item["path"]
    head_data = git_head_bytes(item["path"])
    archive_hash = sha_file(archive) if archive.is_file() else None
    current_hash = sha_file(current) if current.is_file() else None
    head_hash = sha_bytes(head_data)
    cache_results.append({"path": item["path"], "archive": item["archive"], "receiptGeneratedSha256": item["generatedSha256"], "archiveSha256": archive_hash, "receiptRestoredHeadSha256": item["restoredHeadSha256"], "currentSha256": current_hash, "gitHeadSha256": head_hash, "archiveByteCountMatchesReceipt": archive.is_file() and archive.stat().st_size == item["bytes"], "restoredBytesExactlyEqualGitHead": current.is_file() and current.read_bytes() == head_data})
cache_ok = len(cache_results) == 4 and all(x["archiveSha256"] == x["receiptGeneratedSha256"] and x["currentSha256"] == x["receiptRestoredHeadSha256"] == x["gitHeadSha256"] and x["archiveByteCountMatchesReceipt"] and x["restoredBytesExactlyEqualGitHead"] for x in cache_results)
details["generatedCachePreservation"] = {"kind": cache_receipt.get("kind"), "entries": cache_results, "allGeneratedArchivedAndCurrentRestoredToHead": bool(cache_ok)}
checks.append(check("four-generated-cache-archives-and-head-restoration", cache_ok, details["generatedCachePreservation"]))

# Confirm the notebook appends the new markdown cell while preserving every prior cell verbatim.
old_notebook = json.loads(git_head_bytes("research.ipynb"))
current_notebook = read_json(ROOT / "research.ipynb")
old_cells = old_notebook.get("cells", [])
new_cells = current_notebook.get("cells", [])
new_markdown_cells = [c for c in new_cells[len(old_cells):] if c.get("cell_type") == "markdown"]
new_cell_text = "\n".join("".join(c.get("source", [])) for c in new_markdown_cells)
notebook_preserved = new_cells[:len(old_cells)] == old_cells and len(new_cells) == len(old_cells) + 1 and len(new_markdown_cells) == 1
notebook_flat = normalized(new_cell_text)
notebook_content_ok = all(token in notebook_flat for token in ["73", "1191", "101", "53", "1825", "1835", "12378", "512", "3.00/3.70", "0.70/0.90", "5.60/6.30", "3.25/3.90", "3.05/3.50", "5.85/6.70", "0.10/0.20", "3.60/6.20"]) and "realtime parity remains **FAIL**" in new_cell_text and "no causal old/new saving" in new_cell_text and "cold/memory" in new_cell_text and "no-maintenance-advantage" in new_cell_text and "Full-plan HMR" in new_cell_text and "remain open" in new_cell_text
details["notebook"] = {"headCellCount": len(old_cells), "currentCellCount": len(new_cells), "oldCellsPreservedVerbatimInOrder": new_cells[:len(old_cells)] == old_cells, "addedCells": [{"id": c.get("id"), "type": c.get("cell_type"), "sourceSha256": sha_bytes("".join(c.get("source", [])).encode())} for c in new_cells[len(old_cells):]], "newCellFiguresAndClaimsMatchCurrentResults": notebook_content_ok, "newCellText": new_cell_text}
checks.append(check("notebook-adds-one-markdown-cell-and-preserves-prior-evidence", notebook_preserved and "Corrected Darwin-v2" in new_cell_text and notebook_content_ok, {k: v for k, v in details["notebook"].items() if k != "newCellText"}))

# Current document figures and claims are checked against the recorded timing data.
doc_paths = ["README.md", "HANDOFF-PROMPT.txt", "RESEARCH-GUIDE.md", "final-master-plan.md", "implementation-checkpoint.md", "paper.md", "implementation/2026-10-22-owned-scalar-pipeline/results.md"]
figure_tokens = ["3.00/3.70", "0.70/0.90", "3.05/3.50", "0.10/0.20", "5.60/6.30", "3.25/3.90", "5.85/6.70", "3.60/6.20"]
doc_audit = []
for rel in doc_paths:
    text = (ROOT / rel).read_text()
    flat = normalized(text)
    compact_readme = rel == "README.md"
    figures_present = all(token in flat for token in (figure_tokens[:2] + figure_tokens[4:6] if compact_readme else figure_tokens))
    count_tokens = ["73", "1191", "101", "53"] if compact_readme else ["73/73", "1191", "101", "53", "1825", "1835", "12378"]
    correct_counts = all(token in flat for token in count_tokens)
    losing_scope = ("realtime parity is **FAIL**" in text or "realtime parity remains **FAIL**" in text or "still loses" in text)
    if compact_readme:
        no_universal_or_maintenance_claim = "not a causal saving" in text.lower() and "maintainability is a goal, not an established comparative result" in text.lower()
    else:
        no_universal_or_maintenance_claim = ("no universal" in text.lower() or "no speed" in text.lower() or "still loses" in text.lower()) and ("no maintenance advantage" in text.lower() or "no comparative claim" in text.lower() or "no maintenance claim" in text.lower() or "maintenance advantage" in text.lower())
    open_scope = "independent-device" in text and ("remain open" in text or "requirements remain open" in text)
    doc_audit.append({"path": rel, "sha256": sha_file(ROOT / rel), "evidenceDetail": "compact README summary" if compact_readme else "full results summary", "figurePairsPresentForDeclaredScope": figures_present, "gateCountsPresentForDeclaredScope": correct_counts, "parityFailureRecorded": losing_scope, "noUniversalSpeedOrMaintenanceClaim": no_universal_or_maintenance_claim, "broaderScopeStillOpen": open_scope})
details["maintainedDocs"] = doc_audit
docs_ok = all(x["figurePairsPresentForDeclaredScope"] and x["gateCountsPresentForDeclaredScope"] and x["parityFailureRecorded"] and x["noUniversalSpeedOrMaintenanceClaim"] and x["broaderScopeStillOpen"] for x in doc_audit)
checks.append(check("current-docs-match-results-figures-and-open-scope", docs_ok, doc_audit))

review_text = (UNIT / "source-review.md").read_text().lower()
review_ok = all(s in review_text for s in ["darwin-v1", "corrected v2 passes73/73 phases", "1191 runtime tests", "101 rust tests", "53 compiled fixtures", "installed proof passes", "sole comparison remains slower", "cold, allocation, retained-memory and performance budgets remain unknown"])
details["sourceReview"] = {"sha256": sha_file(UNIT / "source-review.md"), "recordsPreservedV1AndCorrectedV2": "darwin-v1" in review_text and "corrected v2 passes73/73 phases" in review_text, "recordsProofAndPerformanceLimits": review_ok}
checks.append(check("primary-source-review-records-failures-proof-and-limits", review_ok, details["sourceReview"]))

summary = {
    "audit": "enclosed-scalar-pipeline-final-evidence-audit",
    "status": "PASS" if all(x["status"] == "PASS" for x in checks) else "FINDINGS",
    "checkCount": len(checks),
    "passed": sum(x["status"] == "PASS" for x in checks),
    "failed": [x["name"] for x in checks if x["status"] != "PASS"],
    "correctedGate": {"phases": len(steps), "passedPhases": step_statuses.get("PASS", 0), "denoTests": runtime_tests, "rustTests": rust_tests, "compiledFixtures": len(compiled_steps), "gateTimeRunnerInputs": 1825, "archivedInputsAndContext": 1835},
    "currentCheckoutComparison": {"matched": archive_match_count, "baseline": len(v2_archive.get("inputs", [])), "expectedPostGateDocumentMismatches": sorted(actual_mismatch_paths), "wholeInventoryMatchClaim": False},
    "proofHashes": hashes,
    "timing": details["recomputedTiming"],
    "limitations": ["No workload, test, build, browser, or protocol was rerun for this audit.", "Timing is one descriptive episode and establishes no causal old/new saving, phase cost, presentation behavior, cold or memory result, or independent-device qualification."],
}
report = {"schemaVersion": 1, "summary": summary, "checks": checks, "details": details}
(VERIFY / "final-audit.json").write_text(json.dumps(report, indent=2) + "\n")
(VERIFY / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))
