#!/usr/bin/env python3
"""Static audit of the reviewed linear-scalar slice receipts; runs no workloads."""

from __future__ import annotations

import hashlib
import json
import math
import pathlib
import statistics
import subprocess
import sys
from typing import Any


ROOT = pathlib.Path(__file__).resolve().parents[3]
UNIT = ROOT / "implementation/2026-10-22-linear-scalar-targets"
VERIFY = UNIT / "verification"
HMR = ROOT / "implementation/2026-10-22-hmr-source-delivery"
OUT = VERIFY / "final-audit.json"
SUPPLEMENT = VERIFY / "audit-summary.json"
issues: list[str] = []


def check(condition: bool, message: str) -> None:
    if not condition:
        issues.append(message)


def read(path: pathlib.Path) -> Any:
    return json.loads(path.read_text())


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def file_sha(path: pathlib.Path) -> str | None:
    try:
        return sha(path.read_bytes())
    except OSError:
        return None


def p95_nearest_rank(values: list[float]) -> float:
    ordered = sorted(values)
    return ordered[math.ceil(0.95 * len(ordered)) - 1]


def median(values: list[float]) -> float:
    return statistics.median(values)


def summary_receipt(path: pathlib.Path) -> dict[str, Any]:
    d = read(path)
    steps = d["steps"]
    counts: dict[str, int] = {}
    for s in steps:
        counts[s["status"]] = counts.get(s["status"], 0) + 1
    return {
        "status": d["status"],
        "executionKind": d["executionKind"],
        "actualPlatform": d["actual"],
        "phaseCount": len(steps),
        "phaseCounts": counts,
        "failedPhases": [
            {"name": s["name"], "status": s["status"], "log": s.get("log")}
            for s in steps if s["status"] != "PASS"
        ],
        "sourceAudit": d.get("sourceAudit"),
        "sourceInputCount": d["source"]["inputCount"],
        "rawArchive": d["source"]["rawArchive"],
    }


def gate_audit() -> dict[str, Any]:
    out: dict[str, Any] = {}
    wanted = {
        "darwin-v1": ("FAIL", 74, 73, 1, 0, 1973, 1963, 293),
        "darwin-v2": ("PASS", 74, 74, 0, 1232, 1974, 1964, 290),
        "darwin-v3": ("PASS", 74, 74, 0, 1232, 1981, 1971, 290),
    }
    for version, (status, n, passed, failed, deno_count, archive_count, runner_count, fixture_count) in wanted.items():
        directory = VERIFY / version
        receipt = read(directory / "receipt.json")
        report = summary_receipt(directory / "receipt.json")
        archive = read(directory / "source-archive.json")
        fixture = read(directory / "fixture-artifacts.json")
        steps = receipt["steps"]
        check(receipt["status"] == status, f"{version}: unexpected status {receipt['status']}")
        check(len(steps) == n, f"{version}: expected {n} phases, got {len(steps)}")
        check(report["phaseCounts"].get("PASS", 0) == passed, f"{version}: pass phase count mismatch")
        check(report["phaseCounts"].get("FAIL", 0) == failed, f"{version}: fail phase count mismatch")
        check(archive["status"] == "ARCHIVED_BEFORE_PRODUCT_COMMANDS", f"{version}: archive status mismatch")
        check(len(archive["inputs"]) == archive_count, f"{version}: archive record count mismatch")
        runner_archived = sum(e.get("kind") == "runner-input" for e in archive["inputs"])
        context_archived = sum(e.get("kind") == "context" for e in archive["inputs"])
        check(runner_archived == runner_count, f"{version}: runner archive count mismatch")
        check(context_archived == 10, f"{version}: expected 10 context records, got {context_archived}")
        check(len(fixture["files"]) == fixture_count, f"{version}: archived fixture-artifact count mismatch")
        compiled = [s for s in steps if s["name"].startswith("compiled-") and s["name"][9:].isdigit()]
        check(len(compiled) == 54 and all(s["status"] == "PASS" for s in compiled), f"{version}: compiled phases not 54/54 PASS")
        if version == "darwin-v1":
            deno = next(s for s in steps if s["name"] == "deno-full")
            check(deno["status"] == "FAIL", "darwin-v1: Deno failure not preserved")
            check(not any(s["name"].startswith("deno-runtime") for s in steps), "darwin-v1: unexpected Deno runtime phase recorded")
            check(deno_count == 0, "darwin-v1: expected zero Deno runtime tests")
            log = (directory / deno["log"]).read_text(errors="replace")
            report["denoFailureEvidence"] = {
                "log": deno["log"],
                "containsNullableCandidateDiagnostics": "candidate" in log and "TS" in log,
                "runtimeTestsExecuted": 0,
            }
            check("candidate" in log and "TS" in log, "darwin-v1: expected nullable-candidate type errors absent from log")
        else:
            deno = next(s for s in steps if s["name"] == "deno-full")
            deno_summary = deno.get("summary", {})
            # The phase's archived output is authoritative when summary fields are absent.
            log = (directory / deno["log"]).read_text(errors="replace")
            report["denoRuntimeTestCount"] = deno_summary.get("testsPassed") or deno_summary.get("passed")
            if report["denoRuntimeTestCount"] is None:
                import re
                matches = re.findall(r"(\d+) passed", log)
                report["denoRuntimeTestCount"] = int(matches[-1]) if matches else None
            check(report["denoRuntimeTestCount"] == deno_count, f"{version}: Deno runtime test count not {deno_count}")
        report["archiveCounts"] = {
            "total": len(archive["inputs"]),
            "runnerInputs": runner_archived,
            "contextInputs": context_archived,
            "fixtureArtifacts": len(fixture["files"]),
        }
        before = read(directory / "source-before.json")["inputs"]
        after = read(directory / "source-after.json")["inputs"]
        equal = before == after
        report["sourceBeforeAfterExactMatch"] = equal
        check(equal, f"{version}: source-before and source-after inventories differ")
        check(len(before) == runner_count, f"{version}: source input count differs from runner archive")
        if version != "darwin-v1":
            report["numberedCompiledPhases"] = {"pass": len(compiled), "total": 54}
        out[version] = report
    return out


