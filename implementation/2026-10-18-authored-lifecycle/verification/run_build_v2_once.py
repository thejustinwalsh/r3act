import datetime, json, os, pathlib, subprocess, time

root = pathlib.Path.cwd()
archive = root / 'implementation/2026-10-18-authored-lifecycle/verification/benchmark-build-v2'
assert not archive.exists(), f'archive already exists: {archive}'
archive.mkdir(parents=True)
node = '/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node'
script = 'implementation/2026-10-18-authored-lifecycle/workload/build-gate.mjs'
proof_dir = '/Volumes/Depot/Developer/r3act/implementation/2026-10-18-authored-lifecycle/workload/proof-v2'
command = [node, script, '--proof-dir', proof_dir]
env = os.environ.copy()
env.pop('CARGO_TARGET_DIR', None)
env.pop('CARGO_BUILD_TARGET', None)
env['PATH'] = '/Users/mini/.local/share/mise/installs/node/24.18.0/bin:' + env.get('PATH', '')
start = time.monotonic()
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
result = subprocess.run(command, cwd=root, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
duration = time.monotonic() - start
(archive / 'stdout.log').write_text(result.stdout)
(archive / 'stderr.log').write_text(result.stderr)
metadata = {'command': command, 'cwd': str(root), 'startedAt': started,
            'durationSeconds': duration, 'exitCode': result.returncode,
            'cargoTargetOverrides': 'unset', 'pathPrefix': '/Users/mini/.local/share/mise/installs/node/24.18.0/bin'}
(archive / 'command.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(json.dumps(metadata))
print(result.stdout, end='')
if result.stderr:
    print(result.stderr, end='', file=__import__('sys').stderr)
raise SystemExit(result.returncode)
