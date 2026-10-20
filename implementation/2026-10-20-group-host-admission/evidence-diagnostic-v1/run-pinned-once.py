from pathlib import Path
import json
import os
import signal
import subprocess
import time

HERE = Path(__file__).resolve().parent
WORK = HERE / "workspace"
LOGS = HERE / "logs"
RECEIPT = LOGS / "run-002.json"


def main():
    if RECEIPT.exists():
        raise RuntimeError("Diagnostic already ran; preserve its first result")
    LOGS.mkdir(exist_ok=True)
    command = ["/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node", "--experimental-transform-types",
               "compiler/compiled_joint_input_transaction_test.mjs"]
    start = time.monotonic()
    child = subprocess.Popen(command, cwd=WORK, stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE, start_new_session=True)
    timed_out = False
    try:
        stdout, stderr = child.communicate(timeout=90)
    except subprocess.TimeoutExpired:
        timed_out = True
        os.killpg(child.pid, signal.SIGTERM)
        try:
            stdout, stderr = child.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(child.pid, signal.SIGKILL)
            stdout, stderr = child.communicate(timeout=5)
    (LOGS / "run-002.stdout.log").write_bytes(stdout)
    (LOGS / "run-002.stderr.log").write_bytes(stderr)
    RECEIPT.write_text(json.dumps({
        "kind": "isolated-correctness-diagnostic",
        "command": command,
        "cwd": str(WORK),
        "exitCode": child.returncode,
        "timedOut": timed_out,
        "elapsedSeconds": round(time.monotonic() - start, 3),
        "stdout": "run-002.stdout.log",
        "stderr": "run-002.stderr.log",
    }, indent=2) + "\n")
    print(RECEIPT)
    raise SystemExit(124 if timed_out else child.returncode)


if __name__ == "__main__":
    main()