def reviewed_manifests() -> dict[str, Any]:
    specs = [
        (UNIT / "reviewed-source-v2.json", "linear scalar v2", 26),
        (HMR / "reviewed-source-v5.json", "HMR v5", 13),
    ]
    reports = []
    for path, label, expected_count in specs:
        manifest = read(path)
        rows = []
        for entry in manifest["files"]:
            actual = file_sha(ROOT / entry["path"])
            match = actual == entry["sha256"]
            rows.append({"path": entry["path"], "expectedSha256": entry["sha256"], "actualSha256": actual, "matches": match})
            check(match, f"{label}: reviewed source hash mismatch {entry['path']}")
        check(len(rows) == expected_count, f"{label}: expected {expected_count} reviewed files, got {len(rows)}")
        reports.append({"name": label, "manifest": str(path.relative_to(ROOT)), "fileCount": len(rows), "allMatch": all(x["matches"] for x in rows), "files": rows})
    return {"manifests": reports}


def installed_proof() -> dict[str, Any]:
    d = read(UNIT / "proof-canvas-v1/canvas-proof-one-shot.json")
    check(d["status"] == "PASS_R3F_FRAME_BASELINES_CANVAS_UNTIMED_PROOF", "installed proof status mismatch")
    contexts = [(a["mode"], a) for a in d["arms"] + d["deliveryArms"]]
    check(len(contexts) == 6, f"installed proof expected six contexts, got {len(contexts)}")
    signatures = []
    context_reports = []
    for mode, arm in contexts:
        r = arm["result"]
        mount = r["mount"]
        all_frames = r["warmupSamples"] + r["samples"]
        epochs = [x["epoch"] for x in all_frames]
        checksum_count_pixel = {(x.get("checksum"), x.get("count"), x.get("pixelChecksum"), x.get("litPixels"), x.get("retained")) for x in all_frames}
        resources = r.get("teardown", {})
        expected, disposed = resources.get("resourcesExpected"), resources.get("resourcesDisposed")
        check(arm.get("contextClosed") is True, f"installed proof {mode}: context did not close")
        check(len(r["warmupSamples"]) == 12 and len(r["samples"]) == 60, f"installed proof {mode}: expected 12 warmup plus 60 measured frames")
        check(len(epochs) == 72 and len(set(epochs)) == 72, f"installed proof {mode}: expected 72 unique warmup/measured epochs")
        check(mount.get("count") == 256 and mount.get("retained") is True, f"installed proof {mode}: mount identity/count mismatch")
        check(expected == disposed == 512 and resources.get("duplicateDisposalEvents") == 0, f"installed proof {mode}: resource disposal mismatch")
        signatures.append(checksum_count_pixel)
        context_reports.append({"mode": mode, "contextClosed": arm.get("contextClosed"), "warmupFrames": len(r["warmupSamples"]), "measuredFrames": len(r["samples"]), "uniqueEpochs": len(set(epochs)), "mount": mount, "resourceExpected": expected, "resourceDisposed": disposed, "duplicateDisposals": resources.get("duplicateDisposalEvents")})
    check(all(s == signatures[0] for s in signatures[1:]), "installed proof: output/pixel/retention results differ between contexts")
    native_reports = []
    for mode, arm in contexts:
        if mode not in ("native", "native-minified", "native-rebundled"):
            continue
        samples = arm["result"]["samples"]
        increments = []
        prev: dict[str, int] | None = None
        for sample in samples:
            counters = sample.get("counters") or {}
            vals = {
                "bucket-builds": counters.get("store.scalar-target.bucket-builds"),
                "member-visits": counters.get("store.scalar-target.member-visits"),
                "owner-index-visits": counters.get("store.scalar-target.owner-index-visits"),
                "owner-lookups": counters.get("store.scalar-target.owner-lookups"),
            }
            if prev:
                increments.append({k: vals[k] - prev[k] for k in vals if vals[k] is not None and prev[k] is not None})
            prev = vals
        unique = {tuple(sorted(x.items())) for x in increments}
        target = (('bucket-builds', 2), ('member-visits', 257), ('owner-index-visits', 257), ('owner-lookups', 257))
        check(len(increments) == 59 and unique == {target}, f"installed proof {mode}: per-frame counter deltas mismatch")
        native_reports.append({"mode": mode, "measuredFrameDeltas": len(increments), "uniqueDelta": [dict(x) for x in sorted(unique)]})
    check(d["browserClosed"] is True, "installed proof: browser not closed")
    check(not d["errors"] and not d["cleanupErrors"] and not d["pageErrors"] and not d["consoleErrors"] and not d["requestFailures"] and not d["blockedRequests"], "installed proof: recorded browser/cleanup errors")
    before, after = d["sourceBefore"], d["sourceAfter"]
    check(len(before) == len(after) == 12396, "installed proof: source check count mismatch")
    check(all(x.get("matches") for x in before + after), "installed proof: source hash mismatch")
    check([(x["path"], x["expected"], x["actual"]) for x in before] == [(x["path"], x["expected"], x["actual"]) for x in after], "installed proof: source-before/after differ")
    return {
        "status": d["status"], "contexts": context_reports,
        "allContextOutputPixelRetentionSignaturesMatch": all(s == signatures[0] for s in signatures[1:]),
        "nativeCounterDeltas": native_reports,
        "csp": {"compiledDelivery": d.get("compiledDelivery"), "blockedRequests": len(d.get("blockedRequests", [])), "expectedPolicyErrors": len(d.get("expectedPolicyErrors", []))},
        "browserClosed": d["browserClosed"], "sourceChecks": {"before": len(before), "after": len(after), "allMatch": all(x.get("matches") for x in before + after)},
    }


