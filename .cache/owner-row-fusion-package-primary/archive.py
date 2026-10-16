import hashlib,json,tarfile
from pathlib import Path
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
base=Path('.cache/owner-row-fusion-package-v1')
report=json.loads((base/'package-report.json').read_text());consumer=json.loads((base/'consumer-results.json').read_text());browser=json.loads((base/'browser-results-v2.json').read_text())
assert consumer['status']==browser['status']=='PASS'
assert consumer['sourceMapAudit']['mapFiles']==68
assert sha(base/'compiled-ui-runtime.tgz')==report['tarballSha256']
lock=json.loads(Path('.cache/owner-row-fusion-package-primary/tool-lock.json').read_text())
for p,h in lock.items():assert sha(p)==h,p
out=Path('implementation/2026-10-13-owner-row-fusion-package');out.mkdir(exist_ok=False)
paths=set(lock)
paths.add('scripts/verify_native_package_browser_owner_row_fusion_v2.mjs')
for directory in [base,Path('.cache/owner-row-fusion-package-primary'),Path('.cache/package-source-map-audit')]:
 for p in directory.rglob('*'):
  if p.is_file() and not any(x in p.parts for x in ['node_modules','cargo-target']):paths.add(str(p))
paths=sorted(paths);inventory={p:sha(p) for p in paths}
archive=out/'evidence.tar.gz'
with tarfile.open(archive,'x:gz') as t:
 for p in paths:t.add(p,arcname=p,recursive=False)
with tarfile.open(archive) as t:observed={m.name:hashlib.sha256(t.extractfile(m).read()).hexdigest() for m in t.getmembers()}
assert observed==inventory
status={'schemaVersion':1,'status':'INSTALLED_FUSION_PACKAGE_MAPS_CONSUMER_AND_MANAGED_HMR_VERIFIED','goalStatus':'ACTIVE','platform':'darwin-arm64','published':False,'checkpoint':report['checkpoint'],'tarballSha256':report['tarballSha256'],'mapsVerified':68,'browserOrigin':browser['origin'],'browserProbeRepair':'Original probe failed before navigation because default URL omitted Portless1355; original source/log/FAIL result retained. Versioned v2 probe used same package bytes and corrected URL, then passed.','scope':'Installed source-map resolution/content, authored TSX DOM/store/tasks, generated JSX types, actual Three scene updates and fixture-managed HMR with explicit teardown. No state-preserving or automatic-root-cleanup HMR claim, no other-platform or performance claim.','performanceGate':'UNMEASURED_CURRENT_REVISION','maintenanceGate':'HOLD_UNCOLLECTED','archive':'evidence.tar.gz','archiveSha256':sha(archive),'archiveMembers':len(inventory),'evidenceSha256':inventory}
(out/'status.json').write_text(json.dumps(status,indent=2)+'\n')
print(json.dumps({k:v for k,v in status.items() if k not in ['evidenceSha256','checkpoint']},indent=2))
