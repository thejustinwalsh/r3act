from pathlib import Path
import hashlib,json,tarfile,shutil,re,copy
root=Path.cwd();cache=root/'.cache/namespace-three-milestone';out=root/'implementation/2026-10-12-namespace-three'
assert not out.exists(),'Refusing to overwrite immutable checkpoint'
commands=json.loads((cache/'commands.json').read_text());assert len(commands)==44 and all(c['exitCode']==0 for c in commands)
match=re.search(r'ok \| (\d+) passed \| 0 failed',(cache/'deno.log').read_text());assert match and int(match.group(1))==433
assert 'test result: ok. 25 passed; 0 failed' in (cache/'rust.log').read_text()
for name in ['browser-results.json','hmr-results.json','input-browser-results.json','resource-regression/browser-result.json','three-browser/results.json','product-mixed-pilot/results.json']:
 assert json.loads((cache/name).read_text())['status']=='PASS',name
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
prior=root/'implementation/2026-10-12-sparse-candidate';previous=json.loads((prior/'status.json').read_text())
assert sha(prior/'source-and-build.tar.gz')==previous['archiveSha256']
assert sha(root/'research.ipynb')==previous['historicalEvidence']['researchNotebookSha256']
assert json.loads((root/'.cache/native-package-verification/results.json').read_text())['status']=='PASS'
files=[p for p in root.iterdir() if p.is_file() and p.suffix in {'.md','.html','.json','.ts','.yaml','.lock'}]
for base in ['src','scripts','compiler','dist','dist-product-mixed-v2']:
 for p in (root/base).rglob('*'):
  if p.is_file() and not any(part in {'target','node_modules','.cache','.git','__pycache__'} for part in p.relative_to(root).parts):files.append(p)
files=sorted(set(files),key=lambda p:str(p.relative_to(root)));hashes={str(p.relative_to(root)):sha(p) for p in files}
out.mkdir();v=out/'verification';v.mkdir()
for c in commands:shutil.copy2(cache/(c['name']+'.log'),v/(c['name']+'.log'))
for name in ['commands.json','verify.py','archive.py','integration-corrections.json','browser-check.mjs','hmr-check.mjs','browser-results.json','hmr-results.json','input-browser-results.json','desktop.png','mobile.png']:shutil.copy2(cache/name,v/name)
for name in ['resource-regression','three-browser','product-mixed-pilot']:shutil.copytree(cache/name,v/name)
shutil.copytree(root/'.cache/product-mixed-v2/compiler-proof',v/'product-compiler-proof')
shutil.copytree(root/'.cache/native-package-verification',v/'native-package')
shutil.copy2(root/'.cache/native-package-build/package-report.json',v/'native-package/package-report.json')
shutil.copy2(root/'.cache/compiled-ui-runtime.tgz',out/'compiled-ui-runtime.tgz')
with tarfile.open(out/'source-and-build.tar.gz','w:gz') as t:
 for p in files:t.add(p,arcname=str(p.relative_to(root)),recursive=False)
