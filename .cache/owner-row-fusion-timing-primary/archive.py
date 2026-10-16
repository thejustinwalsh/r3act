import hashlib,json,tarfile
from pathlib import Path
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
raw=Path('results/product-mixed-owner-row-fusion-confirmation')
s=json.loads((raw/'summary-v3.json').read_text());v=json.loads((raw/'verification-v3.json').read_text());p=json.loads((raw/'preregistration.json').read_text())
assert s['gate']=='FAIL' and s['counts']['valid']==30 and v['status']=='PASS' and v['independentlyComputed']['overallGate']=='FAIL'
assert v['rawPagesVerified']==30
for f,h in p['inputLocks'].items():assert sha(f)==h,f
out=Path('implementation/2026-10-13-owner-row-fusion-timing');out.mkdir(exist_ok=False)
notes=Path('owner-row-fusion-timing-findings.md')
lines=['# Owner-row executor fusion: qualified timing result','','The fixed study passes all 30 correctness pages and 7,200 measured frames, with no exclusions or replacements. Independent recomputation verifies the frozen source archive, input locks and clock rules. The speed gate fails at every size.','','| Rows | Paired median native/React | Median paired p95 native/React |','|---:|---:|---:|']
for x in s['sizes']:lines.append(f"| {x['size']} | {x['decision']['pairedMedianGeometricMeanRatio']:.4f} | {x['decision']['medianPairedP95Ratio']:.4f} |")
lines+=['','Ratios above 1 favor React. This candidate is about 25–39% slower in paired median commit work. The registered target remains at most 0.80 at two sizes and p95 at most 1.10 at every size. At 1,024 rows, descriptive page-median summaries are 1.715 ms native and 1.260 ms React; structural medians are 5.790 and 1.845 ms, and mount medians are 49.610 and 15.640 ms. These descriptive aggregates differ from paired gate estimators.','','The result does not establish a causal change relative to the prior checkpoint: this is a separate study on the current candidate. Commit CPU excludes browser layout/paint/presentation. Raw records retain check outcomes rather than per-frame DOM snapshots; independent verification checks the locked harness and contract that produced those outcomes. One device supplies this evidence. Allocation and human-maintenance claims remain unproven.','','## Preserved tooling repairs','','The preregistered analyzer failed before output because metadata hashing called an undefined helper. Versioned analyzer V3 fixes that helper, identifies its actual source hash, preserves the failure log, and analyzes the same raw records and estimators. The adapted V2 independent verifier then expected an HTTP-status field absent from the collector’s served-byte metadata. Versioned V3 verifier checks the recorded hashes and headers; the locked collector checks HTTP200 before recording them. All original tools and failed logs remain unchanged. No pages were rerun, omitted or changed.','','## Implementation decision','','Loop fusion is correct but insufficient to meet the product performance target. Review a smaller scheduling patch using the existing pending queue to remove repeated acknowledgment lookups, retaining exact World liveness/version checks and coherent publication. Its savings remain unmeasured. Preserve the compiler/VDOM/ECS/async/host direction, but make no claim that this runtime currently beats React Compiler. The goal and Sol maintenance-review hold remain active.','']
notes.write_text('\n'.join(lines))
paths=set(p['inputLocks'])-set(json.loads(Path('implementation/2026-10-13-owner-row-fusion/status.json').read_text())['sourceAndBuildSha256'])-set(json.loads(Path('implementation/2026-10-13-owner-row-fusion/status.json').read_text())['verificationSha256'])-set(json.loads(Path('implementation/2026-10-13-owner-row-fusion/status.json').read_text())['historicalVerificationSha256'])
paths.update(str(x) for x in raw.iterdir() if x.is_file())
paths.update(str(x) for x in Path('.cache/owner-row-fusion-timing-primary').iterdir() if x.is_file())
paths.update(['scripts/summarize_product_mixed_owner_row_fusion_v3.mjs','scripts/verify_product_mixed_owner_row_fusion_evidence_v2.mjs','scripts/verify_product_mixed_owner_row_fusion_evidence_v3.mjs',str(notes)])
paths=sorted(paths);inventory={f:sha(f) for f in paths}
a=out/'evidence.tar.gz'
with tarfile.open(a,'x:gz') as t:
 for f in paths:t.add(f,arcname=f,recursive=False)
with tarfile.open(a) as t:observed={m.name:hashlib.sha256(t.extractfile(m).read()).hexdigest() for m in t.getmembers()}
assert observed==inventory
status={'schemaVersion':1,'status':'TIMING_VERIFIED_SPEED_FAIL','goalStatus':'ACTIVE','runId':p['runId'],'rawPages':30,'measuredFrames':7200,'inputLocks':len(p['inputLocks']),'sourceArchiveSha256':p['archiveSha256'],'speedGate':'FAIL','allocationGate':'UNMEASURED_CURRENT_REVISION','independentDeviceGate':'OPEN','maintenanceGate':'HOLD_UNCOLLECTED','archive':'evidence.tar.gz','archiveSha256':sha(a),'archiveMembers':len(inventory),'evidenceSha256':inventory}
(out/'status.json').write_text(json.dumps(status,indent=2)+'\n')
print(json.dumps({k:v for k,v in status.items() if k!='evidenceSha256'},indent=2))
