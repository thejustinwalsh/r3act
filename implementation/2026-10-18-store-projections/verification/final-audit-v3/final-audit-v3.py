from __future__ import annotations
import hashlib, json, os, re, subprocess, sys, urllib.parse
from collections import Counter
from pathlib import Path

ROOT = Path('/Volumes/Depot/Developer/r3act')
BASE = ROOT / 'implementation/2026-10-18-store-projections'
VER = BASE / 'verification'
OUT = VER / 'final-audit-v3'
checks = []

def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def sha_file(path: Path) -> str:
    return sha_bytes(path.read_bytes())

def load(path: Path):
    return json.loads(path.read_text())

def add(name, ok, details=None):
    checks.append({'name': name, 'status': 'PASS' if ok else 'FAIL', 'details': details})

def walk_files(directory: Path):
    for path in directory.rglob('*'):
        if path.is_file() and not path.is_symlink():
            yield path

def verify_archive(name, metadata, dest):
    rows = metadata.get('files', [])
    failures = []
    for item in rows:
        path = dest / item['path']
        try:
            data = path.read_bytes()
            if len(data) != item['bytes'] or sha_bytes(data) != item['sha256']:
                failures.append(item['path'])
        except Exception:
            failures.append(item['path'])
    add(name, len(failures) == 0 and len(rows) == len(list(walk_files(dest))),
        {'manifestFiles': len(rows), 'actualFiles': len(list(walk_files(dest))), 'badPaths': failures[:20]})
    return len(rows)

def snapshot_check(version, receipt):
    manifest_path = VER / f'reviewed-source-{version}' / 'manifest.json'
    manifest = load(manifest_path)
    lock = {x['path']: x for x in load(VER / f'darwin-{version}/source-before.json')['inputs']}
    bad = []
    for row in manifest['files']:
        rel = row['path']
        file = VER / f'reviewed-source-{version}' / rel
        try:
            d = file.read_bytes()
            expected_lock = lock.get(rel, {}).get('sha256')
            if len(d) != row['bytes'] or sha_bytes(d) != row['sha256'] or expected_lock != row['sha256']:
                bad.append(rel)
        except Exception:
            bad.append(rel)
    add(f'{version} reviewed source snapshot and source-before', not bad,
        {'files': len(manifest['files']), 'badPaths': bad[:20]})

# Actual correctness receipts and raw gate outcomes.
r1 = load(VER / 'darwin-v1/receipt.json')
r2 = load(VER / 'darwin-v2/receipt.json')
c1 = Counter(s['status'] for s in r1['steps'])
c2 = Counter(s['status'] for s in r2['steps'])
add('v1 step receipt counts', c1 == Counter({'PASS': 6, 'FAIL': 3, 'SKIPPED_DEPENDENCY_FAILED': 22}), dict(c1))
add('v2 step receipt counts', c2 == Counter({'PASS': 31}), dict(c2))
add('v1 source audit and v2 source audit', r1.get('sourceAudit', {}).get('status') == 'MATCH' and r2.get('sourceAudit', {}).get('status') == 'MATCH',
    {'v1': r1.get('sourceAudit'), 'v2': r2.get('sourceAudit')})
for version, receipt in [('v1', r1), ('v2', r2)]:
    snapshot_check(version, receipt)
    vdir = VER / f'darwin-{version}'
    for phase in ('before', 'after'):
        metadata = receipt.get('packageCache' + phase.capitalize(), {})
        n = verify_archive(f'{version} package {phase} archive hash/size inventory', metadata, vdir / f'packaging-{phase}')
        add(f'{version} package {phase} archive count', n == (468 if version == 'v1' and phase == 'before' else 217 if version == 'v1' else 217 if phase == 'before' else 468), {'files': n})
    fmeta = receipt.get('fixtureArtifacts', {})
    n = verify_archive(f'{version} fixture archive hash/size inventory', fmeta, vdir / 'fixture-artifacts')
    add(f'{version} fixture archive count', n == (0 if version == 'v1' else 117), {'files': n})