status=copy.deepcopy(previous)
status.update({'date':'2026-10-12','milestone':'Namespace Three constructors, lifecycle-scoped generic writers, inferred JSX and typed collection product pilot','status':'NAMESPACE_THREE_AND_TYPED_COLLECTION_PILOT_VERIFIED','goalStatus':'ACTIVE'})
status['scope']=[
 'Public namespace constructor resolution and Reflect.construct forwarding; no hand-written class catalog in demo/host',
 'Generic data/path writers with parsed path caches, current nested-target resolution, per-handle defaults, known Three conversion and explicit projection policy',
 'Inferred concrete constructors, required args, mutable instance props, raw refs and optional strict Three JSX backend plus custom type augmentation',
 'Compiled built-in/custom namespace scene, indexed material paths, prop reset, borrowed remount defaults and malformed/method/path rejection without custom factory or writer',
 'Installed private package includes strict Three JSX backends; external consumer type checks reject wrong constructor/method props',
 'Resolved native KeyedCollection traits on all eligible required destructured props, safe aliases, mutation exclusions and parenthesized JSX callback support',
 'Compiled two-source runtime publication verifies second-source notifications, retained host identity and balanced lifetime',
 'Actual native and React TSX product arms verify three prop-only writers, eligible collection region and ReactRow/ReactBoard memo caches',
 'Six production correctness pilot pages at 128/512/1024, equal three-field state, explicit CSS pixels, output/order/identity/lifecycle/teardown; zero confirmation pages collected'
]+status['scope']
status['verification']['runtimeTests']={'passed':433,'failed':0,'log':'verification/deno.log'}
status['verification']['rustTests']={'passed':25,'failed':0,'log':'verification/rust.log'}
status['verification']['commands']=commands
status['verification']['namespaceThree']={'status':'PASS','execution':'verification/namespace-three.log','types':'verification/three-inferred-types.log','runtimeScope':'Object3D/BufferGeometry/Material lifecycle; no total maintenance/performance result'}
status['verification']['typedCollections']={'status':'PASS','compiler':'verification/typed-collection.log','runtime':'verification/typed-collection-execution.log'}
status['verification']['productMixedPilot']={'status':'PASS','result':'verification/product-mixed-pilot/results.json','compilerProofs':'verification/product-compiler-proof','productionBuild':'dist-product-mixed-v2 in source archive','confirmationPages':0,'protocol':'product-mixed-v2-protocol.md in source archive'}
status['limitations']=[s for s in status['limitations'] if not s.startswith('Three material arrays,')]
status['limitations'][:0]=[
 'Three lifecycle currently supports Object3D, BufferGeometry and Material; other namespace resources need further lifetime/attachment policies',
 'Generic existing data/dash/indexed material paths are supported; attachment callbacks, automatic constructor reconstruction and full R3F event behavior remain unsupported',
 'Namespace import may retain more Three code; static compiler catalog generation and smaller total adapter implementation are unproved',
 'Strict Three JSX types require the optional host-specific backend; the cross-host JSX backend is permissive',
 'Typed collection traits support required destructured direct imported type references and safe aliases; unsupported source shapes retain generic rendering and typed lies can fail runtime validation',
 'Native DOM numeric CSS lengths do not emulate React implicit pixel conversion; product pilot uses explicit equal pixel strings',
 'Pilot correctness pages are not confirmation timing evidence; source/build must be preregistered before collecting all 30 confirmation pages'
]
status['remaining'][:0]=['Collect the single fixed compiled product mixed V2 confirmation and separate memory profiles from this archived artifact before further optimization families']
status['packageArtifact']={'file':'compiled-ui-runtime.tgz','sha256':sha(out/'compiled-ui-runtime.tgz'),'platform':'darwin-arm64','verification':'verification/native-package/results.json','published':False}
status['archive']='source-and-build.tar.gz';status['archiveSha256']=sha(out/'source-and-build.tar.gz');status['sourceAndBuildSha256']=hashes
status['historicalEvidence']={'researchNotebookSha256':sha(root/'research.ipynb'),'previousCheckpointArchiveSha256':previous['archiveSha256']}
(out/'status.json').write_text(json.dumps(status,indent=2)+'\n')
with tarfile.open(out/'source-and-build.tar.gz') as t:
 members={m.name:m for m in t.getmembers()};assert set(members)==set(hashes)
 for name,want in hashes.items():assert hashlib.sha256(t.extractfile(members[name]).read()).hexdigest()==want and sha(root/name)==want,name
assert sha(prior/'source-and-build.tar.gz')==previous['archiveSha256']
print(json.dumps({'status':'ARCHIVED_AND_HASH_VERIFIED','files':len(hashes),'archiveSha256':status['archiveSha256'],'path':str(out)}))
