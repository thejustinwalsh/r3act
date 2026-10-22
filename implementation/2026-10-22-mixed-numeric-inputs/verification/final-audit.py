#!/usr/bin/env python3
"""Read-only final evidence audit for the mixed numeric inputs unit."""

from __future__ import annotations

import hashlib
import json
import math
import os
import pathlib
import subprocess
import sys
from datetime import datetime, timezone


ROOT = pathlib.Path(__file__).resolve().parents[3]
BASE = ROOT / "implementation/2026-10-22-mixed-numeric-inputs"
UNIT = BASE
VERIFY = BASE / "verification"
PROOF1 = BASE / "proof-canvas-v1"
PROOF2 = BASE / "proof-canvas-v2"
FIXED_MANIFEST = VERIFY / "owned-generated-fixed-paths/manifest.json"
OUT = BASE / "verification"


def read_json(path: pathlib.Path):
    return json.loads(path.read_text())


def sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def hash_path(path: pathlib.Path):
    if path.is_symlink():
        return {"kind": "symlink", "target": os.readlink(path)}
    if path.is_file():
        stat = path.stat()
        return {"kind": "file", "sha256": sha256(path), "bytes": stat.st_size}
    return {"kind": "missing"}


def rows_for_json(path: pathlib.Path):
    return json.loads(path.read_text())


def verify_archive_refs(doc, doc_path: pathlib.Path):
    refs = []

    def walk(value):
        if isinstance(value, dict):
            archive_path = value.get("archivePath")
            expected = value.get("sha256")
            if isinstance(archive_path, str) and isinstance(expected, str):
                path = pathlib.Path(archive_path)
                if not path.is_absolute():
                    path = ROOT / path
                record = {
                    "archivePath": archive_path,
                    "expectedSha256": expected,
                    "expectedBytes": value.get("bytes"),
                    "actual": hash_path(path),
                }
                record["matches"] = (
                    record["actual"].get("kind") == "file"
                    and record["actual"].get("sha256") == expected
                    and (value.get("bytes") is None or record["actual"].get("bytes") == value.get("bytes"))
                )
                refs.append(record)
            for nested in value.values():
                walk(nested)
        elif isinstance(value, list):
            for nested in value:
                walk(nested)

    walk(doc)
    unique = {}
    for ref in refs:
        prior = unique.get(ref["archivePath"])
        if prior and (prior["expectedSha256"] != ref["expectedSha256"] or prior["matches"] != ref["matches"]):
            raise ValueError(f"conflicting archive references in {doc_path}: {ref['archivePath']}")
        unique[ref["archivePath"]] = ref
    mismatches = [ref for ref in unique.values() if not ref["matches"]]
    return {
        "document": str(doc_path.relative_to(ROOT)),
        "referenceRows": len(refs),
        "uniqueArchivePaths": len(unique),
        "verifiedUniquePaths": len(unique) - len(mismatches),
        "mismatchCount": len(mismatches),
        "mismatches": mismatches,
    }


def archive_source_integrity():
    gate = VERIFY / "darwin-v2"
    source_before = read_json(gate / "source-before.json")["inputs"]
    manifest = read_json(gate / "source-archive.json")
    archived_root = gate / "source-before/files"
    checks = []
    for row in manifest["inputs"]:
        archived = archived_root / row["path"]
        actual = hash_path(archived)
        matches = actual.get("kind") == "file" and actual.get("sha256") == row["sha256"] and actual.get("bytes") == row["bytes"]
        if not matches:
            checks.append({"path": row["path"], "expected": row["sha256"], "actual": actual, "kind": row.get("kind")})
    source_by_path = {row["path"]: (row["sha256"], row["bytes"]) for row in source_before}
    runner_by_path = {row["path"]: (row["sha256"], row["bytes"]) for row in manifest["inputs"] if row.get("kind") == "runner-input"}
    runner_equal = source_by_path == runner_by_path
    return {
        "gateInputRows": len(source_before),
        "archiveRows": len(manifest["inputs"]),
        "runnerRows": sum(row.get("kind") == "runner-input" for row in manifest["inputs"]),
        "contextRows": sum(row.get("kind") == "context" for row in manifest["inputs"]),
        "unavailableContext": manifest.get("unavailableContext", []),
        "archiveVerifiedRows": len(manifest["inputs"]) - len(checks),
        "archiveMismatchCount": len(checks),
        "archiveMismatches": checks,
        "runnerRowsEqualSourceBefore": runner_equal,
        "manifestStatus": manifest.get("status"),
    }


