from pathlib import Path
import hashlib,json,tarfile,shutil
root=Path.cwd();out=root/'implementation/2026-10-12-native-cells';cache=root/'.cache/native-cell-milestone'
assert not out.exists(),'Refusing to overwrite checkpoint'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text())
previous=read(root/'implementation/2026-10-12-product-mixed-identity-v3/status.json');old=read(root/'implementation/2026-10-12-product-mixed-v2/status.json')
assert sha(root/'research.ipynb')=='0069fa5cf8ffef8e82454debe3478f784f93fd99ce8869cb6275b8c67ff88f1b'
for checkpoint in [previous,old]:
 for fn,want in checkpoint['evidenceSha256'].items():assert sha(root/fn)==want,fn
for fn,want in previous['sourceAndBuildSha256'].items():
 if fn.startswith(('dist-product-mixed-v2/','dist-product-mixed-candidate/')):assert sha(root/fn)==want,fn
assert sha(root/'implementation/2026-10-12-product-mixed-identity-v3/source-and-build.tar.gz')==previous['archiveSha256']
assert sha(root/'implementation/2026-10-12-product-mixed-v2/source-and-build.tar.gz')==old['archiveSha256']
prior=read(root/'implementation/2026-10-12-state-resolution/status.json')
assert sha(root/'implementation/2026-10-12-state-resolution/source-and-build.tar.gz')==prior['archiveSha256']
allocation=read(root/'implementation/2026-10-12-state-resolution-memory/status.json')
assert sha(root/'implementation/2026-10-12-state-resolution-memory/evidence.tar.gz')==allocation['archiveSha256']
for fn,want in allocation['evidenceSha256'].items():assert sha(root/fn)==want,fn
cmds=read(cache/'commands.json');assert len(cmds)==52 and all(x['exitCode']==0 for x in cmds)
assert '512 passed | 0 failed' in (cache/'deno-final.log').read_text()
assert '28 passed; 0 failed' in (cache/'rust.log').read_text()
pilot=read(cache/'product-mixed-pilot/results.json');assert pilot['status']=='PASS' and len(pilot['records'])==6
for x in pilot['records']:
 r=read(cache/f"product-mixed-pilot/{x['arm']}-{x['size']}.json");assert r['status']=='PASS' and r['production'] and len(r['samples'])==60 and all(r['checks'].values())
cmds.append({'name':'product-mixed-pilot','command':['node','scripts/verify_product_mixed_v2_pilot.mjs'],'environment':{'PRODUCT_MIXED_ORIGIN':'https://compiled-native-cells.localhost:1355','PRODUCT_MIXED_PILOT_DIR':'.cache/native-cell-milestone/product-mixed-pilot'},'exitCode':0})
assert read(root/'.cache/native-package-verification/results.json')['status']=='PASS'
files=[p for p in root.iterdir() if p.is_file() and p.suffix in {'.md','.html','.json','.ts','.yaml','.lock'}]
for base in ['src','scripts','compiler','dist','dist-product-mixed-v2','dist-product-mixed-candidate','dist-product-mixed-direct-writers','dist-product-mixed-unary','dist-product-mixed-cell-identity','dist-product-mixed-state-resolution','dist-product-mixed-native-cells']:
 files.extend(p for p in (root/base).rglob('*') if p.is_file() and not any(x in {'target','node_modules','.cache','.git','__pycache__'} for x in p.relative_to(root).parts))
files.extend([root/'.cache/compiled-ui-runtime.tgz',root/'.cache/native-package-build/package-report.json']);files=sorted(set(files));hashes={str(p.relative_to(root)):sha(p) for p in files}
out.mkdir();v=out/'verification';shutil.copytree(cache,v);(v/'commands.json').write_text(json.dumps(cmds,indent=2)+'\n')
shutil.copy2(root/'.cache/native-package-verification/results.json',v/'installed-package-results.json')
shutil.copytree(root/'.cache/product-mixed-v2/compiler-proof',v/'product-compiler-proof')
for src,dest in [('.cache/three-host-browser','three-browser-records'),('.cache/store-matrix-milestone/input-browser-results.json','input-browser-results.json'),('.cache/namespace-three-milestone/hmr-results.json','hmr-results.json'),('.cache/namespace-three-milestone/resource-regression','resource-browser-records')]:
 p=root/src
 if p.is_dir():shutil.copytree(p,v/dest)
 elif p.exists():shutil.copy2(p,v/dest)
with tarfile.open(out/'source-and-build.tar.gz','w:gz') as tar:
 for p in files:tar.add(p,arcname=str(p.relative_to(root)),recursive=False)
status={'schemaVersion':1,'date':'2026-10-12','milestone':'Stable native cell channel and persistent pending journal','status':'NATIVE_CELLS_CORRECTNESS_VERIFIED','goalStatus':'ACTIVE','goalRenewed':True,'performancePlan':'performance-implementation-plan.md','runtimeTests':512,'rustTests':28,'integrationCommands':53,'candidateProductionPilotPages':6,'performance':{'baselineGate':'FAIL','candidateGate':'UNMEASURED','note':'Correctness pilot does not prove speed; prior qualified allocation diagnostic identifies dispatch/preparation work'},'archive':'source-and-build.tar.gz','archiveSha256':sha(out/'source-and-build.tar.gz'),'sourceAndBuildSha256':hashes,'verificationSha256':{str(p.relative_to(out)):sha(p) for p in v.rglob('*') if p.is_file()},'historicalEvidence':{'researchNotebookSha256':sha(root/'research.ipynb'),'identityV3ArchiveSha256':previous['archiveSha256'],'V2ArchiveSha256':old['archiveSha256']},'limits':['First nonempty collection can still require schema-discovery fallback','Equal mutable object/function projections retain conservative writes','CSR/column metadata still uses fallback','Mixed numeric plus structural state still uses generic candidate; coherent delta candidate is next planned seam','No candidate speed/size/independent-device/comparative maintenance verdict; Sol full review held','Column cut staging now uses one token and three scratch arrays per batch; prior kernel allocation claims no longer apply','Direct nested raw numeric mutations reject before mutation; native state setters retain deferred scheduling'],'predecessorSourceArchiveSha256':prior['archiveSha256'],'allocationDiagnosticArchiveSha256':allocation['archiveSha256'],'next':'Compiler-executed source/sink programs and coherent mixed numeric/keyed candidate integration per performance plan'}
(out/'status.json').write_text(json.dumps(status,indent=2)+'\n')
with tarfile.open(out/'source-and-build.tar.gz') as tar:
 members={m.name:m for m in tar.getmembers()};assert set(members)==set(hashes)
 for fn,want in hashes.items():assert hashlib.sha256(tar.extractfile(members[fn]).read()).hexdigest()==want and sha(root/fn)==want,fn
print(json.dumps({'status':'ARCHIVED_AND_HASH_VERIFIED','sourceFiles':len(hashes),'checks':53,'archiveSha256':status['archiveSha256'],'path':str(out)}))
