#!/usr/bin/env python3
"""Launch one approved proof build or one authorized offline pair, preserving child output and status."""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BENCH = Path(__file__).resolve().parent
NODE = Path("/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node")

parser = argparse.ArgumentParser()
parser.add_argument("mode", choices=["build", "pair"])
parser.add_argument("--proof-dir", required=True, type=Path)
parser.add_argument("--origin")
args = parser.parse_args()
proof_dir = args.proof_dir.resolve()
proof_dir.relative_to(BENCH.resolve())
if not NODE.is_file():
    raise SystemExit(f"required Node executable missing: {NODE}")

if args.mode == "build":
    if proof_dir.exists():
        raise SystemExit(f"refusing to replace existing proof directory: {proof_dir}")
    marker = BENCH / f"{proof_dir.name}-build-attempt.json"
    command = [str(NODE), str(BENCH / "build-gate.mjs"), "--proof-dir", str(proof_dir)]
else:
    if not args.origin:
        raise SystemExit("--origin is required for pair mode")
    if not proof_dir.is_dir():
        raise SystemExit(f"proof directory does not exist: {proof_dir}")
    if (proof_dir / "pair-one-shot.json").exists():
        raise SystemExit(f"refusing a second pair: {proof_dir / 'pair-one-shot.json'}")
    marker = proof_dir / "pair-run-attempt.json"
    command = [str(NODE), str(BENCH / "run-pair.mjs"), "--proof-dir", str(proof_dir), "--origin", args.origin]

if marker.exists():
    raise SystemExit(f"refusing a repeated attempt: {marker}")
with marker.open("x", encoding="utf-8") as attempt:
    attempt.write(json.dumps({"mode": args.mode, "command": command, "proofDir": str(proof_dir)}, indent=2) + "\n")
try:
    completed = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False)
    stdout = completed.stdout
    stderr = completed.stderr
    exit_code = completed.returncode
except OSError as error:
    stdout = ""
    stderr = f"launcher error: {error}\n"
    exit_code = 127

stdout_path = proof_dir / "launcher.stdout.log" if proof_dir.exists() else BENCH / f"{proof_dir.name}-launcher.stdout.log"
stderr_path = proof_dir / "launcher.stderr.log" if proof_dir.exists() else BENCH / f"{proof_dir.name}-launcher.stderr.log"
exit_path = proof_dir / "launcher-exit.json" if proof_dir.exists() else BENCH / f"{proof_dir.name}-launcher-exit.json"
with stdout_path.open("x", encoding="utf-8") as output:
    output.write(stdout)
with stderr_path.open("x", encoding="utf-8") as output:
    output.write(stderr)
with exit_path.open("x", encoding="utf-8") as output:
    output.write(json.dumps({"command": command, "cwd": str(ROOT), "exitCode": exit_code,
        "stdout": str(stdout_path), "stderr": str(stderr_path), "attemptMarker": str(marker)}, indent=2) + "\n")
sys.stdout.write(stdout)
sys.stderr.write(stderr)
sys.stdout.write(f"\nchild exit code: {exit_code}; receipt: {exit_path}\n")
raise SystemExit(exit_code)