# Runtime/Rust/tooling/package/compiled fixture evidence is parsed from preserved raw logs.
log1 = VER / 'darwin-v1/logs'
log2 = VER / 'darwin-v2/logs'
deno = (log2 / 'deno-full.log').read_text()
rust = (log2 / 'cargo-test.log').read_text()
art = (log2 / 'artifact-conformance.log').read_text()
three = (log2 / 'three-host-7.log').read_text()
gc1 = (log2 / 'direct-intent-gc.log').read_text()
gc2 = (log2 / 'native-candidate-gc.log').read_text()
consumer_log = (log2 / 'package-consumer.log').read_text()
add('v2 runtime count from Deno log', bool(re.search(r'ok \| 949 passed \| 0 failed', deno)), {'summary': re.findall(r'ok \| .*', deno)[-1:]})
add('v2 Rust count from cargo log', bool(re.search(r'test result: ok\. 59 passed; 0 failed', rust)), {'summary': [x for x in rust.splitlines() if x.strip().startswith('test result:')]})
add('v2 artifact checks from raw log', 'PASS compiler artifact conformance (24 checks)' in art)
add('v2 Three cases from raw log', bool(re.search(r'ℹ tests 7\s+ℹ suites 0\s+ℹ pass 7\s+ℹ fail 0', three)))
add('v2 two bounded GC checks', 'PASS:' in gc1 and 'PASS:' in gc2)
compiled = [s for s in r2['steps'] if re.fullmatch(r'compiled-\d{2}', s['name'])]
compiler_hash = '1c09f9d608c5c7c7b8dd8fddfa80aa0d90106e1cffc8bce023d134e58350ac9e'
compiled_ok = len(compiled) == 19 and all(s['status'] == 'PASS' and s.get('debugCompilerSha256Before') == compiler_hash and s.get('debugCompilerSha256After') == compiler_hash for s in compiled)
add('v2 19 compiled fixtures and compiler hashes', compiled_ok, {'count': len(compiled), 'compilerSha256': compiler_hash})
add('v2 five-package installed consumer', '"status": "PASS"' in consumer_log and 'installed storeRecord provenance and compiled scoped projections share the core runtime' in consumer_log,
    {'log': 'darwin-v2/logs/package-consumer.log'})

# Final 803 source inputs, 749 pair inputs, proof identity and outputs.
sb = load(VER / 'darwin-v2/source-before.json')['inputs']
sa = load(VER / 'darwin-v2/source-after.json')['inputs']
current_mismatch = []
for item in sb:
    p = ROOT / item['path']
    if not p.exists() or sha_file(p) != item['sha256']:
        current_mismatch.append(item['path'])
add('v2 current 803 source hashes', len(sb) == 803 and sb == sa and not current_mismatch,
    {'sourceBefore': len(sb), 'sourceAfter': len(sa), 'currentMismatches': current_mismatch[:20]})
proof_path = BASE / 'benchmark/proof-v1/build-proof.json'
proof_bytes = proof_path.read_bytes()
proof = json.loads(proof_bytes)
proof_sha = sha_bytes(proof_bytes)
pair_path = BASE / 'benchmark/proof-v1/pair-one-shot.json'
pair_bytes = pair_path.read_bytes()
pair = json.loads(pair_bytes)
source_before, source_after = pair['sourceBefore'], pair['sourceAfter']
pair_sha = sha_bytes(pair_bytes)
source_lock = load(BASE / 'benchmark/proof-v1/source-lock.json')
proof_counts = {'source': len(source_lock['inputs']), 'compiler': 1, 'transformed': len(proof['transformed']), 'assets': len(proof['assets'])}
add('proof input class total 743+1+2+3=749', proof_counts == {'source': 743, 'compiler': 1, 'transformed': 2, 'assets': 3} and sum(proof_counts.values()) == 749, proof_counts)
add('proof source lock and compiler unchanged', all(x['expected'] == x['actual'] for x in proof['inputAudit']) and proof['compiler']['sha256'] == proof['compiler']['sha256After'])
# Current final-state verification: only the README is allowed to differ from the frozen proof input set.
readme_path='implementation/2026-10-18-store-projections/benchmark/README.md'
proof_current_bad=[]
all_inputs=[*source_lock['inputs'], {'path':proof['compiler']['path'],'sha256':proof['compiler']['sha256']}, *proof['transformed'], *proof['assets']]
for item in all_inputs:
    if item['path']==readme_path: continue
    try:
        if sha_file(ROOT/item['path']) != item['sha256']: proof_current_bad.append(item['path'])
    except Exception: proof_current_bad.append(item['path'])
readme_original_hash=next(x['sha256'] for x in source_lock['inputs'] if x['path']==readme_path)
readme_edit_receipt=load(VER/'post-run-readme-edit.json')
readme_current_hash=sha_file(BASE/'benchmark/README.md')
add('748 non-README proof inputs still match current bytes', len(all_inputs)==749 and len(proof_current_bad)==0 and readme_original_hash==readme_edit_receipt['beforeSha256'] and readme_current_hash==readme_edit_receipt['afterSha256'],
    {'totalInputs':len(all_inputs),'currentInputsChecked':len(all_inputs)-1,'mismatches':proof_current_bad[:20],'documentException':{'path':readme_path,'frozenHash':readme_original_hash,'archivedHash':readme_edit_receipt['beforeSha256'],'currentHash':readme_current_hash,'documentedPostRunEdit':readme_edit_receipt['afterSha256']}})
