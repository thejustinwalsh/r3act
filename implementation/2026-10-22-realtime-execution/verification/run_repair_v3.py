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
UNIT = ROOT / "implementation/2026-10-22-realtime-execution"
OUT = UNIT / "verification/repair-v3"
V1 = UNIT / "verification/darwin-v1"
V2 = UNIT / "verification/repair-v2"
NODE = "/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node"

if OUT.exists():
    raise RuntimeError(f"Refusing to overwrite {OUT}")
OUT.mkdir(parents=True)
(OUT / "steps").mkdir()
(OUT / "logs").mkdir()
sha = lambda data: hashlib.sha256(data).hexdigest()

def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")

def snapshot(rows):
    result = []
    for row in rows:
        file = ROOT / row["path"]
        if not file.is_file():
            raise FileNotFoundError(f"Source input disappeared: {row['path']}")
        data = file.read_bytes()
        result.append({"path": row["path"], "sha256": sha(data), "bytes": len(data)})
    return result

def tree_snapshot(directory):
    root = Path(directory)
    entries = []
    if not root.exists():
        return {"status": "ABSENT", "files": entries}
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            entries.append({"path": path.relative_to(root).as_posix(), "kind": "symlink", "target": os.readlink(path)})
        elif path.is_file():
            data = path.read_bytes()
            entries.append({"path": path.relative_to(root).as_posix(), "kind": "file", "sha256": sha(data), "bytes": len(data)})
        elif not path.is_dir():
            raise RuntimeError(f"Unsupported artifact entry: {path}")
    return {"status": "HASHED", "files": entries}

review_path = UNIT / "repair-v3-review.json"
review = json.loads(review_path.read_text())
v2_receipt_path = V2 / "receipt.json"
v2_receipt = json.loads(v2_receipt_path.read_text())
v2_inputs = json.loads((V2 / "source-before.json").read_text())["inputs"]
v2_hashes = {row["path"]: row["sha256"] for row in v2_inputs}
current_before = snapshot(v2_inputs)
current_hashes = {row["path"]: row["sha256"] for row in current_before}
actual_changes = sorted(path for path, old_hash in v2_hashes.items() if current_hashes[path] != old_hash)
expected_changes = sorted(review.get("changedSinceV2", []))
if review.get("status") != "REVIEWED_COMBINED_FAILURE_REPAIR":
    raise RuntimeError("Repair-v3 review is not in the reviewed state")
if actual_changes != expected_changes or len(expected_changes) != 4:
    raise RuntimeError(f"Changed source set differs from repair-v3 review: {actual_changes}")
review_mismatches = []
for row in review["rows"]:
    file = ROOT / row["path"]
    actual = sha(file.read_bytes()) if file.is_file() else None
    if actual != row["sha256"]:
        review_mismatches.append({"path": row["path"], "expected": row["sha256"], "actual": actual})
if review_mismatches:
    raise RuntimeError(f"Frozen review hashes do not match: {review_mismatches}")
write_json(OUT / "source-before.json", {"schemaVersion": 1, "inputs": current_before})
write_json(OUT / "repair-review.json", review)

v2_steps = {row["name"]: row for row in v2_receipt["steps"]}
if v2_receipt.get("status") != "FAIL" or v2_steps.get("compiled-60", {}).get("status") != "FAIL":
    raise RuntimeError("Expected preserved repair-v2 compiled-60 failure was not found")
carried_compiled = [f"compiled-{index:02d}" for index in range(1, 62) if index != 60]
if any(v2_steps.get(name, {}).get("status") != "PASS" for name in carried_compiled):
    raise RuntimeError("A supposedly carried compiled fixture did not pass in repair-v2")
carried_names = ["three-host-7", "direct-intent-gc", "native-candidate-gc", "compiled-collection-gc"]
if any(v2_steps.get(name, {}).get("status") != "PASS" for name in carried_names):
    raise RuntimeError("A supposedly carried host/GC check did not pass in repair-v2")

v1_receipt = json.loads((V1 / "receipt.json").read_text())
v1_steps = {row["name"]: row for row in v1_receipt["steps"]}
for name in ["cargo-test", "cargo-debug", "compiler-info", "artifact-conformance", "install"]:
    if v1_steps.get(name, {}).get("status") != "PASS":
        raise RuntimeError(f"Cannot carry forward non-passing v1 evidence: {name}")
compiler = v1_receipt["debugCompiler"]
compiler_path = ROOT / compiler["path"]
compiler_hash = sha(compiler_path.read_bytes())
if compiler_hash != compiler["sha256AfterBuild"]:
    raise RuntimeError("Previously passing compiler binary hash changed")
toolchains = json.loads((V1 / "toolchains.json").read_text())
node_file = Path(toolchains["node"]["executable"])
node_hash = sha(node_file.read_bytes())
if node_hash != toolchains["node"]["sha256"]:
    raise RuntimeError("Pinned Node executable hash changed")
package_cache_before = tree_snapshot(ROOT / ".cache/r3act-package-build")
v2_cache_after = json.loads((V2 / "package-cache-after.json").read_text())["files"]
cache_now = {row["path"]: (row.get("sha256"), row.get("bytes"), row.get("target")) for row in package_cache_before["files"]}
cache_expected = {row["path"]: (row.get("sha256"), row.get("bytes"), row.get("target")) for row in v2_cache_after}
if cache_now != cache_expected:
    raise RuntimeError("Package build cache no longer matches repair-v2 post-package inventory")
