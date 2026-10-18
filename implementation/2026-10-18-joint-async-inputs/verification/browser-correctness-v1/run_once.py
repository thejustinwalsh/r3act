import os,subprocess,json,hashlib,time,re,signal
from pathlib import Path
root=Path.cwd(); d=Path('implementation/2026-10-18-joint-async-inputs/verification/browser-correctness-v1')
command=['/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node','implementation/2026-10-18-joint-async-inputs/verification/browser-correctness-v1/run.mjs']
env=os.environ.copy(); env['PATH']='/Users/mini/.local/share/mise/installs/node/24.18.0/bin:'+env.get('PATH',''); env.pop('CARGO_TARGET_DIR',None); env.pop('CARGO_BUILD_TARGET',None)
assert not (d/'receipt.json').exists(), 'runner receipt already exists; refusing another attempt'
def browsers():
 try: rows=subprocess.check_output(['ps','-A','-o','pid=,ppid=,comm='],text=True).splitlines()
 except Exception: return []
 return [x.strip() for x in rows if 'Google Chrome for Testing' in x or 'chromium-1243' in x]
before=browsers(); started=time.monotonic(); timedOut=False
p=subprocess.Popen(command,cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True)
try:
 stdout,stderr=p.communicate(timeout=44)
except subprocess.TimeoutExpired:
 timedOut=True
 try: os.killpg(p.pid,signal.SIGINT)
 except ProcessLookupError: pass
 try: stdout,stderr=p.communicate(timeout=2)
 except subprocess.TimeoutExpired:
  try: os.killpg(p.pid,signal.SIGKILL)
  except ProcessLookupError: pass
  stdout,stderr=p.communicate()
exitCode=p.returncode
(d/'stdout.log').write_bytes(stdout); (d/'stderr.log').write_bytes(stderr)
after=browsers(); (d/'owned-browser-processes-after.txt').write_text('\n'.join(after)+'\n' if after else '')
metadata={'cwd':str(root),'command':command,'nodeVersion':subprocess.check_output([command[0],'--version'],env=env,text=True).strip(),'envPathFirst':env['PATH'].split(':')[0],'unset':['CARGO_TARGET_DIR','CARGO_BUILD_TARGET'],'wrapperTimeoutSeconds':44,'runnerTimeoutSeconds':30,'timedOut':timedOut,'elapsedSeconds':round(time.monotonic()-started,3),'exitCode':exitCode,'stdoutBytes':len(stdout),'stderrBytes':len(stderr),'stdoutSha256':hashlib.sha256(stdout).hexdigest(),'stderrSha256':hashlib.sha256(stderr).hexdigest(),'browserProcessCleanup':{'preexisting':before,'remainingAfterRun':after,'check':'ps -A filter Google Chrome for Testing and chromium-1243'}}
(d/'command.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(f'exit={exitCode} elapsed={metadata["elapsedSeconds"]} timeout={timedOut}')
raise SystemExit(exitCode)
