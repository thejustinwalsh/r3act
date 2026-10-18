import json,os,pathlib,subprocess,sys,time
root=pathlib.Path.cwd(); out=root/'implementation/2026-10-18-component-forwarding/verification/benchmark-build-v1'
proof='/Volumes/Depot/Developer/r3act/implementation/2026-10-18-component-forwarding/benchmark/proof-v1'
cmd=['/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node','implementation/2026-10-18-component-forwarding/benchmark/build-gate.mjs','--proof-dir',proof]
env=os.environ.copy(); env['PATH']='/Users/mini/.local/share/mise/installs/node/24.18.0/bin:'+env.get('PATH',''); env.pop('CARGO_TARGET_DIR',None); env.pop('CARGO_BUILD_TARGET',None)
record={'command':cmd,'cwd':str(root),'nodeVersion':subprocess.run([cmd[0],'--version'],capture_output=True,text=True,check=True).stdout.strip(),'cargoTargetDirPresent':False,'cargoBuildTargetPresent':False,'startedAt':time.time()}
(out/'command.json').write_text(json.dumps(record,indent=2)+'\n')
try:
 with open(out/'stdout.log','wb') as stdout, open(out/'stderr.log','wb') as stderr:
  p=subprocess.run(cmd,cwd=root,env=env,stdout=stdout,stderr=stderr,timeout=240)
 record.update({'exitCode':p.returncode,'timedOut':False,'finishedAt':time.time()})
except subprocess.TimeoutExpired as e:
 record.update({'exitCode':None,'timedOut':True,'finishedAt':time.time(),'timeoutSeconds':240})
except Exception as e:
 record.update({'exitCode':None,'error':repr(e),'finishedAt':time.time()})
(out/'tool-exit.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'exitCode':record['exitCode'],'timedOut':record.get('timedOut',False),'error':record.get('error')}))
sys.exit(record['exitCode'] if record['exitCode'] is not None else 1)