pair_current_bad=[]
for item in source_after:
    if item['path']==readme_path: continue
    try:
        if sha_file(ROOT/item['path']) != item['expected']: pair_current_bad.append(item['path'])
    except Exception: pair_current_bad.append(item['path'])
for item in source_after:
    if item['path']==readme_path:
        if item['expected'] != readme_edit_receipt['beforeSha256'] or item['actual'] != readme_edit_receipt['beforeSha256']: pair_current_bad.append('pair-record:'+readme_path)
add('748 non-README pair inputs still match current bytes', len(source_after)==749 and not pair_current_bad,
    {'recordedInputs':len(source_after),'currentInputsChecked':len(source_after)-1,'mismatches':pair_current_bad[:20]})
proof_results = (BASE / 'results.md').read_text()
add('proof hash matches results and pair authorization', proof_sha == 'ec058c78b45ecbfecd513e368fc51277f30ef76ef80b1ae668579cd9d2d78c29' and proof_sha in proof_results and load(BASE / 'benchmark/proof-v1/run-authorization.json')['buildProofSha256'] == proof_sha, {'proofSha256': proof_sha})
add('pair hash matches results', pair_sha == '0d49bdcc466776b8a46bcba64f2b6cf832563ea39270ec8e145867d234dd6094' and pair_sha in proof_results, {'pairSha256': pair_sha})
pair_bad = [x['path'] for x in source_before + source_after if not x['matches'] or x['expected'] != x['actual']]
add('pair all 749 hashes before and after', len(source_before) == 749 and len(source_after) == 749 and not pair_bad and source_before == source_after,
    {'before': len(source_before), 'after': len(source_after), 'mismatches': pair_bad[:20]})
arm_results = [x['result'] for x in pair['arms']]
add('pair matching outputs and lifecycle', pair['status'] == 'PASS_DESCRIPTIVE_JOINT_INPUT_PAIR_ONLY' and len(arm_results) == 2 and
    all(x['status'] == 'PASS' and x['retainedHostIdentity'] and x['retainedTextIdentity'] and x['retainedSubtreeIdentity'] and x['retainedRowIdentity'] and x['retainedRowState'] == 1 and x['fallbackVisible'] and not x['healthReadyBeforeTiming'] and x['healthRevealedAfterTiming'] and x['disposal']['remainingChildren'] == 0 for x in arm_results) and
    arm_results[0]['outputSha256'] == arm_results[1]['outputSha256'] == '6db17d7d29ee4c09c73f99fb532e8111033a8b3a3433e5b273ae0b1805201e27',
    {'nativeMs': arm_results[0].get('dispatchToMutationObserverMs'), 'reactMs': arm_results[1].get('dispatchToMutationObserverMs'), 'outputSha256': arm_results[0].get('outputSha256')})
add('pair network and browser cleanup', not pair['blockedRequests'] and not pair['requestFailures'] and not pair['pageErrors'] and not pair['consoleErrors'] and not pair['errors'] and not pair.get('stopReason'),
    {'servedAssets': len(pair['servedAssets']), 'blocked': len(pair['blockedRequests']), 'requestFailures': len(pair['requestFailures']), 'pageErrors': len(pair['pageErrors']), 'consoleErrors': len(pair['consoleErrors']), 'errors': pair['errors']})

# Notebook: original 199 cells unchanged, one appended cell, root format metadata unchanged.
old_nb = json.loads(subprocess.check_output(['git', 'show', 'HEAD:research.ipynb']))
new_nb = load(ROOT / 'research.ipynb')
old_cells, new_cells = old_nb.get('cells', []), new_nb.get('cells', [])
nb_ok = len(old_cells) == 199 and len(new_cells) == 200 and old_cells == new_cells[:199] and old_nb.get('metadata') == new_nb.get('metadata') and old_nb.get('nbformat') == new_nb.get('nbformat') and old_nb.get('nbformat_minor') == new_nb.get('nbformat_minor')
add('notebook one-cell append preserves prior cells/root metadata', nb_ok,
    {'headCells': len(old_cells), 'currentCells': len(new_cells), 'prefixExact': old_cells == new_cells[:len(old_cells)], 'metadataExact': old_nb.get('metadata') == new_nb.get('metadata'), 'nbformat': [old_nb.get('nbformat'), old_nb.get('nbformat_minor')]})

