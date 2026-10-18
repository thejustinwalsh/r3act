import json,os,pathlib,subprocess,sys,time
root=pathlib.Path.cwd(); out=root/'implementation/2026-10-18-component-forwarding/verification/benchmark-pair-v1'
cmd=['/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node','implementation/2026-10-18-component-forwarding/benchmark/run-pair.mjs','--proof-dir','/Volumes/Depot/Developer/r3act/implementation/2026-10-18-component-forwarding/benchmark/proof-v1','--origin','https://component-forwarding-proof.localhost']
env=os.environ.copy(); env['PATH']='/Users/mini/.local/share/mise/installs/node/24.18.0/bin:'+env.get('PATH',''); env.pop('CARGO_TARGET_DIR',None); env.pop('CARGO_BUILD_TARGET',None)
record={'command':cmd,'cwd':str(root),'nodeVersion':subprocess.run([cmd[0],'--version'],capture_output=True,text=True,check=True).stdout.strip(),'timeoutSeconds':120,'headless':True,'gpu':False,'offline':True,'cargoTargetDirPresent':False,'cargoBuildTargetPresent':False,'startedAt':time.time()}
(out/'command.json').write_text(json.dumps(record,indent=2)+'\n')
try:
 with open(out/'stdout.log','wb') as stdout, open(out/'stderr.log','wb') as stderr:
  p=subprocess.run(cmd,cwd=root,env=env,stdout=stdout,stderr=stderr,timeout=120,start_new_session=True)
 record.update({'exitCode':p.returncode,'timedOut':False,'finishedAt':time.time()})
except subprocess.TimeoutExpired as e:
 record.update({'exitCode':None,'timedOut':True,'finishedAt':time.time(),'timeoutSeconds':120})
 # Kill only the exact runner process group created above, if it remains.
 try: os.killpg(e.pid,9); record['runnerProcessGroupKilled']=True
 except Exception as kill_error: record['runnerProcessGroupKillError']=repr(kill_error)
except Exception as e:
 record.update({'exitCode':None,'error':repr(e),'finishedAt':time.time()})
(out/'tool-exit.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'exitCode':record['exitCode'],'timedOut':record.get('timedOut',False),'error':record.get('error')}))
sys.exit(record['exitCode'] if record['exitCode'] is not None else 1)
