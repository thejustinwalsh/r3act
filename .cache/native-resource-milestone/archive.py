from pathlib import Path
import hashlib, json, shutil, tarfile, re
root=Path.cwd()
out=root/'implementation/2026-10-12-native-resource-boundaries'
assert not out.exists(), 'Refusing to overwrite an immutable checkpoint'
cache=root/'.cache/native-resource-milestone'
logs=['runtime','rust','smoke','execution','retention','typecheck','build','browser','hmr']
for name in logs:
 assert (cache/f'{name}.log').exists(), name
runtime=(cache/'runtime.log').read_text()
rust=(cache/'rust.log').read_text()
assert re.search(r'ok \| 296 passed \| 0 failed',runtime)
assert 'test result: ok. 21 passed; 0 failed' in rust
for name in ['browser','hmr']:
 assert json.loads((cache/f'{name}-result.json').read_text())['status']=='PASS'
assert json.loads((cache/'queue-regression/browser-result.json').read_text())['status']=='PASS'
commands=json.loads((cache/'commands.json').read_text())
assert commands and all(x['exitCode']==0 for x in commands)
prior=root/'implementation/2026-10-12-native-root-queue'
previous=json.loads((prior/'status.json').read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(prior/'source-and-build.tar.gz')==previous['archiveSha256']
files=[]
for p in root.iterdir():
 if p.is_file() and p.suffix in {'.md','.html','.json','.ts','.yaml'}: files.append(p)
for base in ['src','scripts','compiler','dist']:
 for p in (root/base).rglob('*'):
  parts=p.relative_to(root).parts
  if p.is_file() and not any(s in {'target','node_modules','.cache','.git','__pycache__'} for s in parts): files.append(p)
files=sorted(set(files),key=lambda p:str(p.relative_to(root)))
hashes={str(p.relative_to(root)):sha(p) for p in files}
out.mkdir()
verification=out/'verification';verification.mkdir()
for name in logs: shutil.copy2(cache/f'{name}.log',verification/f'{name}.log')
for name in ['commands.json','browser-result.json','browser-check.mjs','hmr-result.json','hmr-check.mjs','desktop.png','mobile.png']:
 shutil.copy2(cache/name,verification/name)
shutil.copytree(cache/'queue-regression',verification/'queue-regression')
with tarfile.open(out/'source-and-build.tar.gz','w:gz') as archive:
 for p in files:archive.add(p,arcname=str(p.relative_to(root)),recursive=False)
status={
 'schemaVersion':1,'date':'2026-10-12',
 'milestone':'Compiled use(store/resource/promise), native Suspense and automatic resource-aware root publication',
 'status':'NATIVE_RESOURCE_BOUNDARIES_IMPLEMENTED_AND_VERIFIED','goalStatus':'ACTIVE',
 'scope':[
  'Public use(store) preserves values; use(promise/resource) unwraps; nested authored reads lower through Rust/OXC',
  'Lexical Suspense identities, scoped boundary owners, independent child state, keyed movement and cached subtree retention',
  'Private ordinary and queued root preparation with rollback of owner cells, lifecycle and selector history',
  'Reachable sibling resource observation, local startup fallback/error/retry and fresh retained-primary re-expansion',
  'Pending branch dependency subscriptions survive old-primary re-expansion and source replacement',
  'Automatic frontier replacement on resource settlement or store invalidation; grouped fresh host/pointer publication',
  'Transition scopes account for stores discovered in earlier prepare waves and empty final root intersections',
  'Candidate artifact and observer cleanup; explicit domain provider/scope/registration cleanup',
  'Seeded chronological action-log projection oracle, actual TSX execution and Portless browser/HMR integration'
 ],
 'verification':{
  'runtimeTests':{'passed':296,'failed':0,'log':'verification/runtime.log'},
  'rustTests':{'passed':21,'failed':0,'log':'verification/rust.log'},
  'commands':commands,
  'compilerExecution':{'fixtures':['native_state_execution_test.mjs','native_store_execution_test.mjs','native_collection_execution_test.mjs','native_root_queue_execution_test.mjs','native_resource_execution_test.mjs'],'log':'verification/execution.log'},
  'retention':{'checks':['owner preparation','native candidates','discarded resource candidate payload'],'log':'verification/retention.log','claim':'Controlled Node24 GC probes only; not a general heap or allocation-rate result'},
  'browser':{'status':'PASS','record':'verification/browser-result.json','checks':['actual TSX','distinct sibling readiness','automatic two-root reveal','draft/node/focus preservation','urgent edits','local rejection/retry','three overlapping works','targeted cancellation','no ancestor fallback after startup','coherent MutationObserver turns','explicit pagehide cleanup','mobile no horizontal overflow']},
  'hmr':{'status':'PASS','record':'verification/hmr-result.json','checks':['old providers/scopes/store roots/readers/listeners/owners/effects released','one fresh main/sidecar pair plus workbench','fresh startup resources reveal']},
  'priorQueueBrowserRegression':{'status':'PASS','record':'verification/queue-regression/browser-result.json'},
  'productionBuild':True,'typeCheck':True
 },
 'preview':'https://async-transition-stress.localhost:1355/native-resource-boundaries.html',
 'limitations':[
  'Sibling traversal observes reachable reads; it does not discover hidden descendants or start arbitrary provider fetches',
  'Compiler task-DAG binding to resource boundaries remains separate work; no true parallel JavaScript CPU execution',
  'Queued groups wait for complete observed resources; mount startup fallback separately before queueing replacements',
  'A retained direct store-held unresolved resource can block publication; no stale source snapshot is silently substituted',
  'Local resource error rendering deactivates the primary; a recovered primary receives a fresh owner lifetime',
  'Queue cancellation does not undo domain actions or stop providers; the demo owns both and explicitly ends their scopes',
  'Low-level beginTransition root IDs introduced for a source that is never rendered require domain registration cleanup; the demo explicitly detaches them',
  'Grouped host writes are synchronous with terminal failure on host exceptions, not general host rollback or cross-thread atomicity',
  'Three seeded projection traces plus a six-scope prefix are bounded oracle coverage, not the complete React-fork parity gate',
  'No new React performance, size, maintainability, arbitrary ecosystem compatibility, streaming or hydration claim'
 ],
 'remaining':[
  'Finish Phase2A store/fork behavioral matrix, optimistic compensation, declared task-DAG/resource binding, and input/composition stress',
  'Complete Phase2B randomized structural/full-fallback and mixed-dependency acceptance',
  'Run preregistered integrated mixed/lifecycle/performance gate and independent-device confirmation',
  'Public DOM/Three host property/ref/event contracts, React adapter and independent extension validation',
  'Installable packages, compiler support/diagnostic matrix and finite maintainability/adoption evidence'
 ],
 'archive':'source-and-build.tar.gz','archiveSha256':sha(out/'source-and-build.tar.gz'),
 'sourceAndBuildSha256':hashes,
 'historicalEvidence':{'researchNotebookSha256':sha(root/'research.ipynb'),'previousCheckpointArchiveSha256':previous['archiveSha256']}
}
(out/'status.json').write_text(json.dumps(status,indent=2)+'\n')
with tarfile.open(out/'source-and-build.tar.gz') as archive:
 members={m.name:m for m in archive.getmembers()}
 assert set(members)==set(hashes)
 for name,expected in hashes.items():
  assert hashlib.sha256(archive.extractfile(members[name]).read()).hexdigest()==expected, name
  assert sha(root/name)==expected,name
assert sha(prior/'source-and-build.tar.gz')==previous['archiveSha256']
print(json.dumps({'status':'ARCHIVED_AND_HASH_VERIFIED','files':len(hashes),'archiveSha256':status['archiveSha256'],'path':str(out)}))
