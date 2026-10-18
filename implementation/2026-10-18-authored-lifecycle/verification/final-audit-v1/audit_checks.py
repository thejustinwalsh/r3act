import hashlib, json, math, os, pathlib, re, stat, subprocess, sys, urllib.parse

root = pathlib.Path.cwd()
base = pathlib.Path('implementation/2026-10-18-authored-lifecycle')
verification = base / 'verification'
audit_dir = verification / 'final-audit-v1'
expected_head = 'b5534eff25ef5f56b15f72badc1c4b187ee8e5f1'
checks = []
failures = []
details = {}

def sha(data): return hashlib.sha256(data).hexdigest()
def read_json(path): return json.loads(pathlib.Path(path).read_text())
def digest_file(path): return sha(pathlib.Path(path).read_bytes())
def add(name, passed, detail=None):
    entry = {'name': name, 'status': 'PASS' if passed else 'FAIL'}
    if detail is not None: entry['detail'] = detail
    checks.append(entry)
    if not passed: failures.append(name)
    return passed
def check(name, fn):
    try:
        result = fn()
        if isinstance(result, tuple): add(name, result[0], result[1])
        else: add(name, bool(result))
    except Exception as error:
        add(name, False, {'error': repr(error)})
def file_manifest(directory):
    directory = pathlib.Path(directory)
    result = {}
    for path in sorted(directory.rglob('*')):
        if path.is_file() and not path.is_symlink():
            data = path.read_bytes()
            result[path.relative_to(directory).as_posix()] = {'sha256': sha(data), 'bytes': len(data)}
    return result
def parse_md_tables(path):
    lines = pathlib.Path(path).read_text().splitlines()
    tables, current = [], []
    for line in lines:
        if line.lstrip().startswith('|'):
            cells = [cell.strip() for cell in line.strip().strip('|').split('|')]
            if cells and all(re.fullmatch(r':?-{3,}:?', c.replace(' ', '')) for c in cells):
                continue
            current.append(cells)
        elif current:
            tables.append(current); current = []
    if current: tables.append(current)
    return tables
def normalized(text):
    text = re.sub(r'[`*_]', '', text)
    return re.sub(r'\s+', ' ', text).strip().lower()
def fmt1(value): return f'{value:.1f}'

current_head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
add('declared Git basis', current_head == expected_head, {'expected': expected_head, 'actual': current_head})

