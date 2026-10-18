import datetime, json, os, pathlib, signal, subprocess, time

root = pathlib.Path.cwd()
archive = root / 'implementation/2026-10-18-authored-lifecycle/verification/benchmark-heap-v1'
assert not archive.exists(), f'capture destination already exists: {archive}'
archive.mkdir(parents=True)
command = ['/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node',
           'implementation/2026-10-18-authored-lifecycle/workload/run-pairs.mjs',
           '--kind', 'heap',
           '--proof-dir', '/Volumes/Depot/Developer/r3act/implementation/2026-10-18-authored-lifecycle/workload/proof-v2',
           '--origin', 'https://authored-lifecycle.localhost']
env = os.environ.copy()
env.pop('CARGO_TARGET_DIR', None)
env.pop('CARGO_BUILD_TARGET', None)
env['PATH'] = '/Users/mini/.local/share/mise/installs/node/24.18.0/bin:' + env.get('PATH', '')
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
start = time.monotonic()
proc = subprocess.Popen(command, cwd=root, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
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
exit_code = proc.returncode
(archive / 'stdout.log').write_bytes(stdout)
(archive / 'stderr.log').write_bytes(stderr)
metadata = {'command': command, 'cwd': str(root), 'startedAt': started,
            'wrapperDeadlineSeconds': 120, 'runnerDeadlineSeconds': 90,
            'durationSeconds': duration, 'exitCode': exit_code, 'timedOut': timed_out,
            'cargoTargetOverrides': 'unset',
            'pathPrefix': '/Users/mini/.local/share/mise/installs/node/24.18.0/bin'}
(archive / 'command.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(json.dumps(metadata))
print(stdout.decode(errors='replace'), end='')
if stderr:
    import sys
    print(stderr.decode(errors='replace'), end='', file=sys.stderr)
raise SystemExit(exit_code if exit_code is not None else 1)
