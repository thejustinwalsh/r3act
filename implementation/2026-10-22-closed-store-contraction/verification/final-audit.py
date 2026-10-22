#!/usr/bin/env python3
"""Read-only evidence audit for the closed Store contraction slice."""

from __future__ import annotations

import hashlib
import json
import math
import os
import pathlib
import subprocess
from datetime import datetime, timezone


ROOT = pathlib.Path(__file__).resolve().parents[3]
UNIT = ROOT / "implementation/2026-10-22-closed-store-contraction"
VERIFY = UNIT / "verification"
GATE = VERIFY / "darwin-v3"
PROOF = UNIT / "proof-canvas-v1"
OUT = VERIFY
FIXED_MANIFEST = VERIFY / "owned-generated-fixed-paths/manifest.json"
FOLLOWONS = {
    "README.md": "Reviewed maintained project documentation follow-on.",
    "final-master-plan.md": "Primary-maintained engineering guide follow-on.",
    "implementation-checkpoint.md": "Primary-maintained checkpoint follow-on.",
    "HANDOFF-PROMPT.txt": "Reviewed handoff documentation follow-on.",
    "RESEARCH-GUIDE.md": "Reviewed research guide follow-on.",
    "paper.md": "Reviewed paper follow-on, including the final whitespace cleanup.",
    "research.ipynb": "Reviewed research notebook follow-on.",
    "implementation/2026-10-22-closed-store-contraction/results.md": "Primary-maintained results follow-on.",
    "implementation/2026-10-22-closed-store-contraction/source-review.md": "Primary-maintained source-review follow-on.",
}


def read_json(path: pathlib.Path):
    return json.loads(path.read_text())


def sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def path_state(path: pathlib.Path):
    if path.is_symlink():
        return {"kind": "symlink", "target": os.readlink(path)}
    if path.is_file():
        return {"kind": "file", "sha256": sha256(path), "bytes": path.stat().st_size}
    return {"kind": "missing"}


def verify_archive_refs(document, label: str):
    refs = []

    def walk(value):
        if isinstance(value, dict):
            archive_path = value.get("archivePath")
            expected = value.get("sha256")
            if isinstance(archive_path, str) and isinstance(expected, str):
                candidate = pathlib.Path(archive_path)
                if not candidate.is_absolute():
                    candidate = ROOT / candidate
                actual = path_state(candidate)
                refs.append({
                    "archivePath": archive_path,
                    "expectedSha256": expected,
                    "expectedBytes": value.get("bytes"),
                    "actual": actual,
                    "matches": actual.get("kind") == "file"
                    and actual.get("sha256") == expected
                    and (value.get("bytes") is None or actual.get("bytes") == value.get("bytes")),
                })
            for nested in value.values():
                walk(nested)
        elif isinstance(value, list):
            for nested in value:
                walk(nested)

    walk(document)
    unique = {}
    conflicts = []
    for ref in refs:
        old = unique.get(ref["archivePath"])
        if old and (old["expectedSha256"] != ref["expectedSha256"] or old["matches"] != ref["matches"]):
            conflicts.append(ref)
        unique[ref["archivePath"]] = ref
    mismatches = [item for item in unique.values() if not item["matches"]]
    return {
        "document": label,
        "referenceRows": len(refs),
        "uniqueArchivePaths": len(unique),
        "verifiedUniquePaths": len(unique) - len(mismatches),
        "mismatchCount": len(mismatches),
        "conflicts": conflicts,
        "mismatches": mismatches,
    }


def gate_audit():
    receipt = read_json(GATE / "receipt.json")
    steps = receipt["steps"]
    deno = (GATE / "logs/deno-full.log").read_text(errors="replace")
    rust = (GATE / "logs/cargo-test.log").read_text(errors="replace")
    summary = next((line for line in reversed(deno.splitlines()) if line.startswith("ok | ")), None)
    rust_lines = [line for line in rust.splitlines() if line.startswith("test result:")]
    fixtures = [s for s in steps if s["name"].startswith("compiled-") and s["name"].split("-")[-1].isdigit()]
    failures = []
    for version in ("v1", "v2"):
        old = read_json(VERIFY / f"darwin-{version}/receipt.json")
        failures.append({
            "gate": f"darwin-{version[-1]}",
            "status": old["status"],
            "failedSteps": [
                {"name": s["name"], "exitCode": s.get("exitCode"), "log": s.get("log")}
                for s in old["steps"] if s["status"] != "PASS"
            ],
        })
    return {
        "status": receipt["status"],
        "actualPlatform": receipt.get("actual"),
        "stepCount": len(steps),
        "passedSteps": sum(s["status"] == "PASS" for s in steps),
        "failedSteps": [s for s in steps if s["status"] != "PASS"],
        "runtimeSummary": summary,
        "rustResults": rust_lines,
        "numberedCompiledFixtureCount": len(fixtures),
        "numberedCompiledFixturePassCount": sum(s["status"] == "PASS" for s in fixtures),
        "sourceAudit": receipt.get("sourceAudit"),
        "preservedEarlierFailures": failures,
    }


