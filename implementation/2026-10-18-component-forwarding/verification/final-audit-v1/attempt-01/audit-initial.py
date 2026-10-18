import hashlib, json, os, re, stat, subprocess, urllib.parse
from pathlib import Path

ROOT = Path('/Volumes/Depot/Developer/r3act')
BASE = ROOT / 'implementation/2026-10-18-component-forwarding'
VER = BASE / 'verification'
OUT = VER / 'final-audit-v1'
GATE = VER / 'darwin-v1'
PRE = VER / 'preflight-v1'
PROOF = BASE / 'benchmark/proof-v1'
checks = []

def load(path): return json.loads(path.read_text())
def sha_bytes(data): return hashlib.sha256(data).hexdigest()
def sha(path): return sha_bytes(path.read_bytes())
def add(name, ok, details=None):
    checks.append({'name': name, 'status': 'PASS' if ok else 'FAIL', 'details': details})
def archive_check(name, rows, folder):
    bad = []
    for row in rows:
        path = folder / row['path']
        if not path.is_file() or path.is_symlink():
            bad.append(row['path']); continue
        data = path.read_bytes()
        if sha_bytes(data) != row['sha256'] or len(data) != row['bytes']:
            bad.append(row['path'])
    add(name, not bad, {'files': len(rows), 'bad': bad[:20]})
    return not bad

gate = load(GATE / 'receipt.json')
step_counts = {}
for step in gate['steps']: step_counts[step['status']] = step_counts.get(step['status'], 0) + 1
add('Darwin correctness gate 33/33', gate['status'] == 'PASS' and step_counts == {'PASS': 33} and not gate['errors'],
    {'status': gate['status'], 'steps': step_counts, 'errors': gate['errors']})
add('declared basis and native platform', gate['source'] == {
    'declaredCommit': '3bf24ad320ec1ff39622a634970b67c8736a90a7',
    'gitHead': '3bf24ad320ec1ff39622a634970b67c8736a90a7', 'inputCount': 816} and
    gate['actual'] == {'platform': 'darwin', 'arch': 'arm64'} and gate['expected'] == gate['actual'])
source_before = load(GATE / 'source-before.json')
source_after = load(GATE / 'source-after.json')
pre_manifest = load(PRE / 'source-before-manifest.json')
pre_rows = pre_manifest['inputs']
before_rows = source_before['inputs']; after_rows = source_after['inputs']
pre_by_path = {x['path']: x for x in pre_rows}
before_by_path = {x['path']: x for x in before_rows}
after_by_path = {x['path']: x for x in after_rows}
pre_archive_bad = []
for row in pre_rows:
    path = PRE / 'source-before' / row['path']
    if not path.is_file() or sha(path) != row['sha256'] or path.stat().st_size != row['bytes']:
        pre_archive_bad.append(row['path'])
add('pre-execution archive exactly covers runner source lock', len(pre_rows) == 816 and
    set(pre_by_path) == set(before_by_path) and all(
        (pre_by_path[k]['sha256'], pre_by_path[k]['bytes']) == (before_by_path[k]['sha256'], before_by_path[k]['bytes'])
        for k in before_by_path) and not pre_archive_bad,
    {'archiveFiles': len(pre_rows), 'runnerFiles': len(before_rows), 'bad': pre_archive_bad[:20]})
changed = [p for p in set(before_by_path) | set(after_by_path) if before_by_path.get(p) != after_by_path.get(p)]
current_bad = [row['path'] for row in after_rows if not (ROOT / row['path']).is_file() or sha(ROOT / row['path']) != row['sha256']]
add('correctness source lock and current files', gate['sourceAudit']['status'] == 'MATCH' and not changed and
    len(before_rows) == len(after_rows) == 816 and not current_bad,
    {'before': len(before_rows), 'after': len(after_rows), 'changed': changed[:20], 'currentMismatches': current_bad[:20]})

