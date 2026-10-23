from __future__ import annotations
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[3]
UNIT = ROOT / "implementation/2026-10-23-mounted-execution-completion"
OUT = UNIT / "verification/repair-v3"
V2 = UNIT / "verification/darwin-v2"
REVIEW_PATH = UNIT / "source-review-v3.json"
sha = lambda data: hashlib.sha256(data).hexdigest()

if OUT.exists():
    raise RuntimeError(f"Refusing to overwrite {OUT}")
review = json.loads(REVIEW_PATH.read_text())
if review.get("status") != "PRIMARY_REVIEWED_TYPED_REPAIR_FREEZE_V3":
    raise RuntimeError("Source review v3 is not frozen")
OUT.mkdir(parents=True)
(OUT / "logs").mkdir()
(OUT / "steps").mkdir()
v2 = json.loads((V2 / "receipt.json").read_text())
if v2.get("sourceAudit", {}).get("status") != "MATCH":
    raise RuntimeError("Prior source audit is not matching")
v2_source = json.loads((V2 / "source-after.json").read_text())["inputs"]
review_rows = review["source"]

def snapshot(rows):
    result = []
    for row in rows:
        file = ROOT / row["path"]
        data = file.read_bytes()
        result.append({"path": row["path"], "sha256": sha(data), "bytes": len(data)})
    return result

before = snapshot(review_rows)
review_mismatches = [{"path": row["path"], "expected": row["sha256"], "actual": got["sha256"]}
                     for row, got in zip(review_rows, before) if row["sha256"] != got["sha256"]]
if review_mismatches:
    raise RuntimeError(f"Frozen review hashes do not match: {review_mismatches}")
prior_now = snapshot(v2_source)
prior_map = {row["path"]: row["sha256"] for row in v2_source}
changed = sorted(row["path"] for row in prior_now if prior_map[row["path"]] != row["sha256"])
expected = sorted([
    "compiler/compiled_compact_scalar_output_test.mjs",
    "compiler/compiled_mounted_scalar_execution_test.mjs",
    "compiler/compiled_owned_frame_transaction_test.mjs",
    "compiler/compiled_owned_scalar_capture_test.mjs",
    "compiler/compiled_store_batch_execution_test.mjs",
    "src/closed_store_execution.ts",
    "src/component_state_runtime.ts",
])
if changed != expected:
    raise RuntimeError(f"Source changes differ from reviewed v3 repair: {changed}")
write = lambda path, value: path.write_text(json.dumps(value, indent=2) + "\n")
write(OUT / "source-before.json", {"inputs": before})
write(OUT / "review.json", review)

v2_steps = {row["name"]: row for row in v2["steps"]}
carried_names = ["install", "cargo-test", "cargo-debug", "compiler-info", "artifact-conformance",
                 "workbench-watch-config", "hmr-revision-plugin", "react-composition-plugin",
                 "runtime-origin-plugin"]
failed = [name for name in carried_names if v2_steps.get(name, {}).get("status") != "PASS"]
if failed:
    raise RuntimeError(f"Cannot carry non-passing source-independent steps: {failed}")
compiler = v2["debugCompiler"]
compiler_file = ROOT / compiler["path"]
compiler_hash = sha(compiler_file.read_bytes())
if compiler_hash != compiler["sha256AfterBuild"]:
    raise RuntimeError("Previously qualified compiler binary changed")
node = v2["toolchains"]["node"]
node_file = Path(node["executable"])
if sha(node_file.read_bytes()) != node["sha256"]:
    raise RuntimeError("Pinned Node executable changed")
carry_files = []
for row in v2_source:
    if row["path"].startswith(("compiler/oxc-spike/", "scripts/", "packages/")) or row["path"] in (
        "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "deno.json", "deno.lock",
        "deno.browser.json", "tsconfig.native-tooling.json"):
        carry_files.append(row)
write(OUT / "carried-forward.json", {
    "repairV2ReceiptSha256": sha((V2 / "receipt.json").read_bytes()),
    "priorInputCount": len(v2_source), "unchangedSincePrior": len(v2_source) - len(changed),
    "expectedSourceChanges": expected, "actualSourceChanges": changed,
    "unchangedCarryPrerequisites": snapshot(carry_files),
    "carriedPassingSteps": carried_names,
    "compiler": {"path": compiler["path"], "expectedSha256": compiler["sha256AfterBuild"], "actualSha256": compiler_hash},
    "node": {"path": str(node_file), "sha256": node["sha256"]},
})