def archive_audit():
    before = read_json(GATE / "source-before.json")["inputs"]
    after = read_json(GATE / "source-after.json")["inputs"]
    archive = read_json(GATE / "source-archive.json")
    archived_root = GATE / "source-before/files"
    checks = []
    for row in archive["inputs"]:
        actual = path_state(archived_root / row["path"])
        matches = actual.get("kind") == "file" and actual.get("sha256") == row["sha256"] and actual.get("bytes") == row["bytes"]
        if not matches:
            checks.append({"path": row["path"], "expectedSha256": row["sha256"], "actual": actual, "kind": row.get("kind")})

    fixed = read_json(FIXED_MANIFEST)
    fixed_by_path = {item["path"]: item for item in fixed}
    fixed_checks = []
    for item in fixed:
        current = path_state(ROOT / item["path"])
        copy = path_state(ROOT / item["archivePath"])
        fixed_checks.append({
            "path": item["path"],
            "current": current,
            "matchesRestoredHead": current.get("kind") == "file" and current.get("sha256") == item["restoredHeadSha256"] and current.get("bytes") == item["restoredBytes"],
            "generatedArchiveCopy": copy,
            "archiveCopyMatchesGenerated": copy.get("kind") == "file" and copy.get("sha256") == item["generatedSha256"] and copy.get("bytes") == item["generatedBytes"],
        })

    current_differences = []
    exact_matches = 0
    for row in before:
        item_path = row["path"]
        expected = fixed_by_path[item_path]["restoredHeadSha256"] if item_path in fixed_by_path else row["sha256"]
        actual = path_state(ROOT / item_path)
        matches = actual.get("kind") == "file" and actual.get("sha256") == expected and actual.get("bytes") == row["bytes"]
        if matches:
            exact_matches += 1
        else:
            current_differences.append({
                "path": item_path,
                "gateSha256": row["sha256"],
                "expectedAfterRestore": expected,
                "current": actual,
                "documentedFollowon": FOLLOWONS.get(item_path),
            })

    context_changes = []
    for row in archive["inputs"]:
        if row.get("kind") != "context":
            continue
        actual = path_state(ROOT / row["path"])
        if actual.get("kind") != "file" or actual.get("sha256") != row["sha256"] or actual.get("bytes") != row["bytes"]:
            context_changes.append({"path": row["path"], "gateSha256": row["sha256"], "current": actual,
                                    "documentedFollowon": FOLLOWONS.get(row["path"])})

    runner = sum(x.get("kind") == "runner-input" for x in archive["inputs"])
    context = sum(x.get("kind") == "context" for x in archive["inputs"])
    return {
        "gateRunnerRows": len(before),
        "afterRunnerRows": len(after),
        "beforeAfterExact": before == after,
        "archiveRows": len(archive["inputs"]),
        "runnerArchiveRows": runner,
        "contextArchiveRows": context,
        "unavailableContext": archive.get("unavailableContext", []),
        "archiveVerifiedRows": len(archive["inputs"]) - len(checks),
        "archiveMismatches": checks,
        "currentRunnerExactMatchesAfterRestores": exact_matches,
        "currentRunnerDifferences": current_differences,
        "currentContextDifferences": context_changes,
        "fixedRestores": fixed_checks,
        "status": "PASS" if len(checks) == 0 and before == after and len(before) == runner
                  and len(archive["inputs"]) == 1665 and context == 10 and not archive.get("unavailableContext")
                  and all(x.get("documentedFollowon") for x in current_differences + context_changes)
                  and all(x["matchesRestoredHead"] and x["archiveCopyMatchesGenerated"] for x in fixed_checks)
                  else "FAIL",
    }