def timing_audit() -> dict[str, Any]:
    path = UNIT / "proof-canvas-v1/canvas-timing-one-shot.json"
    d = read(path)
    check(d["status"] == "PASS_R3F_FRAME_BASELINES_CANVAS_DESCRIPTIVE_TIMING", "timing receipt status mismatch")
    check(d["phase"] == "timing", "timing receipt phase mismatch")
    check(d["authorizationSha256"] == "6681ae1fdc19185d51ce3d5499c004d7a8ae21ccdc573327ac0097dc60adf25b", "timing authorization hash mismatch")
    check(d["priorProofSha256"] == "6990f35dabedc53c5caab1ef897d12e1d15dfee5c85493d5d00f90de3bd7c568", "timing prior-proof hash mismatch")
    arms: dict[str, Any] = {}
    fields = ["publishMs", "callbackMs", "updateThroughDrawMs", "drawMs", "stateAgeMs", "rafIntervalMs"]
    for arm in d["arms"]:
        mode, r = arm["mode"], arm["result"]
        check(arm.get("contextClosed") is True, f"timing {mode}: context not closed")
        check(len(r.get("warmupSamples", [])) == 12, f"timing {mode}: expected 12 warmup samples")
        check(len(r.get("samples", [])) == 60, f"timing {mode}: expected 60 measured samples")
        check(all(sample.get("counters") is None for sample in r["samples"]), f"timing {mode}: timing counters are not null")
        td = r.get("teardown", {})
        check(td.get("resourcesExpected") == td.get("resourcesDisposed") == 512 and td.get("duplicateDisposalEvents") == 0, f"timing {mode}: resource closure mismatch")
        metrics = {}
        for field in fields:
            values = [float(x[field]) for x in r["samples"]]
            metrics[field] = {"median": median(values), "p95NearestRank": p95_nearest_rank(values)}
        arms[mode] = {"warmupSamples": len(r["warmupSamples"]), "measuredSamples": len(r["samples"]), "countersAllNull": all(x.get("counters") is None for x in r["samples"]), "contextClosed": arm.get("contextClosed"), "resourcesExpected": td.get("resourcesExpected"), "resourcesDisposed": td.get("resourcesDisposed"), "metricsMs": metrics}
    check(set(arms) == {"native", "react", "react-frame", "imperative"}, "timing arm set mismatch")
    before, after = d["sourceBefore"], d["sourceAfter"]
    check(len(before) == len(after) == 12396, "timing source check count mismatch")
    check(all(x.get("matches") for x in before + after), "timing source hash check has mismatches")
    check([(x["path"], x["expected"], x["actual"]) for x in before] == [(x["path"], x["expected"], x["actual"]) for x in after], "timing source before/after differs")
    expected = {
        "native": {"publishMs": (3.05, 3.5), "updateThroughDrawMs": (5.9, 6.6)},
        "react": {"publishMs": (1.0, 2.0), "updateThroughDrawMs": (4.6, 6.3)},
    }
    parity = {}
    for mode, fields_expected in expected.items():
        for field, pair in fields_expected.items():
            actual = (arms[mode]["metricsMs"][field]["median"], arms[mode]["metricsMs"][field]["p95NearestRank"])
            check(tuple(round(x, 2) for x in actual) == pair, f"timing {mode}.{field}: recomputed median/p95 mismatch {actual}")
            parity[f"{mode}.{field}"] = actual
    parity_failed = (
        parity["native.publishMs"][0] > parity["react.publishMs"][0]
        and parity["native.publishMs"][1] > parity["react.publishMs"][1]
        and parity["native.updateThroughDrawMs"][0] > parity["react.updateThroughDrawMs"][0]
        and parity["native.updateThroughDrawMs"][1] > parity["react.updateThroughDrawMs"][1]
    )
    check(parity_failed, "timing: expected parity failure not reproduced from raw samples")
    check(d["browserClosed"] is True, "timing: browser not closed")
    check(not d["errors"] and not d["cleanupErrors"] and not d["pageErrors"] and not d["consoleErrors"] and not d["requestFailures"] and not d["blockedRequests"], "timing: browser/cleanup errors recorded")
    return {"status": d["status"], "authorizationSha256": d["authorizationSha256"], "priorProofSha256": d["priorProofSha256"], "arms": arms, "sourceChecks": {"before": len(before), "after": len(after), "allMatch": all(x.get("matches") for x in before + after)}, "parity": {"status": "FAIL" if parity_failed else "PASS", "rawRecomputedNativeVsReact": {"publishMedianP95Ms": {"native": parity["native.publishMs"], "react": parity["react.publishMs"]}, "throughDrawMedianP95Ms": {"native": parity["native.updateThroughDrawMs"], "react": parity["react.updateThroughDrawMs"]}}, "definition": "publishMs is publication/update interval; updateThroughDrawMs covers update start through draw completion including validation/render/readback."}, "browserClosed": d["browserClosed"]}


