#!/usr/bin/env python3
"""Run only the released frozen Deno recheck after fixture-only correction."""

import hashlib
import json
import subprocess
import time
from pathlib import Path

import run_gate_v1 as gate

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def write_lock(name: str) -> dict:
    inputs = []
    for relative in gate.source_paths():
        path = ROOT / relative
        inputs.append({"path": relative.as_posix(), "sha256": gate.digest(path)})
    result = {"schemaVersion": 1, "slice": "2026-10-18-store-host", "phase": name, "inputs": inputs}
    (HERE / name).write_text(json.dumps(result, indent=2) + "\n")
    return result


before = write_lock("source-lock-v2.json")
command = [
    "/opt/homebrew/bin/deno",
    "test",
    "--config",
    "deno.browser.json",
    "--frozen",
    "--lock=implementation/2026-10-16-publication/verification/deno-runtime.lock",
    "src",
]
started = time.monotonic()
result = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False)
log = HERE / "deno-full-v2.log"
log.write_bytes(result.stdout)
receipt = {
    "command": command,
    "exitCode": result.returncode,
    "durationSeconds": round(time.monotonic() - started, 3),
    "log": log.name,
}
(HERE / "deno-full-v2.exit.json").write_text(json.dumps(receipt, indent=2) + "\n")
after = write_lock("source-lock-v2-after.json")

before_map = {item["path"]: item["sha256"] for item in before["inputs"]}
after_map = {item["path"]: item["sha256"] for item in after["inputs"]}
changed = sorted(path for path in before_map.keys() | after_map.keys() if before_map.get(path) != after_map.get(path))
(HERE / "source-lock-audit-v2.json").write_text(
    json.dumps(
        {
            "beforeCount": len(before_map),
            "afterCount": len(after_map),
            "changedPaths": changed,
            "status": "MATCH" if not changed else "MISMATCH",
        },
        indent=2,
    )
    + "\n"
)
base = json.loads((HERE / "source-lock-v1.json").read_text())
base_map = {item["path"]: item["sha256"] for item in base["inputs"]}
delta = sorted(path for path in base_map.keys() | before_map.keys() if base_map.get(path) != before_map.get(path))
(HERE / "source-delta-v1-to-v2.json").write_text(
    json.dumps({"baseCount": len(base_map), "currentCount": len(before_map), "changedPaths": delta}, indent=2) + "\n"
)
print(f"DENO_V2 exit={result.returncode} duration={receipt['durationSeconds']}s log={log}", flush=True)
print(f"SOURCE_AUDIT_V2 {'MATCH' if not changed else 'MISMATCH'} inputs={len(before_map)} changed={len(changed)}", flush=True)
print(f"SOURCE_DELTA_V1_V2 changed={delta}", flush=True)
if result.returncode:
    print(result.stdout.decode("utf-8", errors="replace")[-5000:], flush=True)