# Verify both exact runner source archives and their before/after source receipt locks.
def verify_gate(version):
    run = verification / f'darwin-{version}'
    pre = verification / f'preflight-{version}'
    pre_manifest = read_json(pre / 'source-before-manifest.json')
    archived_inputs = {x['path']: x for x in pre_manifest['inputs']}
    source_bytes = 0
    for rel, item in archived_inputs.items():
        copy = pre / 'source-before' / rel
        data = copy.read_bytes()
        assert len(data) == item['bytes'] and sha(data) == item['sha256'], rel
        assert stat.S_IMODE(copy.stat().st_mode) == item['mode'], f'mode {rel}'
        source_bytes += len(data)
    assert len(archived_inputs) == 828
    receipt = read_json(run / 'receipt.json')
    assert receipt['status'] == 'PASS' and len(receipt['steps']) == 34
    assert all(s['status'] == 'PASS' and s.get('exitCode') == 0 for s in receipt['steps'])
    assert receipt['source']['inputCount'] == 828
    assert receipt['sourceAudit']['status'] == 'MATCH' and receipt['sourceAudit']['changed'] == []
    for filename in ('source-before.json', 'source-after.json'):
        source = read_json(run / filename)
        assert len(source['inputs']) == 828
        by_path = {x['path']: x for x in source['inputs']}
        assert set(by_path) == set(archived_inputs)
        for rel, item in archived_inputs.items():
            assert by_path[rel]['sha256'] == item['sha256'] and by_path[rel]['bytes'] == item['bytes'], (filename, rel)
    logs = list((run / 'logs').glob('*.log'))
    assert len(logs) == 34 and all(p.stat().st_size > 0 for p in logs)
    assert '978 passed | 0 failed' in (run / 'logs/deno-full.log').read_text()
    assert re.search(r'63 passed; 0 failed', (run / 'logs/cargo-test.log').read_text())
    assert sum(s['name'].startswith('compiled-') for s in receipt['steps']) == 22
    assert receipt['packageValidation']['status'] == 'PASS'
    assert receipt['packageValidation']['consumerStatus'] == 'PASS'
    package_counts, package_bytes, package_equal = {}, {}, True
    package_manifests = {}
    for phase in ('before', 'after'):
        meta = read_json(run / f'packaging-{phase}.json')
        assert meta['status'] == 'ARCHIVED' and len(meta['files']) == 488
        dest = run / f'packaging-{phase}'
        actual = file_manifest(dest)
        expected = {x['path']: {'sha256': x['sha256'], 'bytes': x['bytes']} for x in meta['files']}
        assert actual == expected
        package_counts[phase] = len(expected)
        package_bytes[phase] = sum(x['bytes'] for x in meta['files'])
        package_manifests[phase] = expected
    package_equal = package_manifests['before'] == package_manifests['after']
    fixture = read_json(run / 'fixture-artifacts.json')
    assert fixture['status'] == 'ARCHIVED' and len(fixture['files']) == 132
    fixture_bytes = 0
    for item in fixture['files']:
        archived = run / 'fixture-artifacts' / item['path']
        data = archived.read_bytes()
        assert len(data) == item['bytes'] and sha(data) == item['sha256'], item['path']
        fixture_bytes += len(data)
    restoration = read_json(run / 'tracked-cache-restoration.json')
    assert restoration['status'] == 'PASS' and restoration['trackedEntryCount'] == 18983 and restoration['restoredCount'] == 0
    package = receipt['packageValidation']
    assert len(package['tarballs']) == 5 and package['compiler']['target'] == 'aarch64-apple-darwin'
    assert package['compiler']['sha256'] == 'a8241eeaadbefa7b2ec7d34a13a74788775d96ee7554e94d403e7b6cff1288e7'
    return {'sourceInputs': len(archived_inputs), 'sourceArchiveBytes': source_bytes,
            'sourceBeforeAfterMatch': True, 'steps': len(receipt['steps']), 'logs': len(logs),
            'packageFiles': package_counts, 'packageArchiveBytes': package_bytes,
            'packageBeforeAfterIdentical': package_equal, 'fixtureFiles': len(fixture['files']),
            'fixtureArchiveBytes': fixture_bytes, 'trackedCacheEntries': restoration['trackedEntryCount'],
            'trackedCacheRestored': restoration['restoredCount'], 'debugCompilerSha256': receipt['debugCompiler']['sha256AfterBuild'],
            'releaseCompilerSha256': package['compiler']['sha256'],
            'sourceHashes': {'before': len(read_json(run / 'source-before.json')['inputs']), 'after': len(read_json(run / 'source-after.json')['inputs'])}}

gate_summaries = {}
for version in ('v1', 'v2'):
    try:
        gate_summaries[version] = verify_gate(version)
        add(f'{version} gate, source snapshots, logs, package and fixture archives', True, gate_summaries[version])
    except Exception as error:
        gate_summaries[version] = {'error': repr(error)}
        add(f'{version} gate, source snapshots, logs, package and fixture archives', False, {'error': repr(error)})

# Verify the gate's HEAD-derived cache manifests and actual current tracked-cache tree.
def verify_cache():
    raw = subprocess.check_output(['git', 'ls-tree', '-r', '-z', 'HEAD', '--', '.cache'])
    tree = {}
    records = [record for record in raw.split(b'\0') if record]
    for record in records:
        meta, rawpath = record.split(b'\t', 1)
        mode, kind, oid = meta.decode().split()
        tree[os.fsdecode(rawpath)] = {'mode': mode, 'type': kind, 'blob': oid}
    assert len(tree) == 18983
    mismatches = []
    bytes_read = 0
    for rel, expected in tree.items():
        path = root / rel
        mode = expected['mode']
        if mode == '120000':
            if not path.is_symlink():
                mismatches.append(rel); continue
            target = os.readlink(path); data = os.fsencode(target)
        else:
            if not path.is_file() or path.is_symlink():
                mismatches.append(rel); continue
            if stat.S_IMODE(path.stat().st_mode) != int(mode[-3:], 8):
                mismatches.append(rel); continue
            data = path.read_bytes()
        bytes_read += len(data)
        blob = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        if blob != expected['blob']:
            mismatches.append(rel)
    for version in ('v1', 'v2'):
        manifest = read_json(verification / f'preflight-{version}/tracked-cache-before.json')
        assert manifest['head'] == expected_head and len(manifest['entries']) == len(tree)
        by_path = {x['path']: x for x in manifest['entries']}
        assert set(by_path) == set(tree)
        for rel, item in tree.items():
            assert by_path[rel]['mode'] == item['mode'] and by_path[rel]['blob'] == item['blob'], (version, rel)
    return {'trackedEntries': len(tree), 'bytesHashed': bytes_read, 'mismatches': mismatches,
            'v1v2ManifestTreeMatch': True}