# Gate output archives: compare every receipt row to its retained byte copy.
fixtures = load(GATE / 'fixture-artifacts.json')
add('all 127 fixture outputs archived', fixtures['status'] == 'ARCHIVED' and len(fixtures['files']) == 127 and
    archive_check('fixture archive contents', fixtures['files'], GATE / 'fixture-artifacts'),
    {'files': len(fixtures['files'])})
package_before = load(GATE / 'packaging-before.json')
package_after = load(GATE / 'packaging-after.json')
before_ok = archive_check('package before archive contents', package_before['files'], GATE / 'packaging-before')
after_ok = archive_check('package after archive contents', package_after['files'], GATE / 'packaging-after')
add('fresh package artifacts and installed consumer', package_before['status'] == 'ARCHIVED' and
    len(package_before['files']) == 478 and package_after['status'] == 'ARCHIVED' and
    len(package_after['files']) == 488 and before_ok and after_ok and
    gate['packageValidation']['status'] == 'PASS' and gate['packageValidation']['consumerStatus'] == 'PASS' and
    len(gate['packageValidation']['tarballs']) == 5,
    {'before': len(package_before['files']), 'after': len(package_after['files']),
     'consumer': gate['packageValidation']['consumerStatus']})

# Every compiled fixture is bound to the one source-produced executable; package release bytes and Rust inputs are verified.
compiled = [s for s in gate['steps'] if re.fullmatch(r'compiled-\d{2}', s['name'])]
debug_path = ROOT / gate['debugCompiler']['path']
debug_sha = sha(debug_path)
compiled_hashes = {s.get('debugCompilerSha256Before') for s in compiled} | {s.get('debugCompilerSha256After') for s in compiled}
add('21 compiled fixtures bind to current debug compiler', len(compiled) == 21 and
    all(s['status'] == 'PASS' and s['exitCode'] == 0 for s in compiled) and
    compiled_hashes == {debug_sha} == {gate['debugCompiler']['sha256AfterBuild']},
    {'fixtures': len(compiled), 'compilerSha256': debug_sha})
artifact_log = (GATE / 'logs/artifact-conformance.log').read_text()
deno_log = (GATE / 'logs/deno-full.log').read_text()
cargo_log = (GATE / 'logs/cargo-test.log').read_text()
add('consolidated test totals', 'ok | 978 passed | 0 failed' in deno_log and
    'test result: ok. 63 passed; 0 failed' in cargo_log and
    'PASS compiler artifact conformance (24 checks)' in artifact_log and
    step_counts.get('PASS') == 33)

report = load(GATE / 'packaging-after/report.json')
release = report['compilerBinary']
release_path = GATE / 'packaging-after' / 'vite' / release['path']
manifest = load(GATE / 'packaging-after/vite/' + release['manifest'])
manifest_artifact = manifest['artifacts'][0]
release_source_bad = []
for row in release['rustSource']['files']:
    lock_row = after_by_path.get(row['path'])
    if not lock_row or (lock_row['sha256'], lock_row['bytes']) != (row['sha256'], row['bytes']):
        release_source_bad.append(row['path'])
add('packaged release compiler is source-bound', release['rustTarget'] == 'aarch64-apple-darwin' and
    release['compilerInfo']['protocolVersion'] == 1 and release['compilerInfo']['version'] == '0.1.0' and
    sha(release_path) == release['sha256'] and release_path.stat().st_size == release['bytes'] and
    manifest_artifact['sha256'] == release['sha256'] and manifest_artifact['bytes'] == release['bytes'] and
    not release_source_bad and len(release['rustSource']['files']) >= 6,
    {'target': release['rustTarget'], 'sha256': release['sha256'], 'bytes': release['bytes'],
     'rustSourceFiles': len(release['rustSource']['files']), 'sourceMismatches': release_source_bad})

