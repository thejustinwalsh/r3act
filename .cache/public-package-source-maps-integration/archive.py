import hashlib,json,tarfile
from pathlib import Path
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
base=Path('.cache/public-package-source-maps-integration')
build=Path('.cache/native-package-build');report=json.loads((build/'package-report.json').read_text());consumer=json.loads(Path('.cache/native-package-verification/results.json').read_text());assert consumer['status']=='PASS'
comparison=json.loads((base/'runtime-byte-comparison.json').read_text());assert comparison['javascriptFilesCompared']==34 and comparison['differences']==[]
assert sha('.cache/compiled-ui-runtime.tgz')==report['tarballSha256']
currentBinary=build/'dist/compiler/bin/darwin-arm64/ui-graph-compiler-spike';qualifiedBinary=Path('.cache/owner-row-fusion-package-v1/staging/dist/compiler/bin/darwin-arm64/ui-graph-compiler-spike')
binariesMatch=sha(currentBinary)==sha(qualifiedBinary)
(base/'compiler-byte-comparison.json').write_text(json.dumps({'current':str(currentBinary),'qualified':str(qualifiedBinary),'currentSha256':sha(currentBinary),'qualifiedSha256':sha(qualifiedBinary),'match':binariesMatch},indent=2)+'\n')
paths={'scripts/build_native_package.mjs','scripts/verify_native_package.mjs','tsconfig.native-package.json','.cache/compiled-ui-runtime.tgz','.cache/native-package-verification/results.json'}
for directory in [base,build]:
 for p in directory.rglob('*'):
  if p.is_file():paths.add(str(p))
paths=sorted(paths);inventory={p:sha(p) for p in paths}
out=Path('implementation/2026-10-13-public-package-source-maps');out.mkdir(exist_ok=False);a=out/'evidence.tar.gz'
with tarfile.open(a,'x:gz') as t:
 for p in paths:t.add(p,arcname=p,recursive=False)
with tarfile.open(a) as t:observed={m.name:hashlib.sha256(t.extractfile(m).read()).hexdigest() for m in t.getmembers()}
assert inventory==observed
status={'schemaVersion':1,'status':'DEFAULT_PACKAGE_SOURCE_MAP_BUILD_AND_CONSUMER_VERIFIED','goalStatus':'ACTIVE','platform':'darwin-arm64','published':False,'mapsVerified':consumer['sourceMapAudit']['mapFiles'],'packagedSources':consumer['sourceMapAudit']['packagedSourceCount'],'runtimeJavascriptFilesIdenticalToQualifiedFusionPackage':34,'compilerBinaryIdenticalToQualifiedFusionPackage':binariesMatch,'defaultWorkflow':'pnpm package:native / pnpm check:native-package','scope':'Default build packages resolvable JS/declaration source maps; external installed consumer types, compiled TSX/state/store/task DAG and cleanup pass. Runtime/compiler JS is unchanged from browser-qualified fusion package. No new browser probe, automatic HMR, other-platform or speed claim.','speedGate':'FAIL_FUSION_25_TO_39_PERCENT_SLOWER','maintenanceGate':'HOLD_UNCOLLECTED','archive':'evidence.tar.gz','archiveSha256':sha(a),'archiveMembers':len(paths),'evidenceSha256':inventory}
(out/'status.json').write_text(json.dumps(status,indent=2)+'\n');print(json.dumps({k:v for k,v in status.items() if k!='evidenceSha256'},indent=2))
