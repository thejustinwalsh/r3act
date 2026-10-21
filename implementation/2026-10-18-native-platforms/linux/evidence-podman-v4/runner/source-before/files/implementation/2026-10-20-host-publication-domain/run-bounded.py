import datetime
import json
import os
import pathlib
import signal
import subprocess
import sys
import time

output = pathlib.Path(sys.argv[1])
deadline = int(sys.argv[2])
command = sys.argv[3:]
output.parent.mkdir(parents=True, exist_ok=True)
if output.exists():
    raise RuntimeError(f"Refusing to overwrite {output}")
start_utc = datetime.datetime.now(datetime.timezone.utc).isoformat()
start = time.monotonic()
stdout = output.with_suffix(".stdout.log")
stderr = output.with_suffix(".stderr.log")
stop = None
with stdout.open("xb") as out, stderr.open("xb") as err:
    child = subprocess.Popen(command, stdout=out, stderr=err, start_new_session=True)
    def interrupt(number, frame):
        global stop
        stop = f"signal-{number}"
        os.killpg(child.pid, signal.SIGKILL)
    signal.signal(signal.SIGTERM, interrupt)
    signal.signal(signal.SIGINT, interrupt)
    try:
        code = child.wait(timeout=deadline)
    except subprocess.TimeoutExpired:
        stop = "deadline"
        os.killpg(child.pid, signal.SIGKILL)
        code = child.wait(timeout=5)
record = {"command": command, "startedAtUtc": start_utc,
          "finishedAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
          "wallSeconds": time.monotonic() - start, "deadlineSeconds": deadline,
          "exitCode": code, "stop": stop, "stdout": str(stdout), "stderr": str(stderr)}
output.write_text(json.dumps(record, indent=2) + "\n")
print(json.dumps(record))
sys.exit(0 if code == 0 and stop is None else 1)