# Build proof and authorization must remain the exact reviewed pair basis.
proof_bytes = (PROOF / 'build-proof.json').read_bytes()
source_bytes = (PROOF / 'source-lock.json').read_bytes()
auth_bytes = (PROOF / 'run-authorization.json').read_bytes()
proof_sha = sha_bytes(proof_bytes); source_lock_sha = sha_bytes(source_bytes); auth_sha = sha_bytes(auth_bytes)
proof = json.loads(proof_bytes); lock = json.loads(source_bytes); auth = json.loads(auth_bytes)
assertion_names = ['nativeJointInputProgram', 'nativeComponentForwardPrograms', 'nativeOwnedPayloads',
    'nativeFallbackOwnerHookSites', 'nativeRegisteredRevisionAndInvalidation', 'reactCompilerRuntime', 'reactMemoCache']
proof_rows = lock['inputs'] + [{'path': proof['compiler']['path'], 'sha256': proof['compiler']['sha256']}] + proof['transformed'] + proof['assets']
proof_bad = [r['path'] for r in proof_rows if not (ROOT / r['path']).is_file() or sha(ROOT / r['path']) != r['sha256']]
add('approved seven-assertion production proof and current 758-row source',
    proof['status'] == 'BUILD_CAPTURED_PENDING_PRIMARY_REVIEW' and proof['exitCode'] == 0 and
    len(lock['inputs']) == 752 and all(proof['assertions'].get(k) is True for k in assertion_names) and
    proof['sourceLockSha256'] == source_lock_sha and proof['compiler']['sha256'] == debug_sha == proof['compiler']['sha256After'] and
    len(proof['transformed']) == 2 and len(proof['assets']) == 3 and len(proof_rows) == 758 and not proof_bad and
    all(x['expected'] == x['actual'] for x in proof['inputAudit']),
    {'lockedInputs': len(lock['inputs']), 'integrityRows': len(proof_rows), 'mismatches': proof_bad[:20],
     'assertions': proof['assertions'], 'compilerSha256': debug_sha})
add('hash-bound primary authorization', auth['status'] == 'APPROVED_FOR_ONE_DESCRIPTIVE_PAIR' and
    auth['buildProofSha256'] == proof_sha and auth['sourceLockSha256'] == source_lock_sha and
    '758' in auth['primaryReview'] and 'One fixed' in auth['scope'],
    {'proofSha256': proof_sha, 'sourceLockSha256': source_lock_sha, 'authorizationSha256': auth_sha})

# One pair only: matching output, all retained behavior, disposal and 758 source/artifact rows before and after.
pair_path = PROOF / 'pair-one-shot.json'; pair_bytes = pair_path.read_bytes(); pair_sha = sha_bytes(pair_bytes)
pair = json.loads(pair_bytes)
arms = pair['arms']; by_arm = {a['arm']: a['result'] for a in arms}
pair_rows_bad = []
for field in ['sourceBefore', 'sourceAfter']:
    rows = pair[field]
    if len(rows) != 758 or any(not r['matches'] or r['expected'] != r['actual'] for r in rows):
        pair_rows_bad.append({'field': field, 'count': len(rows)})
    for row in rows:
        if not (ROOT / row['path']).is_file() or sha(ROOT / row['path']) != row['expected']:
            pair_rows_bad.append({'field': field, 'path': row['path']})
native = by_arm.get('native', {}); react = by_arm.get('react', {})
behavior = ['retainedHealthIdentity', 'retainedRowIdentity', 'noPrematureJointReveal', 'fallbackRetired',
    'laterStoreUpdated', 'laterHealthRevealed']