def hmr_audit() -> dict[str, Any]:
    rows = []
    expected_hashes = {
        "proof-v1": "b16841678a9e21abdc2a9e2fac24dbf0193026b53c1af9aaa66843681e3564ab",
        "proof-v2": "b16841678a9e21abdc2a9e2fac24dbf0193026b53c1af9aaa66843681e3564ab",
        "proof-v3": "b16841678a9e21abdc2a9e2fac24dbf0193026b53c1af9aaa66843681e3564ab",
        "proof-v4": "48f47ded4652ea2211f21982e5e578ab1ee56a941fe5072f4354c421140f6552",
    }
    stages = {
        "proof-v1": "TLS hostname validation failed before browser/verifier launch (ERR_TLS_CERT_ALTNAME_INVALID; wildcard *.localhost did not cover the generated hostname).",
        "proof-v2": "Browser reached the app; stale actor-setter verifier expected 3 active setters but the reviewed frame clock has 0.",
        "proof-v3": "Browser reached the app; stale Proxy-based prop-write counter did not observe descriptor-resolved writes, so compiled Three props did not advance (phase write count stayed at 8).",
        "proof-v4": "Interactions and live clock passed; reset timed out because Studio Store had 3 shapes while Three root retained 4 ([orbit-b, form-4, orbit-a, form-5]); HMR source edit/remount was not reached.",
    }
    for name in ("proof-v1", "proof-v2", "proof-v3", "proof-v4"):
        proof = HMR / name
        r = read(proof / "attempt-receipt.json")
        sig = read(proof / "server-evidence.json.signal.json")
        archived_sha = file_sha(proof / "original-source.tsx")
        check(r["status"] == "FAIL_OR_INCOMPLETE", f"{name}: outcome unexpectedly absent/nonfailed")
        check(r.get("routeRegistered") is True and r.get("routeRemoved") is True and r.get("listenersClosed") is True and r.get("sourceRestored") is True and r.get("privateTlsRemoved") is True, f"{name}: owned cleanup/source restoration incomplete")
        check(r.get("proxy", {}).get("code") == 0 and r.get("server", {}).get("code") == 0, f"{name}: owned proxy/server process not exited cleanly")
        check(r.get("originalSha256") == expected_hashes[name] and archived_sha == expected_hashes[name], f"{name}: original source archive hash mismatch")
        check(sig.get("watcher", {}).get("ready") is True and sig.get("watcher", {}).get("targetListed") is True, f"{name}: watcher readiness/target membership missing")
        check(sig.get("watcher", {}).get("watcherErrors") == [], f"{name}: watcher errors recorded")
        check(sig.get("events") == [], f"{name}: unexpected server HMR events")
        check(r.get("serverEvidence", {}).get("ready") is True and r.get("serverEvidence", {}).get("transform", {}).get("returned") is True, f"{name}: actual source transform/readiness missing")
        if name == "proof-v1":
            check(r.get("verifier") is None and "ERR_TLS_CERT_ALTNAME_INVALID" in " ".join(r.get("errors", [])), "proof-v1: expected before-browser TLS terminal failure absent")
            stage = stages[name]
        else:
            check(r.get("httpsReadiness", {}).get("status") == 200 and r.get("httpsReadiness", {}).get("authorized") is True, f"{name}: authorized HTTPS readiness missing")
            check(r.get("verifier", {}).get("code") == 1, f"{name}: expected verifier failure absent")
            stage = stages[name]
        if name in ("proof-v2", "proof-v3"):
            fail = read(proof / "browser/failure.json")
            snap = fail.get("currentSnapshot", {})
            check(fail.get("hmrProof") is None, f"{name}: HMR lifecycle unexpectedly claimed")
            if name == "proof-v2":
                check("actor setter registration differs" in fail.get("message", "") and snap.get("activePhaseSetters") == 0 and len(snap.get("sceneObjects", [])) == 3, "proof-v2: stale setter assertion not captured")
            else:
                check("compiled Three props did not advance" in fail.get("message", "") and snap.get("phasePropWrites") == 8 and snap.get("requestedFrameEpoch") == snap.get("drawnFrameEpoch"), "proof-v3: stale Proxy counter failure not captured")
        if name == "proof-v4":
            fail = read(proof / "browser/failure.json")
            snap = fail.get("currentSnapshot", {})
            check(fail.get("hmrProof") is None and fail.get("websocketEvents", [])[-1].get("type") == "connected", "proof-v4: HMR lifecycle unexpectedly claimed or connection evidence missing")
            check(snap.get("selectedId") == "orbit-a" and len(snap.get("actualSceneOrder", [])) == 4 and len(snap.get("sceneOrder", [])) == 3, "proof-v4: reset divergence not present in terminal snapshot")
            check(snap.get("phasePropWrites") == 6099 and snap.get("activePhaseSetters") == 0, "proof-v4: observed frame-write/clock counters differ")
            check(snap.get("frameClock", {}).get("roots") == 1 and snap.get("frameClock", {}).get("listeners") == 1 and snap.get("frameClock", {}).get("readers") == 5, "proof-v4: retained frame-clock counts differ")
            check("TimeoutError" in fail.get("message", "") and fail.get("hmrProof") is None, "proof-v4: reset timeout/HMR nonproof not captured")
        rows.append({"attempt": name, "status": r["status"], "stage": stage, "readiness": {"watcherReady": sig.get("watcher", {}).get("ready"), "exactTargetListed": sig.get("watcher", {}).get("targetListed"), "transformed": r.get("serverEvidence", {}).get("transform", {}).get("returned"), "https": r.get("httpsReadiness")}, "hmrEvents": len(sig.get("events", [])), "hmrLifecycleProof": (read(proof / "browser/failure.json").get("hmrProof") if name == "proof-v4" else None), "originalSourceSha256": r.get("originalSha256"), "archiveSourceSha256": archived_sha, "cleanup": {key: r.get(key) for key in ("routeRemoved", "listenersClosed", "sourceRestored", "privateTlsRemoved")}, "proxyExit": r.get("proxy", {}).get("code"), "serverExit": r.get("server", {}).get("code")})
    current_source_sha = file_sha(ROOT / "src/browser/native_three_host.tsx")
    check(current_source_sha == expected_hashes["proof-v4"], "current workbench source does not match v4 baseline")
    check(len(rows) == 4, "expected four preserved HMR attempts")
    return {"attempts": rows, "currentWorkbenchSourceSha256": current_source_sha, "oldV1V3BaselineSha256": expected_hashes["proof-v1"], "v4CurrentBaselineSha256": expected_hashes["proof-v4"], "noLiveProofRun": True, "lifecycleConclusion": "INCOMPLETE: reset/store-to-host divergence stopped before source edit, old realm retirement, new realm, remount, reduced-motion, and final disposal proof."}


