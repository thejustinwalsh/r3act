import hashlib,json,tarfile
from pathlib import Path
hashfile=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest()
base=json.loads(Path('implementation/2026-10-13-compiled-owner-rows/status.json').read_text())
source=dict(base['sourceAndBuildSha256'])
for f in list(source):source[f]=hashfile(f)
new_source=[
 'compiler/vite_native_package_dev_resolution_test.mjs',
 'vite.product-mixed-compiled-owner-row-fusion.config.ts',
 'owner-row-fusion-findings.md','installed-package-vite-findings.md',
 'compiled-owner-row-timing-findings.md','compiled-owner-row-cpu-findings.md',
 'scripts/profile_product_mixed_compiled_owner_rows_cpu.mjs',
 'scripts/verify_product_mixed_compiled_owner_rows_cpu.mjs',
 'scripts/verify_product_mixed_compiled_owner_rows_cpu_v2.mjs',
 'scripts/summarize_product_mixed_compiled_owner_rows_cpu.py',
 'scripts/summarize_product_mixed_compiled_owner_rows_v2.mjs',
 'scripts/verify_product_mixed_compiled_owner_rows_evidence_v2.mjs',
 'scripts/verify_product_mixed_compiled_owner_rows_evidence_v3.mjs',
 'scripts/verify_product_mixed_compiled_owner_rows_evidence_v4.mjs',
 'scripts/collect_product_mixed_compiled_owner_rows.mjs',
 'scripts/summarize_product_mixed_compiled_owner_rows.mjs',
 'scripts/verify_product_mixed_compiled_owner_rows_evidence.mjs',
 'scripts/verify_product_mixed_compiled_owner_rows_pilot.mjs',
 'product-mixed-compiled-owner-rows-confirmation-protocol.md',
 'product-mixed-compiled-owner-rows-cpu-protocol.md',
 'vite.product-mixed-compiled-owner-rows-cpu.config.ts',
 'vite.product-mixed-compiled-owner-rows-timing.config.ts',
 'tsconfig.native-package.compiled-owner-rows.json',
 'tsconfig.native-package.compiled-owner-rows-v2.json',
]
new_source.extend(str(f) for f in Path('scripts').glob('*native_package*compiled_owner_rows*.mjs'))
new_source.extend(str(f) for f in Path('dist-product-mixed-compiled-owner-row-fusion').rglob('*') if f.is_file())
new_source.extend(str(f) for f in Path('.cache/product-mixed-compiled-owner-row-fusion/compiler-proof').iterdir() if f.is_file())
for f in new_source:source[f]=hashfile(f)
verification={}
# Preserve earlier evidence explicitly as historical, rather than reporting its
# old unit logs as tests of this changed executor.
historical=dict(base['verificationSha256'])
for f,h in historical.items():assert hashfile(f)==h,f
for f in Path('.cache/owner-row-fusion').glob('*.log'):verification[str(f)]=hashfile(f)
for name in ['authored-integrated-primary.log','three-integrated-primary.log']:
 lines=(Path('.cache/owner-row-fusion')/name).read_text().splitlines()
 line=next(line for line in lines if 'execution PASS: ' in line)
 proof=json.loads(line.split('PASS: ',1)[1])
 assert proof['status']=='PASS'
 paths=[proof['authoredSource'],proof['emittedModule']]
 proofdir=Path('.cache/compiled-owner-three-proof' if 'three-' in name else '.cache/compiled-owner-proof')
 artifacts=[f for f in proofdir.glob('*-proof-*.json') if json.loads(f.read_text()).get('authoredSource')==proof['authoredSource']]
 assert len(artifacts)==1
 paths.append(str(artifacts[0]))
 for f in paths:verification[f]=hashfile(f)
for f in ['.cache/owner-row-fusion/vdom.patch','.cache/owner-row-fusion/tests.patch','.cache/owner-row-fusion/README.md',
 '.cache/owner-row-fusion/archive-primary.py',
 '.cache/owner-row-dispatch-plan/owner-row-dispatch-plan.md','.cache/owner-row-dispatch-plan/owner-row-dispatch-plan-v2.md',
 'implementation/2026-10-13-compiled-owner-row-timing/status.json','implementation/2026-10-13-compiled-owner-row-timing/evidence.tar.gz',
 'implementation/2026-10-13-compiled-owner-row-cpu/status.json','implementation/2026-10-13-compiled-owner-row-cpu/evidence.tar.gz',
 'implementation/2026-10-13-installed-vite-dev-fix/status.json','implementation/2026-10-13-installed-vite-dev-fix/evidence.tar.gz']:
 verification[f]=hashfile(f)
# Reuse only byte-identical World diagnostic inputs; this does not claim a new
# browser measurement of the fused VDOM executor.
diagpath=base['qualifiedEngineDiagnostic'];diag=json.loads(Path(diagpath).read_text())
for f,h in diag['bundledInputHashes'].items():assert hashfile(f)==h,f
out=Path('implementation/2026-10-13-owner-row-fusion');out.mkdir(exist_ok=True)
archive=out/'source-and-evidence.tar.gz';assert not archive.exists()
files=source|historical|verification
with tarfile.open(archive,'w:gz') as tar:
 for f in sorted(files):tar.add(f,arcname=f,recursive=False)
with tarfile.open(archive,'r:gz') as tar:
 assert {m.name:hashlib.sha256(tar.extractfile(m).read()).hexdigest() for m in tar.getmembers()}==files
status={'schemaVersion':2,'status':'UNIT_AUTHORED_THREE_AND_PRODUCTION_BUILD_VERIFIED','goalStatus':'ACTIVE',
 'runtimeTests':695,'rustTests':33,'rustEvidence':'Reused base test evidence; Rust source and Cargo inputs unchanged.',
 'qualifiedProductionBuild':'dist-product-mixed-compiled-owner-row-fusion',
 'qualifiedCompilerProofDirectory':'.cache/product-mixed-compiled-owner-row-fusion/compiler-proof',
 'candidateProductionPilotPages':0,'qualifiedEngineDiagnostic':diagpath,
 'chromiumEvidenceScope':'Reused byte-identical World inputs and diagnostic. No new fused VDOM browser/timing measurement.',
 'speedGate':'UNMEASURED_CURRENT_REVISION','allocationGate':'UNMEASURED_CURRENT_REVISION',
 'latestMeasuredRuntimeSpeedGate':'FAIL_OWNER_ROWS_27_TO_43_PERCENT_SLOWER',
 'currentPackageGate':'NOT_REQUALIFIED_AFTER_FUSION','packageSourceMapGate':'OPEN',
 'independentDeviceGate':'OPEN','maintenanceGate':'HOLD_UNCOLLECTED',
 'archive':'source-and-evidence.tar.gz','archiveSha256':hashfile(archive),'archiveMembers':len(files),
 'sourceAndBuildSha256':source,'verificationSha256':verification,'historicalVerificationSha256':historical}
(out/'status.json').write_text(json.dumps(status,indent=2)+'\n')
print(json.dumps({'status':status['status'],'archiveSha256':status['archiveSha256'],'archiveMembers':len(files),
 'sourceAndBuildEntries':len(source),'verificationEntries':len(verification),'historicalVerificationEntries':len(historical)}))
