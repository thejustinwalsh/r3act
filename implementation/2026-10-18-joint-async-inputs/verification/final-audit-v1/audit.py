import hashlib,json,os,re,subprocess,urllib.parse
from pathlib import Path
from collections import Counter
ROOT=Path('/Volumes/Depot/Developer/r3act')
BASE=ROOT/'implementation/2026-10-18-joint-async-inputs'
VER=BASE/'verification'; OUT=VER/'final-audit-v1'; checks=[]
def load(p): return json.loads(p.read_text())
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def add(name,ok,details=None): checks.append(dict(name=name,status='PASS' if ok else 'FAIL',details=details))
def archive(name,rows,folder):
 bad=[x['path'] for x in rows if not (folder/x['path']).is_file() or sha(folder/x['path'])!=x['sha256'] or (folder/x['path']).stat().st_size!=x['bytes']]
 add(name,not bad,dict(files=len(rows),bad=bad[:20]))
for v in ['v1','v2','v3']:
 p=VER/f'darwin-{v}'; r=load(p/'receipt.json'); counts=Counter(s['status'] for s in r['steps'])
 add(f'{v} gate outcomes',counts==({'PASS':31,'FAIL':1} if v=='v1' else {'PASS':32}),dict(counts))
 add(f'{v} source before/after',r['sourceAudit']['status']=='MATCH' and load(p/'source-before.json')==load(p/'source-after.json'))
 snap=load(VER/f'reviewed-source-{v}/manifest.json')
 if isinstance(snap,dict): snap=snap['files']
 archive(f'{v} reviewed source archive',snap,VER/f'reviewed-source-{v}')
 for phase in ['before','after']:
  archive(f'{v} package {phase}',load(p/f'packaging-{phase}.json')['files'],p/f'packaging-{phase}')
 archive(f'{v} fixture artifacts',load(p/'fixture-artifacts.json')['files'],p/'fixture-artifacts')
 if v=='v3':
  rows=load(p/'source-after.json')['inputs']
  bad=[x['path'] for x in rows if sha(ROOT/x['path'])!=x['sha256']]
  add('current correctness source',not bad,dict(files=len(rows),bad=bad))
  logs=p/'logs'
  add('runtime 968 passes',bool(re.search(r'ok \| 968 passed \| 0 failed',(logs/'deno-full.log').read_text())))
  add('Rust 61 passes','test result: ok. 61 passed; 0 failed' in (logs/'cargo-test.log').read_text())
  add('compiler artifact 24 checks','PASS compiler artifact conformance (24 checks)' in (logs/'artifact-conformance.log').read_text())
  cs=[x for x in r['steps'] if x['name'].startswith('compiled-')]
  hashes={x.get('debugCompilerSha256Before') for x in cs}|{x.get('debugCompilerSha256After') for x in cs}
  add('20 compiled fixtures use same current executable',len(cs)==20 and len(hashes)==1 and sha(ROOT/'compiler/oxc-spike/target/debug/ui-graph-compiler-spike') in hashes,dict(hashes=list(hashes)))