def preparation_audit():
    lock = read_json(PROOF / "input-lock.json")
    build = read_json(PROOF / "build-proof.json")
    lock_refs = verify_archive_refs(lock, "proof-canvas-v1/input-lock.json")
    build_refs = verify_archive_refs(build, "proof-canvas-v1/build-proof.json")
    copies = []
    for row in lock.get("inputs", []):
        if "/consumer/" not in row.get("archivePath", ""):
            continue
        source = path_state(pathlib.Path(row["path"]))
        archive = path_state(pathlib.Path(row["archivePath"]))
        copies.append({"path": row["path"], "expectedSha256": row["sha256"], "source": source, "archive": archive,
                       "matches": source.get("sha256") == row["sha256"] and archive.get("sha256") == row["sha256"]})
    for row in lock.get("rendererSourceBasis", []):
        source = path_state(pathlib.Path(row["path"]))
        archive = path_state(pathlib.Path(row["archivePath"]))
        copies.append({"path": row["path"], "expectedSha256": row["sha256"], "source": source, "archive": archive,
                       "matches": source.get("sha256") == row["sha256"] and archive.get("sha256") == row["sha256"]})
    captures = {name: read_json(PROOF / f"capture-{name}.json") for name in ("native", "react", "imperative")}
    native_owners = captures["native"].get("storeOwners", [])
    native_contract = all(owner.get("schemaVersion") == 7 and owner.get("inputCount") == 1
                          and owner.get("kernelInputCount") == 2 and owner.get("sinkCount") == 3
                          and owner.get("kernelPropNames") == ["position-x", "position-y", "rotation-z"]
                          and bool(owner.get("retainedChildProp")) and len(owner.get("stateSites", [])) == 1
                          and len(owner.get("effectSites", [])) == 1 for owner in native_owners)
    return {
        "inputLockStatus": lock.get("status"),
        "buildStatus": build.get("status"),
        "inputLockSha256": sha256(PROOF / "input-lock.json"),
        "buildProofSha256": sha256(PROOF / "build-proof.json"),
        "buildProofInputLockSha256": build.get("inputLockSha256"),
        "counts": {"consumerInputs": len(lock.get("inputs", [])), "staged": len(lock.get("staged", [])),
                   "packageSources": len(lock.get("packageSources", [])), "rendererSourceBasis": len(lock.get("rendererSourceBasis", [])),
                   "tarballs": len(lock.get("tarballs", [])), "installed": len(lock.get("installed", []))},
        "archiveIntegrity": [lock_refs, build_refs],
        "workloadAndBasisCopies": {"count": len(copies), "allMatch": len(copies) == 25 and all(x["matches"] for x in copies), "mismatches": [x for x in copies if not x["matches"]]},
        "nativeCapture": {"schemaVersions": sorted(set(x.get("schemaVersion") for x in native_owners)),
                          "owners": native_owners, "contractMatches": len(native_owners) == 2 and native_contract,
                          "nativePrograms": {"position": captures["native"].get("nativePositionProgram"), "rotation": captures["native"].get("nativeRotationProgram")}},
        "reactCapture": {"compilerEvents": captures["react"].get("compilerEvents", []),
                         "memoized": captures["react"].get("reactMemoized"), "comparator": captures["react"].get("primaryComparator")},
        "processes": {name: {"exit": value.get("exit"), "stopped": value.get("stopped"), "spawnError": value.get("spawnError")}
                      for name, value in build.get("processes", {}).items()},
        "archiveRefsPass": lock_refs["mismatchCount"] == 0 and build_refs["mismatchCount"] == 0,
    }


def frame_stats(samples):
    result = {}
    for field in ("publishMs", "updateThroughDrawMs", "stateAgeMs", "callbackMs", "rafIntervalMs"):
        values = sorted(float(sample[field]) for sample in samples)
        n = len(values)
        if n != 60:
            raise ValueError(f"expected 60 samples for {field}; got {n}")
        result[field] = {"n": n, "median": round((values[29] + values[30]) / 2, 4),
                         "p95NearestRank": round(values[math.ceil(.95 * n) - 1], 4), "unit": "ms"}
    return result


