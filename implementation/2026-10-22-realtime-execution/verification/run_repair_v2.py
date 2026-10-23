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
OUT = UNIT / "verification/repair-v2"
V1 = UNIT / "verification/darwin-v1"
NODE = "/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node"

if OUT.exists():
    raise RuntimeError(f"Refusing to overwrite {OUT}")
OUT.mkdir(parents=True)
(OUT / "steps").mkdir()
(OUT / "logs").mkdir()
sha = lambda data: hashlib.sha256(data).hexdigest()

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

def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")

review = json.loads((UNIT / "repair-v2-review.json").read_text())
prior = json.loads((V1 / "receipt.json").read_text())
prior_inputs = json.loads((V1 / "source-before.json").read_text())["inputs"]
expected_changes = sorted(review["changedSinceV1"])
current_before = snapshot(prior_inputs)
prior_hashes = {row["path"]: row["sha256"] for row in prior_inputs}
current_hashes = {row["path"]: row["sha256"] for row in current_before}
actual_changes = sorted(path for path in prior_hashes if prior_hashes[path] != current_hashes[path])
if review.get("status") != "REVIEWED_COMBINED_REPAIR_FOR_REVERIFICATION":
    raise RuntimeError("Repair review is not in the reviewed state")
if actual_changes != expected_changes:
    raise RuntimeError(f"Changed source set differs from repair review: {actual_changes}")
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

prior_steps = {row["name"]: row for row in prior["steps"]}
compiler = prior["debugCompiler"]
compiler_file = ROOT / compiler["path"]
compiler_hash = sha(compiler_file.read_bytes())
if compiler_hash != compiler["sha256AfterBuild"]:
    raise RuntimeError("Previously passing compiler binary hash changed")
prior_toolchains = json.loads((V1 / "toolchains.json").read_text())
node_file = Path(prior_toolchains["node"]["executable"])
node_hash = sha(node_file.read_bytes())
if node_hash != prior_toolchains["node"]["sha256"]:
    raise RuntimeError("Pinned Node executable hash changed")
package_cache_before = tree_snapshot(ROOT / ".cache/r3act-package-build")
prior_cache_after = prior.get("packageCacheAfter", {}).get("files", [])
cache_now = {row["path"]: (row.get("sha256"), row.get("bytes")) for row in package_cache_before["files"]}
cache_expected = {row["path"]: (row.get("sha256"), row.get("bytes")) for row in prior_cache_after}
if cache_now != cache_expected:
    raise RuntimeError("Package build cache no longer matches the v1 post-gate inventory")
write_json(OUT / "package-cache-before.json", package_cache_before)
carry_names = ["native-inputs-contract", "install", "cargo-test", "cargo-debug", "compiler-info",
               "artifact-conformance", "hmr-revision-plugin", "react-composition-plugin", "runtime-origin-plugin"]
carried = {"v1ReceiptSha256": sha((V1 / "receipt.json").read_bytes()),
           "v1SourceArchiveManifestSha256": sha((V1 / "source-archive.json").read_bytes()),
           "unchangedSourceSet": [name for name in carry_names if prior_steps.get(name, {}).get("status") == "PASS"],
           "compiler": {"path": compiler["path"], "expectedSha256": compiler["sha256AfterBuild"], "actualSha256": compiler_hash},
           "node": {"path": str(node_file), "expectedSha256": prior_toolchains["node"]["sha256"], "actualSha256": node_hash},
           "packageCacheBefore": {"matchesV1PostGate": True, "fileCount": len(package_cache_before["files"])},
           "manifests": {}}
for name in ["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "compiler/oxc-spike/Cargo.toml", "compiler/oxc-spike/Cargo.lock"]:
    carried["manifests"][name] = current_hashes.get(name)
write_json(OUT / "carried-forward.json", carried)

selected = []
for row in prior["steps"]:
    name = row["name"]
    if name in {"deno-full", "native-tooling", "three-host-7", "direct-intent-gc", "native-candidate-gc", "compiled-collection-gc"}:
        selected.append(row)
    elif name.startswith("compiled-") and name != "compiled-collection-gc":
        selected.append(row)
selected_names = [row["name"] for row in selected]
numbered_compiled = [name for name in selected_names if name.startswith("compiled-") and name != "compiled-collection-gc"]
if len(numbered_compiled) + selected_names.count("compiled-collection-gc") != 62:
    raise RuntimeError(f"Expected 62 compiled fixtures, selected {len(numbered_compiled) + selected_names.count('compiled-collection-gc')}")
selected.extend([
    {"name": "package-build", "status": "PENDING", "command": ["pnpm", "package:r3act"], "deadlineMs": 900000},
    {"name": "package-consumer", "status": "PENDING", "command": ["pnpm", "check:r3act-packages"], "deadlineMs": 900000},
])

receipt = {"schemaVersion": 1, "status": "RUNNING", "executionKind": "bounded-repair",
           "startedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
           "reviewSha256": sha((UNIT / "repair-v2-review.json").read_bytes()),
           "priorReceiptSha256": carried["v1ReceiptSha256"], "expectedSourceChanges": expected_changes,
           "actualSourceChanges": actual_changes, "beforeInputCount": len(current_before),
           "carriedForward": carried, "steps": [], "errors": []}
write_json(OUT / "receipt.json", receipt)

package_build_status = None
for row in selected:
    name = row["name"]
    if name == "package-consumer" and package_build_status != "PASS":
        result = {"name": name, "status": "SKIPPED_DEPENDENCY_FAILED", "dependency": "package-build",
                  "command": row["command"], "exitCode": None, "signal": None, "spawnError": None,
                  "log": None, "durationMs": 0}
        receipt["steps"].append(result)
        write_json(OUT / "steps" / f"{name}.json", result)
        write_json(OUT / "receipt.json", receipt)
        continue
    command = row["command"]
    start_utc = dt.datetime.now(dt.timezone.utc).isoformat()
    started = time.monotonic()
    stdout_path = OUT / "logs" / f"{name}.stdout.log"
    stderr_path = OUT / "logs" / f"{name}.stderr.log"
    spawn_error = None
    signal_name = None
    exit_code = None
    with stdout_path.open("xb") as stdout, stderr_path.open("xb") as stderr:
        try:
            process = subprocess.Popen(command, cwd=ROOT, env=os.environ.copy(), stdout=stdout, stderr=stderr)
            exit_code = process.wait()
            if process.returncode is not None and process.returncode < 0:
                signal_name = str(-process.returncode)
        except OSError as error:
            spawn_error = str(error)
            exit_code = 127
    duration = time.monotonic() - started
    result = {"name": name, "status": "PASS" if exit_code == 0 else "FAIL", "command": command,
              "startedAtUtc": start_utc, "finishedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
              "durationMs": round(duration * 1000), "deadlineMs": row.get("deadlineMs"),
              "exitCode": exit_code, "signal": signal_name, "spawnError": spawn_error,
              "stdout": str(stdout_path), "stderr": str(stderr_path)}
    receipt["steps"].append(result)
    write_json(OUT / "steps" / f"{name}.json", result)
    if name == "package-build": package_build_status = result["status"]
    write_json(OUT / "receipt.json", receipt)

current_after = snapshot(prior_inputs)
write_json(OUT / "source-after.json", {"schemaVersion": 1, "inputs": current_after})
write_json(OUT / "package-cache-after.json", tree_snapshot(ROOT / ".cache/r3act-package-build"))
changed_during = sorted(row["path"] for row in current_before
                        if current_hashes[row["path"]] != {item["path"]: item["sha256"] for item in current_after}[row["path"]])
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