# Local inline Markdown link targets in changed live docs and active unit docs/README.
doc_paths = set()
changed = subprocess.check_output(['git', 'diff', '--name-only', 'HEAD', '--', '*.md'], text=True).splitlines()
doc_paths.update(changed)
doc_paths.update([
 'implementation/2026-10-18-store-projections/design.md',
 'implementation/2026-10-18-store-projections/source-review.md',
 'implementation/2026-10-18-store-projections/results.md',
 'implementation/2026-10-18-store-projections/benchmark/README.md',
])
link_failures=[]; link_count=0
link_re=re.compile(r'(?<!!)\[[^\]]*\]\(([^)]+)\)')
for rel in sorted(doc_paths):
 p=ROOT/rel
 if not p.is_file():
  link_failures.append({'doc':rel,'target':'<document missing>'}); continue
 text=p.read_text(errors='replace')
 for raw in link_re.findall(text):
  target=raw.strip().split()[0] if not raw.strip().startswith('<') else raw.strip()[1:raw.find('>')]
  target=urllib.parse.unquote(target)
  if re.match(r'^[A-Za-z][A-Za-z0-9+.-]*:',target) or target.startswith('//'):
   continue
  link_count += 1
  pathpart=target.split('#',1)[0].split('?',1)[0]
  dest=(p.parent/pathpart).resolve() if pathpart else p
  try: dest.relative_to(ROOT.resolve())
  except ValueError:
   link_failures.append({'doc':rel,'target':target,'reason':'escapes repository'}); continue
  if not dest.exists(): link_failures.append({'doc':rel,'target':target,'reason':'missing local target'})
add('local Markdown links in touched docs and unit docs', not link_failures,
    {'documents': sorted(doc_paths), 'linksChecked': link_count, 'failures': link_failures[:30]})
# Confirm the sole post-run editorial README replacement against archived exact bytes.
edit = load(VER/'post-run-readme-edit.json')
readme_current = BASE/'benchmark/README.md'
readme_archive = VER/'benchmark-build-v1/reviewed-source/benchmark/README.md'
readme_before = readme_archive.read_text()
readme_after = readme_current.read_text()
old_sentence = 'Source prepared, not built or run.'
new_sentence = 'Completed once: correctness and the matched pair pass; Native was slower (5.1/0.8 ms). See [results and limits](../results.md).'
readme_lock_hash = next(x['sha256'] for x in load(BASE/'benchmark/proof-v1/source-lock.json')['inputs'] if x['path']=='implementation/2026-10-18-store-projections/benchmark/README.md')
readme_edit_ok = edit.get('kind') == 'POST_RUN_DOCUMENTATION_ONLY' and edit.get('path') == 'implementation/2026-10-18-store-projections/benchmark/README.md' and \
    sha_file(readme_archive) == edit.get('beforeSha256') == readme_lock_hash and sha_file(readme_current) == edit.get('afterSha256') and \
    readme_before.count(old_sentence) == 1 and readme_after.count(new_sentence) == 1 and \
    readme_before.replace(old_sentence,new_sentence,1) == readme_after
add('README exact one-sentence post-run edit matches archived original and receipt', readme_edit_ok,
    {'beforeSha256':sha_file(readme_archive),'sourceLockSha256':readme_lock_hash,'afterSha256':sha_file(readme_current),'receipt':edit,'exactSingleReplacement':readme_edit_ok})
add('results documents sole README post-run proof-input difference', 'sole post-run proof-input change' in (BASE/'results.md').read_text() and 'all 749 hashes matched during both recorded measurement checks' in (BASE/'results.md').read_text().lower())

# Verify tracked frozen locks and source-basis manifests against the current HEAD blobs.
tracked = subprocess.check_output(['git','ls-files','-z']).split(b'\0')[:-1]
critical=[]
for raw in tracked:
    rel=raw.decode(errors='replace')
    base=Path(rel).name.lower()
    if base.endswith('.lock') or base in ('source-before.json','source-after.json','receipt.json'):
        critical.append(rel)
critical_bad=[]
for rel in critical:
    work=ROOT/rel
    try:
        head=subprocess.check_output(['git','show',f'HEAD:{rel}'])
        if not work.is_file() or work.read_bytes()!=head: critical_bad.append(rel)
    except Exception: critical_bad.append(rel)
head_sha=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
add('frozen historical lock/source-basis blobs unchanged', not critical_bad and head_sha == 'efba5eed895bb783b7e4ba2398ccf70b6ed168c9',
    {'trackedCriticalFilesChecked': len(critical), 'mismatches': critical_bad[:30], 'HEAD': head_sha})