check('current tracked .cache files/modes/symlinks match HEAD and both preflight manifests', verify_cache)

# Source current at v2 equals its exact pre-execution archive; preserve the intentionally frozen design/review text.
def verify_current_v2_source():
    manifest = read_json(verification / 'preflight-v2/source-before-manifest.json')
    mismatches = []
    for item in manifest['inputs']:
        current = root / item['path']
        if not current.is_file() or current.is_symlink():
            mismatches.append(item['path']); continue
        data = current.read_bytes()
        if len(data) != item['bytes'] or sha(data) != item['sha256'] or stat.S_IMODE(current.stat().st_mode) != item['mode']:
            mismatches.append(item['path'])
    assert len(manifest['inputs']) == 828 and not mismatches
    return {'currentInputs': len(manifest['inputs']), 'mismatches': mismatches,
            'designAndSourceReviewFrozen': True}
check('current selected source matches v2 archive exactly', verify_current_v2_source)

# Proof provenance: v1 rejection is bound to archived v1 bytes, and has no execution authorization or browser receipts.
def verify_proofs():
    p1 = base / 'workload/proof-v1'
    pre1 = read_json(verification / 'preflight-v1/source-before-manifest.json')
    old_manifest = {x['path']: x for x in pre1['inputs']}
    lock1 = read_json(p1 / 'source-lock.json')
    assert len(lock1['inputs']) == 754
    for item in lock1['inputs']:
        assert item['path'] in old_manifest and item['sha256'] == old_manifest[item['path']]['sha256'], item['path']
        archived = verification / 'preflight-v1/source-before' / item['path']
        assert digest_file(archived) == item['sha256'], item['path']
    proof1_bytes = (p1 / 'build-proof.json').read_bytes()
    reject = read_json(p1 / 'primary-rejection.json')
    assert reject['status'] == 'REJECTED_BY_PRIMARY_FOR_MISSING_HOT_ROW_MEMO_PROVENANCE'
    assert reject['buildProofSha256'] == sha(proof1_bytes)
    assert not any((p1 / name).exists() for name in ('timing-authorization.json', 'heap-authorization.json', 'timing-pair-one-shot.json', 'heap-pair-one-shot.json'))
    assert 'ReactRow' in reject['observation'] and 'no timing' in reject['decision'].lower()
    assert lock1['compiler']['sha256'] == gate_summaries['v1']['debugCompilerSha256']
    p2 = base / 'workload/proof-v2'
    proof2_bytes = (p2 / 'build-proof.json').read_bytes()
    proof2 = read_json(p2 / 'build-proof.json')
    lock2_bytes = (p2 / 'source-lock.json').read_bytes()
    lock2 = json.loads(lock2_bytes)
    assert len(proof2['assertions']) == 9 and all(proof2['assertions'].values())
    assert proof2['provenance']['reactRowMemoSlots'] == [13]
    transformed = p2 / 'transforms/react_arm.tsx.js'
    code = transformed.read_text()
    match = re.search(r'function\s+ReactRow\s*\([^)]*\)\s*\{', code)
    assert match and re.search(r'\b_c\(13\)', code[match.start():match.start()+400])
    assert proof2['compiler']['sha256'] == proof2['compiler']['afterSha256'] == gate_summaries['v2']['debugCompilerSha256']
    assert proof2['sourceLockSha256'] == sha(lock2_bytes)
    assert len(lock2['inputs']) == 754
    pre2 = {x['path']: x for x in read_json(verification / 'preflight-v2/source-before-manifest.json')['inputs']}
    mismatches = []
    for item in lock2['inputs']:
        archived = verification / 'preflight-v2/source-before' / item['path']
        if item['path'] not in pre2 or item['sha256'] != pre2[item['path']]['sha256'] or digest_file(archived) != item['sha256']:
            mismatches.append(item['path'])
    assert not mismatches
    for item in [proof2['compiler'], *proof2['transformed'], *proof2['assets']]:
        assert digest_file(root / item['path']) == item['sha256'], item['path']
    auth_t = read_json(p2 / 'timing-authorization.json')
    auth_h = read_json(p2 / 'heap-authorization.json')
    timing_bytes = (p2 / 'timing-pair-one-shot.json').read_bytes()
    heap_bytes = (p2 / 'heap-pair-one-shot.json').read_bytes()
    timing = json.loads(timing_bytes); heap = json.loads(heap_bytes)
    assert auth_t['buildProofSha256'] == auth_h['buildProofSha256'] == sha(proof2_bytes)
    assert auth_t['sourceLockSha256'] == auth_h['sourceLockSha256'] == sha(lock2_bytes)
    assert auth_h['timingPairSha256'] == sha(timing_bytes)
    assert timing['authorizationSha256'] == sha((p2 / 'timing-authorization.json').read_bytes())
    assert heap['authorizationSha256'] == sha((p2 / 'heap-authorization.json').read_bytes())
    assert timing['status'] == 'PASS_DESCRIPTIVE_TIMING_PAIR' and heap['status'] == 'PASS_DESCRIPTIVE_HEAP_PAIR'
    return {'v1RejectedProofSha256': sha(proof1_bytes), 'v1RejectionBindsProof': True,
            'v1SourceInputsVerifiedAgainstPreflightArchive': len(lock1['inputs']), 'v1NoBrowserAuthorizationOrReceipts': True,
            'v2Assertions': proof2['assertions'], 'v2ReactRowMemoSlots': proof2['provenance']['reactRowMemoSlots'],
            'v2LockInputs': len(lock2['inputs']), 'v2ProofSha256': sha(proof2_bytes),
            'timingReceiptSha256': sha(timing_bytes), 'heapReceiptSha256': sha(heap_bytes),
            'authorizationLinksValid': True}
