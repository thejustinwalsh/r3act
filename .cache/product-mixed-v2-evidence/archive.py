from pathlib import Path
import hashlib,json,tarfile,shutil
root=Path.cwd();out=root/'implementation/2026-10-12-product-mixed-v2';cache=root/'.cache/product-mixed-v2-evidence'
assert not out.exists(),'Refusing to overwrite evidence checkpoint'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
prereg=json.loads((root/'results/product-mixed-v2-preregistration.json').read_text())
manifest=json.loads((root/'results/product-mixed-v2-manifest.json').read_text())
summary=json.loads((root/'results/product-mixed-v2-summary.json').read_text())
assert manifest['status']=='COLLECTION_COMPLETE' and len(manifest['files'])==30 and not manifest['postCollectionChangedFiles']
assert summary['gate']=='FAIL' and not summary['validation']['invalidPages'] and not summary['validation']['archiveContentErrors']
assert 'PASS independent evidence verification' in (cache/'verify.log').read_text()
previous=json.loads((root/'implementation/2026-10-12-namespace-three/status.json').read_text())
assert sha(root/prereg['archive'])==prereg['archiveSha256']==previous['archiveSha256']
assert sha(root/'research.ipynb')==previous['historicalEvidence']['researchNotebookSha256']
# Library and production code remain byte-identical to the measured baseline.
for name,want in previous['sourceAndBuildSha256'].items():
 if name.startswith(('src/','compiler/','dist/','dist-product-mixed-v2/')):assert sha(root/name)==want,name
memory=json.loads((root/'results/product-mixed-v2-memory/results.json').read_text());assert memory['status']=='PASS' and len(memory['records'])==6
for item in manifest['files']:assert sha(root/item['file'])==item['sha256']
files=[p for p in root.iterdir() if p.is_file() and p.suffix in {'.md','.html','.json','.ts','.yaml','.lock'}]
for base in ['src','scripts','compiler','dist','dist-product-mixed-v2']:
 for p in (root/base).rglob('*'):
  if p.is_file() and not any(part in {'target','node_modules','.cache','.git','__pycache__'} for part in p.relative_to(root).parts):files.append(p)
files=sorted(set(files),key=lambda p:str(p.relative_to(root)));hashes={str(p.relative_to(root)):sha(p) for p in files}
evidence=[root/'results'/name for name in ['product-mixed-v2-preregistration.json','product-mixed-v2-manifest.json','product-mixed-v2-summary.json','product-mixed-v2-summary.svg']]
for base in ['results/product-mixed-v2','results/product-mixed-v2-memory']:evidence.extend(p for p in (root/base).rglob('*') if p.is_file())
evidence=sorted(evidence,key=lambda p:str(p.relative_to(root)));evidenceHashes={str(p.relative_to(root)):sha(p) for p in evidence}
out.mkdir();v=out/'verification';v.mkdir()
for name in ['verify.log','archive.py','render-chart.mjs','chart.png']:shutil.copy2(cache/name,v/name)
shutil.copy2(root/'.cache/product-mixed-v2-collection.log',v/'collection.log')
shutil.copy2(root/'.cache/product-mixed-v2-memory.log',v/'memory.log')
for name,paths in [('source-and-build.tar.gz',files),('evidence.tar.gz',evidence)]:
 with tarfile.open(out/name,'w:gz') as t:
  for p in paths:t.add(p,arcname=str(p.relative_to(root)),recursive=False)
status={'schemaVersion':1,'date':'2026-10-12','milestone':'Compiled product mixed V2 fixed confirmation and separate memory profiles','status':'COMPILED_PRODUCT_MIXED_SPEED_GATE_FAILED','goalStatus':'ACTIVE',
'baseline':{'status':'../2026-10-12-namespace-three/status.json','archiveSha256':prereg['archiveSha256'],'runtimeTests':433,'rustTests':25,'integrationChecks':44,'codeChangedSinceBaseline':False},
'confirmation':{'scheduled':30,'valid':30,'frames':7200,'excluded':0,'gate':'FAIL','medianRatios':{'512':2.6745205304008173,'1024':2.6700020919398955},'pairedP95Ratios':{'512':2.399999998509884,'1024':2.9999999935212345},'unresolvedSize':128,'protocolSha256':prereg['protocolSha256'],'preregistrationSha256':sha(root/'results/product-mixed-v2-preregistration.json')},
'memory':{'profiles':6,'correctness':'PASS','scope':'Separate cold/module/mount/warmup/measured/harness/disposal sampled JS allocation estimates; one profile per arm/size, not timing or leak proof'},
'verification':{'independentRecomputation':'verification/verify.log','svgQA':'verification/chart.png','rawCollection':'verification/collection.log','memoryCollection':'verification/memory.log'},
'limitations':['One physical computer; second contexts are not independent device replication','128-row decision ratios unresolved at the preregistered five-clock-tick denominator floor','DOM checks/diagnostics outside step timer can affect subsequent frames','Lifecycle totals exclude warmup step CPU, module import, layout/paint/GPU and physical presentation','Allocation sampling includes startup/harness and is not exact or pure-update allocation; post-GC JS heap is not a leak verdict','Different state/API architecture from historical mixed V1 prevents single-optimization attribution','Dynamic real-time speed advantage unproved; no superiority claim; human maintenance and Sol full review still held'],
'next':'Bounded state-write/binding/structural cost attribution on this archived artifact before a justified implementation change and new named confirmation; keep independent-device/adoption gates open',
'archive':'source-and-build.tar.gz','archiveSha256':sha(out/'source-and-build.tar.gz'),'sourceAndBuildSha256':hashes,'evidenceArchive':'evidence.tar.gz','evidenceArchiveSha256':sha(out/'evidence.tar.gz'),'evidenceSha256':evidenceHashes,
'historicalEvidence':{'researchNotebookSha256':sha(root/'research.ipynb'),'previousCheckpointArchiveSha256':previous['archiveSha256']}}
(out/'status.json').write_text(json.dumps(status,indent=2)+'\n')
for name,expected in [('source-and-build.tar.gz',hashes),('evidence.tar.gz',evidenceHashes)]:
 with tarfile.open(out/name) as t:
  members={m.name:m for m in t.getmembers()};assert set(members)==set(expected)
  for fn,want in expected.items():assert hashlib.sha256(t.extractfile(members[fn]).read()).hexdigest()==want and sha(root/fn)==want,fn
assert sha(root/prereg['archive'])==previous['archiveSha256']
print(json.dumps({'status':'ARCHIVED_AND_HASH_VERIFIED','sourceFiles':len(hashes),'evidenceFiles':len(evidenceHashes),'gate':'FAIL','path':str(out)}))
