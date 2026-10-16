from pathlib import Path
import json,hashlib,tarfile,shutil
root=Path.cwd();out=root/'implementation/2026-10-12-product-mixed-identity-v3';cache=root/'.cache/product-mixed-identity-v3-evidence'
assert not out.exists(),'Refusing to overwrite evidence checkpoint'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text())
prereg=read(root/'results/product-mixed-identity-v3-preregistration.json');manifest=read(root/'results/product-mixed-identity-v3-manifest.json');summary=read(root/'results/product-mixed-identity-v3-summary.json')
previous=read(root/'implementation/2026-10-12-state-change-identity/status.json');old=read(root/'implementation/2026-10-12-product-mixed-v2/status.json')
assert manifest['status']=='COLLECTION_COMPLETE' and len(manifest['files'])==30 and not manifest['postCollectionChangedFiles']
assert summary['gate']=='FAIL' and not any(summary['validation'][k] for k in ['invalidPages','preregistrationErrors','archiveContentErrors','directoryErrors'])
assert 'PASS independent V3 verification' in (root/'.cache/product-mixed-identity-v3-verify.log').read_text()
assert sha(root/prereg['archive'])==prereg['archiveSha256']==previous['archiveSha256']
assert sha(root/'research.ipynb')==previous['historicalEvidence']['researchNotebookSha256']
for name,want in previous['sourceAndBuildSha256'].items():
 if name.startswith(('src/','compiler/','dist/','dist-product-mixed-v2/','dist-product-mixed-candidate/')):assert sha(root/name)==want,name
for name,want in old['evidenceSha256'].items():assert sha(root/name)==want,name
assert sha(root/'implementation/2026-10-12-product-mixed-v2/source-and-build.tar.gz')==old['archiveSha256']
for item in manifest['files']:assert sha(root/item['file'])==item['sha256']
memory=read(root/'results/product-mixed-identity-v3-memory/results.json');assert memory['status']=='PASS' and len(memory['records'])==6
files=[p for p in root.iterdir() if p.is_file() and p.suffix in {'.md','.html','.json','.ts','.yaml','.lock'}]
for base in ['src','scripts','compiler','dist','dist-product-mixed-v2','dist-product-mixed-candidate']:
 files.extend(p for p in (root/base).rglob('*') if p.is_file() and not any(x in {'target','node_modules','.cache','.git','__pycache__'} for x in p.relative_to(root).parts))
files.extend([root/'.cache/compiled-ui-runtime.tgz',root/'.cache/native-package-build/package-report.json'])
files=sorted(set(files));hashes={str(p.relative_to(root)):sha(p) for p in files}
evidence=[root/'results'/name for name in ['product-mixed-identity-v3-preregistration.json','product-mixed-identity-v3-manifest.json','product-mixed-identity-v3-summary.json','product-mixed-identity-v3-summary.svg']]
for base in ['results/product-mixed-identity-v3','results/product-mixed-identity-v3-memory','results/product-mixed-identity-v3-buildproof']:evidence.extend(p for p in (root/base).rglob('*') if p.is_file())
evidence=sorted(set(evidence));evidenceHashes={str(p.relative_to(root)):sha(p) for p in evidence}
out.mkdir();v=out/'verification';v.mkdir()
for name in ['archive.py','render-chart.mjs','chart.png']:shutil.copy2(cache/name,v/name)
for name in ['collection','summary','memory','verify','first-verifier-failure']:shutil.copy2(root/f'.cache/product-mixed-identity-v3-{name}.log',v/f'{name}.log')
for name,paths in [('source-and-build.tar.gz',files),('evidence.tar.gz',evidence)]:
 with tarfile.open(out/name,'w:gz') as tar:
  for p in paths:tar.add(p,arcname=str(p.relative_to(root)),recursive=False)