check('rejected v1 and current v2 proof/authorization provenance', verify_proofs)

def row_expectations():
    order = list(range(2, 256)) + [256, 0]
    result = []
    for ident in order:
        local = 1 if ident == 0 else 0
        result.append({'id': ident, 'step': '60', 'local': str(local),
                       'transform': f'translateX({(60 + ident) % 128}px)',
                       'opacity': str(((60 + ident) % 10 + 1) / 10),
                       'text': f'{ident}:60:{local}'})
    return result
def check_final_arm(arm):
    scene = arm['finalScene']; d = scene['diagnostics']
    assert scene['rows'] == row_expectations() and scene['row0Retained'] is True
    assert scene['detail'] == {'fallback': 0, 'ready': 1, 'text': 'detail ready'}
    assert scene['health'] == {'fallback': 0, 'ready': 1, 'text': 'health ready'}
    assert d['rowSetups'] == 257 and d['rowCleanups'] == 1
    assert d['detailFallbackSetups'] == d['detailFallbackCleanups'] == 1
    assert d['healthFallbackSetups'] == d['healthFallbackCleanups'] == 1
    post = arm['postDispose']; pd = post['diagnostics']
    assert post['rows'] == [] and post['remainingChildren'] == 0
    assert pd['rowSetups'] == pd['rowCleanups'] == 257
    assert pd['detailFallbackSetups'] == pd['detailFallbackCleanups'] == 1
    assert pd['healthFallbackSetups'] == pd['healthFallbackCleanups'] == 1
    assert pd['storeListeners'] == 0 and pd['disposed'] is True
    if arm['arm'] == 'native':
        assert pd['storeReaders'] == pd['ownerCount'] == pd['pendingChangeCount'] == 0