write_json(OUT / "package-cache-before.json", package_cache_before)

carried = {
    "repairV2ReceiptSha256": sha(v2_receipt_path.read_bytes()),
    "repairV2SourceInputSha256": sha((V2 / "source-before.json").read_bytes()),
    "carriedCompiledSteps": carried_compiled,
    "carriedHostGcSteps": carried_names,
    "carriedV1Steps": ["install", "cargo-test", "cargo-debug", "compiler-info", "artifact-conformance"],
    "compiler": {"path": compiler["path"], "expectedSha256": compiler["sha256AfterBuild"], "actualSha256": compiler_hash},
    "node": {"path": str(node_file), "expectedSha256": toolchains["node"]["sha256"], "actualSha256": node_hash},
    "packageCacheBefore": {"matchesRepairV2PostPackage": True, "fileCount": len(package_cache_before["files"])},
    "changedSinceV2": actual_changes,
}
write_json(OUT / "carried-forward.json", carried)

prior_selected = [v2_steps[name] for name in ["deno-full", "native-tooling", "compiled-60", "package-build", "package-consumer"]]
selected = []
for prior in prior_selected:
    selected.append({"name": prior["name"], "command": prior["command"],
                     "deadlineMs": prior.get("deadlineMs", 900000)})

receipt = {"schemaVersion": 1, "status": "RUNNING", "executionKind": "bounded-repair",
           "startedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
           "reviewSha256": sha(review_path.read_bytes()),
           "priorReceiptSha256": sha(v2_receipt_path.read_bytes()),
           "expectedSourceChanges": expected_changes, "actualSourceChanges": actual_changes,
           "beforeInputCount": len(current_before), "carriedForward": carried, "steps": [], "errors": []}
write_json(OUT / "receipt.json", receipt)

package_build_status = None
for row in selected:
    name = row["name"]
    if name == "package-consumer" and package_build_status != "PASS":
        result = {"name": name, "status": "SKIPPED_DEPENDENCY_FAILED", "dependency": "package-build",
                  "command": row["command"], "exitCode": None, "signal": None, "spawnError": None,
                  "stdout": None, "stderr": None, "durationMs": 0}
        receipt["steps"].append(result)
        write_json(OUT / "steps" / f"{name}.json", result)
        write_json(OUT / "receipt.json", receipt)
        continue
    start_utc = dt.datetime.now(dt.timezone.utc).isoformat()
    started = time.monotonic()
    stdout_path = OUT / "logs" / f"{name}.stdout.log"
    stderr_path = OUT / "logs" / f"{name}.stderr.log"
    spawn_error = None
    signal_name = None
    exit_code = None
    with stdout_path.open("xb") as stdout, stderr_path.open("xb") as stderr:
        try:
            process = subprocess.Popen(row["command"], cwd=ROOT, env=os.environ.copy(), stdout=stdout, stderr=stderr)
            exit_code = process.wait()
            if process.returncode is not None and process.returncode < 0:
                signal_name = str(-process.returncode)
        except OSError as error:
            spawn_error = str(error)
            exit_code = 127
    duration = time.monotonic() - started
    result = {"name": name, "status": "PASS" if exit_code == 0 else "FAIL", "command": row["command"],
              "startedAtUtc": start_utc, "finishedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
              "durationMs": round(duration * 1000), "deadlineMs": row.get("deadlineMs"),
              "exitCode": exit_code, "signal": signal_name, "spawnError": spawn_error,
              "stdout": str(stdout_path), "stderr": str(stderr_path)}
    receipt["steps"].append(result)
    write_json(OUT / "steps" / f"{name}.json", result)
    if name == "package-build":
        package_build_status = result["status"]
    write_json(OUT / "receipt.json", receipt)

current_after = snapshot(v2_inputs)
write_json(OUT / "source-after.json", {"schemaVersion": 1, "inputs": current_after})
write_json(OUT / "package-cache-after.json", tree_snapshot(ROOT / ".cache/r3act-package-build"))
after_hashes = {row["path"]: row["sha256"] for row in current_after}
changed_during = sorted(row["path"] for row in current_before if current_hashes[row["path"]] != after_hashes[row["path"]])
receipt["afterInputCount"] = len(current_after)
receipt["sourceBeforeAfterMatch"] = not changed_during
receipt["changedDuringRepair"] = changed_during
receipt["failedSteps"] = [row["name"] for row in receipt["steps"] if row["status"] != "PASS"]
receipt["finishedAtUtc"] = dt.datetime.now(dt.timezone.utc).isoformat()
receipt["status"] = "PASS" if not receipt["failedSteps"] and not changed_during else "FAIL"
write_json(OUT / "receipt.json", receipt)
print(json.dumps({"status": receipt["status"], "steps": len(receipt["steps"]),
                  "failedSteps": receipt["failedSteps"], "changedDuringRepair": changed_during,
                  "out": str(OUT)}))
if receipt["status"] != "PASS":
    sys.exit(1)