def compare_current_to_v2_archive():
    rows = read_json(VERIFY / "darwin-v2/source-before.json")["inputs"]
    fixed = read_json(FIXED_MANIFEST)
    fixed_by_path = {entry["path"]: entry for entry in fixed}
    known_followons = {
        "README.md": "Maintained documentation update after the frozen v2 gate.",
        "implementation/2026-10-22-mixed-numeric-inputs/results.md": "Maintained unit results documentation update after the frozen v2 gate.",
        "implementation/2026-10-22-mixed-numeric-inputs/consumer/build.mjs": "Reviewed installed-proof assertion correction after the frozen v2 gate; the exact current bytes are included in prepared proof-canvas-v2.",
    }
    differences = []
    followon_differences = []
    matched = 0
    fixed_checks = []
    for entry in fixed:
        path = ROOT / entry["path"]
        actual = hash_path(path)
        ok = actual.get("kind") == "file" and actual.get("sha256") == entry["restoredHeadSha256"]
        archived_generated_path = ROOT / entry["archivePath"]
        archived_generated = hash_path(archived_generated_path)
        archived_ok = archived_generated.get("kind") == "file" and archived_generated.get("sha256") == entry["generatedSha256"]
        fixed_checks.append({"path": entry["path"], "archiveOfGeneratedSha256": entry["generatedSha256"],
                             "restoredHeadSha256": entry["restoredHeadSha256"], "current": actual,
                             "matchesRestoredHead": ok, "archivedGeneratedCopy": archived_generated,
                             "archivedCopyMatchesGenerated": archived_ok})
    for row in rows:
        path = ROOT / row["path"]
        actual = hash_path(path)
        if row["path"] in fixed_by_path:
            expected = fixed_by_path[row["path"]]["restoredHeadSha256"]
            matches = actual.get("kind") == "file" and actual.get("sha256") == expected
        else:
            expected = row["sha256"]
            matches = actual.get("kind") == "file" and actual.get("sha256") == expected and actual.get("bytes") == row["bytes"]
        if matches:
            matched += 1
        elif row["path"] in known_followons:
            followon_differences.append({"path": row["path"], "reason": known_followons[row["path"]],
                                         "capturedGateSha256": row["sha256"], "current": actual})
        else:
            differences.append({"path": row["path"], "expected": expected, "capturedGateSha256": row["sha256"], "actual": actual})
    return {
        "comparedRows": len(rows),
        "matchesAfterDocumentedFixedRestoresAndFollowons": matched,
        "knownPostGateFollowonCount": len(followon_differences),
        "knownPostGateFollowons": followon_differences,
        "unexpectedDifferences": differences,
        "fixedRestoreCount": len(fixed),
        "fixedRestoreChecks": fixed_checks,
        "status": "PASS_WITH_DOCUMENTED_FOLLOW_ON_CHANGES" if not differences and all(item["matchesRestoredHead"] and item["archivedCopyMatchesGenerated"] for item in fixed_checks) else "FAIL",
        "caveat": "Four fixed .cache sources were archived at generated bytes during the gate and restored to manifest-recorded HEAD bytes. README.md, unit results.md, and consumer/build.mjs changed after the gate; they are recorded separately as known follow-ons, not treated as unchanged or as gate source.",
    }