def verify_pair_receipts():
    p = base / 'workload/proof-v2'
    timing = read_json(p / 'timing-pair-one-shot.json')
    heap = read_json(p / 'heap-pair-one-shot.json')
    for receipt in (timing, heap):
        assert len(receipt['sourceBefore']) == len(receipt['sourceAfter']) == 760
        assert all(x['matches'] for x in receipt['sourceBefore'] + receipt['sourceAfter'])
        assert not receipt['errors'] and not receipt['cleanupErrors'] and receipt['stopReason'] is None
        assert not receipt['blockedRequests'] and not receipt['requestFailures'] and not receipt['pageErrors'] and not receipt['consoleErrors']
        assert len(receipt['arms']) == 2 and [a['arm'] for a in receipt['arms']] == ['native', 'react']
        for arm in receipt['arms']: check_final_arm(arm)
        assert receipt['arms'][0]['finalScene']['rows'] == receipt['arms'][1]['finalScene']['rows']
        assert receipt['arms'][0]['finalScene']['detail'] == receipt['arms'][1]['finalScene']['detail']
        assert receipt['arms'][0]['finalScene']['health'] == receipt['arms'][1]['finalScene']['health']
    update_checks = []
    for arm in timing['arms']:
        samples = arm['updateMs']; assert len(samples) == 60
        expected = {'firstMs': samples[0], 'medianMs': sorted(samples)[29], 'p95Ms': sorted(samples)[56], 'sumMs': sum(samples)}
        subtotal = arm['mountDurationMs'] + sum(samples) + arm['editDurationMs'] + arm['disposeDurationMs']
        expected['measuredLifecycleSubtotalMs'] = subtotal
        actual = arm['stats']
        assert all(math.isclose(actual[key], value, rel_tol=1e-9, abs_tol=1e-7) for key, value in expected.items())
        assert timing['comparison']['native' if arm['arm'] == 'native' else 'react'] == actual
        update_checks.append({'arm': arm['arm'], 'intervalCount': len(samples), 'stats': actual,
                              'mountMs': arm['mountDurationMs'], 'editMs': arm['editDurationMs'], 'disposeMs': arm['disposeDurationMs'],
                              'timerQuantumMs': arm['timerQuantumMs']})
    heap_phase_checks = []
    expected_phases = ['baseline', 'mounted', 'updatedEditedRevealed', 'disposedControllerRetained', 'releasedController']
    for arm in heap['arms']:
        observations = arm['observations']
        assert list(observations) == expected_phases
        assert 'stats' not in arm and 'updateMs' not in arm and heap['timingMeaning'] is None
        baseline = observations['baseline']
        expected_delta = {}
        for phase, data in observations.items():
            heap_data, dom = data['heap'], data['dom']
            assert set(heap_data) == {'usedSize', 'totalSize', 'embedderHeapUsedSize', 'backingStorageSize'}
            assert set(dom) == {'documents', 'nodes', 'jsEventListeners'}
            expected_delta[phase] = {'usedSize': heap_data['usedSize'] - baseline['heap']['usedSize'],
                                     'totalSize': heap_data['totalSize'] - baseline['heap']['totalSize'],
                                     'documents': dom['documents'] - baseline['dom']['documents'],
                                     'nodes': dom['nodes'] - baseline['dom']['nodes'],
                                     'jsEventListeners': dom['jsEventListeners'] - baseline['dom']['jsEventListeners']}
        assert arm['signedDeltasFromBaseline'] == expected_delta
        heap_phase_checks.append({'arm': arm['arm'], 'phases': observations, 'signedDeltasFromBaseline': expected_delta})
    return {'timing': update_checks, 'heap': heap_phase_checks,
            'sourceMatches': {'timingBeforeAfter': 760, 'heapBeforeAfter': 760},
            'allOutputAndLifecycleChecks': True, 'timingErrors': 0, 'heapErrors': 0}
check('timing and heap receipts, all row/output/lifetime assertions, hashes and arithmetic', verify_pair_receipts)

# Validate package cache after the gate against actual current cache and current compiler files.
def verify_current_package():
    receipt = read_json(verification / 'darwin-v2/receipt.json')
    meta = read_json(verification / 'darwin-v2/packaging-after.json')
    expected = {x['path']: {'sha256': x['sha256'], 'bytes': x['bytes']} for x in meta['files']}
    current = file_manifest('.cache/r3act-package-build')
    assert expected == current and len(current) == 488
    report = json.loads((root / '.cache/r3act-package-build/report.json').read_text())
    binary = report['compilerBinary']
    release = root / '.cache/r3act-package-build/vite' / binary['path']
    debug = root / receipt['debugCompiler']['path']
    assert digest_file(debug) == receipt['debugCompiler']['sha256AfterBuild']
    assert digest_file(release) == binary['sha256'] == receipt['packageValidation']['compiler']['sha256']
    return {'currentPackageFiles': len(current), 'currentDebugCompilerSha256': digest_file(debug),
            'currentReleaseCompilerSha256': digest_file(release), 'releaseCompilerBytes': release.stat().st_size}
