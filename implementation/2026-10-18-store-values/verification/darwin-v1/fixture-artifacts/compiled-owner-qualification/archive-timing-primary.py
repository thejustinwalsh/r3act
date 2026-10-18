import hashlib,json,tarfile
from pathlib import Path
root=Path.cwd()
raw=Path('results/product-mixed-compiled-owner-rows-confirmation')
p=json.loads((raw/'preregistration.json').read_text())
v=json.loads((raw/'verification-v4.json').read_text())
s=json.loads((raw/'summary-v2.json').read_text())
assert v['status']=='PASS' and v['gate']==s['gate']=='FAIL'
assert v['rawPages']==30 and v['inputLockCount']==len(p['inputLocks'])==1044
hashfile=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest()
for filename,digest in p['inputLocks'].items(): assert hashfile(filename)==digest,filename
files=set(str(f) for f in raw.iterdir() if f.is_file())
files.update(str(f) for f in Path('scripts').glob('*product_mixed_compiled_owner_rows*'))
files.update([
 'product-mixed-compiled-owner-rows-confirmation-protocol.md',
 'vite.product-mixed-compiled-owner-rows.config.ts','vite.product-mixed-compiled-owner-rows-timing.config.ts',
 'compiled-owner-row-timing-findings.md',
 'implementation/2026-10-13-compiled-owner-rows/status.json',
 'implementation/2026-10-13-compiled-owner-rows/source-and-evidence.tar.gz',
 'implementation/2026-10-13-compiled-owner-rows-pilot/status.json',
 'implementation/2026-10-13-compiled-owner-rows-pilot/evidence.tar.gz',
 '.cache/compiled-owner-qualification/summary-v2-review.png',
 '.cache/compiled-owner-qualification/render-summary-v2-review.mjs',
 '.cache/compiled-owner-qualification/archive-timing-primary.py',
])
# Timing tools only: a future CPU collector belongs to its own checkpoint.
files={f for f in files if not f.endswith('_cpu.mjs')}
files.update(str(f) for f in Path('.cache/compiled-owner-qualification').glob('timing-*.log'))
for folder in ['analyzer-repair-v2','verifier-repair-v2','verifier-repair-v3','verifier-repair-v4']:
 files.update(str(f) for f in (Path('.cache/compiled-owner-qualification')/folder).iterdir() if f.is_file())
hashes={f:hashfile(f) for f in sorted(files)}
out=Path('implementation/2026-10-13-compiled-owner-row-timing')
out.mkdir(exist_ok=True)
archive=out/'evidence.tar.gz'
assert not archive.exists() and not (out/'status.json').exists()
with tarfile.open(archive,'w:gz') as tar:
 for f in sorted(files): tar.add(f,arcname=f,recursive=False)
with tarfile.open(archive,'r:gz') as tar:
 observed={m.name:hashlib.sha256(tar.extractfile(m).read()).hexdigest() for m in tar.getmembers()}
assert observed==hashes
status={
 'schemaVersion':1,'status':'TIMING_CONFIRMATION_VERIFIED_SPEED_FAIL','goalStatus':'ACTIVE',
 'runId':p['runId'],'pages':30,'measuredFrames':7200,'inputLocksVerified':1044,
 'sourceArchiveMembersVerified':1029,'speedGate':'FAIL','independentVerification':'PASS',
 'archive':'evidence.tar.gz','archiveSha256':hashfile(archive),'archiveMembers':len(hashes),
 'analysis':str(raw/'summary-v2.json'),'verification':str(raw/'verification-v4.json'),
 'originalInvalidAnalysisPreserved':True,'originalAndExecutedRepairToolsPreserved':True,
 'rawPagesRerun':False,'thresholdsChanged':False,
 'allocationGate':'NOT_MEASURED_CURRENT_REVISION','currentPackageGate':'NOT_REQUALIFIED_CURRENT_REVISION',
 'independentDeviceGate':'OPEN','maintenanceAndAdoptionGate':'HOLD_UNCOLLECTED',
 'evidenceSha256':hashes,
}
(out/'status.json').write_text(json.dumps(status,indent=2)+'\n')
print(json.dumps({k:status[k] for k in ['status','archiveSha256','archiveMembers','inputLocksVerified']}))
