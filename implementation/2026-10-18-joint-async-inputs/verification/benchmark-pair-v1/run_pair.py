import os, subprocess, json, hashlib, time, re
from pathlib import Path
root=Path.cwd(); out=Path('implementation/2026-10-18-joint-async-inputs/verification/benchmark-pair-v1')
command=['/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node','implementation/2026-10-18-joint-async-inputs/benchmark/run-pair.mjs','--proof-dir','/Volumes/Depot/Developer/r3act/implementation/2026-10-18-joint-async-inputs/benchmark/proof-v2','--origin','https://r3act-joint-async-inputs.localhost']
env=os.environ.copy(); env['PATH']='/Users/mini/.local/share/mise/installs/node/24.18.0/bin:'+env.get('PATH',''); env.pop('CARGO_TARGET_DIR',None); env.pop('CARGO_BUILD_TARGET',None)
assert Path('implementation/2026-10-18-joint-async-inputs/benchmark/proof-v2/run-authorization.json').is_file()
assert not Path('implementation/2026-10-18-joint-async-inputs/benchmark/proof-v2/pair-one-shot.json').exists()
def browsers():
 try:
  lines=subprocess.check_output(['ps','-A','-o','pid=,ppid=,comm='],text=True).splitlines()
 except Exception: return []
 return [line.strip() for line in lines if re.search(r'(Chrome|Chromium|headless_shell)',line,re.I)]
before=set(browsers()); seen=set(); started=time.monotonic()
with open(out/'stdout.log','wb') as stdout, open(out/'stderr.log','wb') as stderr:
 p=subprocess.Popen(command,cwd=root,env=env,stdout=stdout,stderr=stderr)
 while p.poll() is None:
  seen.update(browsers())
  time.sleep(0.2)
 exit_code=p.wait()
after=set(browsers()); new_seen=seen-before
(out/'command.json').write_text(json.dumps({'cwd':str(root),'command':command,'nodeVersion':subprocess.check_output([command[0],'--version'],env=env,text=True).strip(),'envPathFirst':env['PATH'].split(':')[0],'unset':['CARGO_TARGET_DIR','CARGO_BUILD_TARGET'],'exitCode':exit_code,'elapsedSeconds':round(time.monotonic()-started,3),'stdoutSha256':hashlib.sha256((out/'stdout.log').read_bytes()).hexdigest(),'stderrSha256':hashlib.sha256((out/'stderr.log').read_bytes()).hexdigest(),'browserProcessCleanup':{'preexisting':sorted(before),'observedDuringRun':sorted(new_seen),'remainingAfterRun':sorted(after-before),'processCheck':'ps -A pid/ppid/comm filtered to Chrome, Chromium and headless_shell names'}},indent=2)+'\n')
print(f'exit={exit_code} elapsed={(time.monotonic()-started):.3f}s')
raise SystemExit(exit_code)