def scoped_drift() -> dict[str, Any]:
    gate = read(VERIFY / "darwin-v3/source-before.json")["inputs"]
    current_diffs = []
    for entry in gate:
        p = ROOT / entry["path"]
        actual = file_sha(p)
        if actual != entry["sha256"]:
            current_diffs.append({"path": entry["path"], "gateSha256": entry["sha256"], "currentSha256": actual})
    check([x["path"] for x in current_diffs] == ["README.md", "implementation/2026-10-22-linear-scalar-targets/results.md"], "gate-v3 recorded-input drift differs from documented two post-gate prose updates")
    timed = read(UNIT / "proof-canvas-v1/canvas-timing-one-shot.json")
    timing_paths = {str(pathlib.Path(x["path"]).resolve()) for x in timed["sourceBefore"]}
    outside = ["src/browser/native_three_host.tsx", "scripts/verify_native_three_host.mjs"]
    outside_check = {p: str((ROOT / p).resolve()) not in timing_paths for p in outside}
    check(all(outside_check.values()), "post-timing workbench/verifier change unexpectedly appears in captured 12,396-source timing inventory")
    timing_current_diffs = []
    by_resolved = {str(pathlib.Path(x["path"]).resolve()): x for x in timed["sourceBefore"]}
    for resolved, entry in by_resolved.items():
        actual = file_sha(pathlib.Path(resolved))
        if actual != entry["expected"]:
            timing_current_diffs.append({"path": resolved, "capturedSha256": entry["expected"], "currentSha256": actual})
    check(not timing_current_diffs, "a recorded canvas timing source differs from its captured hash")
    preserved_sources = [
        "src/vdom_snapshot_runtime.ts", "compiler/vite_native_module.ts",
        "implementation/2026-10-22-linear-scalar-targets/consumer/native.tsx",
        "implementation/2026-10-22-linear-scalar-targets/consumer/react.tsx",
        "implementation/2026-10-22-linear-scalar-targets/consumer/react-frame.tsx",
        "implementation/2026-10-22-linear-scalar-targets/consumer/imperative.ts",
    ]
    preserved_source_matches = {}
    for rel in preserved_sources:
        resolved = str((ROOT / rel).resolve())
        entry = by_resolved.get(resolved)
        actual = file_sha(ROOT / rel)
        preserved_source_matches[rel] = bool(entry and entry["expected"] == actual)
        check(preserved_source_matches[rel], f"canvas timing core/compiled/authored-arm source not unchanged: {rel}")
    # Confirm the four generated cache artifacts only against their bounded manifest and Git HEAD.
    generated = read(UNIT / "evidence/generated-followons/manifest.json")
    wrappers = []
    for e in generated:
        committed = subprocess.run(["git", "show", f"HEAD:{e['path']}"], cwd=ROOT, capture_output=True, check=False)
        current = file_sha(ROOT / e["path"])
        archived = file_sha(ROOT / e["archive"])
        head_sha = sha(committed.stdout) if committed.returncode == 0 else None
        good = head_sha == e["committedSha256"] and current == head_sha and archived == e["generatedSha256"]
        check(good, f"generated wrapper archive/HEAD/current mismatch for {e['path']}")
        wrappers.append({"path": e["path"], "currentSha256": current, "committedSha256": head_sha, "archivedGeneratedSha256": archived, "currentMatchesHead": current == head_sha, "archiveMatchesManifest": archived == e["generatedSha256"]})
    # Compare only the 31 recorded initial copies; no cache traversal.
    copied = read(UNIT / "initial-copy.json")["entries"]
    changed_copies = []
    for e in copied:
        actual = file_sha(ROOT / e["copy"])
        if actual != e["sha256"]:
            changed_copies.append({"path": e["copy"], "initialSha256": e["sha256"], "currentSha256": actual})
    check(len(copied) == 31 and [pathlib.Path(x["path"]).name for x in changed_copies] == ["prepare.mjs", "verify.mjs"], "bounded 31-copy drift differs from reviewed prepare/verify tooling only")
    check({x["path"] for x in changed_copies} == {"implementation/2026-10-22-linear-scalar-targets/consumer/prepare.mjs", "implementation/2026-10-22-linear-scalar-targets/consumer/verify.mjs"}, "unexpected initial-copy differences")
    # Notebook semantic cell comparison against HEAD; outputs and execution counters are intentionally ignored.
    current_nb = read(ROOT / "research.ipynb")
    head = subprocess.run(["git", "show", "HEAD:research.ipynb"], cwd=ROOT, capture_output=True, check=False)
    check(head.returncode == 0, "could not read HEAD research.ipynb")
    base_nb = json.loads(head.stdout)
    semantic = lambda c: (c.get("cell_type"), c.get("source"), c.get("metadata", {}).get("tags", []))
    first_246_equal = len(current_nb["cells"]) == 247 and len(base_nb["cells"]) == 246 and all(semantic(a) == semantic(b) for a, b in zip(current_nb["cells"][:246], base_nb["cells"]))
    check(first_246_equal, "research notebook first 246 semantic cells differ from HEAD or cell count mismatch")
    return {
        "darwinV3RecordedInputInventory": {"capturedRunnerInputs": len(gate), "currentHashDifferences": current_diffs, "scopeNote": "Only recorded gate-v3 inputs were compared; no whole-worktree/cache equality claim."},
        "canvasTimingCapturedInputInventory": {"capturedChecks": len(timed["sourceBefore"]), "beforeAfterMatches": all(x.get("matches") for x in timed["sourceBefore"] + timed["sourceAfter"]), "currentRecordedSourceDifferences": timing_current_diffs, "postTimingToolingOutsideCapturedInventory": outside_check, "coreCompiledAndFourAuthoredArmsStillMatchTimingCapture": preserved_source_matches, "scopeNote": "The browser-demo instrumentation and canonical verifier updates are separate post-timing tooling; this audit does not equate current inventory with timing inputs."},
        "initialCopiedInputs": {"recordedCount": len(copied), "unchangedCount": len(copied) - len(changed_copies), "reviewedToolingDifferences": changed_copies},
        "generatedWrappers": {"boundedManifestCount": len(wrappers), "allCurrentBytesMatchHeadAndArchivesMatchManifest": all(x["currentMatchesHead"] and x["archiveMatchesManifest"] for x in wrappers), "entries": wrappers},
        "notebook": {"headSemanticCellCount": len(base_nb["cells"]), "currentCellCount": len(current_nb["cells"]), "first246SemanticCellsEqualHead": first_246_equal, "additionalCellCount": len(current_nb["cells"]) - len(base_nb["cells"]), "formatNote": "Current notebook was reserialized with ensure_ascii=True; that format-only rewrite is recorded separately from semantic cell comparison."},
        "sourceBoundary": {"coreRuntimeCompiledArithmeticAndFourAuthoredConsumerArmsUnchangedAfterCanvasTiming": "As recorded in reviewed results/source review; the exact browser demo and canonical verifier are post-timing diagnostic tooling. This bounded audit makes no broad source-inventory equality claim."},
    }