check('current package cache and debug/release compiler hashes match gate archives', verify_current_package)

# Archive one failed launch separately from gate results and verify preserved raw files/artifacts.
def verify_preflight_failure():
    data = read_json(verification / 'preflight-v1/runner-launch-failure.json')
    receipt = read_json(verification / 'darwin-v1/receipt.json')
    assert data['exitCode'] == 1 and data['gateStepsStarted'] is False
    assert 'EEXIST' in data['stderr'] and receipt['status'] == 'PASS' and len(receipt['steps']) == 34
    return {'launchExit': data['exitCode'], 'gateStepsStarted': data['gateStepsStarted'], 'actualGateStatus': receipt['status'], 'actualGateSteps': len(receipt['steps'])}
check('preflight output-directory failure is preserved separately and had no steps', verify_preflight_failure)

# Notebook must be one append over exact HEAD cells and root metadata.
def verify_notebook():
    current = json.loads((root / 'research.ipynb').read_text())
    head = json.loads(subprocess.check_output(['git', 'show', 'HEAD:research.ipynb']))
    assert len(head['cells']) == 202 and len(current['cells']) == 203
    assert current['cells'][:202] == head['cells'] and current['metadata'] == head['metadata']
    assert current['nbformat'] == head['nbformat'] and current['nbformat_minor'] == head['nbformat_minor']
    last = current['cells'][202]
    assert last['cell_type'] == 'markdown' and last.get('execution_count') is None and last.get('outputs', []) == []
    source = ''.join(last['source'])
    for value in ('34/34 steps', '978 runtime tests', '2.6/3.9 ms Native', '0.5/0.8 ms React', '183.3/43.3 ms', '1,459,444/933,636'):
        assert value in source, value
    return {'headCells': len(head['cells']), 'currentCells': len(current['cells']), 'appendOnly': True,
            'rootMetadataUnchanged': True, 'appendCellType': last['cell_type'], 'appendCellHasOutputs': False}
check('research notebook is exactly HEAD 202 cells plus one append with unchanged root metadata', verify_notebook)

# Markdown tables are read semantically after whitespace/format normalization, not by whole-line phrase matching.
def table_with_headers(path, needed):
    wanted = [normalized(x) for x in needed]
    for table in parse_md_tables(path):
        if table and all(any(w == normalized(h) for h in table[0]) for w in wanted):
            return table
    raise AssertionError(f'no table with normalized headers {wanted} in {path}')