output_equal = native.get('definedOutput') == react.get('definedOutput') and native.get('outputSha256') == react.get('outputSha256')
try: digest_ok = sha_bytes(native['definedOutput'].encode()) == native['outputSha256']
except Exception: digest_ok = False
native_disposal = native.get('disposal', {}); native_store = native_disposal.get('store', {})
add('sole reviewed Native-first offline pair and 758-row integrity',
    pair['status'] == 'PASS_DESCRIPTIVE_COMPONENT_FORWARDING_PAIR_ONLY' and
    len(arms) == 2 and [a['arm'] for a in arms] == ['native', 'react'] and
    pair['buildProofSha256'] == proof_sha and pair['sourceLockSha256'] == source_lock_sha and
    len(pair['servedAssets']) == 4 and not pair['blockedRequests'] and not pair['requestFailures'] and
    not pair['pageErrors'] and not pair['consoleErrors'] and not pair['errors'] and not pair['stopReason'] and
    pair['browserOptions']['headless'] is True and pair['browserOptions']['gpu'] is False and
    pair['transport'] == 'offline-production-asset-replay; synthetic HTTPS .localhost requests are fulfilled only from source-locked local assets; no network, TLS connection, project server or Portless route' and
    output_equal and digest_ok and len(pair_rows_bad) == 0 and
    all(x.get('status') == 'PASS' and all(x.get(k) is True for k in behavior) and x.get('retainedRowState') == 1 and
        x.get('disposeDurationMs') is not None and x.get('mountDurationMs') is not None and
        x.get('timerResolutionMs') == 0.09999990463256836 and x.get('disposal', {}).get('remainingChildren') == 0 and
        x.get('disposal', {}).get('fallbackLife') == {'mounts': 1, 'cleanups': 1} for x in [native, react]) and
    native.get('forwardOwnerCountPreserved') is True and native_disposal.get('ownerCount') == 0 and
    native_disposal.get('pendingChangeCount') == 0 and all(native_store.get(k) == 0 for k in
        ['roots', 'listeners', 'readers', 'retainedActions', 'transitions']),
    {'status': pair['status'], 'integrityRowsPerSide': [len(pair['sourceBefore']), len(pair['sourceAfter'])],
     'pairSha256': pair_sha, 'outputSha256': native.get('outputSha256'), 'errors': pair['errors'],
     'timingsMs': {'native': native.get('settlementToMutationObserverMs'), 'react': react.get('settlementToMutationObserverMs'),
                   'mount': [native.get('mountDurationMs'), react.get('mountDurationMs')],
                   'dispose': [native.get('disposeDurationMs'), react.get('disposeDurationMs')]}})

# Results and current human-facing status must reflect exact artifacts and limits.
results = (VER / 'results.md').read_text()
required = [proof_sha, source_lock_sha, auth_sha, pair_sha, native['outputSha256'],
    '978 runtime tests', '63 Rust tests', '21 actual compiled fixtures', '33/33 steps',
    '3.4 ms Native / 277.7 ms React', 'not a general performance qualification',
    'The temporary 18,855-entry tracked-cache rollback copy was removed']
add('verification results bind exact proof and pair provenance', all(x in results for x in required),
    {'missing': [x for x in required if x not in results]})
for rel in ['implementation-checkpoint.md', 'final-master-plan.md', 'paper.md',
            'implementation/2026-10-18-first-pass/design.md', 'docs/native-authoring-reference.md']:
    body = (ROOT / rel).read_text()
    contains_pair = ('3.4' in body and '277.7' in body) if rel != 'docs/native-authoring-reference.md' else \
        ('978 runtime tests' in body and '21 compiled fixtures' in body)
    limited = any(text in body.lower() for text in ['not a general performance', 'does not qualify', 'no performance qualification', 'no general performance'])
    add(f'{rel} records result with stated limits', contains_pair and limited, {'pair': contains_pair, 'limit': limited})
add('current sources preserve historical design and review snapshot',
    all((ROOT / rel).read_bytes() == (PRE / 'source-before' / rel).read_bytes() for rel in
        ['implementation/2026-10-18-component-forwarding/design.md', 'implementation/2026-10-18-component-forwarding/source-review.md']))

# Notebook must append exactly one cell to the current HEAD basis and preserve root metadata.
old = json.loads(subprocess.check_output(['git', 'show', 'HEAD:research.ipynb'], cwd=ROOT))
new = load(ROOT / 'research.ipynb'); old_count = len(old['cells'])
add('notebook exact HEAD prefix with one append', old_count == 201 and len(new['cells']) == old_count + 1 and
    new['cells'][:old_count] == old['cells'] and all(new[k] == old[k] for k in
    ['metadata', 'nbformat', 'nbformat_minor']),
    {'headCells': old_count, 'currentCells': len(new['cells']), 'rootMetadataUnchanged':
     all(new[k] == old[k] for k in ['metadata', 'nbformat', 'nbformat_minor'])})