def evidence_scope() -> dict[str, Any]:
    docs = {
        "checkpoint": ROOT / "implementation-checkpoint.md",
        "masterPlan": ROOT / "final-master-plan.md",
        "researchGuide": ROOT / "RESEARCH-GUIDE.md",
        "handoff": ROOT / "HANDOFF-PROMPT.txt",
        "readme": ROOT / "README.md",
        "linearResults": UNIT / "results.md",
        "hmrResults": HMR / "results.md",
    }
    texts = {name: path.read_text(errors="replace") for name, path in docs.items()}
    checks = {
        "linearParityFailureRecorded": "3.05/3.50" in texts["checkpoint"] and "3.05/3.50" in texts["linearResults"],
        "hmrResetFailureAndIncompleteLifecycleRecorded": "3 shapes" in texts["checkpoint"] and "HMR source edit" in texts["checkpoint"] and "never run" in texts["checkpoint"],
        "goalOpenAndLimitsRecorded": all(token in texts["checkpoint"] for token in ("full goal stays active", "independent-device", "maintenance")),
        "historicalWinsAndDenseLossRetained": "Historical narrow wins/dense loss" in texts["checkpoint"],
        "noHumanMaintenanceClaim": "zero human maintenance participants" in texts["checkpoint"] or "zero-participant" in texts["checkpoint"],
        "resultExplainsScopeAndCaveats": all(token in texts["linearResults"] for token in ("parity FAIL", "No favorable repeat", "causal old/new", "cold/memory")),
    }
    for name, ok in checks.items():
        check(ok, f"top-level evidence-scope claim missing/inconsistent: {name}")
    return {"checks": checks, "sources": {k: str(v.relative_to(ROOT)) for k, v in docs.items()}, "historicalEvidenceRetained": True, "realtimeParity": "FAIL", "HMRLifecycle": "INCOMPLETE", "fullGoal": "OPEN", "qualificationLimitations": ["independent device", "cold/memory", "human maintenance participants: 0"]}