def cell_num(text): return float(re.sub(r'[^0-9.+-]', '', text))
def verify_result_docs():
    main = base / 'results.md'; verify = verification / 'results.md'
    timing = read_json(base / 'workload/proof-v2/timing-pair-one-shot.json')
    heap = read_json(base / 'workload/proof-v2/heap-pair-one-shot.json')
    expected_arm = {a['arm']: [a['stats']['firstMs'], a['stats']['medianMs'], a['stats']['p95Ms'], a['stats']['sumMs'], a['mountDurationMs'], a['editDurationMs'], a['disposeDurationMs'], a['stats']['measuredLifecycleSubtotalMs']] for a in timing['arms']}
    timing_headers = ['Arm', 'First update', 'Median update', 'p95 update', '60-update sum', 'Mount', 'Keyed edit', 'Disposal', 'Measured subtotal']
    for doc in (main, verify):
        table = table_with_headers(doc, timing_headers)
        rows = {normalized(row[0]): row for row in table[1:] if row and normalized(row[0]) in ('native', 'react')}
        assert set(rows) == {'native', 'react'}
        for arm, vals in expected_arm.items():
            actual = [cell_num(x) for x in rows[arm.lower()][1:9]]
            assert all(math.isclose(a, round(e, 1), abs_tol=1e-9) for a, e in zip(actual, vals)), (doc, arm, actual, vals)
    heap_headers = ['Forced-GC phase', 'Native used-heap delta B', 'React used-heap delta B']
    table = table_with_headers(main, heap_headers)
    rows = {normalized(row[0]): row for row in table[1:] if row}
    for phase in ('mounted', 'updatedEditedRevealed', 'disposedControllerRetained', 'releasedController'):
        row = rows[normalized(phase)]
        for index, arm in ((1, 'native'), (2, 'react')):
            expected_delta = heap['arms'][0 if arm == 'native' else 1]['signedDeltasFromBaseline'][phase]['usedSize']
            assert int(re.sub(r'[^0-9+-]', '', row[index])) == expected_delta
    # Verify exact proof and receipt hashes where the source/results document claims provenance.
    proof_sha, timing_sha, heap_sha = digest_file(base / 'workload/proof-v2/build-proof.json'), digest_file(base / 'workload/proof-v2/timing-pair-one-shot.json'), digest_file(base / 'workload/proof-v2/heap-pair-one-shot.json')
    compiler = read_json(base / 'workload/proof-v2/build-proof.json')['compiler']['sha256']
    package = read_json(verification / 'darwin-v2/receipt.json')['packageValidation']['compiler']['sha256']
    text = normalized(main.read_text())
    for digest in (proof_sha, timing_sha, heap_sha, compiler, package): assert digest in text, digest
    # Every local Markdown link in the current lifecycle results and the cost reference must resolve.
    checked_files = [main, verify, base / 'design.md', base / 'source-review.md', base / 'workload/README.md', root / 'docs/authored-lifecycle-costs.md', root / 'implementation-checkpoint.md', root / 'final-master-plan.md', root / 'implementation/2026-10-18-first-pass/design.md', root / 'paper.md']
    broken = []
    for source in checked_files:
        for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)', source.read_text()):
            target = target.strip().split()[0].strip('<>')
            if not target or re.match(r'^(?:https?:|mailto:|data:)', target, re.I): continue
            pathpart = urllib.parse.unquote(target.split('#', 1)[0])
            if not pathpart: continue
            dest = (source.parent / pathpart).resolve()
            if not dest.exists(): broken.append({'source': source.as_posix(), 'target': target})
    assert not broken, broken
    return {'timingTablesMatchedReceipt': True, 'heapDeltaTableMatchedReceipt': True,
            'proofTimingHeapCompilerPackageHashesMatched': True, 'localMarkdownLinksChecked': len(checked_files), 'brokenLinks': broken}
check('results and cost docs semantically match receipts and current local links resolve', verify_result_docs)

# Preserve the early EEXIST, raw receipts, generated artifacts and code/docs whitespace without repairing them.
def verify_captures_and_whitespace():
    raw_paths = [verification / f'darwin-{v}' / 'receipt.json' for v in ('v1', 'v2')]
    raw_paths += [base / 'workload/proof-v1/primary-rejection.json', base / 'workload/proof-v2/build-proof.json', base / 'workload/proof-v2/timing-pair-one-shot.json', base / 'workload/proof-v2/heap-pair-one-shot.json']
    raw_paths += [verification / f'benchmark-{name}-v1' / filename for name in ('build', 'timing', 'heap') for filename in ('command.json', 'stdout.log', 'stderr.log')]
    raw_paths += [verification / 'preflight-v1/runner-launch-failure.json']
    assert all(p.is_file() for p in raw_paths)
    diff = subprocess.run(['git', 'diff', '--check', 'HEAD', '--'], cwd=root, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    assert diff.returncode == 0 and not diff.stdout and not diff.stderr, {'stdout': diff.stdout, 'stderr': diff.stderr}
    textfiles = [base / 'results.md', verification / 'results.md', root / 'docs/authored-lifecycle-costs.md', base / 'design.md', base / 'source-review.md']
    trailing = []
    for path in textfiles:
        for number, line in enumerate(path.read_text().splitlines(), 1):
            if line.rstrip(' \t') != line: trailing.append({'path': path.as_posix(), 'line': number})
    assert not trailing, trailing
    return {'rawCaptureFilesPresent': len(raw_paths), 'trackedDiffCheck': 'PASS', 'newDocumentTrailingWhitespace': trailing}
check('raw captures preserved and authored diffs/docs pass whitespace checks', verify_captures_and_whitespace)

report = {'schemaVersion': 'authored-lifecycle-final-audit-v1', 'status': 'PASS' if not failures else 'FAIL',
          'head': current_head, 'checks': checks, 'gateSummaries': gate_summaries, 'failedChecks': failures}
(audit_dir / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
sys.exit(0 if not failures else 1)
