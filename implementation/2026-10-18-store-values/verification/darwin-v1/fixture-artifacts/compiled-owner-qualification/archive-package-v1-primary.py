import hashlib,json,tarfile
from pathlib import Path
base=Path('.cache/compiled-owner-rows-package-v1')
report=json.loads((base/'package-report.json').read_text())
smoke=json.loads((base/'consumer-results.json').read_text())
browser=json.loads((base/'browser-results.json').read_text())
assert smoke['status']=='PASS' and browser['status']=='FAIL'
assert browser['pageErrors']==['Owner-aware components must be registered with defineComponent(siteId, render)']
hashfile=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest()
assert hashfile(base/'compiled-ui-runtime.tgz')==report['tarballSha256']
source=json.loads(Path('implementation/2026-10-13-compiled-owner-rows/status.json').read_text())
for f,h in (source['sourceAndBuildSha256']|source['verificationSha256']).items():assert hashfile(f)==h,f
files={
 str(base/'compiled-ui-runtime.tgz'),str(base/'package-report.json'),str(base/'consumer-results.json'),str(base/'browser-results.json'),
 str(base/'browser-install-primary.log'),
 'scripts/build_native_package_compiled_owner_rows.mjs','scripts/verify_native_package_compiled_owner_rows.mjs',
 'scripts/verify_native_package_browser_compiled_owner_rows.mjs','tsconfig.native-package.compiled-owner-rows.json',
 '.cache/compiled-owner-qualification/package-build-primary.log',
 '.cache/compiled-owner-qualification/package-consumer-primary.log',
 '.cache/compiled-owner-qualification/package-browser-primary.log',
 '.cache/compiled-owner-qualification/package-browser-served-native-app-v1.js',
 '.cache/compiled-owner-qualification/archive-package-v1-primary.py',
 'implementation/2026-10-13-compiled-owner-rows/status.json',
}
files.update(str(f) for f in (base/'staging').rglob('*') if f.is_file())
fixture=base/'browser-consumer'
files.update(str(f) for f in fixture.rglob('*') if f.is_file() and 'node_modules' not in f.parts)
metadata=fixture/'node_modules/.vite/deps/_metadata.json'
if metadata.exists():files.add(str(metadata))
hashes={f:hashfile(f) for f in sorted(files)}
out=Path('implementation/2026-10-13-compiled-owner-row-package-v1');out.mkdir(exist_ok=True)
archive=out/'evidence.tar.gz'
assert not archive.exists()
with tarfile.open(archive,'w:gz') as tar:
 for f in sorted(files):tar.add(f,arcname=f,recursive=False)
with tarfile.open(archive,'r:gz') as tar:
 assert {m.name:hashlib.sha256(tar.extractfile(m).read()).hexdigest() for m in tar.getmembers()}==hashes
status={'schemaVersion':1,'status':'BUILD_AND_CONSUMER_PASS_BROWSER_FAIL','goalStatus':'ACTIVE',
 'platform':'darwin-arm64','published':False,'build':'PASS','installedConsumerSmoke':'PASS','installedBrowser':'FAIL',
 'failure':'Vite optimized package resolution bypasses native TSX compiler opt-in; mount rejects unregistered NativePanel.',
 'hmr':'NOT_REACHED','sourceCheckpointArchiveSha256':source['archiveSha256'],
 'tarballSha256':report['tarballSha256'],'archive':'evidence.tar.gz','archiveSha256':hashfile(archive),
 'archiveMembers':len(hashes),'evidenceSha256':hashes}
(out/'status.json').write_text(json.dumps(status,indent=2)+'\n')
print(json.dumps({k:status[k] for k in ['status','archiveSha256','archiveMembers']}))
