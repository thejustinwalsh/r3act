from pathlib import Path
import hashlib,json,tarfile,shutil,re
root=Path.cwd();cache=root/'.cache/native-cell-cut-milestone';out=root/'implementation/2026-10-13-native-cell-cut'
assert not out.exists(),'Refusing to overwrite checkpoint'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text())
assert sha(root/'research.ipynb')=='0069fa5cf8ffef8e82454debe3478f784f93fd99ce8869cb6275b8c67ff88f1b'
prior=read(root/'implementation/2026-10-12-mixed-candidates/status.json')
assert sha(root/'implementation/2026-10-12-mixed-candidates/source-and-build.tar.gz')==prior['archiveSha256']
for checkpoint in (root/'implementation').glob('*/status.json'):
 status=read(checkpoint)
 if 'archiveSha256' in status and 'archive' in status:
  artifact=root/status['archive'] if status['archive'].startswith('implementation/') else checkpoint.parent/status['archive']
  assert artifact.is_file() and sha(artifact)==status['archiveSha256'],str(artifact)
 for filename,want in status.get('evidenceSha256',{}).items():
  assert sha(root/filename)==want,filename
 for filename,want in status.get('sourceAndBuildSha256',{}).items():
  if filename.startswith('dist-product-mixed-'):
   assert sha(root/filename)==want,filename
commands=read(cache/'commands.json');assert len(commands)==55 and all(x['exitCode']==0 for x in commands)
final=read(cache/'final-checks.json');assert all(x['exitCode']==0 for x in final);commands.extend(final)
runtime_tests=int(re.search(r'(\d+) passed \| 0 failed',(cache/'deno-final.log').read_text()).group(1))
rust_tests=int(re.search(r'(\d+) passed; 0 failed',(cache/'rust.log').read_text()).group(1))
pilot=read(cache/'product-mixed-pilot/results.json');assert pilot['status']=='PASS' and len(pilot['records'])==6
for item in pilot['records']:
 record=read(cache/f"product-mixed-pilot/{item['arm']}-{item['size']}.json")
 assert record['status']=='PASS' and record['production'] and len(record['samples'])==60 and all(record['checks'].values())
assert read(cache/'execution-proof.json')['captureCallsForEligibleCuts']==0
assets=read(cache/'served-assets.json');assert assets['status']=='PASS' and len(assets['records'])==5
for asset in assets['records']:assert sha(root/assets['build']/asset['path'])==asset['sha256']
commands.append({'name':'product-mixed-pilot','command':['node','scripts/verify_product_mixed_v2_pilot.mjs'],'environment':{'PRODUCT_MIXED_ORIGIN':assets['origin'],'PRODUCT_MIXED_PILOT_DIR':'.cache/native-cell-cut-milestone/product-mixed-pilot'},'exitCode':0})
files=[p for p in root.iterdir() if p.is_file() and p.suffix in {'.md','.html','.json','.ts','.yaml','.lock'}]
for base in ['src','scripts','compiler','dist']+[p.name for p in root.glob('dist-product-mixed-*') if p.is_dir()]:
 files.extend(p for p in (root/base).rglob('*') if p.is_file() and not any(x in {'target','node_modules','.cache','.git','__pycache__'} for x in p.relative_to(root).parts))
files.extend([root/'.cache/compiled-ui-runtime.tgz',root/'.cache/native-package-build/package-report.json']);files=sorted(set(files));hashes={str(p.relative_to(root)):sha(p) for p in files}
out.mkdir();verification=out/'verification';shutil.copytree(cache,verification);shutil.copytree(root/'.cache/native-cell-cut-pre-simplification',verification/'pre-simplification')
(verification/'commands.json').write_text(json.dumps(commands,indent=2)+'\n')
shutil.copy2(root/'.cache/native-package-verification/results.json',verification/'installed-package-results.json')
shutil.copytree(root/'.cache/product-mixed-v2/compiler-proof',verification/'product-compiler-proof')
with tarfile.open(out/'source-and-build.tar.gz','w:gz') as tar:
 for p in files:tar.add(p,arcname=str(p.relative_to(root)),recursive=False)
status={'schemaVersion':1,'date':'2026-10-13','milestone':'Native captured cell cuts without per-field StateChange records','status':'NATIVE_CELL_CUT_CORRECTNESS_VERIFIED','goalStatus':'ACTIVE','runtimeTests':runtime_tests,'rustTests':rust_tests,'integrationCommands':len(commands),'candidateProductionPilotPages':6,'archive':'source-and-build.tar.gz','archiveSha256':sha(out/'source-and-build.tar.gz'),'sourceAndBuildSha256':hashes,'verificationSha256':{str(p.relative_to(out)):sha(p) for p in verification.rglob('*') if p.is_file()},'predecessorSourceArchiveSha256':prior['archiveSha256'],'historicalEvidence':{'researchNotebookSha256':sha(root/'research.ipynb')},'performance':{'baselineGate':'FAIL','candidateGate':'UNMEASURED'},'limits':['Eligible native numeric cuts reuse version buffers; this does not remove all allocations or world dirty maps', 'Numeric mixed candidate writes still use generic source batching','Initial empty collection can need schema-discovery fallback','Unproved resource/boundary/owner footprints retain coherent full candidate fallback','Component visit bounds are not a bound on ordered bucket work or initial cached child-array release','Grouped-root protocol proof is not worker parallelism or a general distributed transaction','No speed/size/independent-device/comparative-maintenance verdict; Sol full review held'],'next':'Fresh attributed allocation diagnostic, then justified dense storage integration and unchanged product confirmation'}
(out/'status.json').write_text(json.dumps(status,indent=2)+'\n')
with tarfile.open(out/'source-and-build.tar.gz') as tar:
 members={m.name:m for m in tar.getmembers()};assert set(members)==set(hashes)
 for filename,want in hashes.items():assert hashlib.sha256(tar.extractfile(members[filename]).read()).hexdigest()==want and sha(root/filename)==want,filename
print(json.dumps({'status':'ARCHIVED_AND_HASH_VERIFIED','runtimeTests':runtime_tests,'rustTests':rust_tests,'commands':len(commands),'files':len(hashes),'archiveSha256':status['archiveSha256']}))
