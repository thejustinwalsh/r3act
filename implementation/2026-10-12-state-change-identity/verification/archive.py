from pathlib import Path
import json,hashlib,tarfile,shutil
root=Path.cwd();cache=root/'.cache/state-change-identity-milestone';out=root/'implementation/2026-10-12-state-change-identity'
assert not out.exists(),'Refusing to overwrite milestone'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text())
previous=read(root/'implementation/2026-10-12-product-mixed-v2/status.json');base=read(root/'implementation/2026-10-12-namespace-three/status.json')
assert sha(root/'research.ipynb')=='0069fa5cf8ffef8e82454debe3478f784f93fd99ce8869cb6275b8c67ff88f1b'
for fn,want in previous['evidenceSha256'].items():assert sha(root/fn)==want,fn
for fn,want in base['sourceAndBuildSha256'].items():
 if fn.startswith('dist-product-mixed-v2/'):assert sha(root/fn)==want,fn
assert sha(root/'implementation/2026-10-12-product-mixed-v2/source-and-build.tar.gz')==previous['archiveSha256']
cmds=read(cache/'commands.json');assert len(cmds)==45 and all(x['exitCode']==0 for x in cmds)
assert '443 passed | 0 failed' in (cache/'deno.log').read_text()
assert '25 passed; 0 failed' in (cache/'rust.log').read_text()
pilot=read(cache/'product-mixed-pilot/results.json');assert pilot['status']=='PASS' and len(pilot['records'])==6
for x in pilot['records']:
 r=read(cache/f"product-mixed-pilot/{x['arm']}-{x['size']}.json");assert r['status']=='PASS' and r['production'] and len(r['samples'])==60 and all(r['checks'].values())
cmds.append({'name':'product-mixed-pilot','command':['node','scripts/verify_product_mixed_v2_pilot.mjs'],'environment':{'PRODUCT_MIXED_ORIGIN':'https://compiled-product-candidate.localhost:1355','PRODUCT_MIXED_PILOT_DIR':'.cache/state-change-identity-milestone/product-mixed-pilot'},'exitCode':0})
assert read(root/'.cache/native-package-verification/results.json')['status']=='PASS'
assert 'PASS frozen CPU inputs' in (cache/'cpu-verification.log').read_text()
files=[p for p in root.iterdir() if p.is_file() and p.suffix in {'.md','.html','.json','.ts','.yaml','.lock'}]
for directory in ['src','scripts','compiler','dist','dist-product-mixed-v2','dist-product-mixed-candidate']:
 files.extend(p for p in (root/directory).rglob('*') if p.is_file() and not any(x in {'target','node_modules','.cache','.git','__pycache__'} for x in p.relative_to(root).parts))
files.extend([root/'.cache/compiled-ui-runtime.tgz',root/'.cache/native-package-build/package-report.json'])
files=sorted(set(files));hashes={str(p.relative_to(root)):sha(p) for p in files}
evidence=sorted(p for p in (root/'results/product-mixed-v2-cpu').iterdir() if p.is_file());evidenceHashes={str(p.relative_to(root)):sha(p) for p in evidence}
out.mkdir();v=out/'verification';shutil.copytree(cache,v)
(v/'commands.json').write_text(json.dumps(cmds,indent=2)+'\n')
shutil.copy2(root/'.cache/native-package-verification/results.json',v/'installed-package-results.json')
for src,dest in [('.cache/three-host-browser','three-browser-records'),('.cache/store-matrix-milestone/input-browser-results.json','input-browser-results.json'),('.cache/namespace-three-milestone/hmr-results.json','hmr-results.json'),('.cache/namespace-three-milestone/resource-regression','resource-browser-records')]:
 p=root/src
 if p.is_dir():shutil.copytree(p,v/dest)
 elif p.exists():shutil.copy2(p,v/dest)
for name,paths in [('source-and-build.tar.gz',files),('cpu-evidence.tar.gz',evidence)]:
 with tarfile.open(out/name,'w:gz') as tar:
  for p in paths:tar.add(p,arcname=str(p.relative_to(root)),recursive=False)
status={'schemaVersion':1,'date':'2026-10-12','milestone':'Attributed pending-state identities, numeric reentrant restoration and compiler host JSX generation','status':'STATE_CHANGE_IDENTITY_CANDIDATE_CORRECTNESS_VERIFIED','goalStatus':'ACTIVE','runtimeTests':443,'rustTests':25,'integrationCommands':46,'candidateProductionPilotPages':6,'cpuDiagnosticProfiles':2,'performance':{'baselineGate':'FAIL','candidateGate':'UNMEASURED','note':'Production pilot is correctness only; do not pool CPU diagnostic records with latency.'},'archive':'source-and-build.tar.gz','archiveSha256':sha(out/'source-and-build.tar.gz'),'sourceAndBuildSha256':hashes,'evidenceArchive':'cpu-evidence.tar.gz','evidenceArchiveSha256':sha(out/'cpu-evidence.tar.gz'),'evidenceSha256':evidenceHashes,'verificationSha256':{str(p.relative_to(out)):sha(p) for p in v.rglob('*') if p.is_file()},'historicalEvidence':{'researchNotebookSha256':sha(root/'research.ipynb'),'previousCheckpointArchiveSha256':previous['archiveSha256'],'lockedV2ProductionArchiveSha256':base['archiveSha256']},'limitations':['Candidate speed and allocation not yet measured','Persistent identity cache adds live-site memory; full-scale throughput unknown','Explicit host type registrations; runtime lifecycle policy remains adapter-owned','One physical device; independent-device and comparative human maintenance gates remain open','Sol full review remains held'], 'next':'Separately preregistered candidate comparison with existing workload and speed targets; allocation evidence separate; preserve V2 and historical records'}
(out/'status.json').write_text(json.dumps(status,indent=2)+'\n')
for name,expected in [('source-and-build.tar.gz',hashes),('cpu-evidence.tar.gz',evidenceHashes)]:
 with tarfile.open(out/name) as tar:
  members={m.name:m for m in tar.getmembers()};assert set(members)==set(expected)
  for fn,want in expected.items():assert hashlib.sha256(tar.extractfile(members[fn]).read()).hexdigest()==want and sha(root/fn)==want,fn
print(json.dumps({'status':'ARCHIVED_AND_HASH_VERIFIED','sourceFiles':len(hashes),'cpuEvidenceFiles':len(evidenceHashes),'checks':46,'archiveSha256':status['archiveSha256'],'path':str(out)}))
