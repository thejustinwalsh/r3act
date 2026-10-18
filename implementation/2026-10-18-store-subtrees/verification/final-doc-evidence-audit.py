#!/usr/bin/env python3
"""One read-only final evidence/documentation audit for store-subtrees."""

from __future__ import annotations

import hashlib
import json
import os
import re
import stat
import subprocess
import time
import urllib.parse
from pathlib import Path


ROOT = Path.cwd()
UNIT = Path("implementation/2026-10-18-store-subtrees")
VER = UNIT / "verification"
V1 = VER / "darwin-v1"
V2 = VER / "darwin-v2"
PROOF = UNIT / "benchmark/proof-v1"
PREVIOUS_AUDIT = Path("implementation/2026-10-18-store-values/verification/final-doc-evidence-audit.json")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def git(*args: str) -> bytes:
    p = subprocess.run(["git", *args], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    return p.stdout


def load(rel: Path):
    return json.loads((ROOT / rel).read_text())


def file_manifest_check(manifest_rel: Path, archive_rel: Path | None):
    doc = load(manifest_rel)
    rows = doc.get("files", [])
    archive_dir = ROOT / archive_rel if archive_rel is not None else None
    is_materialized = bool(archive_dir and archive_dir.is_dir() and any((archive_dir / row["path"]).is_file() for row in rows))
    result = {"manifest": manifest_rel.as_posix(), "status": doc.get("status"), "count": len(rows), "materialized": is_materialized, "checked": 0, "mismatches": []}
    if result["materialized"]:
        base = ROOT / archive_rel
        for row in rows:
            p = base / row["path"]
            try:
                st = p.lstat()
                actual_hash = sha256(p) if stat.S_ISREG(st.st_mode) else None
                actual_bytes = st.st_size
            except FileNotFoundError:
                actual_hash, actual_bytes, st = None, None, None
            result["checked"] += 1
            if not st or not stat.S_ISREG(st.st_mode) or actual_hash != row.get("sha256") or actual_bytes != row.get("bytes"):
                result["mismatches"].append({"path": row["path"], "expectedSha256": row.get("sha256"), "actualSha256": actual_hash, "expectedBytes": row.get("bytes"), "actualBytes": actual_bytes})
    return result


def check_inputs(rel: Path, key: str):
    rows = load(rel)[key]
    paths = [r["path"] for r in rows]
    disk = []
    mismatches = []
    for row in rows:
        p = ROOT / row["path"]
        if not p.is_file():
            actual, size = None, None
        else:
            actual, size = sha256(p), p.stat().st_size
        disk.append({"path": row["path"], "sha256": actual, "bytes": size})
        if actual != row.get("sha256") or ("bytes" in row and size != row["bytes"]):
            mismatches.append({"path": row["path"], "expectedSha256": row.get("sha256"), "actualSha256": actual, "expectedBytes": row.get("bytes"), "actualBytes": size})
    return {"count": len(rows), "uniquePathCount": len(set(paths)), "mismatches": mismatches, "disk": disk}


def link_audit(documents):
    pattern = re.compile(r"\[[^\]]*\]\(([^)]+)\)|^\s*\[[^\]]+\]:\s*(\S+)", re.MULTILINE)
    checked, missing = [], []
    for rel in documents:
        text = (ROOT / rel).read_text(errors="replace")
        for m in pattern.finditer(text):
            raw = (m.group(1) or m.group(2) or "").strip()
            if raw.startswith("<") and ">" in raw:
                raw = raw[1:raw.index(">")]
            raw = raw.split()[0] if raw else ""
            raw = urllib.parse.unquote(raw)
            if not raw or raw.startswith(("http://", "https://", "mailto:", "data:", "javascript:", "#")):
                continue
            target = raw.split("#", 1)[0].split("?", 1)[0]
            if not target:
                continue
            p = (ROOT / rel).parent / target
            exists = p.exists()
            item = {"document": rel.as_posix(), "target": raw, "exists": exists}
            checked.append(item)
            if not exists:
                missing.append(item)
    return {"documents": [p.as_posix() for p in documents], "linkCount": len(checked), "missing": missing}


def run():
    started = time.time()
    documents = [
        Path("docs/native-authoring-reference.md"),
        Path("three-host-api.md"),
        Path("implementation-checkpoint.md"),
        Path("final-master-plan.md"),
        Path("paper.md"),
        Path("implementation/2026-10-18-first-pass/design.md"),
        UNIT / "design.md",
        UNIT / "source-review.md",
        UNIT / "results.md",
        UNIT / "benchmark/README.md",
    ]
    freeze_paths = documents + [
        V1 / "receipt.json", V1 / "source-before.json", V1 / "source-after.json",
        V1 / "packaging-before.json", V1 / "packaging-after.json", V1 / "fixture-artifacts.json",
        V1 / "source-repair-basis/reconstruction.json",
        V2 / "receipt.json", V2 / "source-before.json", V2 / "source-after.json",
        V2 / "packaging-before.json", V2 / "packaging-after.json", V2 / "fixture-artifacts.json",
        PROOF / "build-proof.json", PROOF / "source-lock.json", PROOF / "pair-one-shot.json", PROOF / "run-authorization.json",
    ]
    freeze_before = {p.as_posix(): sha256(ROOT / p) for p in freeze_paths if (ROOT / p).is_file()}

    head_nb = json.loads(git("show", "HEAD:research.ipynb").decode())
    current_nb = json.loads((ROOT / "research.ipynb").read_text())
    notebook = {
        "headCellCount": len(head_nb.get("cells", [])),
        "currentCellCount": len(current_nb.get("cells", [])),
        "priorCellsExactIncludingMetadataAndOutputs": current_nb.get("cells", [])[: len(head_nb.get("cells", []))] == head_nb.get("cells", []),
        "rootMetadataExact": current_nb.get("metadata") == head_nb.get("metadata"),
        "notebookFormatExact": all(current_nb.get(k) == head_nb.get(k) for k in ("nbformat", "nbformat_minor")),
        "newCellCount": len(current_nb.get("cells", [])) - len(head_nb.get("cells", [])),
    }

    links = link_audit(documents)

    v2_before = check_inputs(V2 / "source-before.json", "inputs")
    v2_after = check_inputs(V2 / "source-after.json", "inputs")
    before_rows = load(V2 / "source-before.json")["inputs"]
    after_rows = load(V2 / "source-after.json")["inputs"]
    v2_inputs = {
        "before": {k: v for k, v in v2_before.items() if k != "disk"},
        "after": {k: v for k, v in v2_after.items() if k != "disk"},
        "beforeAfterExact": before_rows == after_rows,
    }

    pair = load(PROOF / "pair-one-shot.json")
    pair_checks = {}
    for label, rows in (("before", pair["sourceBefore"]), ("after", pair["sourceAfter"])):
        mismatches = []
        for row in rows:
            actual = sha256(ROOT / row["path"]) if (ROOT / row["path"]).is_file() else None
            if not row.get("matches") or row.get("expected") != row.get("actual") or actual != row.get("expected"):
                mismatches.append({"path": row["path"], "expected": row.get("expected"), "recordedActual": row.get("actual"), "diskActual": actual, "matchesFlag": row.get("matches")})
        pair_checks[label] = {"count": len(rows), "uniquePathCount": len({r['path'] for r in rows}), "mismatches": mismatches}
    pair_checks["beforeAfterExactPathHashes"] = [(r["path"], r["expected"]) for r in pair["sourceBefore"]] == [(r["path"], r["expected"]) for r in pair["sourceAfter"]]

    compiler_expected = "0f800a16a2fd6b4b65fd58772bec83626d26c7d8991da845b71ee21bac387d3e"
    fixture_hashes = []
    compiler_path = ROOT / "compiler/oxc-spike/target/debug/ui-graph-compiler-spike"
    disk_compiler = sha256(compiler_path) if compiler_path.is_file() else None
    for i in range(1, 19):
        step = load(V2 / f"steps/compiled-{i:02d}.json")
        record = {"step": f"compiled-{i:02d}", "status": step.get("status"), "before": step.get("debugCompilerSha256Before"), "after": step.get("debugCompilerSha256After")}
        record["matchesExpected"] = record["status"] == "PASS" and record["before"] == compiler_expected and record["after"] == compiler_expected and disk_compiler == compiler_expected
        fixture_hashes.append(record)

    reconstruction = load(V1 / "source-repair-basis/reconstruction.json")
    v1_source = {x["path"]: x for x in load(V1 / "source-before.json")["inputs"]}
    reconstruction_results = []
    for row in reconstruction:
        basis_file = V1 / "source-repair-basis" / row["path"]
        disk = sha256(ROOT / basis_file) if (ROOT / basis_file).is_file() else None
        original = v1_source.get(row["path"], {}).get("sha256")
        reconstruction_results.append({"path": row["path"], "label": row.get("method"), "recordedSha256": row.get("sha256"), "oldSourceBeforeSha256": original, "diskSha256": disk, "exactMatch": row.get("sha256") == original == disk, "explicitlyLabeledReconstruction": "reconstruct" in row.get("method", "").lower()})

    archives = []
    for label, manifest, materialized in [
        ("v1-package-before", V1 / "packaging-before.json", V1 / "packaging-before"),
        ("v1-package-after", V1 / "packaging-after.json", V1 / "packaging-after"),
        ("v2-package-before", V2 / "packaging-before.json", V2 / "packaging-before"),
        ("v2-package-after", V2 / "packaging-after.json", V2 / "packaging-after"),
        ("v1-fixtures", V1 / "fixture-artifacts.json", V1 / "fixture-artifacts"),
        ("v2-fixtures", V2 / "fixture-artifacts.json", V2 / "fixture-artifacts"),
    ]:
        result = file_manifest_check(manifest, materialized)
        result["label"] = label
        # v2's before manifest references the v1 post-build materialized archive.
        if label == "v2-package-before" and not result["materialized"]:
            prior = load(V1 / "packaging-after.json")["files"]
            rows = load(manifest)["files"]
            result["matchesV1AfterManifest"] = rows == prior
            result["mismatches"] = [] if rows == prior else [{"reason": "v2 before manifest differs from v1 after manifest"}]
            if rows == prior:
                result["checked"] = len(rows)
                result["referenceArchive"] = "v1-package-after"
                result["mismatches"] = file_manifest_check(V1 / "packaging-after.json", V1 / "packaging-after")["mismatches"]
        archives.append(result)

    # Changed fixture outputs are content-addressed by the runner; compare path/hash/size manifests across v1/v2 and verify archived regular files.
    f1 = load(V1 / "fixture-artifacts.json")["files"]
    f2 = load(V2 / "fixture-artifacts.json")["files"]
    fixtures_by_path = {r["path"]: r for r in f2}
    fixture_changes = []
    for row in f1:
        new = fixtures_by_path.get(row["path"])
        if new != row:
            fixture_changes.append({"path": row["path"], "v1": row, "v2": new})

    # Re-check each v2 fixture archive entry as an ordinary file, not a symlink.
    fixture_archive_recheck = file_manifest_check(V2 / "fixture-artifacts.json", V2 / "fixture-artifacts")

    prev_cache = load(PREVIOUS_AUDIT)["trackedCache"]
    previous_symlinks = {r["path"]: r for r in prev_cache["symlinks"]}
    ls_tree = git("ls-tree", "-r", "-z", "HEAD", "--", ".cache").split(b"\0")
    symlink_rows = []
    cache_mismatches = []
    tracked_count = regular_count = symlink_count = 0
    for raw in ls_tree:
        if not raw:
            continue
        meta, raw_path = raw.split(b"\t", 1)
        mode, kind, blob = meta.decode().split()
        path = raw_path.decode()
        tracked_count += 1
        if mode == "120000":
            symlink_count += 1
            p = ROOT / path
            try:
                st = p.lstat()
                is_link = stat.S_ISLNK(st.st_mode)
                current_target = os.readlink(p) if is_link else None
                target = git("cat-file", "blob", blob).decode()
                prev = previous_symlinks.get(path, {})
            row = {"path": path, "gitMode": mode, "gitTarget": target, "currentLstatMode": oct(st.st_mode) if is_link else None, "currentTarget": current_target, "previousLstatMode": prev.get("currentLstatMode"), "previousTarget": prev.get("currentTarget"), "matchesGit": is_link and current_target == target, "matchesPriorModeAndTarget": is_link and oct(st.st_mode) == prev.get("currentLstatMode") and current_target == prev.get("currentTarget")}
            except FileNotFoundError:
                row = {"path": path, "gitMode": mode, "gitTarget": git("cat-file", "blob", blob).decode(), "currentLstatMode": None, "currentTarget": None, "previousLstatMode": previous_symlinks.get(path, {}).get("currentLstatMode"), "previousTarget": previous_symlinks.get(path, {}).get("currentTarget"), "matchesGit": False, "matchesPriorModeAndTarget": False}
            symlink_rows.append(row)
            if not row["matchesGit"] or not row["matchesPriorModeAndTarget"]:
                cache_mismatches.append(row)
        elif mode in ("100644", "100755"):
            regular_count += 1
    cache_diff = subprocess.run(["git", "diff", "HEAD", "--", ".cache"], cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    tracked_cache = {"headTrackedEntryCount": tracked_count, "headRegularFileCount": regular_count, "headSymlinkCount": symlink_count, "previousSymlinkCount": len(previous_symlinks), "symlinksCompared": len(symlink_rows), "symlinkMismatches": cache_mismatches, "trackedDiffExit": cache_diff.returncode, "trackedDiff": cache_diff.stdout, "diffStderr": cache_diff.stderr}

    # Compare human-facing claims in the slice result and integrated checkpoint with the raw receipt/pair.
    results_text = (ROOT / UNIT / "results.md").read_text()
    checkpoint_text = (ROOT / "implementation-checkpoint.md").read_text()
    arms = {a["arm"]: a["result"] for a in pair.get("arms", [])}
    native, react = arms.get("native", {}), arms.get("react", {})
    comparison = pair.get("comparison", {})
    values = [native.get("dispatchToMutationObserverMs"), react.get("dispatchToMutationObserverMs"), native.get("mountDurationMs"), react.get("mountDurationMs"), native.get("disposeDurationMs"), react.get("disposeDurationMs")]
    checkpoint_text = (ROOT / "implementation-checkpoint.md").read_text()
    master_text = (ROOT / "final-master-plan.md").read_text()
    paper_text = (ROOT / "paper.md").read_text()
    first_pass_text = (ROOT / "implementation/2026-10-18-first-pass/design.md").read_text()
    notebook_last_cell = "".join(current_nb.get("cells", [])[-1].get("source", []))
    claim_check = {
        "resultsReflectsGateCounts": all(s in results_text for s in ("938 runtime tests", "57 Rust tests", "24 artifact checks", "eighteen actual compiled fixtures", "All **798 correctness inputs**")),
        "resultsReflectsPairTimes": "5.0 / 0.6 ms Native/React" in results_text and comparison.get("nativeTransactionToMutationObserverMs") == 5 and abs(comparison.get("reactTransactionToMutationObserverMs", 999) - 0.6) < 0.001,
        "resultsReflectsIdentityAndPendingHealth": all(native.get(k) and react.get(k) for k in ("retainedHostIdentity", "retainedSubtreeIdentity", "retainedTextIdentity", "retainedRowIdentity")) and native.get("retainedRowState") == react.get("retainedRowState") == 1 and native.get("healthReadyBeforeTiming") is False and react.get("healthReadyBeforeTiming") is False and "retain container/host/text/row identity and row state" in results_text and "keep health pending during timing" in results_text,
        "armsHaveMatchingOutputAndText": native.get("outputSha256") == react.get("outputSha256") and native.get("finalProps") == react.get("finalProps") and native.get("order") == react.get("order") and native.get("definedOutput") == react.get("definedOutput"),
        "fallbackRevealAndEmptyTeardown": native.get("fallbackVisible") and react.get("fallbackVisible") and native.get("healthRevealedAfterTiming") and react.get("healthRevealedAfterTiming") and native.get("disposal", {}).get("remainingChildren") == react.get("disposal", {}).get("remainingChildren") == 0,
        "checkpointPaperAndFirstPassPairClaimsMatch": all("5.0 / 0.6 ms Native/React" in t and "Native was slower" in t for t in (checkpoint_text, paper_text, first_pass_text)) and "5.0 / 0.6 ms" in master_text and "slower for Native (5.0/0.6 ms)" in master_text,
        "notebook199thCellClaimsMatch": all(s in notebook_last_cell for s in ("938 runtime tests", "57 Rust tests", "5.0 / 0.6 ms Native/React", "All **746 source/compiler/artifact hashes**", "527,988 bytes")),
        "pairAndCacheIntegrity": pair.get("status") == "PASS_DESCRIPTIVE_JOINT_INPUT_PAIR_ONLY" and not pair.get("errors") and not pair.get("blockedRequests") and not pair.get("requestFailures") and not pair.get("pageErrors") and not pair.get("consoleErrors") and cache_diff.returncode == 0,
        "proofAuthorizationBindsBuild": load(PROOF / "run-authorization.json").get("buildProofSha256") == sha256(ROOT / PROOF / "build-proof.json"),
        "timings": values,
        "comparison": comparison,
    }

    # Capture a narrowly filtered process snapshot: local repo commands, the synthetic origin,
    # Playwright's headless Chromium profile/process, and Chromium 153 test binary only.
    ps = subprocess.run(["ps", "-axo", "pid,ppid,command"], cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    process_lines = []
    for line in ps.stdout.splitlines()[1:]:
        low = line.lower()
        if "final-doc-evidence-audit.py" in low or "ps -axo pid,ppid,command" in low:
            continue
        if ("/volumes/depot/developer/r3act/" in low or "store-subtrees-proof.localhost" in low or "playwright_chromiumdev_profile" in low or "chrome-linux" in low or "chromium.app/contents/macos/chromium" in low or "153.0.8010.12" in low):
            process_lines.append(line)
    process_snapshot = {"command": "ps -axo pid,ppid,command; filter scoped to the r3act worktree, proof origin, and Playwright/Chromium test profiles", "exitCode": ps.returncode, "stderr": ps.stderr, "matchingProcesses": process_lines, "noOwnedBrowserOrServer": ps.returncode == 0 and not process_lines}
    process_snapshot["priorWrapperAttempt"] = {"command": "/bin/zsh -c 'ps -axo pid,ppid,command | grep -E \"[C]hromium|[c]hrome|[v]ite|[p]ortless|[s]tore-subtrees\" > ...; status=$?; ...'", "error": "zsh:1: read-only variable: status", "note": "The ps output was captured before zsh rejected assignment to its reserved status variable; this filtered successful snapshot supersedes it."}

    freeze_after = {p.as_posix(): sha256(ROOT / p) for p in freeze_paths if (ROOT / p).is_file()}
    freeze = {"fileCount": len(freeze_before), "before": freeze_before, "after": freeze_after, "changedDuringAudit": sorted(set(freeze_before) | set(freeze_after)) and [p for p in set(freeze_before) | set(freeze_after) if freeze_before.get(p) != freeze_after.get(p)]}

    mismatches = {
        "notebook": [] if notebook["priorCellsExactIncludingMetadataAndOutputs"] and notebook["rootMetadataExact"] and notebook["notebookFormatExact"] and notebook["newCellCount"] == 1 else [notebook],
        "markdownLinks": links["missing"],
        "v2Inputs": v2_before["mismatches"] + v2_after["mismatches"] + ([] if v2_inputs["beforeAfterExact"] else [{"reason": "v2 source before/after differ"}]),
        "pairIntegrity": pair_checks["before"]["mismatches"] + pair_checks["after"]["mismatches"] + ([] if pair_checks["beforeAfterExactPathHashes"] else [{"reason": "pair before/after differ"}]),
        "fixtureCompilerHashes": [x for x in fixture_hashes if not x["matchesExpected"]],
        "repairBasis": [x for x in reconstruction_results if not x["exactMatch"] or not x["explicitlyLabeledReconstruction"]],
        "archives": [{"label": a["label"], "mismatches": a["mismatches"]} for a in archives if a["mismatches"]],
        "fixtureArchiveRegularFiles": fixture_archive_recheck["mismatches"],
        "trackedCacheSymlinks": cache_mismatches,
        "trackedCacheDiff": [] if cache_diff.returncode == 0 and not cache_diff.stdout else [{"exitCode": cache_diff.returncode, "diff": cache_diff.stdout, "stderr": cache_diff.stderr}],
        "pairClaims": [k for k, v in claim_check.items() if isinstance(v, bool) and not v],
        "processSnapshot": [] if process_snapshot["noOwnedBrowserOrServer"] else process_lines,
        "inputFreeze": freeze["changedDuringAudit"],
    }
    flat_mismatches = sum(len(v) for v in mismatches.values())
    report = {
        "schemaVersion": "store-subtrees-final-doc-evidence-audit-v1",
        "generatedAtUnixSeconds": time.time(),
        "durationSeconds": round(time.time() - started, 3),
        "notebook": notebook,
        "markdownLinks": links,
        "v2CorrectnessInputs": v2_inputs,
        "pairSourceIntegrity": pair_checks,
        "finalFixtureCompilerHashes": {"expectedCount": 18, "expectedSha256": compiler_expected, "actualCompilerSha256": disk_compiler, "fixtures": fixture_hashes},
        "packageAndFixtureArchives": archives,
        "v1ReconstructedSourceBasis": reconstruction_results,
        "v1ToV2FixtureArchivePathDifferencesInformational": {"count": len(fixture_changes), "changes": fixture_changes},
        "v2FixtureArchiveRegularFiles": fixture_archive_recheck,
        "trackedCache": tracked_cache,
        "pairOutcome": {"recordSha256": sha256(ROOT / PROOF / "pair-one-shot.json"), "status": pair.get("status"), "arms": [{"arm": a["arm"], "result": a["result"]} for a in pair.get("arms", [])], "comparison": pair.get("comparison"), "errors": pair.get("errors"), "blockedRequests": pair.get("blockedRequests"), "requestFailures": pair.get("requestFailures"), "pageErrors": pair.get("pageErrors"), "consoleErrors": pair.get("consoleErrors")},
        "resultsClaimsAgainstPair": claim_check,
        "processSnapshot": process_snapshot,
        "inputFreeze": freeze,
        "mismatches": mismatches,
        "overallStatus": "PASS" if flat_mismatches == 0 else "MISMATCHES_FOUND",
    }
    out = ROOT / VER / "final-doc-evidence-audit.json"
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"status": report["overallStatus"], "mismatchCount": flat_mismatches, "notebookCells": notebook, "links": {"documents": len(links["documents"]), "count": links["linkCount"], "missing": len(links["missing"])}, "v2Inputs": {"count": v2_inputs["before"]["count"], "diskMismatches": len(v2_before["mismatches"]) + len(v2_after["mismatches"])}, "pairInputs": {"before": pair_checks["before"]["count"], "after": pair_checks["after"]["count"], "diskMismatches": len(pair_checks["before"]["mismatches"]) + len(pair_checks["after"]["mismatches"])}, "fixtureCompiler": {"count": len(fixture_hashes), "mismatches": len(mismatches["fixtureCompilerHashes"])}, "archives": [{"label": x["label"], "count": x["count"], "checked": x["checked"], "materialized": x["materialized"], "mismatches": len(x["mismatches"])} for x in archives], "cache": {"tracked": tracked_count, "symlinks": symlink_count, "mismatches": len(cache_mismatches), "gitDiffExit": cache_diff.returncode}, "processes": process_snapshot["matchingProcesses"], "output": out.as_posix()}, sort_keys=True))
    return 0 if report["overallStatus"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(run())
