#!/usr/bin/env python3
"""Run the released compiler-artifacts correctness boundary and preserve receipts."""
from __future__ import annotations
import hashlib, json, os, shutil, subprocess, time
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
NODE='/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node'
CARGO_HOME=ROOT/'.cache/cargo'
ENV={**os.environ,'CARGO_HOME':str(CARGO_HOME),'PATH':':'.join([str(Path(NODE).parent),'/Users/mini/.local/share/mise/installs/node/26/bin','/Users/mini/.cargo/bin','/opt/homebrew/bin',os.environ.get('PATH','')])}
COMPILER=ROOT/'compiler/oxc-spike/target/debug/ui-graph-compiler-spike'
EXCLUDED={'target','.cache','node_modules','dist','.git','verification','benchmark'}
def sha(p:Path):
 if not p.is_file(): return None
 h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
def input_paths():
 found=set()
 for top in ('src','compiler','packages','scripts'):
  for cur,dirs,files in os.walk(ROOT/top):
   dirs[:]=[d for d in dirs if d not in EXCLUDED]
   for f in files: found.add((Path(cur)/f).relative_to(ROOT))
 for n in ('package.json','pnpm-lock.yaml','pnpm-workspace.yaml','deno.json','deno.browser.json','deno.lock','tsconfig.json','tsconfig.native-tooling.json','tsconfig.r3act-packages.json','vite.config.ts','LICENSE'):
  if (ROOT/n).is_file():found.add(Path(n))
 sl=ROOT/'implementation/2026-10-18-compiler-artifacts'
 for cur,dirs,files in os.walk(sl):
  dirs[:]=[d for d in dirs if d not in {'benchmark','verification'}]
  for f in files:found.add((Path(cur)/f).relative_to(ROOT))
 for n in ('docs/native-authoring-reference.md','three-host-api.md'):
  if (ROOT/n).is_file():found.add(Path(n))
 return sorted(found,key=lambda p:p.as_posix())
def write_lock(name):
 rows=[{'path':p.as_posix(),'sha256':sha(ROOT/p)} for p in input_paths()]
 v={'schemaVersion':1,'slice':'2026-10-18-compiler-artifacts','phase':name,'inputs':rows}
 (HERE/name).write_text(json.dumps(v,indent=2)+'\n');return v
def run(name,cmd,extra_env=None):
 print('START',name,':',' '.join(cmd),flush=True); t=time.monotonic()
 try:r=subprocess.run(cmd,cwd=ROOT,env={**ENV,**(extra_env or {})},stdout=subprocess.PIPE,stderr=subprocess.STDOUT,check=False)
 except Exception as e:
  data=(repr(e)+'\n').encode(); rc=127
 else:data=r.stdout;rc=r.returncode
 receipt={'command':cmd,'environment':{'CARGO_HOME':str(CARGO_HOME)},'exitCode':rc,'durationSeconds':round(time.monotonic()-t,3),'log':name+'.log'}
 (HERE/(name+'.log')).write_bytes(data);(HERE/(name+'.exit.json')).write_text(json.dumps(receipt,indent=2)+'\n')
 print('END',name,'exit=',rc,'seconds=',receipt['durationSeconds'],flush=True)
 if rc:print(data.decode(errors='replace')[-3500:],flush=True)
 return receipt
def tree_manifest(src):
 rows=[]
 if src.exists():
  for p in sorted(x for x in src.rglob('*') if x.is_file()):rows.append({'path':p.relative_to(src).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)})
 return rows
def archive_tree(src,dest):
 if dest.exists(): raise RuntimeError(f'archive already exists: {dest}')
 dest.parent.mkdir(parents=True,exist_ok=True)
 if src.exists():shutil.copytree(src,dest)
 rows=tree_manifest(dest)
 return {'source':src.relative_to(ROOT).as_posix(),'archive':dest.relative_to(ROOT).as_posix(),'fileCount':len(rows),'files':rows}
