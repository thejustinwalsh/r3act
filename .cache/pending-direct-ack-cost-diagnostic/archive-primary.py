import hashlib,json,tarfile
from pathlib import Path
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
base=Path('.cache/pending-direct-ack-cost-diagnostic');v=json.loads((base/'verification.json').read_text());assert v['status']=='PASS'
notes=base/'decision.md'
lines=['# Direct pending-key acknowledgement: withhold default integration','','The staged Root integration passes 703 runtime tests after the race-injection hook is migrated to the new capture API. That establishes staged correctness, not a speed advantage. The Node queue diagnostic preserves 120 matched pairs, 240 arm records and all 96 measured samples per arm. Independent verification recomputes paired arm medians and geometric mean keyed/baseline ratios.','','| Case | Queue size | Density | Warm paired B/A | Cold paired B/A |','|---|---:|---|---:|---:|']
for r in v['recomputation']['pairedSummaries']:
 lines.append(f"| {r['case']} | {r['workload']['size']} | {r['workload']['density']} | {r['warmGeometricMeanBOverA']:.3f} | {r['coldGeometricMeanBOverA']:.3f} |")
lines+=['','B is keyed capture/acknowledgement. Values below 1 favor B. The independent paired analysis uses an averaged median for even 96-sample sets; the collector separately verifies its nearest-rank pooled descriptive summaries. Frames are nested observations, not independent replications. Nanosecond timer units do not establish nanosecond accuracy, especially for very short sparse batches.','','Dense accepted cuts at larger sizes show a queue-level benefit. Sparse accepted cuts, cold setup and legacy declines add cost. The new capability allocation, buffer stores, private-brand checks and cleanup do not produce a uniform improvement. This diagnostic uses simplified queue handles on Node, includes common assertions, and has no World, DOM, Three or browser commit work. It cannot support an integrated React or Root speed claim.','','## Decision','','Keep the current live queue path. Do not fold this patch into every Root update. Preserve the staged implementation as a possible specialized strategy if a future compiler/kernel workload justifies it. Prioritize a homogeneous compiler-emitted primitive update kernel that can remove repeated dynamic projection dispatch across a whole cut, while preserving ordering and publication guarantees. The measured live fusion speed gate remains FAIL; the goal remains active.','']
notes.write_text('\n'.join(lines))
paths={str(p) for p in base.iterdir() if p.is_file()}
for directory in ['.cache/pending-direct-ack-stage-v3','.cache/pending-direct-ack-root-stage','.cache/pending-direct-ack-root-stage-v2']:
 d=Path(directory)
 for p in d.iterdir():
  if p.is_file():paths.add(str(p))
 for name in ['pending_state_changes.ts','component_state_runtime.ts','native_cell_cut_test.ts','native_numeric_cell_cut_test.ts']:
  p=d/'src'/name
  if p.exists():paths.add(str(p))
paths=sorted(paths);inventory={p:sha(p) for p in paths};out=Path('implementation/2026-10-13-pending-key-cost-decision');out.mkdir(exist_ok=False);a=out/'evidence.tar.gz'
with tarfile.open(a,'x:gz') as t:
 for p in paths:t.add(p,arcname=p,recursive=False)
with tarfile.open(a) as t:observed={m.name:hashlib.sha256(t.extractfile(m).read()).hexdigest() for m in t.getmembers()}
assert observed==inventory
status={'schemaVersion':1,'status':'QUEUE_DIAGNOSTIC_VERIFIED_DEFAULT_INTEGRATION_WITHHELD','goalStatus':'ACTIVE','liveRuntimeChanged':False,'stagedRuntimeTests':703,'matchedPairs':120,'scope':'Node queue-only cost diagnostic; no integrated runtime or React speed claim.','decision':'Withhold default integration due sparse/cold/fallback costs; retain prototype for possible specialization.','archive':'evidence.tar.gz','archiveSha256':sha(a),'archiveMembers':len(paths),'evidenceSha256':inventory}
with (out/'status.json').open('x') as f:json.dump(status,f,indent=2);f.write('\n')
print(json.dumps({k:v for k,v in status.items() if k!='evidenceSha256'},indent=2))