def main() -> int:
    output = {
        "schemaVersion": "linear-scalar-static-audit-v1",
        "auditKind": "STATIC_RECEIPT_AND_BOUNDED_INVENTORY_AUDIT",
        "createdBy": str(pathlib.Path(__file__).relative_to(ROOT)),
        "workloadsExecuted": False,
        "scope": "Receipt/manifest/hash/document semantic comparisons only. No tests, builds, browser, server, benchmark, or cache crawl.",
    }
    output["darwinGates"] = gate_audit()
    output["reviewedSourceManifests"] = reviewed_manifests()
    output["installedProof"] = installed_proof()
    output["timing"] = timing_audit()
    output["hmrAttempts"] = hmr_audit()
    output["scopedDrift"] = scoped_drift()
    output["evidenceScope"] = evidence_scope()
    output["issues"] = issues
    output["auditStatus"] = "PASS" if not issues else "FAIL"
    OUT.write_text(json.dumps(output, indent=2, sort_keys=True) + "\n")
    supplemental = {
        "schemaVersion": "linear-scalar-audit-summary-v1",
        "auditStatus": output["auditStatus"],
        "auditPath": str(OUT.relative_to(ROOT)),
        "issues": issues,
        "gateStatus": {k: v["status"] for k, v in output["darwinGates"].items()},
        "correctness": "PASS after corrected v2/v3 consolidated gates; v1 type-only failure preserved",
        "installedProof": output["installedProof"]["status"],
        "realtimeParity": output["timing"]["parity"]["status"],
        "hmrLifecycle": "INCOMPLETE",
        "fullGoal": "OPEN",
        "limits": ["independent device", "cold/memory", "human maintenance participants: 0"],
        "noWorkloadsExecuted": True,
    }
    SUPPLEMENT.write_text(json.dumps(supplemental, indent=2, sort_keys=True) + "\n")
    print(json.dumps({"auditStatus": output["auditStatus"], "issues": issues, "output": str(OUT), "supplement": str(SUPPLEMENT)}, indent=2))
    return 0 if not issues else 1


if __name__ == "__main__":
    sys.exit(main())
