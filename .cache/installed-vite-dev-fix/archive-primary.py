import hashlib,json,tarfile
from pathlib import Path
hashfile=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest()
base=Path('.cache/compiled-owner-rows-package-v2')
report=json.loads((base/'package-report.json').read_text())
smoke=json.loads((base/'consumer-results.json').read_text())
browser=json.loads((base/'browser-results.json').read_text())
assert smoke['status']==browser['status']=='PASS'
assert hashfile(base/'compiled-ui-runtime.tgz')==report['tarballSha256']
source=json.loads(Path('implementation/2026-10-13-compiled-owner-rows/status.json').read_text())
changes=[]
for f,h in (source['sourceAndBuildSha256']|source['verificationSha256']).items():
 if hashfile(f)!=h:changes.append(f)
assert changes==['compiler/vite_native_plugin.ts'],changes
files={
 str(base/'compiled-ui-runtime.tgz'),str(base/'package-report.json'),str(base/'consumer-results.json'),str(base/'browser-results.json'),str(base/'browser-install-primary.log'),
 'scripts/build_native_package_compiled_owner_rows_v2.mjs','scripts/verify_native_package_compiled_owner_rows_v2.mjs',
 'scripts/verify_native_package_browser_compiled_owner_rows_v2.mjs','tsconfig.native-package.compiled-owner-rows-v2.json',
 'compiler/vite_native_plugin.ts','compiler/vite_native_package_dev_resolution_test.mjs',
 'installed-package-vite-findings.md',
 'implementation/2026-10-13-compiled-owner-rows/status.json',
 'implementation/2026-10-13-compiled-owner-rows/source-and-evidence.tar.gz',
 'implementation/2026-10-13-compiled-owner-row-package-v1/status.json',
 'implementation/2026-10-13-compiled-owner-row-package-v1/evidence.tar.gz',
 '.cache/installed-vite-dev-fix/implementation.patch',
 '.cache/installed-vite-dev-fix/source-delta-primary.json',
 '.cache/installed-vite-dev-fix/served-native-app-primary-v2.js',
 '.cache/installed-vite-dev-fix/archive-primary.py',
}
files.update(str(f) for f in base.joinpath('staging').rglob('*') if f.is_file())
files.update(str(f) for f in Path('.cache/installed-vite-dev-fix').glob('*primary*.log'))
fixture=base/'browser-consumer'
files.update(str(f) for f in fixture.rglob('*') if f.is_file() and 'node_modules' not in f.parts)
metadata=fixture/'node_modules/.vite/deps/_metadata.json'
if metadata.exists():files.add(str(metadata))
hashes={f:hashfile(f) for f in sorted(files)}
out=Path('implementation/2026-10-13-installed-vite-dev-fix');out.mkdir(exist_ok=True)
archive=out/'evidence.tar.gz';assert not archive.exists()
with tarfile.open(archive,'w:gz') as tar:
 for f in sorted(files):tar.add(f,arcname=f,recursive=False)
with tarfile.open(archive,'r:gz') as tar:
 assert {m.name:hashlib.sha256(tar.extractfile(m).read()).hexdigest() for m in tar.getmembers()}==hashes
status={'schemaVersion':1,'status':'INSTALLED_VITE_DOM_REACT_THREE_AND_MANAGED_HMR_VERIFIED',
 'goalStatus':'ACTIVE','platform':'darwin-arm64','published':False,
 'sourceBaseArchiveSha256':source['archiveSha256'],
 'sourceDelta':{f:hashfile(f) for f in ['compiler/vite_native_plugin.ts','compiler/vite_native_package_dev_resolution_test.mjs']},
 'packageBuild':'PASS','installedConsumerSmoke':'PASS','installedBrowser':'PASS','cargoBlockedInConsumers':True,
 'hmrScope':'Fixture-managed dependency acceptance with explicit cleanup and remount; no automatic plugin-owned disposal or state preservation claim.',
 'sourceMapPackaging':'OPEN_RUNTIME_SOURCE_PATH_WARNINGS',
 'runtimeSpeedGate':'FAIL_FOR_FROZEN_OWNER_ROW_RUNTIME','allocationGate':'OPEN','independentDeviceGate':'OPEN','maintenanceGate':'HOLD_UNCOLLECTED',
 'tarballSha256':report['tarballSha256'],'archive':'evidence.tar.gz','archiveSha256':hashfile(archive),
 'archiveMembers':len(hashes),'evidenceSha256':hashes}
(out/'status.json').write_text(json.dumps(status,indent=2)+'\n')
print(json.dumps({k:status[k] for k in ['status','archiveSha256','archiveMembers']}))
