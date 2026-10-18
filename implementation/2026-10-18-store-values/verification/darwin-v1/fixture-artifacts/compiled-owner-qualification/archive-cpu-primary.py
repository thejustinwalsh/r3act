import hashlib,json,tarfile
from pathlib import Path
raw=Path('results/product-mixed-compiled-owner-rows-cpu')
p=json.loads((raw/'preregistration.json').read_text())
v=json.loads((raw/'verification-v2.json').read_text())
assert v['status']=='PASS' and v['pagesVerified']==2
hashfile=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest()
for f,h in p['frozenInputs']['inputLocks'].items():assert hashfile(f)==h,f
files={str(f) for f in raw.iterdir() if f.is_file()}
files.update(str(f) for f in Path('results/product-mixed-compiled-owner-rows-cpu-analysis').iterdir() if f.is_file())
files.update([
 'scripts/profile_product_mixed_compiled_owner_rows_cpu.mjs',
 'scripts/verify_product_mixed_compiled_owner_rows_cpu.mjs',
 'scripts/verify_product_mixed_compiled_owner_rows_cpu_v2.mjs',
 'scripts/summarize_product_mixed_compiled_owner_rows_cpu.py',
 'product-mixed-compiled-owner-rows-cpu-protocol.md',
 'vite.product-mixed-compiled-owner-rows-cpu.config.ts',
 'compiled-owner-row-cpu-findings.md',
 'implementation/2026-10-13-compiled-owner-rows/status.json',
 'implementation/2026-10-13-compiled-owner-rows/source-and-evidence.tar.gz',
 'implementation/2026-10-13-compiled-owner-row-timing/status.json',
 'implementation/2026-10-13-compiled-owner-row-timing/evidence.tar.gz',
 '.cache/compiled-owner-qualification/cpu-collection-primary.log',
 '.cache/compiled-owner-qualification/cpu-verification-primary.log',
 '.cache/compiled-owner-qualification/cpu-verification-primary-v2.log',
 '.cache/compiled-owner-qualification/cpu-summary-review.png',
 '.cache/compiled-owner-qualification/render-cpu-summary-review.mjs',
 '.cache/compiled-owner-qualification/archive-cpu-primary.py',
])
files.update(str(f) for f in Path('.cache/compiled-owner-qualification/cpu-verification-v2').iterdir() if f.is_file())
hashes={f:hashfile(f) for f in sorted(files)}
out=Path('implementation/2026-10-13-compiled-owner-row-cpu');out.mkdir(exist_ok=True)
archive=out/'evidence.tar.gz'
assert not archive.exists() and not(out/'status.json').exists()
with tarfile.open(archive,'w:gz') as tar:
 for f in sorted(files):tar.add(f,arcname=f,recursive=False)
with tarfile.open(archive,'r:gz') as tar:
 assert {m.name:hashlib.sha256(tar.extractfile(m).read()).hexdigest() for m in tar.getmembers()}==hashes
status={'schemaVersion':1,'status':'CPU_ATTRIBUTION_VERIFIED','goalStatus':'ACTIVE',
 'runId':p['runId'],'pages':2,'measuredHarnessFrames':480,'inputLocksVerified':len(p['frozenInputs']['inputLocks']),
 'profileScope':v['profileScope'],'priorSpeedGate':'FAIL','currentSourceUnchanged':True,
 'originalVerifierAndFailurePreserved':True,'rawProfilesRerun':False,
 'archive':'evidence.tar.gz','archiveSha256':hashfile(archive),'archiveMembers':len(hashes),'evidenceSha256':hashes}
(out/'status.json').write_text(json.dumps(status,indent=2)+'\n')
print(json.dumps({k:status[k] for k in ['status','archiveSha256','archiveMembers','inputLocksVerified']}))
