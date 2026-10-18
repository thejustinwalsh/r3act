import json,os,pathlib,subprocess,sys,time
root=pathlib.Path.cwd(); out=root/'implementation/2026-10-18-component-forwarding/verification/final-audit-v1'
cmd=['python3','implementation/2026-10-18-component-forwarding/verification/final-audit-v1/audit.py']
record={'cwd':str(root),'command':cmd,'timeoutSeconds':120,'startedAt':time.time()}
(out/'command.json').write_text(json.dumps(record,indent=2)+'\n')
try:
 p=subprocess.run(cmd,cwd=root,capture_output=True,text=True,timeout=120)
 (out/'stdout.log').write_text(p.stdout); (out/'stderr.log').write_text(p.stderr)
 record.update({'exitCode':p.returncode,'timedOut':False,'finishedAt':time.time()})
except subprocess.TimeoutExpired as e:
 (out/'stdout.log').write_bytes(e.stdout or b''); (out/'stderr.log').write_bytes(e.stderr or b'')
 record.update({'exitCode':None,'timedOut':True,'finishedAt':time.time()})
(out/'tool-exit.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'exitCode':record['exitCode'],'timedOut':record.get('timedOut')}))
sys.exit(record['exitCode'] if record['exitCode'] is not None else 1)
