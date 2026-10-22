#!/usr/bin/env python3
"""Read existing owned-store verification artifacts and write a final audit summary."""

from __future__ import annotations

import hashlib
import json
import math
import statistics
import subprocess
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
UNIT = ROOT / "implementation/2026-10-22-owned-store-execution"
VERIFY = UNIT / "verification"
OUT_SUMMARY = VERIFY / "summary.json"
OUT_AUDIT = VERIFY / "final-audit.json"


def sha_bytes(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def sha_file(path: Path) -> str | None:
    return sha_bytes(path.read_bytes()) if path.is_file() else None


def load(path: Path) -> Any:
    return json.loads(path.read_text())


def map_inputs(items: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {item["path"]: item for item in items}


def hash_check(path: Path, expected: str | None) -> dict[str, Any]:
    actual = sha_file(path)
    return {"path": str(path), "expectedSha256": expected, "actualSha256": actual, "matches": expected is not None and actual == expected}


def source_tree_checks(version: int) -> dict[str, Any]:
    base = VERIFY / f"darwin-v{version}"
    archive = load(base / "source-archive.json")
    before = load(base / "source-before.json")
    after = load(base / "source-after.json")
    archive_by = map_inputs(archive["inputs"])
    before_by = map_inputs(before["inputs"])
    after_by = map_inputs(after["inputs"])
    archived_files = base / "source-before/files"
    per_archive = []
    for path, item in archive_by.items():
        snap = archived_files / path
        per_archive.append({"path": path, "expectedSha256": item["sha256"], "expectedBytes": item["bytes"], "snapshotSha256": sha_file(snap), "snapshotBytes": snap.stat().st_size if snap.is_file() else None, "matches": snap.is_file() and sha_file(snap) == item["sha256"] and snap.stat().st_size == item["bytes"]})
    path_union = before_by.keys() | after_by.keys()
    drift = [path for path in sorted(path_union) if before_by.get(path, {}).get("sha256") != after_by.get(path, {}).get("sha256")]
    archive_only = sorted(archive_by.keys() - before_by.keys())
    context_checks = []
    for path in archive_only:
        snap = archived_files / path
        item = archive_by[path]
        context_checks.append({"path": path, "expectedSha256": item["sha256"], "snapshotSha256": sha_file(snap), "matches": snap.is_file() and sha_file(snap) == item["sha256"]})
    receipt = load(base / "receipt.json")
    counts = Counter(step["status"] for step in receipt["steps"])
    compiled = [step for step in receipt["steps"] if step["name"].startswith("compiled-") and step["name"][9:].isdigit()]
    deno_log = (base / "logs/deno-full.log").read_text(errors="replace")
    tests = None
    marker = "ok | "
    for line in deno_log.splitlines():
        if line.startswith(marker):
            tests = line[len(marker):].strip()
    cargo_log = (base / "logs/cargo-test.log").read_text(errors="replace")
    rust_summary = next((line.strip() for line in cargo_log.splitlines() if line.strip().startswith("test result:")), None)
    failed_phases = []
    for step in receipt["steps"]:
        if step["status"] == "PASS":
            continue
        log_path = base / step.get("log", "")
        lines = log_path.read_text(errors="replace").splitlines() if log_path.is_file() else []
        failed_phases.append({"name": step["name"], "status": step["status"], "exitCode": step.get("exitCode"), "signal": step.get("signal"), "log": step.get("log"), "tail": lines[-12:]})
    return {
        "receiptStatus": receipt["status"],
        "actualPlatform": receipt.get("actual"),
        "phaseCount": len(receipt["steps"]),
        "phaseStatuses": dict(counts),
        "denoSummary": tests,
        "rustSummary": rust_summary,
        "compiledFixtureCount": len(compiled),
        "compiledFixtureStatuses": dict(Counter(step["status"] for step in compiled)),
        "archiveEntryCount": len(archive_by),
        "archiveEntriesAllMatchSnapshot": all(item["matches"] for item in per_archive),
        "archiveHashManifest": {path: [item["sha256"], item["bytes"]] for path, item in archive_by.items()},
        "archiveMismatchPaths": [item["path"] for item in per_archive if not item["matches"]],
        "sourceBeforeCount": len(before_by),
        "sourceAfterCount": len(after_by),
        "beforeAfterDriftPaths": drift,
        "archiveOnlyContextPaths": archive_only,
        "archiveContextChecks": context_checks,
        "unavailableContext": archive.get("unavailableContext"),
        "beforeAfterEqual": not drift and before_by == after_by,
        "failedPhases": failed_phases,
    }


def nearest_rank_p95(values: list[float]) -> float:
    return sorted(values)[math.ceil(0.95 * len(values)) - 1]


def timing_summary() -> dict[str, Any]:
    proof = UNIT / "proof-canvas-v2"
    timing_path = proof / "canvas-timing-one-shot.json"
    timing = load(timing_path)
    arms = []
    for arm in timing["arms"]:
        result = arm["result"]
        samples = result["samples"]
        metrics: dict[str, Any] = {}
        for field in ("publishMs", "updateThroughDrawMs", "stateAgeMs", "callbackMs", "rafIntervalMs", "rafDeltaMs"):
            vals = [sample[field] for sample in samples if isinstance(sample.get(field), (int, float))]
            if vals:
                metrics[field] = {
                    "n": len(vals),
                    "medianCentralAverage": statistics.median(vals),
                    "p95NearestRank": nearest_rank_p95(vals),
                    "min": min(vals),
                    "max": max(vals),
                }
            else:
                metrics[field] = {"n": 0, "present": False}
        arms.append({"mode": arm["mode"], "contextClosed": arm.get("contextClosed"), "warmup": result.get("warmup"), "measured": result.get("measured"), "sampleEpochs": [samples[0].get("epoch"), samples[-1].get("epoch")] if samples else [], "metricsMs": metrics, "resourcesExpected": result["teardown"].get("resourcesExpected"), "resourcesDisposed": result["teardown"].get("resourcesDisposed"), "duplicateDisposalEvents": result["teardown"].get("duplicateDisposalEvents"), "retainedAllSamples": all(sample.get("retained") is True for sample in result.get("warmupSamples", []) + samples), "timedSamplesCountersPresent": any("counters" in sample for sample in samples)})
    return {
        "status": timing["status"],
        "phase": timing["phase"],
        "artifactSha256": sha_file(timing_path),
        "buildProofSha256": timing.get("buildProofSha256"),
        "inputLockSha256": timing.get("inputLockSha256"),
        "authorizationSha256": timing.get("authorizationSha256"),
        "authorization": load(proof / "canvas-timing-authorization.json"),
        "order": timing["order"],
        "browser": timing["browser"],
        "warmup": 12,
        "measured": 60,
        "sourceBefore": {"count": len(timing["sourceBefore"]), "matched": sum(bool(x.get("matches")) for x in timing["sourceBefore"]), "mismatched": sum(x.get("matches") is False for x in timing["sourceBefore"])},
        "sourceAfter": {"count": len(timing["sourceAfter"]), "matched": sum(bool(x.get("matches")) for x in timing["sourceAfter"]), "mismatched": sum(x.get("matches") is False for x in timing["sourceAfter"])},
        "errors": timing["errors"],
        "cleanupErrors": timing["cleanupErrors"],
        "browserClosed": timing["browserClosed"],
        "blockedRequestCount": len(timing["blockedRequests"]),
        "requestFailureCount": len(timing["requestFailures"]),
        "pageErrorCount": len(timing["pageErrors"]),
        "consoleErrorCount": len(timing["consoleErrors"]),
        "arms": arms,
    }


def installed_summary(version: int) -> dict[str, Any]:
    proof = UNIT / f"proof-canvas-v{version}"
    lock_path = proof / "input-lock.json"
    build_path = proof / "build-proof.json"
    lock = load(lock_path)
    build = load(build_path)
    build_link = build.get("inputLockSha256")
    lock_hash = sha_file(lock_path)
    lock_inputs = []
    for entry in lock["inputs"]:
        current = Path(entry["path"])
        archived = Path(entry["archivePath"])
        lock_inputs.append({"path": entry["path"], "archivePath": entry["archivePath"], "sha256": entry["sha256"], "currentMatches": sha_file(current) == entry["sha256"], "archiveMatches": sha_file(archived) == entry["sha256"]})
    package_sources = [{"path": entry["path"], "sha256": entry["sha256"], "currentMatches": sha_file(Path(entry["path"])) == entry["sha256"]} for entry in lock.get("packageSources", [])]
    renderer = [{"path": entry["path"], "sha256": entry["sha256"], "currentMatches": sha_file(Path(entry["path"])) == entry["sha256"], "archiveMatches": sha_file(Path(entry["archivePath"])) == entry["sha256"]} for entry in lock.get("rendererSourceBasis", [])]
    installed = [{"path": entry["path"], "archivePath": entry["archivePath"], "sha256": entry["sha256"], "archiveMatches": sha_file(Path(entry["archivePath"])) == entry["sha256"]} for entry in lock.get("installed", [])]
    return {
        "version": version,
        "lockStatus": lock["status"],
        "lockSha256": lock_hash,
        "buildStatus": build["status"],
        "buildProofSha256": sha_file(build_path),
        "buildLinksToLock": build_link == lock_hash,
        "buildInputLockSha256": build_link,
        "proofStatus": (load(proof / "canvas-proof-one-shot.json").get("status") if (proof / "canvas-proof-one-shot.json").exists() else None),
        "lockInputCount": len(lock["inputs"]),
        "lockInputsAllCurrentAndArchivedMatch": all(x["currentMatches"] and x["archiveMatches"] for x in lock_inputs),
        "lockInputFollowonPaths": [x["path"] for x in lock_inputs if not x["currentMatches"] or not x["archiveMatches"]],
        "packageSourceCount": len(package_sources),
        "packageSourcesAllCurrentMatch": all(x["currentMatches"] for x in package_sources),
        "packageSourceChecks": package_sources,
        "rendererBasisCount": len(renderer),
        "rendererBasisAllCurrentAndArchivedMatch": all(x["currentMatches"] and x["archiveMatches"] for x in renderer),
        "rendererBasisChecks": renderer,
        "installedArchivedPathCount": len(installed),
        "allInstalledArchivedPathsMatch": all(x["archiveMatches"] for x in installed),
        "installedArchiveHashes": {entry["archivePath"]: entry["sha256"] for entry in lock.get("installed", [])},
        "installedArchiveMismatchPaths": [entry["archivePath"] for entry in installed if not entry["archiveMatches"]],
    }


def initial_copy_audit() -> dict[str, Any]:
    data = load(UNIT / "initial-copy.json")
    entries = data["entries"]
    unchanged = []
    changed = []
    baseline_source_checks = []
    functional_names = {"native.tsx", "react.tsx", "react-frame.tsx", "imperative.ts", "scene.ts", "package.json", "tsconfig.json", "native.html", "react.html", "react-frame.html", "imperative.html"}
    for entry in entries:
        copy_path = ROOT / entry["copy"]
        current = sha_file(copy_path)
        record = {"path": entry["copy"], "initialSha256": entry["sha256"], "currentSha256": current, "initialBytes": entry["bytes"], "currentBytes": copy_path.stat().st_size if copy_path.is_file() else None}
        if current == entry["sha256"]:
            unchanged.append(entry["copy"])
        else:
            changed.append(entry["copy"])
        if Path(entry["copy"]).name in functional_names:
            baseline = subprocess.run(["git", "show", f"{data['base']}:{entry['source']}"], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            baseline_hash = sha_bytes(baseline.stdout) if baseline.returncode == 0 else None
            baseline_source_checks.append({"source": entry["source"], "copy": entry["copy"], "baselineAvailable": baseline.returncode == 0, "baselineSha256": baseline_hash, "initialCopySha256": entry["sha256"], "baselineMatchesInitial": baseline_hash == entry["sha256"]})
    scoped_current_match = all(x["baselineMatchesInitial"] and sha_file(ROOT / x["copy"]) == x["initialCopySha256"] for x in baseline_source_checks)
    return {"base": data["base"], "entryCount": len(entries), "unchangedPaths": unchanged, "changedPaths": changed, "baselineSourceChecks": baseline_source_checks, "workloadAndArmInputsMatchBaselineBytes": scoped_current_match}


def cache_followons() -> dict[str, Any]:
    record_path = UNIT / "evidence/generated-followons/restoration.json"
    record = load(record_path)
    items = []
    for item in record["files"]:
        original = ROOT / item["path"]
        archived = ROOT / item["archive"]
        head = subprocess.run(["git", "show", f"HEAD:{item['path']}"], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        head_hash = sha_bytes(head.stdout) if head.returncode == 0 else None
        items.append({**item, "currentSha256": sha_file(original), "archiveSha256": sha_file(archived), "headSha256": head_hash, "archiveMatchesGenerated": sha_file(archived) == item["generatedSha256"], "currentMatchesRestoredHead": sha_file(original) == item["restoredHeadSha256"] == head_hash})
    status = subprocess.run(["git", "status", "--porcelain", "-z"], cwd=ROOT, stdout=subprocess.PIPE, check=True).stdout
    paths = []
    chunks = status.split(b"\0")
    i = 0
    while i < len(chunks) and chunks[i]:
        part = chunks[i].decode(errors="replace")
        code, path = part[:2], part[3:]
        if code.startswith("R") or code.endswith("R") or code.startswith("C") or code.endswith("C"):
            i += 1
        paths.append((code, path))
        i += 1
    untracked_cache = [path for code, path in paths if code == "??" and path.startswith(".cache/")]
    tracked_cache = [path for code, path in paths if path.startswith(".cache/") and code != "??"]
    untracked_bytes = 0
    for rel in untracked_cache:
        path = ROOT / rel
        if path.is_file():
            untracked_bytes += path.stat().st_size
        elif path.is_dir():
            untracked_bytes += sum(item.stat().st_size for item in path.rglob("*") if item.is_file())
    return {"basis": record["basis"], "files": items, "allFourPreservedAndRestored": all(x["archiveMatchesGenerated"] and x["currentMatchesRestoredHead"] for x in items), "trackedCachePathsStillModified": tracked_cache, "untrackedCachePathCount": len(untracked_cache), "untrackedCacheBytes": untracked_bytes, "untrackedCacheExamples": untracked_cache[:20], "untrackedCachePreservationList": untracked_cache, "preserveUntrackedCache": True}


def current_source_followons() -> dict[str, Any]:
    v3 = load(VERIFY / "darwin-v3/source-before.json")
    baseline = map_inputs(v3["inputs"])
    changed = []
    missing = []
    for path, entry in baseline.items():
        actual = sha_file(ROOT / path)
        if actual is None:
            missing.append(path)
        elif actual != entry["sha256"]:
            changed.append(path)
    product_changes = [p for p in changed if p.startswith("src/") or p.startswith("compiler/") and not p.startswith("compiler/compiled_")]
    consumer_changes = [p for p in changed if p.startswith("implementation/2026-10-22-owned-store-execution/consumer/")]
    archive = load(VERIFY / "darwin-v3/source-archive.json")
    all_archive = map_inputs(archive["inputs"])
    context_changes = []
    for path, entry in all_archive.items():
        actual = sha_file(ROOT / path)
        if actual is not None and actual != entry["sha256"]:
            context_changes.append(path)
    docs = [p for p in context_changes if p.endswith((".md", ".ipynb"))]
    return {"v3RunnerInputCount": len(baseline), "currentMissingPaths": missing, "currentChangedPaths": changed, "productSourceChangedPaths": product_changes, "consumerFollowonPaths": consumer_changes, "allArchiveCurrentChangedPaths": context_changes, "documentFollowonPaths": docs, "auditScope": "product/runtime and consumer harness compared against v3 runner input snapshot; primary-owned final-document follow-ons observed at audit time and remain subject to primary's final enumeration"}


def main() -> None:
    gates = {f"darwin-v{v}": source_tree_checks(v) for v in (1, 2, 3)}
    archive_maps = {v: gates[f"darwin-v{v}"]["archiveHashManifest"] for v in (1, 2, 3)}
    archive_deltas = {}
    for left, right in ((1, 2), (2, 3), (1, 3)):
        a, b = archive_maps[left], archive_maps[right]
        paths = sorted(set(a) | set(b))
        archive_deltas[f"v{left}-to-v{right}"] = {"changedPaths": [path for path in paths if a.get(path) != b.get(path)], "entryCountEqual": len(a) == len(b)}
    context_sets = [{path: value for path, value in archive_maps[v].items() if path in gates[f"darwin-v{v}"]["archiveOnlyContextPaths"]} for v in (1, 2, 3)]
    installs = {f"installed-v{v}": installed_summary(v) for v in (1, 2)}
    timing = timing_summary()
    proof_path = UNIT / "proof-canvas-v2/canvas-proof-one-shot.json"
    proof = load(proof_path)
    proof_auth = load(UNIT / "proof-canvas-v2/canvas-timing-authorization.json")
    proof_hash = sha_file(proof_path)
    timing_auth = timing["authorization"]
    initial = initial_copy_audit()
    cache = cache_followons()
    changes = current_source_followons()
    proof_summary = {
        "proofStatus": proof["status"],
        "proofSha256": proof_hash,
        "buildProofSha256": sha_file(UNIT / "proof-canvas-v2/build-proof.json"),
        "inputLockSha256": sha_file(UNIT / "proof-canvas-v2/input-lock.json"),
        "timingAuthorizationStatus": proof_auth["status"],
        "authorizationBindsProofBuildLock": proof_auth.get("proofSha256") == proof_hash and proof_auth.get("buildProofSha256") == sha_file(UNIT / "proof-canvas-v2/build-proof.json") and proof_auth.get("inputLockSha256") == sha_file(UNIT / "proof-canvas-v2/input-lock.json"),
        "timingArtifactBindsAuthorization": timing.get("authorizationSha256") == sha_file(UNIT / "proof-canvas-v2/canvas-timing-authorization.json"),
        "proofSourceBefore": {"count": len(proof["sourceBefore"]), "matched": sum(bool(x.get("matches")) for x in proof["sourceBefore"])},
        "proofSourceAfter": {"count": len(proof["sourceAfter"]), "matched": sum(bool(x.get("matches")) for x in proof["sourceAfter"])},
        "errors": proof["errors"],
        "cleanupErrors": proof["cleanupErrors"],
        "browserClosed": proof["browserClosed"],
        "armCount": len(proof["arms"]),
        "armModes": [arm["mode"] for arm in proof["arms"]],
        "allContextsClosed": all(arm.get("contextClosed") for arm in proof["arms"]),
        "resources": {arm["mode"]: {"expected": arm["result"]["teardown"].get("resourcesExpected"), "disposed": arm["result"]["teardown"].get("resourcesDisposed"), "duplicates": arm["result"]["teardown"].get("duplicateDisposalEvents")} for arm in proof["arms"]},
        "armOutputSequencesMatch": len({json.dumps([(sample.get("checksum"), sample.get("pixelChecksum")) for sample in arm["result"]["samples"]]) for arm in proof["arms"]}) == 1,
        "allArmSamplesRetained": all(sample.get("retained") is True for arm in proof["arms"] for sample in arm["result"].get("warmupSamples", []) + arm["result"].get("samples", [])),
        "nativeOwnedDataRowsPerEpochValid": all(sample.get("counters", {}).get("store.owned-data.rows") == 257 * sample.get("epoch") and sample.get("counters", {}).get("store.owned-data.batches") == sample.get("epoch") for arm in proof["arms"] if arm["mode"] == "native" for sample in arm["result"].get("warmupSamples", []) + arm["result"].get("samples", [])),
        "nativeExecutionKinds": sorted({owner.get("executionKind") for owner in load(UNIT / "proof-canvas-v2/capture-native.json").get("storeOwners", [])}),
        "nativeDataOwnerCount": len(load(UNIT / "proof-canvas-v2/capture-native.json").get("storeOwners", [])),
        "legacyKernelMetadataInNativeCapture": any("kernel" in json.dumps(owner).lower() for owner in load(UNIT / "proof-canvas-v2/capture-native.json").get("storeOwners", [])),
    }
    summary = {
        "schemaVersion": 1,
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "gateStatuses": {key: value["receiptStatus"] for key, value in gates.items()},
        "gatePhases": {key: {"total": value["phaseCount"], "statuses": value["phaseStatuses"]} for key, value in gates.items()},
        "timing": timing,
        "installed": {key: {k: v for k, v in data.items() if k not in ("packageSourceChecks", "rendererBasisChecks", "installedChecks", "installedArchiveHashes")} for key, data in installs.items()},
        "proof": proof_summary,
        "initialCopy": {k: v for k, v in initial.items() if k != "baselineSourceChecks"},
        "currentSourceFollowons": changes,
        "cacheGeneratedFollowons": {k: v for k, v in cache.items() if k not in ("files", "untrackedCacheExamples")},
    }
    audit = {
        "schemaVersion": 1,
        "generatedAtUtc": summary["generatedAtUtc"],
        "evidenceOnly": True,
        "noProductEditsOrVerificationCommandsRun": True,
        "gateAudits": gates,
        "crossGateSourceArchiveDeltas": archive_deltas,
        "crossGateContextHashesEqual": context_sets[0] == context_sets[1] == context_sets[2],
        "installedAudits": installs,
        "proof": proof_summary,
        "timing": timing,
        "initialCopy": initial,
        "currentSourceFollowons": changes,
        "generatedCacheFollowons": cache,
        "timingInterpretation": "One fixed-order descriptive episode only; medians and nearest-rank p95 were recomputed directly from the 60 saved measured samples per arm. No phase cost, causal saving, or repeated timing is inferred.",
        "documentFollowons": "Primary is maintaining final documents after the v3 gate. This audit reports product and consumer harness paths changed from v3 runner inputs and leaves final document enumeration to primary.",
    }
    OUT_SUMMARY.write_text(json.dumps(summary, indent=2) + "\n")
    OUT_AUDIT.write_text(json.dumps(audit, indent=2) + "\n")
    print(json.dumps({"summary": str(OUT_SUMMARY), "audit": str(OUT_AUDIT), "gateStatuses": summary["gateStatuses"], "timingHash": timing["artifactSha256"], "sourceChanges": changes["currentChangedPaths"], "cacheRestored": cache["allFourPreservedAndRestored"]}, indent=2))


if __name__ == "__main__":
    main()