selected_names = ["deno-full", "native-tooling", *[f"compiled-{n:02d}" for n in range(1, 63)],
                  "three-host-7", "direct-intent-gc", "native-candidate-gc", "compiled-collection-gc",
                  "package-build", "package-consumer"]
steps_by_name = {row["name"]: row for row in v2["steps"]}
missing = [name for name in selected_names if name not in steps_by_name]
if missing:
    raise RuntimeError(f"Missing pinned command rows: {missing}")
receipt = {"schemaVersion": 1, "status": "RUNNING", "executionKind": "bounded-affected-repair-v3",
           "startedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
           "reviewSha256": sha(REVIEW_PATH.read_bytes()),
           "priorReceiptSha256": sha((V2 / "receipt.json").read_bytes()),
           "beforeInputCount": len(before), "wholePriorInputCount": len(v2_source),
           "expectedSourceChanges": expected, "actualSourceChanges": changed,
           "carriedForward": json.loads((OUT / "carried-forward.json").read_text()),
           "steps": [], "errors": []}
write(OUT / "receipt.json", receipt)
deadline = time.monotonic() + 600
package_status = None
for name in selected_names:
    original = steps_by_name[name]
    if name == "package-consumer" and package_status != "PASS":
        result = {"name": name, "status": "SKIPPED_DEPENDENCY_FAILED", "command": original["command"]}
    else:
        command = original["command"]
        env = os.environ.copy()
        env.update({"CARGO_HOME": str(ROOT / ".cache/cargo"), "CARGO_BUILD_JOBS": "1", "CI": "true"})
        fixture_commands = command[2:]
        if name.startswith("compiled-") and any("compiled_publication_callbacks_execution_test.mjs" in x for x in fixture_commands):
            env["R3ACT_CAPTURED_COMPILER_SHA256"] = compiler_hash
        stdout_path, stderr_path = OUT / "logs" / f"{name}.stdout.log", OUT / "logs" / f"{name}.stderr.log"
        start = time.monotonic()
        try:
            remaining = deadline - start
            if remaining <= 0: raise subprocess.TimeoutExpired(command, 0)
            with stdout_path.open("xb") as stdout, stderr_path.open("xb") as stderr:
                process = subprocess.Popen(command, cwd=ROOT, env=env, stdout=stdout, stderr=stderr,
                                           start_new_session=True)
                try:
                    code = process.wait(timeout=min(300, remaining))
                    timed_out = False
                except subprocess.TimeoutExpired:
                    timed_out = True
                    try: os.killpg(process.pid, 9)
                    except ProcessLookupError: pass
                    code = process.wait()
        except OSError as error:
            code, timed_out = 127, False
            stderr_path.write_text(str(error) + "\n")
        status = "PASS" if code == 0 and not timed_out else "TIMEOUT" if timed_out else "FAIL"
        result = {"name": name, "status": status, "command": command,
                  "startedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
                  "durationMs": round((time.monotonic() - start) * 1000), "exitCode": code,
                  "timedOut": timed_out, "stdout": str(stdout_path), "stderr": str(stderr_path)}
        if name == "package-build": package_status = status
    receipt["steps"].append(result)
    write(OUT / "steps" / f"{name}.json", result)
    write(OUT / "receipt.json", receipt)
    print(f"{name}: {result['status']}", flush=True)
    if time.monotonic() >= deadline:
        break

after = snapshot(review_rows)
write(OUT / "source-after.json", {"inputs": after})
after_prior = snapshot(v2_source)
after_hashes = {row["path"]: row["sha256"] for row in after_prior}
changed_during = sorted(row["path"] for row in prior_now if row["sha256"] != after_hashes[row["path"]])
receipt["afterInputCount"] = len(after)
receipt["sourceReviewMatchAfter"] = all(a["sha256"] == b["sha256"] for a, b in zip(before, after))
receipt["sourceChangedDuringRun"] = changed_during
receipt["failedSteps"] = [row["name"] for row in receipt["steps"] if row["status"] != "PASS"]
receipt["missingSteps"] = sorted(set(selected_names) - {row["name"] for row in receipt["steps"]})
receipt["finishedAtUtc"] = dt.datetime.now(dt.timezone.utc).isoformat()
receipt["status"] = "PASS" if not receipt["failedSteps"] and not receipt["missingSteps"] and not changed_during and receipt["sourceReviewMatchAfter"] else "FAIL"
write(OUT / "receipt.json", receipt)
print(json.dumps({"status": receipt["status"], "failedSteps": receipt["failedSteps"],
                  "changedDuringRun": changed_during, "output": str(OUT)}), flush=True)
if receipt["status"] != "PASS": sys.exit(1)