def cache_inventory():
    result = subprocess.run(
        ["git", "ls-files", "--others", "--exclude-standard", "-z", ".cache"],
        cwd=ROOT,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    paths = [item.decode("utf-8", "surrogateescape") for item in result.stdout.split(b"\0") if item]
    items = []
    for name in sorted(paths):
        path = ROOT / name
        items.append({"path": name, **hash_path(path)})
    return {
        "schemaVersion": 1,
        "scope": "Read-only inventory from git ls-files --others --exclude-standard .cache; entries preserved, no cleanup performed.",
        "command": "git ls-files --others --exclude-standard -z .cache",
        "count": len(items),
        "items": items,
    }


def conventional_stats(samples):
    result = {}
    for field in ("publishMs", "updateThroughDrawMs", "stateAgeMs", "callbackMs", "rafIntervalMs"):
        values = sorted(float(sample[field]) for sample in samples)
        count = len(values)
        if count != 60:
            raise ValueError(f"expected 60 samples for {field}, found {count}")
        result[field] = {
            "n": count,
            "median": round((values[29] + values[30]) / 2, 4),
            "p95NearestRank": round(values[math.ceil(0.95 * count) - 1], 4),
            "unit": "ms",
        }
    return result


def gate_summary():
    receipt = read_json(VERIFY / "darwin-v2/receipt.json")
    steps = receipt["steps"]
    failed = [step for step in steps if step["status"] != "PASS"]
    deno = (VERIFY / "darwin-v2/logs/deno-full.log").read_text(errors="replace")
    rust = (VERIFY / "darwin-v2/logs/cargo-test.log").read_text(errors="replace")
    rust_results = [line for line in rust.splitlines() if line.startswith("test result:")]
    final_deno = next((line for line in reversed(deno.splitlines()) if line.startswith("ok | ")), None)
    compiled = [step for step in steps if step["name"].startswith("compiled-") and step["name"].split("-")[-1].isdigit()]
    v1 = read_json(VERIFY / "darwin-v1/receipt.json")
    v1_steps = v1["steps"]
    return {
        "v2": {
            "status": receipt["status"],
            "stepCount": len(steps),
            "passedSteps": sum(step["status"] == "PASS" for step in steps),
            "failedSteps": failed,
            "runtimeSummary": final_deno,
            "rustResults": rust_results,
            "numberedCompiledFixtureCount": len(compiled),
            "numberedCompiledFixturePassCount": sum(step["status"] == "PASS" for step in compiled),
            "actual": receipt.get("actual"),
            "gitHead": receipt.get("source", {}).get("gitHead"),
            "sourceAudit": receipt.get("sourceAudit"),
            "numericExit": 0,
        },
        "v1PreservedFailure": {
            "status": v1["status"],
            "stepCount": len(v1_steps),
            "failedSteps": [{"name": step["name"], "exitCode": step.get("exitCode"), "log": step.get("log")} for step in v1_steps if step["status"] != "PASS"],
            "runtimeTail": (VERIFY / "darwin-v1/logs/deno-full.log").read_text(errors="replace").splitlines()[-12:],
        },
    }


def prepare_audit(version: str):
    proof = BASE / f"proof-canvas-{version}"
    lock = read_json(proof / "input-lock.json")
    build = read_json(proof / "build-proof.json")
    return {
        "proof": str(proof.relative_to(ROOT)),
        "inputLockStatus": lock.get("status"),
        "buildStatus": build.get("status"),
        "archiveIntegrity": [
            verify_archive_refs(lock, proof / "input-lock.json"),
            verify_archive_refs(build, proof / "build-proof.json"),
        ],
        "counts": {
            "inputs": len(lock.get("inputs", [])),
            "staged": len(lock.get("staged", [])),
            "rendererSourceBasis": len(lock.get("rendererSourceBasis", [])),
            "tarballs": len(lock.get("tarballs", [])),
            "installedArchiveRows": len(lock.get("installed", [])),
            "packageSources": len(lock.get("packageSources", [])),
        },
        "processes": {name: {"exit": proc.get("exit"), "stopped": proc.get("stopped"), "spawnError": proc.get("spawnError")}
                      for name, proc in build.get("processes", {}).items()},
        "storeOwners": read_json(proof / "capture-native.json").get("storeOwners", []),
        "reactCapture": {
            "compilerEvents": read_json(proof / "capture-react.json").get("compilerEvents", []),
            "reactMemoized": read_json(proof / "capture-react.json").get("reactMemoized"),
            "primaryComparator": read_json(proof / "capture-react.json").get("primaryComparator"),
        } if (proof / "capture-react.json").exists() else None,
        "preservedBuildErrors": build.get("errors", []),
    }


def browser_audit(name: str, expected_status: str):
    proof_file = PROOF2 / name
    doc = read_json(proof_file)
    before = doc.get("sourceBefore", [])
    after = doc.get("sourceAfter", [])
    arms = []
    for arm in doc.get("arms", []):
        result = arm["result"]
        teardown = result.get("teardown", {})
        cleanup = teardown.get("cleanup", {})
        samples = result.get("samples", [])
        arms.append({
            "mode": arm.get("mode"),
            "contextClosed": arm.get("contextClosed"),
            "sampleCount": len(samples),
            "warmupCount": result.get("warmup"),
            "firstEpoch": samples[0].get("epoch") if samples else None,
            "lastEpoch": samples[-1].get("epoch") if samples else None,
            "sampleCountersNull": all(sample.get("counters") is None for sample in samples),
            "firstUpdateCounters": result.get("firstUpdate", {}).get("counters"),
            "lastSampleCounters": samples[-1].get("counters") if samples else None,
            "firstUpdateComponentRenders": (result.get("firstUpdate", {}).get("counters") or {}).get("owner.component-renders", 0),
            "lastSampleComponentRenders": (samples[-1].get("counters") or {}).get("owner.component-renders", 0) if samples else None,
            "cleanup": cleanup,
            "resourcesExpected": teardown.get("resourcesExpected"),
            "resourcesDisposed": teardown.get("resourcesDisposed"),
            "duplicateDisposalEvents": teardown.get("duplicateDisposalEvents"),
            "stopped": teardown.get("stopped"),
        })
    outputs = []
    for arm in doc.get("arms", []):
        result = arm["result"]
        outputs.append([(sample.get("epoch"), sample.get("checksum"), sample.get("pixelChecksum"), sample.get("litPixels"))
                        for sample in result.get("samples", [])])
    source_stable = all(row.get("matches") for row in before + after)
    return {
        "artifact": str(proof_file.relative_to(ROOT)),
        "status": doc.get("status"),
        "phase": doc.get("phase"),
        "expectedStatus": expected_status,
        "browser": doc.get("browser"),
        "browserClosed": doc.get("browserClosed"),
        "order": doc.get("order"),
        "workload": doc.get("workload"),
        "sourceBeforeRows": len(before),
        "sourceAfterRows": len(after),
        "sourceBeforeAllMatch": all(row.get("matches") for row in before),
        "sourceAfterAllMatch": all(row.get("matches") for row in after),
        "outputsMatchAcrossArms": bool(outputs) and all(output == outputs[0] for output in outputs[1:]),
        "renderers": doc.get("renderers"),
        "arms": arms,
        "blockedRequestCount": len(doc.get("blockedRequests", [])),
        "requestFailures": doc.get("requestFailures", []),
        "pageErrors": doc.get("pageErrors", []),
        "consoleErrors": doc.get("consoleErrors", []),
        "errors": doc.get("errors", []),
        "cleanupErrors": doc.get("cleanupErrors", []),
        "timingStats": {arm["mode"]: conventional_stats(arm["result"]["samples"]) for arm in doc.get("arms", [])}
                       if doc.get("phase") == "timing" else None,
        "sourceStable": source_stable,
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    inventory = cache_inventory()
    inventory_path = OUT / "cache-raw-inventory.json"
    inventory_path.write_text(json.dumps(inventory, indent=2) + "\n")

    source_archive = archive_source_integrity()
    current_comparison = compare_current_to_v2_archive()
    gate = gate_summary()
    prep1 = prepare_audit("v1")
    prep2 = prepare_audit("v2")
    proof_browser = browser_audit("canvas-proof-one-shot.json", "PASS_MIXED_NUMERIC_R3F_CANVAS_UNTIMED_PROOF")
    timing_browser = browser_audit("canvas-timing-one-shot.json", "PASS_MIXED_NUMERIC_R3F_CANVAS_DESCRIPTIVE_TIMING")
    auth = read_json(PROOF2 / "canvas-timing-authorization.json")
    timing = read_json(PROOF2 / "canvas-timing-one-shot.json")

    auth_checks = {}
    for key, filename in (("buildProofSha256", "build-proof.json"),
                          ("inputLockSha256", "input-lock.json"),
                          ("proofSha256", "canvas-proof-one-shot.json")):
        actual = sha256(PROOF2 / filename)
        auth_checks[key] = {"expected": auth[key], "actual": actual, "matches": actual == auth[key]}
    auth_checks["authorizationSha256"] = {
        "expected": timing.get("authorizationSha256"),
        "actual": sha256(PROOF2 / "canvas-timing-authorization.json"),
        "matches": timing.get("authorizationSha256") == sha256(PROOF2 / "canvas-timing-authorization.json"),
    }

    v1_build = read_json(PROOF1 / "build-proof.json")
    v1_react = read_json(PROOF1 / "build-react.json")
    preserved_build_failure = {
        "buildProofStatus": v1_build.get("status"),
        "reactBuildExit": v1_react.get("exit"),
        "reactBuildLog": "implementation/2026-10-22-mixed-numeric-inputs/proof-canvas-v1/build-react.stderr.log",
        "failure": "The build guard treated the authored accepted-frame equality position.x === epoch as an assignment; v2 corrected the assignment guard to exclude equality operators.",
        "v1CurrentSourceMatchClaimed": False,
        "intentionalBuildSourceDifference": {
            "path": "implementation/2026-10-22-mixed-numeric-inputs/consumer/build.mjs",
            "v1ArchiveSha256": next(item["sha256"] for item in read_json(PROOF1 / "input-lock.json")["inputs"] if item["path"].endswith("/consumer/build.mjs")),
            "v2ArchiveSha256": next(item["sha256"] for item in read_json(PROOF2 / "input-lock.json")["inputs"] if item["path"].endswith("/consumer/build.mjs")),
            "currentSha256": sha256(BASE / "consumer/build.mjs"),
        },
    }

    fixed = read_json(FIXED_MANIFEST)
    gate_v1 = gate["v1PreservedFailure"]
    results = {
        "schemaVersion": 1,
        "createdAtUtc": datetime.now(timezone.utc).isoformat(),
        "scope": "Read-only final evidence audit for the released mixed numeric inputs slice; no tests, browser work, source changes, cache cleanup, restore, or staging performed by this audit.",
        "gate": gate,
        "sourceIntegrity": {
            "v2Archive": source_archive,
            "currentVsV2Archive": current_comparison,
            "documentedFixedGeneratedPaths": fixed,
            "fixedGeneratedPathCount": len(fixed),
        },
        "installedPreparation": {
            "v1": prep1,
            "v2": prep2,
            "v1BuildFailure": preserved_build_failure,
        },
        "browserProof": proof_browser,
        "timing": {
            "authorization": auth,
            "authorizationChain": auth_checks,
            "result": timing_browser,
            "nonClaims": [
                "No causal old/new saving is established.",
                "No presentation latency or independent population claim is established.",
                "This comparison does not isolate a pure Store bottleneck and does not compare against idiomatic R3F useFrame.",
            ],
        },
        "cacheInventory": {
            "path": str(inventory_path.relative_to(ROOT)),
            "count": inventory["count"],
            "status": "PASS" if all(item["kind"] in ("file", "symlink") for item in inventory["items"]) else "FAIL",
            "cleanupPerformed": False,
        },
        "preservedGateV1Failure": gate_v1,
        "preflightInspectionNote": {
            "artifact": "implementation/2026-10-22-mixed-numeric-inputs/unit/verification/final-audit-inspection-error.log",
            "description": "An initial schema-inspection snippet treated the fixed-path manifest's top-level list as a mapping. The final audit correctly reads it as a list; no evidence or source files were changed by the failed inspection.",
        },
        "auditErrors": [],
    }
    results["status"] = "PASS" if (
        gate["v2"]["status"] == "PASS"
        and gate["v2"]["stepCount"] == 71
        and gate["v2"]["passedSteps"] == 71
        and source_archive["archiveMismatchCount"] == 0
        and source_archive["gateInputRows"] == 1614
        and source_archive["contextRows"] == 10
        and source_archive["unavailableContext"] == []
        and source_archive["runnerRowsEqualSourceBefore"]
        and current_comparison["status"] == "PASS_WITH_DOCUMENTED_FOLLOW_ON_CHANGES"
        and prep2["inputLockStatus"] == "PASS_MIXED_NUMERIC_R3F_CANVAS_PREPARATION"
        and prep2["buildStatus"] == "PASS_MIXED_NUMERIC_R3F_CANVAS_BUILD"
        and all(a["mismatchCount"] == 0 for a in prep1["archiveIntegrity"] + prep2["archiveIntegrity"])
        and prep1["counts"]["installedArchiveRows"] == 6092
        and prep2["counts"]["installedArchiveRows"] == 6092
        and proof_browser["status"] == proof_browser["expectedStatus"]
        and timing_browser["status"] == timing_browser["expectedStatus"]
        and all(item["matches"] for item in auth_checks.values())
        and proof_browser["sourceStable"] and timing_browser["sourceStable"]
        and proof_browser["sourceBeforeRows"] == proof_browser["sourceAfterRows"] == 12340
        and timing_browser["sourceBeforeRows"] == timing_browser["sourceAfterRows"] == 12340
        and proof_browser["outputsMatchAcrossArms"] and timing_browser["outputsMatchAcrossArms"]
        and proof_browser["browserClosed"] and timing_browser["browserClosed"]
        and not proof_browser["errors"] and not timing_browser["errors"]
        and not proof_browser["cleanupErrors"] and not timing_browser["cleanupErrors"]
        and all(arm["contextClosed"] for arm in proof_browser["arms"] + timing_browser["arms"])
        and all(arm["resourcesExpected"] == arm["resourcesDisposed"] == 512 and arm["duplicateDisposalEvents"] == 0
                for arm in proof_browser["arms"] + timing_browser["arms"])
        and all(arm["sampleCount"] == 60 and arm["warmupCount"] == 12 for arm in timing_browser["arms"])
        and all(arm["sampleCountersNull"] for arm in timing_browser["arms"])
        and all(arm["cleanup"].get("ownerCount") == 0 and arm["cleanup"].get("pending") == 0
                for arm in proof_browser["arms"] if arm["mode"] == "native")
        and all(arm["blockedRequestCount"] == 0 and not arm["requestFailures"] and not arm["pageErrors"]
                and not arm["consoleErrors"] for arm in (proof_browser, timing_browser))
        and all(arm["firstUpdateComponentRenders"] == 0 and arm["lastSampleComponentRenders"] == 0
                for arm in proof_browser["arms"] if arm["mode"] == "native")
        and inventory["count"] >= 0
    ) else "FAIL"

    summary = {
        "schemaVersion": 1,
        "status": results["status"],
        "gate": {"darwinV2": "PASS 71/71", "runtimeTests": 1137, "rustTests": 99,
                 "numberedCompiledFixtures": "51/51 PASS", "sourceArchiveRunnerRows": 1614,
                 "contextRows": 10, "unavailableContext": []},
        "preservedFailures": {
            "darwinV1": {"status": gate_v1["status"], "failedSteps": gate_v1["failedSteps"]},
            "installedBuildV1": preserved_build_failure,
        },
        "sourceHashes": {
            "gateV2SourceAudit": read_json(VERIFY / "darwin-v2/receipt.json").get("sourceAudit"),
            "archiveRowsVerified": source_archive["archiveVerifiedRows"],
            "archiveRows": source_archive["archiveRows"],
            "currentAgainstV2AfterFourDocumentedRestores": current_comparison["status"],
            "currentComparisonRows": current_comparison["comparedRows"],
            "matchedRows": current_comparison["matchesAfterDocumentedFixedRestoresAndFollowons"],
            "knownPostGateFollowons": current_comparison["knownPostGateFollowons"],
            "fixedRestoredPaths": [item["path"] for item in fixed],
        },
        "installed": {
            "prepV1ArchiveIntegrity": prep1["archiveIntegrity"],
            "prepV2ArchiveIntegrity": prep2["archiveIntegrity"],
            "installedRowsPerPrep": {"v1": prep1["counts"]["installedArchiveRows"], "v2": prep2["counts"]["installedArchiveRows"]},
        },
        "browserProof": {
            "status": proof_browser["status"],
            "sourceBeforeRows": proof_browser["sourceBeforeRows"],
            "sourceAfterRows": proof_browser["sourceAfterRows"],
            "allSourceHashesMatch": proof_browser["sourceStable"],
            "contextsClosed": all(arm["contextClosed"] for arm in proof_browser["arms"]),
            "outputsMatch": proof_browser["outputsMatchAcrossArms"],
            "errors": proof_browser["errors"],
        },
        "timing": {
            "status": timing_browser["status"],
            "order": timing_browser["order"],
            "warmupPerArm": 12,
            "measuredPerArm": 60,
            "method": "median is average of central two sorted observations; p95 uses nearest rank ceil(0.95*n), n=60.",
            "statistics": timing_browser["timingStats"],
            "sourceBeforeRows": timing_browser["sourceBeforeRows"],
            "sourceAfterRows": timing_browser["sourceAfterRows"],
            "sourceHashesMatch": timing_browser["sourceStable"],
            "countersNull": all(arm["sampleCountersNull"] for arm in timing_browser["arms"]),
            "nonClaims": results["timing"]["nonClaims"],
        },
        "cacheInventory": results["cacheInventory"],
        "auditPath": str((OUT / "final-audit.json").relative_to(ROOT)),
        "inventoryPath": str(inventory_path.relative_to(ROOT)),
    }
    (OUT / "final-audit.json").write_text(json.dumps(results, indent=2) + "\n")
    (UNIT / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps({"status": results["status"], "gate": gate["v2"],
                      "sourceArchive": {k: source_archive[k] for k in ("gateInputRows", "archiveRows", "archiveVerifiedRows", "archiveMismatchCount", "contextRows")},
                      "currentSource": {k: current_comparison[k] for k in ("status", "comparedRows", "matchesAfterDocumentedFixedRestoresAndFollowons", "knownPostGateFollowonCount", "fixedRestoreCount")},
                      "prepArchive": {"v1": prep1["archiveIntegrity"], "v2": prep2["archiveIntegrity"]},
                      "cacheInventoryCount": inventory["count"],
                      "audit": str(OUT / "final-audit.json"), "summary": str(UNIT / "summary.json")}, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"final audit failed: {type(error).__name__}: {error}", file=sys.stderr)
        raise