def browser_audit(filename: str, expected_phase: str, expected_status: str):
    doc = read_json(PROOF / filename)
    arms = []
    output_frames = []
    for arm in doc.get("arms", []):
        result = arm["result"]
        samples = result.get("samples", [])
        teardown = result.get("teardown", {})
        cleanup = teardown.get("cleanup", {})
        arms.append({
            "mode": arm.get("mode"), "contextClosed": arm.get("contextClosed"),
            "warmup": result.get("warmup"), "measuredSamples": len(samples),
            "retainedAllFrames": all(x.get("retained") is True for x in samples),
            "allCounts256": all(x.get("count") == 256 for x in samples),
            "cleanup": cleanup, "resourcesExpected": teardown.get("resourcesExpected"),
            "resourcesDisposed": teardown.get("resourcesDisposed"),
            "duplicateDisposalEvents": teardown.get("duplicateDisposalEvents"),
            "stopped": teardown.get("stopped"),
            "sampleCountersNull": all(x.get("counters") is None for x in samples),
        })
        output_frames.append([(x.get("epoch"), x.get("checksum"), x.get("pixelChecksum"), x.get("litPixels"), x.get("count"), x.get("retained")) for x in samples])
    before = doc.get("sourceBefore", [])
    after = doc.get("sourceAfter", [])
    matches = bool(output_frames) and all(frames == output_frames[0] for frames in output_frames[1:])
    return {
        "artifact": str((PROOF / filename).relative_to(ROOT)),
        "sha256": sha256(PROOF / filename), "status": doc.get("status"), "phase": doc.get("phase"),
        "expectedPhase": expected_phase, "expectedStatus": expected_status,
        "order": doc.get("order"), "workload": doc.get("workload"),
        "sourceBeforeRows": len(before), "sourceAfterRows": len(after),
        "sourceBeforeAllMatch": all(x.get("matches") for x in before), "sourceAfterAllMatch": all(x.get("matches") for x in after),
        "sourceAllMatch": all(x.get("matches") for x in before + after),
        "outputsMatchAcrossArms": matches, "browser": doc.get("browser"), "browserClosed": doc.get("browserClosed"),
        "renderers": doc.get("renderers"), "arms": arms,
        "blockedRequests": doc.get("blockedRequests", []), "requestFailures": doc.get("requestFailures", []),
        "pageErrors": doc.get("pageErrors", []), "consoleErrors": doc.get("consoleErrors", []),
        "errors": doc.get("errors", []), "cleanupErrors": doc.get("cleanupErrors", []),
        "statistics": {a["mode"]: frame_stats(a["result"]["samples"]) for a in doc.get("arms", [])} if doc.get("phase") == "timing" else None,
        "nativeKernelCounters": ({"firstUpdate": doc["arms"][0]["result"].get("firstUpdate", {}).get("counters"),
                                  "lastMeasured": doc["arms"][0]["result"].get("samples", [])[-1].get("counters"),
                                  "cleanup": doc["arms"][0]["result"].get("teardown", {}).get("cleanup", {}).get("counters")}
                                 if doc.get("phase") == "proof" and doc.get("arms") else None),
    }