# Dynamic HEAD-tracked cache audit, including symlink target bytes and executable modes.
entries = subprocess.check_output(['git', 'ls-tree', '-r', '-z', 'HEAD', '--', '.cache'], cwd=ROOT).split(b'\0')
cache_bad = []; symlinks = 0; cache_count = 0
for entry in entries:
    if not entry: continue
    meta, rawpath = entry.split(b'\t', 1)
    mode, typ, oid = meta.decode().split(); rel = os.fsdecode(rawpath); path = ROOT / rel; cache_count += 1
    try:
        is_link = path.is_symlink(); symlinks += int(is_link)
        data = os.fsencode(os.readlink(path)) if is_link else path.read_bytes()
        blob = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        actual_mode = '120000' if is_link else ('100755' if path.stat().st_mode & 0o111 else '100644')
        if blob != oid or actual_mode != mode: cache_bad.append(rel)
    except Exception: cache_bad.append(rel)
add('all current HEAD tracked cache blobs, modes and symlinks', cache_count == 18855 and not cache_bad,
    {'trackedEntries': cache_count, 'symlinks': symlinks, 'bad': cache_bad[:20]})
pre_manifest_cache = load(PRE / 'tracked-cache-before.json')
add('temporary cache rollback duplicate removed after Git verification',
    not (PRE / 'tracked-cache-before').exists() and pre_manifest_cache['trackedEntryCount'] == 18855 and
    load(GATE / 'tracked-cache-restoration.json')['status'] == 'PASS' and
    load(GATE / 'tracked-cache-restoration.json')['restoredCount'] == 0,
    {'manifestEntries': pre_manifest_cache['trackedEntryCount'], 'removed': not (PRE / 'tracked-cache-before').exists()})

# Local links across all edited and new Markdown; include the explicit results/README documents.
changed_docs = set(subprocess.check_output(['git', 'diff', '--name-only', 'HEAD', '--', '*.md'], cwd=ROOT, text=True).splitlines())
untracked_docs = subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard', '--', '*.md'], cwd=ROOT, text=True).splitlines()
changed_docs.update(untracked_docs)
changed_docs.update(['implementation/2026-10-18-component-forwarding/verification/results.md',
    'implementation/2026-10-18-component-forwarding/benchmark/README.md'])
link_bad = []; link_count = 0
for rel in sorted(changed_docs):
    path = ROOT / rel
    if not path.is_file(): continue
    for target in re.findall(r'(?<!!)\[[^\]]*\]\(([^)]+)\)', path.read_text()):
        target = urllib.parse.unquote(target.strip().strip('<>'))
        if re.match(r'^[A-Za-z][A-Za-z0-9+.-]*:', target) or target.startswith('//'): continue
        dest = target.split('#', 1)[0].split('?', 1)[0]
        link_count += 1
        if dest and not (path.parent / dest).exists(): link_bad.append({'file': rel, 'target': target})
add('local links in modified/new Markdown including current results and protocol', not link_bad,
    {'documents': len(changed_docs), 'links': link_count, 'bad': link_bad[:30]})

diff = subprocess.run(['git', 'diff', '--check'], cwd=ROOT, capture_output=True, text=True)
add('git diff whitespace check', diff.returncode == 0 and not diff.stdout and not diff.stderr,
    {'exitCode': diff.returncode, 'stdout': diff.stdout, 'stderr': diff.stderr})

result = {'schemaVersion': 1, 'status': 'PASS' if all(x['status'] == 'PASS' for x in checks) else 'FAIL',
          'basis': gate['source']['declaredCommit'], 'checks': checks}
(OUT / 'receipt.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'status': result['status'], 'checkCount': len(checks),
                  'failed': [x for x in checks if x['status'] == 'FAIL']}, indent=2))
raise SystemExit(0 if result['status'] == 'PASS' else 1)
