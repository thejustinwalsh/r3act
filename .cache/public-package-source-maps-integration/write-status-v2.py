import hashlib,json,tarfile
from pathlib import Path
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
base=Path('.cache/public-package-source-maps-integration');out=Path('implementation/2026-10-13-public-package-source-maps');a=out/'evidence.tar.gz'
with tarfile.open(a) as t:inventory={m.name:hashlib.sha256(t.extractfile(m).read()).hexdigest() for m in t.getmembers()}
for p,h in inventory.items():assert sha(p)==h,p
consumer=json.loads(Path('.cache/native-package-verification/results.json').read_text());assert consumer['status']=='PASS'
binary=json.loads((base/'compiler-byte-comparison.json').read_text());assert binary['match']
status={'schemaVersion':1,'status':'DEFAULT_PACKAGE_SOURCE_MAP_BUILD_AND_CONSUMER_VERIFIED','goalStatus':'ACTIVE','platform':'darwin-arm64','published':False,'mapsVerified':consumer['sourceMapAudit']['mapCount'],'packagedSources':consumer['sourceMapAudit']['packagedSourceCount'],'runtimeJavascriptFilesIdenticalToQualifiedFusionPackage':34,'compilerBinaryIdenticalToQualifiedFusionPackage':True,'defaultWorkflow':'pnpm package:native / pnpm check:native-package','scope':'Default build packages resolvable JS/declaration source maps; external installed consumer types, compiled TSX/state/store/task DAG and cleanup pass. Runtime/compiler JS and binary match browser-qualified fusion package. No new browser probe, automatic HMR, other-platform or speed claim.','metadataRepair':{'originalBuilder':'.cache/public-package-source-maps-integration/archive.py','reason':'Archive bytes were verified, then status creation failed reading nonexistent mapFiles; actual consumer field is mapCount. Same archive retained.','statusBuilder':str(Path(__file__).relative_to(Path.cwd())),'statusBuilderSha256':sha(__file__)},'speedGate':'FAIL_FUSION_25_TO_39_PERCENT_SLOWER','maintenanceGate':'HOLD_UNCOLLECTED','archive':'evidence.tar.gz','archiveSha256':sha(a),'archiveMembers':len(inventory),'evidenceSha256':inventory}
with (out/'status.json').open('x') as f:json.dump(status,f,indent=2);f.write('\n')
print(json.dumps({k:v for k,v in status.items() if k!='evidenceSha256'},indent=2))
