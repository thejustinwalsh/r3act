#!/usr/bin/env python3
"""Read-only integrity and evidence audit for the R3F frame baseline."""

from __future__ import annotations

import hashlib
import json
import math
import os
import pathlib
import subprocess
from functools import lru_cache
from collections import Counter
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[3]
BASE = ROOT / "implementation/2026-10-22-r3f-frame-baseline"
VERIFY = BASE / "verification"
OUT = VERIFY
GATE = VERIFY / "darwin-v1"
FIXED_MANIFEST = VERIFY / "owned-generated-fixed-paths/manifest.json"
PREVIOUS = ROOT / "implementation/2026-10-22-closed-store-contraction/proof-canvas-v1"
ASTRA_LOCK = ROOT / "implementation/2026-10-22-owned-execution-review/source-lock.json"
HEAD = "04b7757e606de235f228ee4f9966f39e28feb2e1"


def read_json(path: pathlib.Path):
    return json.loads(path.read_text())


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha(path: pathlib.Path) -> str:
    return sha_bytes(path.read_bytes())


@lru_cache(maxsize=None)
def hash_path(path: pathlib.Path):
    if path.is_symlink():
        return {"kind": "symlink", "target": os.readlink(path)}
    if path.is_file():
        return {"kind": "file", "sha256": sha(path), "bytes": path.stat().st_size}
    return {"kind": "missing"}


