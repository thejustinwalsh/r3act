import hashlib,json,subprocess,time
from pathlib import Path
root=Path('/Volumes/Depot/Developer/r3act')
out=root/'implementation/2026-10-18-joint-async-inputs/verification/final-audit-v1'
assert not (out/'receipt.json').exists(), 'final audit already ran; refusing a rerun'
command=['python3','implementation/2026-10-18-joint-async-inputs/verification/final-audit-v1/audit.py']
start=time.monotonic(); result=subprocess.run(command,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False)
(out/'stdout.log').write_bytes(result.stdout); (out/'stderr.log').write_bytes(result.stderr)
(out/'command.json').write_text(json.dumps({'cwd':str(root),'command':command,'exitCode':result.returncode,'elapsedSeconds':round(time.monotonic()-start,3),'stdoutBytes':len(result.stdout),'stderrBytes':len(result.stderr),'stdoutSha256':hashlib.sha256(result.stdout).hexdigest(),'stderrSha256':hashlib.sha256(result.stderr).hexdigest()},indent=2)+'\n')
print(result.stdout.decode(errors='replace'))
print(f'exit={result.returncode} elapsed={time.monotonic()-start:.3f}s')
raise SystemExit(result.returncode)