status={'schemaVersion':1,'date':'2026-10-12','milestone':'Compiled product mixed identity V3 fixed confirmation and separate allocation profiles','status':'COMPILED_PRODUCT_MIXED_IDENTITY_SPEED_GATE_FAILED','goalStatus':'ACTIVE','baseline':{'status':'../2026-10-12-state-change-identity/status.json','archiveSha256':prereg['archiveSha256'],'runtimeTests':443,'rustTests':25,'integrationChecks':46,'codeChangedSinceBaseline':False,'note':'Inherited correctness/build checks because runtime/compiler/production bytes remain identical; new collector/analyzer/verifier exercised on the full dataset'},'confirmation':{'scheduled':30,'valid':30,'frames':7200,'excluded':0,'gate':'FAIL','medianRatios':{str(x['size']):x['decision']['pairedMedianGeometricMeanRatio'] for x in summary['sizes']},'pairedP95Ratios':{str(x['size']):x['decision']['medianPairedP95Ratio'] for x in summary['sizes']},'protocolSha256':prereg['protocolSha256'],'preregistrationSha256':sha(root/'results/product-mixed-identity-v3-preregistration.json')},'memory':{'profiles':6,'correctness':'PASS','scope':'Separate startup/mount/warmup/measured/harness/disposal sampled estimates, not timing or leak proof','treeRatiosRange':[2.656655,(140016888/48577192)],'treeAndFlatSamples':'Both preserved; first verifier wrongly assumed equality, corrected against protocol representations without altering raw profiles'},'archive':'source-and-build.tar.gz','archiveSha256':sha(out/'source-and-build.tar.gz'),'sourceAndBuildSha256':hashes,'evidenceArchive':'evidence.tar.gz','evidenceArchiveSha256':sha(out/'evidence.tar.gz'),'evidenceSha256':evidenceHashes,'verificationSha256':{str(p.relative_to(out)):sha(p) for p in v.iterdir() if p.is_file()},'historicalEvidence':{'researchNotebookSha256':sha(root/'research.ipynb'),'candidateArchiveSha256':previous['archiveSha256'],'previousV2EvidenceArchiveSha256':old['archiveSha256']},'limitations':['Single physical device; second contexts are not independent replication','128-row ratios unresolved below five-tick denominator floor','Historical before/after data do not isolate a single optimization; both arms have lower absolute times and RAF conditions changed','Allocation sampling includes startup/harness and is not exact or update-only allocation; post-disposal heap does not measure mounted cache memory or prove no leaks','Rendering/layout/paint/GPU/network/async performance outside workload','Dynamic realtime superiority unproved; comparative human maintenance and Sol review remain held'],'next':'Connect compiler-proven direct property/style writer semantics through retained root/keyed indexes and coherent publication; attribution and correctness before another confirmation; no new storage/backend family'}
# Compute allocation ratios from raw profiles rather than copied rounded report values.
ratios=[]
for size in [128,512,1024]:
 values={}
 for item in memory['records']:
  if item['size']==size:
   raw=read(root/'results/product-mixed-identity-v3-memory'/item['file'])
   def total(node):return node.get('selfSize',0)+sum(total(c) for c in node.get('children',[]))
   values[item['arm']]=total(raw['cdp']['stoppedSamplingProfile']['head'])
 ratios.append(values['native']/values['react'])
status['memory']['treeRatiosRange']=[min(ratios),max(ratios)]
(out/'status.json').write_text(json.dumps(status,indent=2)+'\n')
for name,expected in [('source-and-build.tar.gz',hashes),('evidence.tar.gz',evidenceHashes)]:
 with tarfile.open(out/name) as tar:
  members={m.name:m for m in tar.getmembers()};assert set(members)==set(expected)
  for fn,want in expected.items():assert hashlib.sha256(tar.extractfile(members[fn]).read()).hexdigest()==want and sha(root/fn)==want,fn
print(json.dumps({'status':'ARCHIVED_AND_HASH_VERIFIED','sourceFiles':len(hashes),'evidenceFiles':len(evidenceHashes),'gate':'FAIL','archiveSha256':status['archiveSha256'],'path':str(out)}))
