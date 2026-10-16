import json,os,subprocess,time
from pathlib import Path
out=Path('.cache/numeric-program-milestone');env=dict(os.environ)
env['PATH']='/Users/tjw/.nvm/versions/node/v24.18.0/bin:/Users/tjw/.cargo/bin:/opt/homebrew/bin:'+env['PATH'];env['CARGO_HOME']=str(Path('.cache/cargo').resolve())
cmds=json.loads((out/'planned-commands.json').read_text());done=[]
for x in cmds:
 start=time.time()
 with (out/(x['name']+'.log')).open('w') as f:r=subprocess.run(x['command'],env=env,stdout=f,stderr=subprocess.STDOUT)
 entry={**x,'exitCode':r.returncode,'seconds':time.time()-start};done.append(entry)
 (out/'commands.json').write_text(json.dumps(done,indent=2)+'\n')
 print(x['name'],r.returncode,round(time.time()-start,2),flush=True)
 if r.returncode:raise SystemExit(r.returncode)