def main():
 before=write_lock('source-lock-v1.json')
 (HERE/'source-lock-v1.receipt.json').write_text(json.dumps({'inputCount':len(before['inputs']),'cargoHome':str(CARGO_HOME),'benchmarkExcluded':True},indent=2)+'\n')
 for cache_name in ('.cache/r3act-package-build','.cache/native-package-build'):
  src=ROOT/cache_name; tag=Path(cache_name).name
  archive=archive_tree(src,HERE/'prebuild-archives'/tag)
  (HERE/f'prebuild-{tag}.json').write_text(json.dumps(archive,indent=2)+'\n')
 run('cargo-test-v1',['/Users/mini/.cargo/bin/cargo','test','--locked','--manifest-path','compiler/oxc-spike/Cargo.toml'])
 build=run('cargo-build-v1',['/Users/mini/.cargo/bin/cargo','build','--locked','--manifest-path','compiler/oxc-spike/Cargo.toml'])
 if build['exitCode']==0:
  (HERE/'compiler-binary-v1.json').write_text(json.dumps({'path':COMPILER.relative_to(ROOT).as_posix(),'sha256':sha(COMPILER),'cargoHome':str(CARGO_HOME)},indent=2)+'\n')
  run('compiler-info-v1',[str(COMPILER),'--compiler-info'])
 run('deno-full-v1',['/opt/homebrew/bin/deno','test','--config','deno.browser.json','--frozen','--lock=implementation/2026-10-16-publication/verification/deno-runtime.lock','src'])
 run('native-tooling-v1',['pnpm','check:native-tooling'])
 fixtures=[
 'compiler/compiled_direct_intent_test.mjs','compiler/compiled_urgent_retained_test.mjs','compiler/compiled_urgent_retained_three_test.mjs','compiler/compiled_boundary_workset_test.mjs','compiler/compiled_boundary_reveal_test.mjs','compiler/native_resource_execution_test.mjs','compiler/compiled_joint_transaction_test.mjs','compiler/compiled_scoped_collection_test.mjs','compiler/compiled_retained_transaction_test.mjs','compiler/compiled_owner_row_execution_test.mjs','compiler/compiled_owner_row_three_execution_test.mjs','compiler/compiled_store_host_test.mjs','compiler/compiled_joint_store_host_test.mjs','compiler/compiled_joint_input_transaction_test.mjs','compiler/compiled_resource_subtree_reveal_test.mjs']
 for i,f in enumerate(fixtures,1):
  pre=sha(COMPILER); rr=run(f'compiled-{i:02d}-v1',[NODE,'--experimental-transform-types',f]); post=sha(COMPILER)
  rr.update({'debugCompilerSha256Before':pre,'debugCompilerSha256After':post,'compilerChanged':pre!=post})
  (HERE/f'compiled-{i:02d}-v1.exit.json').write_text(json.dumps(rr,indent=2)+'\n')
 if build['exitCode']==0:run('native-compiler-artifact-v1',[NODE,'--experimental-transform-types','compiler/native_compiler_artifact_test.mjs'])
 else:(HERE/'native-compiler-artifact-v1.exit.json').write_text(json.dumps({'status':'SKIPPED_DEPENDENCY_FAILED','dependency':'cargo-build-v1'},indent=2)+'\n')
 run('three-host-node-v1',[NODE,'--experimental-transform-types','--test','compiler/three_host_capability_test.mjs'])
 run('direct-intent-retention-v1',[NODE,'--experimental-transform-types','--expose-gc','scripts/verify_direct_intent_retention.mjs'])
 run('native-candidate-retention-v1',[NODE,'--experimental-transform-types','--expose-gc','scripts/verify_native_candidate_retention.mjs'])
 # Fresh R3act packages + installed consumer.
 pb=run('r3act-package-build-v1',['pnpm','package:r3act'])
 if pb['exitCode']==0:
  rows=tree_manifest(ROOT/'.cache/r3act-package-build');shutil.copytree(ROOT/'.cache/r3act-package-build',HERE/'r3act-packages-v1')
  (HERE/'r3act-package-archive-v1.json').write_text(json.dumps({'fileCount':len(rows),'files':rows},indent=2)+'\n')
  run('r3act-package-consumer-v1',['pnpm','check:r3act-packages'])
 else:(HERE/'r3act-package-consumer-v1.exit.json').write_text(json.dumps({'status':'SKIPPED_DEPENDENCY_FAILED'},indent=2)+'\n')
 # Fresh legacy native package build + installed consumer.
 nb=run('native-package-build-v1',['pnpm','package:native'])
 if nb['exitCode']==0:
  rows=tree_manifest(ROOT/'.cache/native-package-build');shutil.copytree(ROOT/'.cache/native-package-build',HERE/'native-packages-v1')
  (HERE/'native-package-archive-v1.json').write_text(json.dumps({'fileCount':len(rows),'files':rows},indent=2)+'\n')
  run('native-package-consumer-v1',['pnpm','check:native-package'])
 else:(HERE/'native-package-consumer-v1.exit.json').write_text(json.dumps({'status':'SKIPPED_DEPENDENCY_FAILED'},indent=2)+'\n')
 after=write_lock('source-lock-v1-after.json')
 bm={x['path']:x['sha256'] for x in before['inputs']};am={x['path']:x['sha256'] for x in after['inputs']}
 changed=sorted(p for p in bm.keys()|am.keys() if bm.get(p)!=am.get(p))
 audit={'beforeCount':len(bm),'afterCount':len(am),'changedPaths':changed,'status':'MATCH' if not changed else 'MISMATCH'}
 (HERE/'source-lock-audit-v1.json').write_text(json.dumps(audit,indent=2)+'\n')
 print('SOURCE_AUDIT',audit['status'],'before',len(bm),'after',len(am),'changed',len(changed),flush=True)
if __name__=='__main__':main()