def cache_inventory():
    result = subprocess.run(["git", "ls-files", "--others", "--exclude-standard", "-z", ".cache"], cwd=ROOT,
                            check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    names = [x.decode("utf-8", "surrogateescape") for x in result.stdout.split(b"\0") if x]
    items = [{"path": name, **path_state(ROOT / name)} for name in sorted(names)]
    return {"schemaVersion": 1, "scope": "Read-only raw inventory; no cache cleanup performed.",
            "command": "git ls-files --others --exclude-standard -z .cache", "count": len(items), "items": items}


def main():
    inventory = cache_inventory()
    inventory_path = OUT / "cache-raw-inventory.json"
    inventory_path.write_text(json.dumps(inventory, indent=2) + "\n")
    gate = gate_audit()
    source = archive_audit()
    prep = preparation_audit()
    proof = browser_audit("canvas-proof-one-shot.json", "proof", "PASS_MIXED_NUMERIC_R3F_CANVAS_UNTIMED_PROOF")
    timing = browser_audit("canvas-timing-one-shot.json", "timing", "PASS_MIXED_NUMERIC_R3F_CANVAS_DESCRIPTIVE_TIMING")
    authorization = read_json(PROOF / "canvas-timing-authorization.json")
    timing_raw = read_json(PROOF / "canvas-timing-one-shot.json")
    chain = {
        "buildProof": {"expected": authorization.get("buildProofSha256"), "actual": sha256(PROOF / "build-proof.json")},
        "inputLock": {"expected": authorization.get("inputLockSha256"), "actual": sha256(PROOF / "input-lock.json")},
        "untimedProof": {"expected": authorization.get("proofSha256"), "actual": sha256(PROOF / "canvas-proof-one-shot.json")},
        "authorization": {"expected": timing_raw.get("authorizationSha256"), "actual": sha256(PROOF / "canvas-timing-authorization.json")},
        "timingProofParent": {"expected": timing_raw.get("priorProofSha256"), "actual": sha256(PROOF / "canvas-proof-one-shot.json")},
    }
    for item in chain.values():
        item["matches"] = item["expected"] == item["actual"]

    semantic_checks = (
        gate["status"] == "PASS" and gate["stepCount"] == 72 and gate["passedSteps"] == 72
        and "1147 passed | 0 failed" in (gate["runtimeSummary"] or "")
        and any("99 passed; 0 failed" in x for x in gate["rustResults"])
        and gate["numberedCompiledFixtureCount"] == gate["numberedCompiledFixturePassCount"] == 52
        and source["status"] == "PASS" and prep["inputLockStatus"] == "PASS_MIXED_NUMERIC_R3F_CANVAS_PREPARATION"
        and prep["buildStatus"] == "PASS_MIXED_NUMERIC_R3F_CANVAS_BUILD" and prep["archiveRefsPass"]
        and prep["workloadAndBasisCopies"]["allMatch"] and prep["nativeCapture"]["contractMatches"]
        and proof["status"] == proof["expectedStatus"] and proof["phase"] == "proof"
        and proof["sourceAllMatch"] and proof["sourceBeforeRows"] == proof["sourceAfterRows"] == 12340
        and proof["outputsMatchAcrossArms"] and proof["browserClosed"]
        and timing["status"] == timing["expectedStatus"] and timing["phase"] == "timing"
        and timing["sourceAllMatch"] and timing["sourceBeforeRows"] == timing["sourceAfterRows"] == 12340
        and timing["outputsMatchAcrossArms"] and timing["browserClosed"]
        and all(x["matches"] for x in chain.values())
        and all(not proof[k] and not timing[k] for k in ("blockedRequests", "requestFailures", "pageErrors", "consoleErrors", "errors", "cleanupErrors"))
        and all(a["contextClosed"] and a["retainedAllFrames"] and a["allCounts256"] and a["stopped"]
                and a["resourcesExpected"] == a["resourcesDisposed"] == 512 and a["duplicateDisposalEvents"] == 0
                for a in proof["arms"] + timing["arms"])
        and all(a["cleanup"].get("sceneChildren") == 0 for a in proof["arms"] + timing["arms"])
        and all(a["cleanup"].get("registeredSetters") == 0 for a in proof["arms"] + timing["arms"]
                if "registeredSetters" in a["cleanup"])
        and all(a["cleanup"].get("ownerCount") == 0 and a["cleanup"].get("pending") == 0
                for a in proof["arms"] + timing["arms"] if a["mode"] == "native")
        and all(a["measuredSamples"] == 60 and a["warmup"] == 12 and a["sampleCountersNull"] for a in timing["arms"])
        and inventory["count"] == len(inventory["items"])
    )
    n = timing["statistics"]["native"]
    r = timing["statistics"]["react"]
    parity_fail = any(n[field][metric] > r[field][metric] for field in ("publishMs", "updateThroughDrawMs") for metric in ("median", "p95NearestRank"))
    results = {
        "schemaVersion": 1,
        "createdAtUtc": datetime.now(timezone.utc).isoformat(),
        "scope": "Read-only final evidence audit. It did not run tests/builds/browser/timing, mutate product sources, clean caches, restore files, or stage changes.",
        "status": "PASS" if semantic_checks else "FAIL",
        "semanticConformance": "PASS" if semantic_checks else "FAIL",
        "performanceParity": "FAIL" if parity_fail else "PASS",
        "gate": gate,
        "sourceIntegrity": source,
        "installedPreparation": prep,
        "untimedProof": proof,
        "timing": {"authorization": authorization, "authorizationChain": chain, "result": timing,
                   "performanceParity": "FAIL" if parity_fail else "PASS",
                   "nonClaims": ["No causal old/new saving is established.", "No presentation, cold/memory, independent-device, or idiomatic R3F useFrame claim is established."]},
        "cacheInventory": {"path": str(inventory_path.relative_to(ROOT)), "count": inventory["count"], "cleanupPerformed": False},
        "auditErrors": [
            "The first bounded invocation stopped before evidence inspection because an earlier-gate path was formed as darwin-1; its preserved stderr is /private/tmp/r3act-closed-store-final-audit-supervisor.stderr.log.",
            "The first completed audit pass marked semantic conformance FAIL because its predicate required an unreported registeredSetters field from the imperative arm. That field is not emitted for imperative teardown; the corrected predicate checks reported setter counts and the shared resource/scene cleanup evidence.",
        ],
        "auditExecutionHistory": [
            {"supervisor": "/private/tmp/r3act-closed-store-final-audit-supervisor.json", "exitCode": 1, "reason": "audit script path typo; failure preserved"},
            {"supervisor": "/private/tmp/r3act-closed-store-final-audit-supervisor-retry.json", "exitCode": 0, "reason": "audit completed; initial cleanup predicate was overly strict for imperative telemetry"},
        ],
    }
    (OUT / "final-audit.json").write_text(json.dumps(results, indent=2) + "\n")
    summary = {
        "schemaVersion": 1,
        "status": results["status"],
        "semanticConformance": results["semanticConformance"],
        "performanceParity": results["performanceParity"],
        "gate": {"darwinV3": f'{gate["status"]} {gate["passedSteps"]}/{gate["stepCount"]}',
                 "runtimeTests": 1147, "rustTests": 99, "numberedCompiledFixtures": "52/52 PASS",
                 "sourceArchiveRunnerRows": source["runnerArchiveRows"], "contextRows": source["contextArchiveRows"],
                 "archivedRowsVerified": source["archiveVerifiedRows"]},
        "preservedFailures": gate["preservedEarlierFailures"],
        "sourceHashes": {"beforeAfterExact": source["beforeAfterExact"], "archiveRows": source["archiveRows"],
                         "archiveVerifiedRows": source["archiveVerifiedRows"],
                         "currentRunnerExactMatchesAfterRestores": source["currentRunnerExactMatchesAfterRestores"],
                         "currentRunnerDifferences": source["currentRunnerDifferences"],
                         "currentContextDifferences": source["currentContextDifferences"],
                         "fixedRestoreChecks": source["fixedRestores"]},
        "installed": {"inputLockSha256": prep["inputLockSha256"], "buildProofSha256": prep["buildProofSha256"],
                      "inputLockArchiveRows": prep["archiveIntegrity"][0], "buildProofArchiveRows": prep["archiveIntegrity"][1],
                      "counts": prep["counts"], "workloadBasisCopies": prep["workloadAndBasisCopies"]},
        "browserProof": {"status": proof["status"], "sourceHashesMatch": proof["sourceAllMatch"],
                         "outputsMatch": proof["outputsMatchAcrossArms"], "browserClosed": proof["browserClosed"],
                         "arms": proof["arms"], "errors": proof["errors"]},
        "timing": {"status": timing["status"], "order": timing["order"], "warmupPerArm": 12,
                   "measuredPerArm": 60, "statistics": timing["statistics"], "sourceHashesMatch": timing["sourceAllMatch"],
                   "outputsMatch": timing["outputsMatchAcrossArms"], "countersNull": all(a["sampleCountersNull"] for a in timing["arms"])},
        "cacheInventory": results["cacheInventory"],
        "auditPath": str((OUT / "final-audit.json").relative_to(ROOT)),
        "inventoryPath": str(inventory_path.relative_to(ROOT)),
    }
    (UNIT / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps({"status": results["status"], "semanticConformance": results["semanticConformance"],
                      "performanceParity": results["performanceParity"], "gate": summary["gate"],
                      "archive": {"rows": source["archiveRows"], "verified": source["archiveVerifiedRows"],
                                 "currentRunnerDifferences": len(source["currentRunnerDifferences"]),
                                 "currentContextDifferences": len(source["currentContextDifferences"])},
                      "installed": prep["counts"], "cacheRawCount": inventory["count"],
                      "audit": summary["auditPath"], "summary": str((UNIT / "summary.json").relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
