import datetime, json, os, pathlib, signal, subprocess, time

root = pathlib.Path.cwd()
out = root / 'implementation/2026-10-18-authored-lifecycle/verification/final-audit-v1'
assert out.is_dir()
assert not (out / 'wrapper.json').exists()
command = ['python3', str(out / 'audit_checks.py')]
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
start = time.monotonic()
proc = subprocess.Popen(command, cwd=root, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                        start_new_session=True)
timed_out = False
try:
    stdout, stderr = proc.communicate(timeout=120)
except subprocess.TimeoutExpired:
    timed_out = True
    try:
        os.killpg(proc.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        stdout, stderr = proc.communicate(timeout=5)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        stdout, stderr = proc.communicate()
duration = time.monotonic() - start
(out / 'stdout.log').write_bytes(stdout)
(out / 'stderr.log').write_bytes(stderr)
metadata = {'command': command, 'cwd': str(root), 'startedAt': started,
            'deadlineSeconds': 120, 'durationSeconds': duration,
            'exitCode': proc.returncode, 'timedOut': timed_out}
(out / 'wrapper.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(json.dumps(metadata))
print(stdout.decode(errors='replace'), end='')
if stderr:
    import sys
    print(stderr.decode(errors='replace'), end='', file=sys.stderr)
raise SystemExit(proc.returncode if proc.returncode is not None else 1)