# Tracked .cache verification uses lstat/readlink and never dereferences symlinks.
cache_rows=load(VER/'preflight-v1/tracked-cache-before.json')['entries']
cache_bad=[]; cache_counts=Counter()
for row in cache_rows:
    p=ROOT/row['path']
    try: mode=p.lstat().st_mode
    except FileNotFoundError:
        cache_bad.append(row['path']); continue
    if os.path.islink(p):
        cache_counts['symlink']+=1
        if row['kind']!='symlink' or os.readlink(p)!=row.get('target'): cache_bad.append(row['path'])
    elif p.is_file():
        cache_counts['file']+=1
        if row['kind']!='file' or p.stat().st_size!=row['bytes'] or sha_file(p)!=row['sha256']: cache_bad.append(row['path'])
    else: cache_bad.append(row['path'])
add('tracked cache exact bytes and symlink targets', len(cache_rows)==18368 and cache_counts['symlink']==954 and cache_counts['file']==17414 and not cache_bad,
    {'trackedEntries':len(cache_rows),'regularFiles':cache_counts['file'],'symlinks':cache_counts['symlink'],'mismatches':cache_bad[:30]})
tracked_names={r['path'] for r in cache_rows}
untracked_symlinks=[]
for directory, dirs, files in os.walk(ROOT/'.cache', followlinks=False):
    for name in dirs+files:
        p=Path(directory)/name
        rel=p.relative_to(ROOT).as_posix()
        if p.is_symlink() and rel not in tracked_names: untracked_symlinks.append(rel)
add('untracked generated cache symlink inventory separately counted', True,
    {'untrackedSymlinks':len(untracked_symlinks),'examples':untracked_symlinks[:10], 'notComparedAsHistoricalTrackedCache':True})

# Scoped process check: inspect only relevant command matches and report PIDs/count, not other process details.
ps_text=subprocess.check_output(['ps','-axo','pid=,command='],text=True)
owned=[]
for line in ps_text.splitlines():
    if re.search(r'(run-pair\.mjs|store-projections-proof\.localhost|vitexec.*chrom|chrom.*vitexec)',line,re.I):
        m=re.match(r'\s*(\d+)',line)
        if m and int(m.group(1)) != os.getpid(): owned.append(int(m.group(1)))
add('no owned benchmark browser/server process remains', not owned, {'matchingPids':owned})
auth_pid=subprocess.run(['ps','-p','62738','-o','pid=,comm='],capture_output=True,text=True)
auth_line=auth_pid.stdout.strip()
add('native authorization OS PID 62738 remains separate', bool(auth_line) and 'osascript' in auth_line.lower(), {'present':bool(auth_line),'pidAndCommand':auth_line or None,'touched':False,'executionSessionHandle':63129})

failures=[x for x in checks if x['status']=='FAIL']
report={'schemaVersion':1,'status':'PASS' if not failures else 'FAIL','checks':checks,'failureCount':len(failures),
        'artifacts':{'v1ReceiptSha256':sha_file(VER/'darwin-v1/receipt.json'),'v2ReceiptSha256':sha_file(VER/'darwin-v2/receipt.json'),
        'proofSha256':proof_sha,'pairSha256':pair_sha,'pairRecordToolExit':(VER/'benchmark-pair-v1/tool-exit-code.txt').read_text().strip()}}
(OUT/'final-audit-v3.json').write_text(json.dumps(report,indent=2)+'\n')
lines=['# Structured Store projection final evidence audit v3','',f"Status: **{report['status']}** ({len(checks)-len(failures)}/{len(checks)} checks passed).",'']
for c in checks:
    lines.append(f"- **{c['status']}** — {c['name']}")
    if c['status']=='FAIL': lines.append(f"  - Details: `{json.dumps(c['details'],sort_keys=True)}`")
lines += ['',f"v1 receipt SHA-256: `{report['artifacts']['v1ReceiptSha256']}`  ",f"v2 receipt SHA-256: `{report['artifacts']['v2ReceiptSha256']}`  ",f"Proof SHA-256: `{proof_sha}`  ",f"Pair SHA-256: `{pair_sha}`  ",f"Pair tool exit: `{report['artifacts']['pairRecordToolExit']}`.",'']
(OUT/'final-audit-v3.md').write_text('\n'.join(lines))
print(f"final evidence audit {report['status']}: {len(checks)-len(failures)}/{len(checks)} checks passed")
for f in failures: print('FAIL:',f['name'],json.dumps(f['details'],sort_keys=True))
sys.exit(0 if not failures else 1)