proofdir=BASE/'benchmark/proof-v3'
proof=load(proofdir/'build-proof.json'); lock=load(proofdir/'source-lock.json'); auth=load(proofdir/'correctness-authorization.json')
add('current proof assertions and correctness authorization',proof['status']=='BUILD_CAPTURED_PENDING_PRIMARY_REVIEW' and all(proof['assertions'].values()) and auth['buildProofSha256']==sha(proofdir/'build-proof.json'))
rows=lock['inputs']+[{'path':proof['compiler']['path'],'sha256':proof['compiler']['sha256']}]+proof['transformed']+proof['assets']
add('current proof inputs',all(sha(ROOT/x['path'])==x['sha256'] for x in rows),dict(files=len(rows)))
failed=load(BASE/'benchmark/proof-v2/pair-one-shot.json')
add('sole comparison remains incomplete without arm timings',failed['status']=='INCOMPLETE' and failed['arms']==[] and not failed['comparison'] and failed['stopReason']=='deadline-90s' and not failed['sourceAfter'] and len(failed['sourceBefore'])==753 and all(x['matches'] for x in failed['sourceBefore']))
add('rejected first proof preserved',load(BASE/'benchmark/proof-v1/build-proof.json')['status']=='BUILD_FAILED_OR_INCOMPLETE')
smoke_path=VER/'browser-correctness-v1/receipt.json'; smoke=load(smoke_path)
add('untimed native correctness status',smoke['status']=='PASS_UNTIMED_NATIVE_CORRECTNESS_ONLY' and smoke['kind']=='UNTIMED_NATIVE_CORRECTNESS_ONLY')
r=smoke['result']
add('untimed behavior and lifetime',r['status']=='PASS' and all(r[k] for k in ['retainedHealthIdentity','retainedRowIdentity','noPrematureJointReveal','fallbackRetired','laterStoreUpdated','laterHealthRevealed']) and r['retainedRowState']==1 and r['disposal']['remainingChildren']==0 and r['disposal']['ownerCount']==0 and all(r['disposal']['store'][k]==0 for k in ['roots','readers','listeners']))
add('untimed source integrity',smoke['sourceBefore']==smoke['sourceAfter'] and len(smoke['sourceAfter'])==len(rows) and all(x['expected']==x['actual'] for x in smoke['sourceAfter']))
add('untimed errors',not any(smoke[k] for k in ['errors','pageErrors','blockedRequests']))
add('untimed result excludes performance fields',not any('Ms' in k or 'timing' in k.lower() for k in r))
notes=(BASE/'results.md').read_text()
add('results bind current proof, failed pair and untimed correctness',all(sha(p) in notes for p in [proofdir/'build-proof.json',BASE/'benchmark/proof-v2/pair-one-shot.json',smoke_path]))
old=json.loads(subprocess.check_output(['git','show','HEAD:research.ipynb'],cwd=ROOT)); new=load(ROOT/'research.ipynb'); n=len(old['cells'])
add('notebook exact prefix and one append',len(new['cells'])==n+1 and new['cells'][:n]==old['cells'] and all(new[k]==old[k] for k in ['metadata','nbformat','nbformat_minor']),dict(before=n,after=len(new['cells'])))
# Validate current tracked cache bytes using Git blob hashes; symlinks hash their link text.
entries=subprocess.check_output(['git','ls-files','--stage','-z','--','.cache'],cwd=ROOT).split(b'\0'); bad=[]; links=0; count=0
for entry in entries:
 if not entry: continue
 meta,rawpath=entry.split(b'\t',1); mode,oid,stage=meta.decode().split(); rel=os.fsdecode(rawpath); p=ROOT/rel; count+=1
 try:
  link=p.is_symlink(); links+=int(link)
  data=os.fsencode(os.readlink(p)) if link else p.read_bytes()
  actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
  actualmode='120000' if link else ('100755' if p.stat().st_mode&0o111 else '100644')
  if actual!=oid or actualmode!=mode: bad.append(rel)
 except Exception: bad.append(rel)
add('all tracked historical cache bytes/modes/links',not bad,dict(entries=count,symlinks=links,bad=bad[:20]))
paths=set(subprocess.check_output(['git','diff','--name-only','HEAD','--','*.md'],cwd=ROOT,text=True).splitlines())
paths.update(str(p.relative_to(ROOT)) for p in BASE.glob('*.md')); paths.add(str((BASE/'benchmark/README.md').relative_to(ROOT)))
bad=[]; linkcount=0
for rel in paths:
 p=ROOT/rel
 for target in re.findall(r'(?<!!)\[[^\]]*\]\(([^)]+)\)',p.read_text()):
  target=target.strip().strip('<>'); target=urllib.parse.unquote(target)
  if re.match(r'^[A-Za-z][A-Za-z0-9+.-]*:',target) or target.startswith('//'): continue
  dest=target.split('#',1)[0].split('?',1)[0]; linkcount+=1
  if dest and not (p.parent/dest).exists(): bad.append([rel,target])
add('local doc links',not bad,dict(count=linkcount,bad=bad[:20]))
result=dict(status='PASS' if all(x['status']=='PASS' for x in checks) else 'FAIL',checks=checks)
(OUT/'receipt.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(dict(status=result['status'],checks=len(checks),failed=[x for x in checks if x['status']=='FAIL']),indent=2))
raise SystemExit(0 if result['status']=='PASS' else 1)