def git_blob(path: str):
    result = subprocess.run(["git", "show", f"{HEAD}:{path}"], cwd=ROOT,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        return {"kind": "missing-in-head", "stderr": result.stderr.decode(errors="replace")[:500]}
    return {"kind": "git-blob", "sha256": sha_bytes(result.stdout), "bytes": len(result.stdout)}


def git_changed(paths):
    result = subprocess.run(["git", "diff", "--name-only", HEAD, "--", *paths], cwd=ROOT,
                            check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return [line for line in result.stdout.splitlines() if line]


def verify_archive_refs(doc, label: str):
    refs = []

    def walk(value):
        if isinstance(value, dict):
            archive_path, expected = value.get("archivePath"), value.get("sha256")
            if isinstance(archive_path, str) and isinstance(expected, str):
                path = pathlib.Path(archive_path)
                if not path.is_absolute():
                    path = ROOT / path
                actual = hash_path(path)
                refs.append({"archivePath": archive_path, "expectedSha256": expected,
                             "expectedBytes": value.get("bytes"), "actual": actual,
                             "matches": actual.get("kind") == "file" and actual.get("sha256") == expected
                             and (value.get("bytes") is None or actual.get("bytes") == value.get("bytes"))})
            for nested in value.values():
                walk(nested)
        elif isinstance(value, list):
            for nested in value:
                walk(nested)

    walk(doc)
    unique = {}
    conflicts = []
    for ref in refs:
        prior = unique.get(ref["archivePath"])
        if prior and (prior["expectedSha256"] != ref["expectedSha256"] or prior["matches"] != ref["matches"]):
            conflicts.append(ref["archivePath"])
        unique[ref["archivePath"]] = ref
    mismatches = [row for row in unique.values() if not row["matches"]]
    return {"document": label, "referenceRows": len(refs), "uniqueArchivePaths": len(unique),
            "verifiedUniquePaths": len(unique) - len(mismatches), "mismatchCount": len(mismatches),
            "conflictingPaths": sorted(set(conflicts)), "mismatches": mismatches}


def source_archive_audit():
    manifest = read_json(GATE / "source-archive.json")
    source_before = read_json(GATE / "source-before.json")["inputs"]
    archived_root = GATE / "source-before/files"
    failures = []
    for row in manifest["inputs"]:
        path = archived_root / row["path"]
        actual = hash_path(path)
        if not (actual.get("kind") == "file" and actual.get("sha256") == row["sha256"]
                and actual.get("bytes") == row["bytes"]):
            failures.append({"path": row["path"], "expected": row, "actual": actual})
    kinds = Counter(row.get("kind") for row in manifest["inputs"])
    return {"status": manifest.get("status"), "sourceBeforeRows": len(source_before),
            "archiveRows": len(manifest["inputs"]), "runnerRows": kinds.get("runner-input", 0),
            "contextRows": kinds.get("context", 0), "unavailableContext": manifest.get("unavailableContext", []),
            "verifiedRows": len(manifest["inputs"]) - len(failures), "mismatchCount": len(failures),
            "mismatches": failures, "runnerRowsEqualSourceBefore": kinds.get("runner-input", 0) == len(source_before)}


FOLLOWONS = {
    "README.md": "Maintained repository summary updated after the frozen correctness gate.",
    "final-master-plan.md": "Primary-maintained guide follow-on; current claim remains proposal, not implementation.",
    "implementation-checkpoint.md": "Primary-maintained evidence checkpoint follow-on.",
    "HANDOFF-PROMPT.txt": "Maintained handoff context updated after the gate.",
    "RESEARCH-GUIDE.md": "Maintained research context updated after the gate.",
    "implementation/2026-10-22-r3f-frame-baseline/agent-authored.md": "Agent handoff documentation created/updated after the gate.",
    "implementation/2026-10-22-r3f-frame-baseline/agent-tooling.md": "Agent handoff documentation created/updated after the gate.",
    "implementation/2026-10-22-r3f-frame-baseline/consumer/build.mjs": "Reviewed installed logger/guard diagnostics tooling follow-on; separately captured by v2/v3 input locks.",
    "implementation/2026-10-22-r3f-frame-baseline/consumer/react-frame.tsx": "Reviewed observer bookkeeping moved into module helpers; separately captured by v3.",
    "implementation/2026-10-22-r3f-frame-baseline/consumer/verify.mjs": "Reviewed browser evidence-chain/verification follow-on; separately captured by v3.",
    "implementation/2026-10-22-r3f-frame-baseline/source-review.md": "Primary source review updated with actual v1-v3 and browser disposition.",
}


def current_vs_gate(fixed):
    rows = read_json(GATE / "source-archive.json")["inputs"]
    fixed_by_path = {entry["path"]: entry for entry in fixed}
    differences, allowed, fixed_checks = [], [], []
    matches = 0
    for item in fixed:
        current = hash_path(ROOT / item["path"])
        archive = hash_path(ROOT / item["archivePath"])
        head_blob = git_blob(item["path"])
        restored_ok = current.get("kind") == "file" and current.get("sha256") == item["restoredHeadSha256"]
        archive_ok = archive.get("kind") == "file" and archive.get("sha256") == item["generatedSha256"]
        head_ok = head_blob.get("sha256") == item["restoredHeadSha256"]
        fixed_checks.append({"path": item["path"], "current": current, "restoredHeadSha256": item["restoredHeadSha256"],
                             "matchesRestoredHead": restored_ok, "headBlob": head_blob, "matchesActualHead": head_ok,
                             "archivedGeneratedCopy": archive, "generatedSha256": item["generatedSha256"],
                             "archivedCopyMatchesGenerated": archive_ok})
    for row in rows:
        path = row["path"]
        actual = hash_path(ROOT / path)
        if path in fixed_by_path:
            expected = fixed_by_path[path]["restoredHeadSha256"]
            ok = actual.get("kind") == "file" and actual.get("sha256") == expected
        else:
            expected = row["sha256"]
            ok = actual.get("kind") == "file" and actual.get("sha256") == expected and actual.get("bytes") == row["bytes"]
        if ok:
            matches += 1
        else:
            detail = {"path": path, "capturedGateSha256": row["sha256"], "effectiveExpectedSha256": expected,
                      "current": actual, "reason": FOLLOWONS.get(path)}
            (allowed if path in FOLLOWONS else differences).append(detail)
    # results.md is an intentional post-gate evidence follow-on and was not in the gate runner's input set.
    results_path = "implementation/2026-10-22-r3f-frame-baseline/results.md"
    return {"gateArchiveRows": len(rows), "gateRunnerRows": sum(row.get("kind") == "runner-input" for row in rows),
            "gateContextRows": sum(row.get("kind") == "context" for row in rows),
            "matchedIncludingReviewedRestores": matches,
            "reviewedFollowonDifferences": allowed, "unexpectedDifferences": differences,
            "fixedRestoreChecks": fixed_checks, "fixedRestoreCount": len(fixed),
            "resultsMdPostGateFollowon": {"path": results_path, **hash_path(ROOT / results_path),
                                          "noGateInputRow": results_path not in {row["path"] for row in rows}},
            "status": "PASS_WITH_EXPLICIT_FOLLOWONS" if not differences and all(
                item["matchesRestoredHead"] and item["matchesActualHead"] and item["archivedCopyMatchesGenerated"]
                for item in fixed_checks) else "FAIL"}


def gate_summary():
    receipt = read_json(GATE / "receipt.json")
    steps = receipt["steps"]
    deno = (GATE / "logs/deno-full.log").read_text(errors="replace")
    rust = (GATE / "logs/cargo-test.log").read_text(errors="replace")
    deno_summary = next((line for line in reversed(deno.splitlines()) if line.startswith("ok | ")), None)
    rust_results = [line for line in rust.splitlines() if line.startswith("test result:")]
    numbered = [step for step in steps if step["name"].startswith("compiled-") and step["name"].split("-")[-1].isdigit()]
    supervisor = read_json(VERIFY / "darwin-v1-supervisor.json")
    return {"status": receipt["status"], "gitHead": receipt.get("source", {}).get("gitHead"),
            "actual": receipt.get("actual"), "stepCount": len(steps),
            "passedSteps": sum(step["status"] == "PASS" for step in steps),
            "failedSteps": [step for step in steps if step["status"] != "PASS"],
            "denoSummary": deno_summary, "rustTestResults": rust_results,
            "compiledFixtureCount": len(numbered),
            "compiledFixturePassed": sum(step["status"] == "PASS" for step in numbered),
            "sourceAudit": receipt.get("sourceAudit"), "supervisor": supervisor}


def prep_audit(version: str, prior_lock):
    proof = BASE / f"proof-canvas-{version}"
    lock = read_json(proof / "input-lock.json")
    build = read_json(proof / "build-proof.json")
    refs = [verify_archive_refs(lock, str((proof / "input-lock.json").relative_to(ROOT))),
            verify_archive_refs(build, str((proof / "build-proof.json").relative_to(ROOT)))]
    capture_path = proof / "capture-react-frame.json"
    capture = read_json(capture_path) if capture_path.exists() else None
    processes = build.get("processes", {})
    counts = {key: len(lock.get(key, [])) for key in
              ("inputs", "staged", "packageSources", "rendererSourceBasis", "tarballs", "installed")}
    supervisor_path = VERIFY / f"installed-build-{version}-supervisor.json"
    graph_diff = {}
    for key in ("packageSources", "tarballs"):
        current = {row["path"]: (row.get("sha256"), row.get("bytes")) for row in lock.get(key, [])}
        previous = {row["path"]: (row.get("sha256"), row.get("bytes")) for row in prior_lock.get(key, [])}
        graph_diff[key] = {"currentCount": len(current), "previousCount": len(previous),
                           "added": sorted(current.keys() - previous.keys()),
                           "removed": sorted(previous.keys() - current.keys()),
                           "changed": sorted(path for path in current.keys() & previous.keys() if current[path] != previous[path]),
                           "identical": current == previous}
    return {"inputLockSha256": sha(proof / "input-lock.json"), "buildProofSha256": sha(proof / "build-proof.json"),
            "inputLockStatus": lock.get("status"), "buildStatus": build.get("status"), "counts": counts,
            "processes": {name: {"exit": proc.get("exit"), "stopped": proc.get("stopped"),
                                 "spawnError": proc.get("spawnError")} for name, proc in processes.items()},
            "archiveIntegrity": refs, "packageGraphComparedWithPriorUnit": graph_diff,
            "supervisor": read_json(supervisor_path),
            "frameCapture": ({"sha256": sha(capture_path), "status": capture.get("status"),
                              "motionCompiled": capture.get("motionCompiled"),
                              "events": [{"fnName": event.get("fnName"), "kind": event.get("kind"),
                                          "reason": event.get("reason"), "category": (event.get("detail") or {}).get("category")}
                                         for event in capture.get("compilerEvents", [])]}
                             if capture is not None else None),
            "preservedBuildErrors": build.get("errors", []), "hasCapture": capture is not None}


def initial_copy_audit():
    data = read_json(BASE / "initial-copy.json")
    expected_changes = {"consumer/build.mjs", "consumer/prepare.mjs", "consumer/verify.mjs"}
    rows = []
    for entry in data["entries"]:
        copy = ROOT / entry["copy"]
        actual = hash_path(copy)
        prior_match = actual.get("sha256") == entry["sha256"] and actual.get("bytes") == entry["bytes"]
        rel = pathlib.PurePosixPath(entry["copy"]).relative_to("implementation/2026-10-22-r3f-frame-baseline")
        row = {"source": entry["source"], "copy": entry["copy"], "expectedInitialSha256": entry["sha256"],
               "actual": actual, "matchesInitial": prior_match}
        if not prior_match:
            row["reviewedToolingFollowon"] = str(rel) in expected_changes
        rows.append(row)
    unchanged = sum(row["matchesInitial"] for row in rows)
    intentional = [row for row in rows if not row["matchesInitial"]]
    return {"base": data.get("base"), "entryCount": len(rows), "unchangedCount": unchanged,
            "changedRows": intentional, "changedCount": len(intentional),
            "allChangesAreReviewedTooling": all(row.get("reviewedToolingFollowon") for row in intentional)}


def source_basis_audit(prior_lock, current_lock):
    old = {pathlib.PurePosixPath(row["path"]).name: row for row in prior_lock.get("rendererSourceBasis", [])}
    new = {pathlib.PurePosixPath(row["path"]).name: row for row in current_lock.get("rendererSourceBasis", [])}
    unchanged = sorted(name for name, row in old.items() if name in new and row.get("sha256") == new[name].get("sha256"))
    mismatches = sorted(name for name, row in old.items() if name not in new or row.get("sha256") != new[name].get("sha256"))
    additions = sorted(new.keys() - old.keys())
    return {"priorCount": len(old), "currentCount": len(new), "unchangedPriorCount": len(unchanged),
            "unchangedPriorFiles": unchanged, "priorMismatches": mismatches, "additions": additions}


def preserved_v1_raw_outputs():
    proof = BASE / "proof-canvas-v1"
    paths = [proof / "transforms/react-frame", proof / "dist/react-frame"]
    items = []
    for root in paths:
        if root.exists():
            for path in sorted(root.rglob("*")):
                if path.is_file() or path.is_symlink():
                    items.append({"path": str(path.relative_to(ROOT)), **hash_path(path)})
    return {"scope": "Read-only hashes of v1 frame-arm orphan transform/bundle outputs; no v1 diagnostics reconstructed.",
            "items": items, "count": len(items), "allPresent": all(item["kind"] == "file" for item in items)}


def conventional_stats(samples):
    stats = {}
    for field in ("publishMs", "updateThroughDrawMs", "stateAgeMs", "callbackMs", "rafIntervalMs"):
        values = sorted(float(sample[field]) for sample in samples)
        count = len(values)
        if count != 60:
            raise ValueError(f"expected 60 timing samples for {field}, got {count}")
        stats[field] = {"n": count, "medianCentralTwo": round((values[29] + values[30]) / 2, 4),
                        "p95NearestRank": round(values[math.ceil(.95 * count) - 1], 4), "unit": "ms"}
    return stats


def browser_audit(proof_path: pathlib.Path, expected_status: str, phase: str):
    doc = read_json(proof_path)
    before, after = doc.get("sourceBefore", []), doc.get("sourceAfter", [])
    outputs, arms = [], []
    for arm in doc.get("arms", []):
        result = arm["result"]
        teardown = result.get("teardown", {})
        cleanup = teardown.get("cleanup", {})
        warmups, samples = result.get("warmupSamples", []), result.get("samples", [])
        seq = warmups + samples
        outputs.append([(s.get("epoch"), s.get("checksum"), s.get("pixelChecksum"), s.get("litPixels"), s.get("count"), s.get("retained")) for s in seq])
        frame_expected = {"frameCallbacks": 257, "motionCallbacks": 256, "markerCallbacks": 1,
                          "renderTakeovers": 1, "controlCommitsDuringUpdate": 0, "drawsDuringAdvance": 0}
        frame_counters_every_step = (all((sample.get("counters") or {}) == frame_expected for sample in seq)
                                     if arm.get("mode") == "react-frame" else None)
        arms.append({"mode": arm.get("mode"), "contextClosed": arm.get("contextClosed"),
                     "mount": result.get("mount"), "warmupCount": len(warmups), "sampleCount": len(samples),
                     "firstEpoch": seq[0].get("epoch") if seq else None, "lastEpoch": seq[-1].get("epoch") if seq else None,
                     "allRetainedCount256": all(s.get("retained") is True and s.get("count") == 256 for s in seq),
                     "allLitPixelsNonzero": all((s.get("litPixels") or 0) > 0 for s in seq),
                     "frameCountersEveryStep": frame_counters_every_step,
                     "teardownRenderCalls": teardown.get("cleanup", {}).get("renderCalls"),
                     "allSamplesCountersNull": all(s.get("counters") is None for s in samples),
                     "firstUpdateCounters": result.get("firstUpdate", {}).get("counters"),
                     "lastCounters": samples[-1].get("counters") if samples else None,
                     "cleanup": cleanup, "stopped": teardown.get("stopped"),
                     "resourcesExpected": teardown.get("resourcesExpected"),
                     "resourcesDisposed": teardown.get("resourcesDisposed"),
                     "duplicateDisposalEvents": teardown.get("duplicateDisposalEvents"),
                     "rendering": result.get("rendering")})
    stable = len(before) == 12367 and len(after) == 12367 and before == after and all(
        row.get("matches") and row.get("expected") == row.get("actual") for row in before + after)
    outputs_match = bool(outputs) and all(output == outputs[0] for output in outputs[1:])
    return {"artifact": str(proof_path.relative_to(ROOT)), "sha256": sha(proof_path),
            "status": doc.get("status"), "expectedStatus": expected_status, "phase": doc.get("phase"),
            "browser": doc.get("browser"), "browserClosed": doc.get("browserClosed"),
            "order": doc.get("order"), "transport": doc.get("transport"),
            "sourceBeforeRows": len(before), "sourceAfterRows": len(after), "sourceRowsEqual": before == after,
            "allSourceMatches": stable, "outputsMatchAcrossArms": outputs_match, "arms": arms,
            "frameCompilerOutcome": doc.get("frameCompilerOutcome"),
            "blockedRequestCount": len(doc.get("blockedRequests", [])),
            "requestFailures": doc.get("requestFailures", []), "pageErrors": doc.get("pageErrors", []),
            "consoleErrors": doc.get("consoleErrors", []), "errors": doc.get("errors", []),
            "cleanupErrors": doc.get("cleanupErrors", []),
            "timingStats": {arm["mode"]: conventional_stats(arm["result"]["samples"]) for arm in doc["arms"]}
            if phase == "timing" else None}


def astra_review_audit(gate_manifest):
    lock = read_json(ASTRA_LOCK)
    by_gate = {row["path"]: row for row in gate_manifest["inputs"]}
    files = []
    for row in lock["files"]:
        path = ROOT / row["path"]
        actual = hash_path(path)
        gate_row = by_gate.get(row["path"])
        matches_gate = bool(gate_row and gate_row["sha256"] == row["sha256"] and gate_row["bytes"] == row["bytes"])
        head = git_blob(row["path"]) if row["path"].startswith(("src/", "compiler/")) else None
        files.append({"path": row["path"], "expected": {"sha256": row["sha256"], "bytes": row["bytes"]},
                      "current": actual, "currentMatchesLock": actual.get("sha256") == row["sha256"] and actual.get("bytes") == row["bytes"],
                      "gateArchiveRow": matches_gate, "headBlob": head,
                      "matchesHead": head is None or head.get("sha256") == row["sha256"]})
    prod = [row for row in files if row["path"].startswith(("src/", "compiler/"))]
    related_docs = [ROOT / "implementation/2026-10-22-owned-execution-review/report.md",
                    ROOT / "implementation/2026-10-22-owned-execution-review/orchestration.md"]
    return {"sourceLock": str(ASTRA_LOCK.relative_to(ROOT)), "head": lock.get("head"),
            "fileRows": len(files), "productionRows": len(prod), "productionAllMatchHead": all(x["matchesHead"] for x in prod),
            "allLockRowsMatchGateArchive": all(x["gateArchiveRow"] for x in files),
            "rows": files, "reviewDocuments": [{"path": str(path.relative_to(ROOT)), **hash_path(path)} for path in related_docs],
            "currentMasterAndCheckpointFollowons": [
                {"path": path, **hash_path(ROOT / path), "gateHash": by_gate.get(path, {}).get("sha256"),
                 "differsFromGate": bool(by_gate.get(path) and sha(ROOT / path) != by_gate[path]["sha256"])}
                for path in ("final-master-plan.md", "implementation-checkpoint.md")],
            "proposedABIImplemented": False,
            "note": "The Astra source-locked execution report is a proposal; matching source locks do not implement its ABI or authorize performance claims."}


def cache_inventory():
    result = subprocess.run(["git", "ls-files", "--others", "--exclude-standard", "-z", ".cache"], cwd=ROOT,
                            check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    names = [part.decode("utf-8", "surrogateescape") for part in result.stdout.split(b"\0") if part]
    items = [{"path": name, **hash_path(ROOT / name)} for name in sorted(names)]
    return {"schemaVersion": 1, "scope": "Preserved inventory of untracked nonignored .cache files; read-only, no cleanup.",
            "command": "git ls-files --others --exclude-standard -z .cache", "count": len(items), "items": items,
            "status": "PASS" if all(item["kind"] in ("file", "symlink") for item in items) else "FAIL"}


def main():
    fixed = read_json(FIXED_MANIFEST)
    gate_manifest = read_json(GATE / "source-archive.json")
    prior_lock = read_json(PREVIOUS / "input-lock.json")
    prep_locks = {v: read_json(BASE / f"proof-canvas-{v}/input-lock.json") for v in ("v1", "v2", "v3")}
    prep = {v: prep_audit(v, prior_lock) for v in ("v1", "v2", "v3")}
    gate = gate_summary()
    archive = source_archive_audit()
    current = current_vs_gate(fixed)
    copies = initial_copy_audit()
    basis = source_basis_audit(prior_lock, prep_locks["v3"])
    proof = browser_audit(BASE / "proof-canvas-v3/canvas-proof-one-shot.json",
                          "PASS_R3F_FRAME_BASELINES_CANVAS_UNTIMED_PROOF", "proof")
    timing = browser_audit(BASE / "proof-canvas-v3/canvas-timing-one-shot.json",
                           "PASS_R3F_FRAME_BASELINES_CANVAS_DESCRIPTIVE_TIMING", "timing")
    auth_path = BASE / "proof-canvas-v3/canvas-timing-authorization.json"
    auth = read_json(auth_path)
    timing_doc = read_json(BASE / "proof-canvas-v3/canvas-timing-one-shot.json")
    auth_chain = {}
    for key, file in (("buildProofSha256", "build-proof.json"), ("inputLockSha256", "input-lock.json"),
                      ("proofSha256", "canvas-proof-one-shot.json")):
        actual = sha(BASE / "proof-canvas-v3" / file)
        auth_chain[key] = {"expected": auth.get(key), "actual": actual, "matches": auth.get(key) == actual}
    auth_chain["authorizationSha256"] = {"expected": timing_doc.get("authorizationSha256"),
                                         "actual": sha(auth_path), "matches": timing_doc.get("authorizationSha256") == sha(auth_path)}
    orphan = preserved_v1_raw_outputs()
    cache_path = OUT / "cache-raw-inventory.json"
    cache = cache_inventory()
    cache_path.write_text(json.dumps(cache, indent=2) + "\n")
    product_paths = ["src", "compiler", "scripts", "packages", "crates", "package.json", "pnpm-lock.yaml",
                     "pnpm-workspace.yaml", "deno.json", "deno.lock", "Cargo.toml", "Cargo.lock"]
    product_diff = git_changed(product_paths)
    all_archive_refs = [ref for version in ("v1", "v2", "v3") for ref in prep[version]["archiveIntegrity"]]
    ref_mismatches = sum(row["mismatchCount"] for row in all_archive_refs)
    proof_arms = {arm["mode"]: arm for arm in proof["arms"]}
    timing_arms = {arm["mode"]: arm for arm in timing["arms"]}
    expected_order = ["native", "react", "react-frame", "imperative"]
    stats = timing["timingStats"] or {}
    parity = {}
    for mode in ("react", "react-frame"):
        parity[mode] = {field: {"nativeMedian": stats["native"][field]["medianCentralTwo"],
                               "reactMedian": stats[mode][field]["medianCentralTwo"],
                               "nativeP95": stats["native"][field]["p95NearestRank"],
                               "reactP95": stats[mode][field]["p95NearestRank"],
                               "nativeLosesBoth": stats["native"][field]["medianCentralTwo"] > stats[mode][field]["medianCentralTwo"]
                               and stats["native"][field]["p95NearestRank"] > stats[mode][field]["p95NearestRank"]}
                        for field in ("publishMs", "updateThroughDrawMs")}
    semantic_checks = {
        "gatePass72": gate["status"] == "PASS" and gate["stepCount"] == gate["passedSteps"] == 72,
        "gateRuntime1147": gate["denoSummary"] is not None and "1147 passed" in gate["denoSummary"],
        "gateRust99": any("99 passed" in line for line in gate["rustTestResults"]),
        "gateCompiled52": gate["compiledFixtureCount"] == gate["compiledFixturePassed"] == 52,
        "gateArchive1703": archive["archiveRows"] == archive["verifiedRows"] == 1703 and archive["runnerRows"] == 1693 and archive["contextRows"] == 10 and archive["mismatchCount"] == 0,
        "currentFollowonsExplicit": current["status"] == "PASS_WITH_EXPLICIT_FOLLOWONS" and current["gateArchiveRows"] == 1703 and len(current["reviewedFollowonDifferences"]) == 11,
        "productDiffEmpty": product_diff == [],
        "initialCopies22Plus3": copies["entryCount"] == 25 and copies["unchangedCount"] == 22 and copies["changedCount"] == 3 and copies["allChangesAreReviewedTooling"],
        "sourceBasis13Plus4": basis["priorCount"] == 13 and basis["currentCount"] == 17 and basis["unchangedPriorCount"] == 13 and len(basis["additions"]) == 4 and not basis["priorMismatches"],
        "prepArchivesIntact": ref_mismatches == 0,
        "packageGraphStable": all(all(prep[v]["packageGraphComparedWithPriorUnit"][key]["identical"]
                                       for key in ("packageSources", "tarballs"))
                                    and prep[v]["counts"]["packageSources"] == 53
                                    and prep[v]["counts"]["tarballs"] == 3
                                    and prep[v]["counts"]["installed"] == 6092 for v in ("v1", "v2", "v3")),
        "v1FailurePreserved": prep["v1"]["buildStatus"] == "STARTED" and prep["v1"]["frameCapture"] is None,
        "v2DeclineUnapproved": prep["v2"]["frameCapture"]["status"] == "FRAME_COMPILER_DECLINE_PENDING_PRIMARY_REVIEW",
        "v3AllFrameCompiles": prep["v3"]["frameCapture"]["status"] == "PASS" and prep["v3"]["frameCapture"]["motionCompiled"] == {"Position": True, "Rotation": True} and all(e["kind"] == "CompileSuccess" for e in prep["v3"]["frameCapture"]["events"]),
        "proofStatus": proof["status"] == proof["expectedStatus"] and proof["allSourceMatches"] and proof["outputsMatchAcrossArms"] and all(a["allLitPixelsNonzero"] for a in proof["arms"]),
        "proofContextsAndCleanup": proof["browserClosed"] and all(a["contextClosed"] and a["resourcesExpected"] == a["resourcesDisposed"] == 512 and a["duplicateDisposalEvents"] == 0 and a["stopped"] for a in proof["arms"]),
        "frame72CountersAndCleanup": False,
        "timingStatusAndChain": timing["status"] == timing["expectedStatus"] and all(x["matches"] for x in auth_chain.values()),
        "timingSourceAndCounters": timing["allSourceMatches"] and timing["sourceBeforeRows"] == timing["sourceAfterRows"] == 12367 and all(a["allSamplesCountersNull"] for a in timing["arms"]),
        "timingContextsAndCleanup": timing["browserClosed"] and all(a["contextClosed"] and a["resourcesExpected"] == a["resourcesDisposed"] == 512 and a["duplicateDisposalEvents"] == 0 and a["stopped"] for a in timing["arms"]),
        "astraProductionLock": astra_review_audit(gate_manifest)["productionAllMatchHead"] and astra_review_audit(gate_manifest)["allLockRowsMatchGateArchive"] and all(x["currentMatchesLock"] and x["matchesHead"] and x["gateArchiveRow"]
                                    for x in astra_review_audit(gate_manifest)["rows"]
                                    if x["path"].startswith(("src/", "compiler/"))),
        "cacheInventoryComplete": cache["status"] == "PASS",
    }
    # Explicit semantic frame observations and error absence.
    frame_proof = proof_arms["react-frame"]
    frame_first = frame_proof["firstUpdateCounters"] or {}
    semantic_checks["frame72CountersAndCleanup"] = (
        frame_proof.get("frameCountersEveryStep") is True
        and frame_first.get("frameCallbacks") == 257 and frame_first.get("motionCallbacks") == 256
        and frame_first.get("markerCallbacks") == 1 and frame_first.get("renderTakeovers") == 1
        and frame_first.get("controlCommitsDuringUpdate") == 0 and frame_first.get("drawsDuringAdvance") == 0
        and frame_proof["cleanup"].get("registeredFrameCallbacks") == 0
        and frame_proof["cleanup"].get("registeredSetters") == 0
        and frame_proof["cleanup"].get("rootStopped") is True
        and frame_proof["cleanup"].get("sceneChildren") == 0
        and frame_proof.get("teardownRenderCalls") == 72)
    native_cleanup = proof_arms["native"]["cleanup"]
    react_cleanup = proof_arms["react"]["cleanup"]
    semantic_checks["ownerSetterCleanup"] = (
        native_cleanup.get("ownerCount") == native_cleanup.get("pending") == native_cleanup.get("registeredSetters") == 0
        and native_cleanup.get("sceneChildren") == 0
        and react_cleanup.get("registeredSetters") == 0 and react_cleanup.get("sceneChildren") == 0)
    no_browser_errors = all(not report[field] for report in (proof, timing)
                            for field in ("requestFailures", "pageErrors", "consoleErrors", "errors", "cleanupErrors"))
    semantic_checks["noBrowserErrorsOrBlockedRequests"] = no_browser_errors and proof["blockedRequestCount"] == timing["blockedRequestCount"] == 0
    semantic_checks["noNativeTimingParity"] = all(check["nativeLosesBoth"] for path in parity.values() for check in
                                                   (path["publishMs"], path["updateThroughDrawMs"]))
    status = "PASS" if all(semantic_checks.values()) else "FAIL"
    audit = {"schemaVersion": 1, "createdAtUtc": datetime.now(timezone.utc).isoformat(), "status": status,
             "scope": "Read-only final evidence audit for the R3F frame baseline. No product changes, tests, browser runs, timing runs, cleanup, restore, or staging performed.",
             "auditExecution": {"preservedInitialFailure": {"supervisor": str((VERIFY / "audit-relatedlogs/receipts/final-audit-supervisor.json").relative_to(ROOT)),
                                                               "stderr": str((VERIFY / "audit-relatedlogs/receipts/final-audit-supervisor.stderr.log").relative_to(ROOT)),
                                                               "stderrSha256": sha(VERIFY / "audit-relatedlogs/receipts/final-audit-supervisor.stderr.log"),
                                                               "exitCode": read_json(VERIFY / "audit-relatedlogs/receipts/final-audit-supervisor.json").get("exitCode"),
                                                               "cause": "Auditor root-path parent index pointed one directory above repository; corrected before the final audit pass."},
                              "preservedScopeFailure": {"artifact": str((VERIFY / "audit-relatedlogs/receipts/final-audit-attempt-v2.json").relative_to(ROOT)),
                                                         "priorAuditStatus": "FAIL", "priorSupervisorExit": read_json(VERIFY / "audit-relatedlogs/receipts/final-audit-supervisor-v2.json").get("exitCode"),
                                                         "cause": "Compared the 1693 runner rows but omitted four changed files among the 10 archived context rows; corrected to compare all 1703 archived rows."}},
             "semanticChecks": semantic_checks,
             "gate": gate,
             "gateArchiveIntegrity": archive,
             "currentVsGate": current,
             "productionVsHead": {"head": HEAD, "diffPaths": product_diff, "clean": not product_diff},
             "initialCopies": copies, "r3fSourceBasis": basis,
             "installedPreparation": prep,
             "priorPackageGraph": {v: prep[v]["packageGraphComparedWithPriorUnit"] for v in ("v1", "v2", "v3")},
             "v1UnmanifestedRawFrameOutputs": orphan,
             "untimedBrowserProof": proof,
             "timing": {"authorization": auth, "authorizationChain": auth_chain, "result": timing,
                        "nativeParity": {"status": "FAIL" if all(c["nativeLosesBoth"] for p in parity.values() for c in p.values()) else "UNRESOLVED",
                                         "byReactPath": parity},
                        "nonClaims": ["One fixed-order observation is descriptive, not a causal old/new saving.",
                                      "No population-tail, presentation, automatic-frameloop, cold/memory, independent-device, or maintenance claim is established.",
                                      "The Native update-step and useFrame update-step have different semantics."]},
             "astraSourceLockedReview": astra_review_audit(gate_manifest),
             "cacheInventory": {"path": str(cache_path.relative_to(ROOT)), "count": cache["count"], "status": cache["status"], "cleanupPerformed": False},
             "auditErrors": []}
    summary = {"schemaVersion": 1, "status": status,
               "comparatorConformance": "PASS" if semantic_checks["proofStatus"] and semantic_checks["timingStatusAndChain"] else "FAIL",
               "nativeParity": audit["timing"]["nativeParity"]["status"],
               "gate": {"status": gate["status"], "phases": "72/72", "runtimeTests": 1147, "rustTests": 99, "compiledFixtures": "52/52", "archiveRows": "1693 runner + 10 context"},
               "preservedPreparationOutcomes": {v: {"buildStatus": prep[v]["buildStatus"], "frameCapture": prep[v]["frameCapture"]} for v in ("v1", "v2", "v3")},
               "archiveIntegrity": {"verified": archive["verifiedRows"], "rows": archive["archiveRows"], "mismatches": archive["mismatchCount"]},
               "sourceDisposition": {"currentVsGate": current["status"], "explicitFollowons": current["reviewedFollowonDifferences"], "productionVsHeadClean": not product_diff,
                                     "initialCopiedRows": {"total": copies["entryCount"], "unchanged": copies["unchangedCount"], "reviewedTooling": copies["changedCount"]},
                                     "sourceBasis": {"prior": basis["priorCount"], "same": basis["unchangedPriorCount"], "current": basis["currentCount"], "added": basis["additions"]}},
               "timing": {"status": timing["status"], "proofSha256": timing_doc.get("priorProofSha256"), "authorizationSha256": timing_doc.get("authorizationSha256"),
                          "order": timing["order"], "warmup": 12, "measured": 60, "statistics": timing["timingStats"], "countersNull": all(a["allSamplesCountersNull"] for a in timing["arms"])},
               "cacheInventory": audit["cacheInventory"],
               "auditPath": str((OUT / "final-audit.json").relative_to(ROOT)),
               "inventoryPath": str(cache_path.relative_to(ROOT))}
    (OUT / "final-audit.json").write_text(json.dumps(audit, indent=2) + "\n")
    (BASE / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps({"status": status, "failedChecks": [key for key, value in semantic_checks.items() if not value],
                      "gateArchive": {"rows": archive["archiveRows"], "mismatchCount": archive["mismatchCount"]},
                      "followons": {"count": len(current["reviewedFollowonDifferences"]), "unexpected": len(current["unexpectedDifferences"])},
                      "archiveReferenceMismatches": ref_mismatches, "cacheCount": cache["count"],
                      "audit": str((OUT / "final-audit.json").relative_to(ROOT)),
                      "summary": str((BASE / "summary.json").relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
