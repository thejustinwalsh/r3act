#!/usr/bin/env python3
"""Bounded read-only evidence reconciliation for verified scalar execution."""
from __future__ import annotations

import hashlib
import json
import math
import re
import subprocess
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
UNIT = ROOT / "implementation/2026-10-22-verified-scalar-execution"
VER = UNIT / "verification"
PROOF = UNIT / "proof-canvas-v1"


def read_json(path: Path):
    return json.loads(path.read_text())


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def record_check(checks: dict[str, bool], name: str, value: bool):
    checks[name] = bool(value)


def sample_stats(samples: list[dict], key: str) -> dict:
    values = sorted(float(item[key]) for item in samples if isinstance(item.get(key), (int, float)))
    if not values:
        return {"n": 0, "central": [], "median": None, "mean": None, "p95NearestRank": None}
    n = len(values)
    if n % 2:
        central = [values[n // 2]]
        median = central[0]
    else:
        central = values[n // 2 - 1:n // 2 + 1]
        median = sum(central) / 2
    return {
        "n": n,
        "central": central,
        "median": median,
        "mean": sum(values) / n,
        "p95NearestRank": values[math.ceil(0.95 * n) - 1],
    }


checks: dict[str, bool] = {}
# v1 preserved failure: type narrowing and obsolete schema-shape fixture assertions.
v1_dir = VER / "darwin-v1"
v1 = read_json(v1_dir / "receipt.json")
v1_steps = v1["steps"]
v1_counts = dict(Counter(step["status"] for step in v1_steps))
v1_deno_log = (v1_dir / "logs/deno-full.log").read_text(errors="replace")
v1_ts_errors = re.findall(r"TS\d{4}", v1_deno_log)
legacy_cases = []
for name in ("compiled_store_numeric_kernel_test.mjs", "compiled_mixed_numeric_inputs_test.mjs", "compiled_closed_store_contraction_test.mjs"):
    archived = v1_dir / "source-before/files/compiler" / name
    text = archived.read_text()
    log_match = next(step for step in v1_steps if step["name"] == "compiled-" + {"compiled_store_numeric_kernel_test.mjs": "50", "compiled_mixed_numeric_inputs_test.mjs": "51", "compiled_closed_store_contraction_test.mjs": "52"}[name])
    log = (v1_dir / log_match["log"]).read_text(errors="replace")
    legacy_cases.append({
        "test": name,
        "assertedSchema1": 'literal(property(execution, "schemaVersion")), 1' in text,
        "assertedFourExecutionFields": 'execution.properties.length, 4' in text,
        "observedAssertion": "2 !== 1" in log,
        "failureLocation": re.search(r"\.mjs:(\d+):(\d+)", log).group(0) if re.search(r"\.mjs:(\d+):(\d+)", log) else None,
    })
record_check(checks, "v1ReceiptFailed", v1.get("status") == "FAIL")
record_check(checks, "v1PhaseCounts66_6_1", v1_counts == {"PASS": 66, "FAIL": 6, "SKIPPED_DEPENDENCY_FAILED": 1})
record_check(checks, "v1DenoHadEightTypeErrors", len(v1_ts_errors) == 8 and "/src/closed_scalar_kernel_proof.ts:" in v1_deno_log)
record_check(checks, "v1ThreeSchemaFixtureAssertions", len(legacy_cases) == 3 and all(c["assertedSchema1"] and c["assertedFourExecutionFields"] and c["observedAssertion"] for c in legacy_cases))

# Corrected consolidated v2 receipt and its source evidence.
v2_dir = VER / "darwin-v2"
v2 = read_json(v2_dir / "receipt.json")
v2_steps = v2["steps"]
v2_counts = dict(Counter(step["status"] for step in v2_steps))
denotest = (v2_dir / "logs/deno-full.log").read_text(errors="replace")
rustlog = (v2_dir / "logs/cargo-test.log").read_text(errors="replace")
compiled_pass = sum(1 for s in v2_steps if s["name"].startswith("compiled-") and s["name"][9:].isdigit() and s["status"] == "PASS")
record_check(checks, "v2ReceiptPassed", v2.get("status") == "PASS")
record_check(checks, "v2All73PhasesPassed", v2_counts == {"PASS": 73})
record_check(checks, "v2Deno1212Passed", "1212 passed | 0 failed" in denotest)
record_check(checks, "v2Rust105Passed", "105 passed; 0 failed" in rustlog)
record_check(checks, "v2Compiled53Passed", compiled_pass == 53)

v1_before = read_json(v1_dir / "source-before.json")["inputs"]
v1_after = read_json(v1_dir / "source-after.json")["inputs"]
v2_before = read_json(v2_dir / "source-before.json")["inputs"]
v2_after = read_json(v2_dir / "source-after.json")["inputs"]
source_archive = read_json(v2_dir / "source-archive.json")
def source_map(items):
    return {item["path"]: item["sha256"] for item in items}
source_gate_diff_v1 = [p for p in source_map(v1_before).keys() | source_map(v1_after).keys() if source_map(v1_before).get(p) != source_map(v1_after).get(p)]
source_gate_diff_v2 = [p for p in source_map(v2_before).keys() | source_map(v2_after).keys() if source_map(v2_before).get(p) != source_map(v2_after).get(p)]
v2_manifest_hashes = {name: digest(v2_dir / name) for name in ("source-before.json", "source-after.json", "source-archive.json", "packaging-before.json", "packaging-after.json")}
current_diffs = []
for rel, expected in source_map(v2_after).items():
    path = ROOT / rel
    actual = digest(path) if path.is_file() else None
    if actual != expected:
        current_diffs.append({"path": rel, "expected": expected, "actual": actual})
expected_postgate_docs = {"README.md", "implementation/2026-10-22-verified-scalar-execution/source-review.md"}
record_check(checks, "v1GateInventory1865NoDrift", len(v1_before) == len(v1_after) == 1865 and not source_gate_diff_v1)
record_check(checks, "v2GateInventory1865NoDrift", len(v2_before) == len(v2_after) == 1865 and not source_gate_diff_v2)
record_check(checks, "v2ArchivedSource1875", len(source_archive.get("inputs", [])) == 1875 and source_archive.get("status") == "ARCHIVED_BEFORE_PRODUCT_COMMANDS")
record_check(checks, "currentGateInputDiffsAreDocsOnly", {d["path"] for d in current_diffs} == expected_postgate_docs)

# Supplemental documents: preserve notebook history and avoid overclaiming the whole gate inventory.
notebook_path = ROOT / "research.ipynb"
notebook = read_json(notebook_path)
head_notebook = json.loads(subprocess.check_output(["git", "show", "HEAD:research.ipynb"], cwd=ROOT))
old_cells = head_notebook.get("cells", [])
new_cells = notebook.get("cells", [])
notebook_append = new_cells[len(old_cells):]
record_check(checks, "notebook244OldCellsUnchangedPlusMarkdown", len(old_cells) == 244 and len(new_cells) == 245 and new_cells[:244] == old_cells and len(notebook_append) == 1 and notebook_append[0].get("cell_type") == "markdown")
maintained_docs = ["README.md", "HANDOFF-PROMPT.txt", "RESEARCH-GUIDE.md", "final-master-plan.md", "implementation-checkpoint.md", "paper.md", "research.ipynb", "docs/native-authoring-reference.md"]
results_path = UNIT / "results.md"
source_review_path = UNIT / "source-review.md"
record_check(checks, "supplementalResultsAndSourceReviewPresent", results_path.is_file() and source_review_path.is_file())

# Generated cache artifacts are preserved, while tracked cache files retain prior HEAD bytes.
cache_receipt = read_json(UNIT / "evidence/generated-followons/receipt.json")
cache_items = []
for entry in cache_receipt["entries"]:
    generated = ROOT / entry["archive"]
    current = ROOT / entry["path"]
    cache_items.append({
        "path": entry["path"],
        "archive": entry["archive"],
        "bytes": entry["bytes"],
        "archiveSha256": digest(generated) if generated.is_file() else None,
        "expectedGeneratedSha256": entry["generatedSha256"],
        "currentSha256": digest(current) if current.is_file() else None,
        "expectedRestoredHeadSha256": entry["restoredHeadSha256"],
        "archiveMatchesReceipt": generated.is_file() and digest(generated) == entry["generatedSha256"],
        "currentMatchesRestoredHead": current.is_file() and digest(current) == entry["restoredHeadSha256"],
    })
cache_bytes = sum(x["bytes"] for x in cache_items)
record_check(checks, "fourGeneratedFollowonsPreserved97338Bytes", len(cache_items) == 4 and cache_bytes == 97338 and all(x["archiveMatchesReceipt"] for x in cache_items))
record_check(checks, "trackedCacheRestoredToHeadBytes", all(x["currentMatchesRestoredHead"] for x in cache_items))

# Installed build, proof and timing bindings.
build = read_json(PROOF / "build-proof.json")
input_lock = read_json(PROOF / "input-lock.json")
proof = read_json(PROOF / "canvas-proof-one-shot.json")
timing = read_json(PROOF / "canvas-timing-one-shot.json")
timing_auth = read_json(PROOF / "canvas-timing-authorization.json")
build_sha = digest(PROOF / "build-proof.json")
lock_sha = digest(PROOF / "input-lock.json")
proof_sha = digest(PROOF / "canvas-proof-one-shot.json")
timing_sha = digest(PROOF / "canvas-timing-one-shot.json")
auth_sha = digest(PROOF / "canvas-timing-authorization.json")
record_check(checks, "proofBoundToBuildAndLock", proof.get("buildProofSha256") == build_sha and proof.get("inputLockSha256") == lock_sha)
record_check(checks, "timingBoundToApprovedBuildLockProofAuth", timing.get("buildProofSha256") == build_sha and timing.get("inputLockSha256") == lock_sha and timing.get("priorProofSha256") == proof_sha and timing.get("authorizationSha256") == auth_sha and timing_auth.get("buildProofSha256") == build_sha and timing_auth.get("inputLockSha256") == lock_sha and timing_auth.get("proofSha256") == proof_sha)
record_check(checks, "timingPriorDeliveryProofBinding", timing.get("compiledDelivery", {}).get("status") == "BOUND_UNTIMED_DELIVERY_PROOF" and timing.get("compiledDelivery", {}).get("proofSha256") == proof_sha)

# Verify emitted code and registration captures for baseline and Vite default minification.
captures = {
    "baseline": read_json(PROOF / "capture-native.json"),
    "minified": read_json(PROOF / "delivery/minified/capture-native.json"),
}
owner_capture_ok = True
for variant, capture in captures.items():
    owners = {o["component"]: o for o in capture.get("storeOwners", [])}
    for component in ("Position", "Rotation"):
        owner = owners.get(component, {})
        owner_capture_ok &= capture.get("status") == "PASS" and owner.get("executionSchema") == 2 and owner.get("executionKind") == "owned-data" and owner.get("numericKernel") == "emitted"
record_check(checks, "nativeBaselineAndMinifiedSchema2Captures", owner_capture_ok)

# Actual compiled JS assets in all native forms contain the emitted optional-function field and owner IDs.
asset_sets = {
    "baseline": build["assets"]["native"],
    "minified": build["delivery"]["minified"]["assets"],
    "rebundled": build["delivery"]["rebundled"]["assets"],
}
asset_audit = {}
for variant, items in asset_sets.items():
    js_asset = next(item for item in items if item["path"].endswith(".js"))
    content = Path(js_asset["path"]).read_text(errors="replace")
    asset_audit[variant] = {"path": js_asset["path"], "sha256": digest(Path(js_asset["path"])), "expectedSha256": js_asset["sha256"], "numericKernelOccurrences": content.count("numericKernel"), "positionOwnerId": "native.tsx#component:Position" in content, "rotationOwnerId": "native.tsx#component:Rotation" in content, "functionLiteralPresent": bool(re.search(r"""["\']?numericKernel["\']?\s*:\s*\([^)]*\)\s*=>\s*\{""", content))}
record_check(checks, "actualJsContainsV2KernelFunctionsAllNativeVariants", all(x["sha256"] == x["expectedSha256"] and x["numericKernelOccurrences"] > 0 and x["positionOwnerId"] and x["rotationOwnerId"] and x["functionLiteralPresent"] for x in asset_audit.values()))

react_captures = {"react": read_json(PROOF / "capture-react.json"), "react-frame": read_json(PROOF / "capture-react-frame.json")}
react_compile = {}
for arm, capture in react_captures.items():
    successes = {(event.get("fnName"), event.get("kind")) for event in capture.get("compilerEvents", [])}
    react_compile[arm] = {name: [name, "CompileSuccess"] in [list(x) for x in successes] for name in ("Position", "Rotation")}
record_check(checks, "reactCompilerSuccessBothMotionComponentsBothArms", all(all(v.values()) and react_captures[k].get("status") == "PASS" for k, v in react_compile.items()))
rebundle_capture = read_json(PROOF / "delivery/rebundled/capture-native.json")
minified_dir = str((PROOF / "delivery/minified/dist/native").resolve())
record_check(checks, "rebundleUsesActualMinifiedOutput", Path(rebundle_capture.get("rebundleInput", "")).resolve() == Path(minified_dir))

# Untimed six-context proof, CSP negative controls, row counters, and cleanup.
proof_arms = proof.get("arms", [])
delivery_proof_arms = proof.get("deliveryArms", [])
all_proof_arms = proof_arms + delivery_proof_arms
record_check(checks, "proofHasFourBaselineAndTwoDeliveryContexts", [a.get("mode") for a in proof_arms] == ["native", "react", "react-frame", "imperative"] and [a.get("mode") for a in delivery_proof_arms] == ["native-minified", "native-rebundled"])
record_check(checks, "allSixProofContextsClosed", len(all_proof_arms) == 6 and all(a.get("contextClosed") is True for a in all_proof_arms))
record_check(checks, "deliveryCspBlockedExactEvalEach", len(delivery_proof_arms) == 2 and all(a.get("csp") == {"blocked": True, "violations": ["eval"]} for a in delivery_proof_arms))
record_check(checks, "compiledDeliveryThreeVariantsPassed", proof.get("compiledDelivery", {}).get("status") == "PASS_VERIFIED_SCALAR_DELIVERY" and proof.get("compiledDelivery", {}).get("variants") == ["baseline", "minified", "rebundled"])
proof_source_checks = len(proof.get("sourceBefore", [])) == len(proof.get("sourceAfter", [])) == 12396 and all(x.get("matches") for x in proof.get("sourceBefore", [])) and all(x.get("matches") for x in proof.get("sourceAfter", []))
record_check(checks, "proofSourceChecks12396BothSidesAllMatch", proof_source_checks)
proof_cleanup = {}
for arm in all_proof_arms:
    teardown = arm.get("result", {}).get("teardown", {})
    proof_cleanup[arm.get("mode")] = {"resourcesExpected": teardown.get("resourcesExpected"), "resourcesDisposed": teardown.get("resourcesDisposed"), "duplicateDisposalEvents": teardown.get("duplicateDisposalEvents"), "sceneChildren": (teardown.get("cleanup") or {}).get("sceneChildren")}
record_check(checks, "proofCleanup512ExactlyOnceAllContexts", len(proof_cleanup) == 6 and all(v == {"resourcesExpected": 512, "resourcesDisposed": 512, "duplicateDisposalEvents": 0, "sceneChildren": 0} for v in proof_cleanup.values()))
proof_no_errors = all(not proof.get(k) for k in ("blockedRequests", "requestFailures", "pageErrors", "consoleErrors", "errors", "cleanupErrors")) and proof.get("browserClosed") is True
record_check(checks, "proofNoUnrelatedErrorsBrowserClosed", proof_no_errors)
proof_native_counts = {}
for arm in [a for a in all_proof_arms if a.get("mode") in ("native", "native-minified", "native-rebundled")]:
    result = arm["result"]
    series = result.get("warmupSamples", []) + result.get("samples", [])
    valid = len(series) == 72
    for index, sample in enumerate(series, 1):
        counters = sample.get("counters") or {}
        valid &= counters.get("store.owned-data.verified-rows") == 257 * index
        valid &= counters.get("store.owned-data.enclosed-batches") == index
        valid &= counters.get("publication.immediate.runs") == index
    last = series[-1].get("counters", {}) if series else {}
    proof_native_counts[arm["mode"]] = {"epochs": len(series), "verifiedRows": last.get("store.owned-data.verified-rows"), "enclosedBatches": last.get("store.owned-data.enclosed-batches"), "immediateRuns": last.get("publication.immediate.runs"), "everyEpochMatches257AndOne": bool(valid)}
record_check(checks, "nativeVariants257RowsOneBatchImmediateEveryEpoch", len(proof_native_counts) == 3 and all(v["everyEpochMatches257AndOne"] and v["verifiedRows"] == 18504 for v in proof_native_counts.values()))

# Timing is the one authorized 4-arm episode; verify its bound sample shape and recompute statistics.
timing_arms = timing.get("arms", [])
record_check(checks, "timingHasFourClosedBaselineArmsNoDelivery", [a.get("mode") for a in timing_arms] == ["native", "react", "react-frame", "imperative"] and len(timing.get("deliveryArms", [])) == 0 and all(a.get("contextClosed") is True for a in timing_arms))
metrics = ["publishMs", "updateThroughDrawMs", "stateAgeMs", "callbackMs", "rafIntervalMs"]
timing_stats = {}
for arm in timing_arms:
    samples = arm.get("result", {}).get("samples", [])
    counters_null = all(s.get("counters") is None for s in samples)
    timing_stats[arm.get("mode")] = {"warmups": len(arm.get("result", {}).get("warmupSamples", [])), "measured": len(samples), "countersNull": counters_null, "metricsMs": {m: sample_stats(samples, m) for m in metrics}}
record_check(checks, "timing12Warmup60SamplesCountersNull", len(timing_stats) == 4 and all(v["warmups"] == 12 and v["measured"] == 60 and v["countersNull"] for v in timing_stats.values()))
timing_cleanup = {}
for arm in timing_arms:
    teardown = arm.get("result", {}).get("teardown", {})
    timing_cleanup[arm.get("mode")] = {"resourcesExpected": teardown.get("resourcesExpected"), "resourcesDisposed": teardown.get("resourcesDisposed"), "duplicateDisposalEvents": teardown.get("duplicateDisposalEvents"), "sceneChildren": (teardown.get("cleanup") or {}).get("sceneChildren")}
record_check(checks, "timingCleanup512ExactlyOnceFourArms", len(timing_cleanup) == 4 and all(v == {"resourcesExpected": 512, "resourcesDisposed": 512, "duplicateDisposalEvents": 0, "sceneChildren": 0} for v in timing_cleanup.values()))
record_check(checks, "timingNoErrorsBrowserClosed", all(not timing.get(k) for k in ("blockedRequests", "requestFailures", "pageErrors", "consoleErrors", "errors", "cleanupErrors")) and timing.get("browserClosed") is True)

# Summarize precise findings and write only the two authorized JSON outputs.
audit = {
    "schemaVersion": "verified-scalar-final-evidence-audit-v1",
    "scope": "bounded evidence reconciliation; no product edits or verification reruns",
    "checks": checks,
    "overall": "PASS" if all(checks.values()) else "FINDINGS",
    "v1": {
        "status": v1["status"], "phaseCounts": v1_counts, "denoTypeErrorCount": len(v1_ts_errors),
        "denoTypeErrorCodes": dict(Counter(v1_ts_errors)), "compiledObsoleteSchemaAssertions": legacy_cases,
        "explanation": "The three compiled failures asserted schemaVersion 1 and four execution fields; emitted schema2 had actual value 2 and five fields. They were stale schema-shape assertions, not verified-row counts. Deno/native-tooling/package-build stopped on the same eight TypeScript narrowing errors.",
    },
    "v2": {
        "status": v2["status"], "phaseCounts": v2_counts, "denoRuntimeTests": 1212,
        "rustTests": 105, "compiledFixtures": compiled_pass,
        "sourceGateCounts": {"v1Before": len(v1_before), "v1After": len(v1_after), "v2Before": len(v2_before), "v2After": len(v2_after), "v2Archive": len(source_archive.get("inputs", []))},
        "sourceGateDrift": {"v1": source_gate_diff_v1, "v2": source_gate_diff_v2},
        "sourceManifestHashes": v2_manifest_hashes,
        "generatedFollowonsReceiptSha256": digest(UNIT / "evidence/generated-followons/receipt.json"),
        "currentComparedToV2Gate": {"matchingEntries": len(v2_after) - len(current_diffs), "totalEntries": len(v2_after), "postGateDocumentDifferences": current_diffs, "statement": "Product/compiler/package/workload entries match the v2 gate. README and source-review changed afterward; this does not claim the whole 1,865-entry inventory matches after documentation updates."},
    },
    "supplementals": {
        "maintainedDocuments": maintained_docs,
        "resultsMarkdownPresent": results_path.is_file(),
        "sourceReviewMarkdownPresent": source_review_path.is_file(),
        "notebook": {"headCells": len(old_cells), "currentCells": len(new_cells), "oldCellsPreservedByteStructure": new_cells[:len(old_cells)] == old_cells, "appendedCellTypes": [c.get("cell_type") for c in notebook_append], "currentSha256": digest(notebook_path)},
        "generatedFollowons": {"archivedBytes": cache_bytes, "entries": cache_items},
    },
    "deliveryProof": {
        "buildProofSha256": build_sha, "inputLockSha256": lock_sha, "proofSha256": proof_sha,
        "buildProofInputLockSha256": build.get("inputLockSha256"), "proofSourceChecksPerSide": [len(proof.get("sourceBefore", [])), len(proof.get("sourceAfter", []))],
        "nativeCaptures": {k: {"status": v.get("status"), "owners": [{"component": o.get("component"), "executionSchema": o.get("executionSchema"), "numericKernel": o.get("numericKernel")} for o in v.get("storeOwners", []) if o.get("component") in ("Position", "Rotation")]} for k, v in captures.items()},
        "actualNativeJsAssets": asset_audit, "reactCompilerOutcomes": react_compile,
        "rebundleInput": rebundle_capture.get("rebundleInput"), "compiledDelivery": proof.get("compiledDelivery"),
        "contexts": {"baseline": [a.get("mode") for a in proof_arms], "delivery": [{"mode": a.get("mode"), "contextClosed": a.get("contextClosed"), "csp": a.get("csp")} for a in delivery_proof_arms], "cleanup": proof_cleanup, "nativeCounters": proof_native_counts, "browserClosed": proof.get("browserClosed"), "errors": {k: len(proof.get(k, [])) for k in ("blockedRequests", "requestFailures", "pageErrors", "consoleErrors", "errors", "cleanupErrors")}},
    },
    "timing": {
        "status": timing.get("status"), "reportSha256": timing_sha, "authorizationSha256": auth_sha,
        "boundBuildProofSha256": timing.get("buildProofSha256"), "boundInputLockSha256": timing.get("inputLockSha256"),
        "priorProofSha256": timing.get("priorProofSha256"), "compiledDeliveryBinding": timing.get("compiledDelivery"),
        "sourceChecksPerSide": [len(timing.get("sourceBefore", [])), len(timing.get("sourceAfter", []))],
        "contexts": [a.get("mode") for a in timing_arms], "deliveryContexts": len(timing.get("deliveryArms", [])),
        "statisticsDefinition": "60 measured samples; median is average of central sorted pair; p95 uses nearest rank ceil(0.95*n).",
        "arms": timing_stats, "cleanup": timing_cleanup,
        "browserClosed": timing.get("browserClosed"), "errors": {k: len(timing.get(k, [])) for k in ("blockedRequests", "requestFailures", "pageErrors", "consoleErrors", "errors", "cleanupErrors")},
    },
}
summary = {
    "schemaVersion": "verified-scalar-final-summary-v1",
    "auditStatus": audit["overall"],
    "v1": {"status": v1["status"], "phases": v1_counts, "cause": "eight TypeScript narrowing errors plus three stale schema1/four-field fixture assertions"},
    "v2": {"status": v2["status"], "phases": v2_counts, "runtimeTests": 1212, "rustTests": 105, "compiledFixtures": compiled_pass},
    "postGateSourceDifferences": [d["path"] for d in current_diffs],
    "proof": {"status": proof.get("status"), "contextsClosed": len(all_proof_arms), "nativeVariants": proof_native_counts, "compiledDelivery": proof.get("compiledDelivery", {}).get("status")},
    "timing": {"status": timing.get("status"), "arms": timing_stats, "deliveryContexts": len(timing.get("deliveryArms", [])), "countersNull": all(x["countersNull"] for x in timing_stats.values())},
    "overallChecksPassed": sum(checks.values()), "overallChecks": len(checks),
}
(VER / "final-audit.json").write_text(json.dumps(audit, indent=2, sort_keys=True) + "\n")
(VER / "summary.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")
(VER / "final_audit.py").chmod(0o644)
print(json.dumps({"overall": audit["overall"], "passed": sum(checks.values()), "checks": len(checks), "failedChecks": [k for k, v in checks.items() if not v], "outputs": [str(VER / "final-audit.json"), str(VER / "summary.json")]}, indent=2))
