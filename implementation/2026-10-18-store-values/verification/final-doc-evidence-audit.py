#!/usr/bin/env python3
import hashlib
import json
import os
import re
import stat
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import unquote

ROOT = Path('/Volumes/Depot/Developer/r3act')
VERIFY = ROOT / 'implementation/2026-10-18-store-values/verification'
RESULTS = ROOT / 'implementation/2026-10-18-store-values/results.md'
PAIR_PATH = ROOT / 'implementation/2026-10-18-store-values/benchmark/proof-v1/pair-one-shot.json'


def run_git(*args, input_bytes=None):
    return subprocess.run(['git', *args], cwd=ROOT, input=input_bytes, capture_output=True)


def read_json(path):
    return json.loads(Path(path).read_text())


def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def file_fingerprint(relative):
    path = ROOT / relative
    try:
        data = path.read_bytes()
        return {'path': relative, 'exists': True, 'bytes': len(data), 'sha256': sha256_bytes(data)}
    except Exception as error:
        return {'path': relative, 'exists': False, 'error': repr(error)}


def verify_entries(entries, path_root):
    mismatches = []
    checked = 0
    for entry in entries:
        checked += 1
        path = path_root / entry['path']
        try:
            data = path.read_bytes()
            details = {'actualSha256': sha256_bytes(data), 'actualBytes': len(data)}
            if details['actualSha256'] != entry['sha256'] or details['actualBytes'] != entry['bytes']:
                mismatches.append({'path': entry['path'], 'expectedSha256': entry['sha256'],
                                   'expectedBytes': entry['bytes'], **details})
        except Exception as error:
            mismatches.append({'path': entry['path'], 'error': repr(error)})
    return {'checked': checked, 'mismatchCount': len(mismatches), 'mismatches': mismatches}


def verify_archive(version, label, metadata_file, archive_dir):
    base = VERIFY / f'darwin-v{version}'
    metadata_path = base / metadata_file
    archive_root = base / archive_dir
    if not metadata_path.exists():
        return {'version': version, 'archive': label, 'status': 'MISSING_METADATA'}
    metadata = read_json(metadata_path)
    check = verify_entries(metadata.get('files', []), archive_root)
    return {'version': version, 'archive': label, 'status': metadata.get('status'),
            'metadataPath': str(metadata_path.relative_to(ROOT)), 'archivePath': str(archive_root.relative_to(ROOT)),
            **check}


def parse_inline_target(raw):
    target = raw.strip()
    if target.startswith('<') and '>' in target:
        target = target[1:target.index('>')]
    else:
        target = target.split()[0] if target else ''
    return target


def local_markdown_links(doc_paths):
    found = []
    misses = []
    link_pattern = re.compile(r'\]\(\s*(<[^>]+>|[^)]+)\)')
    definition_pattern = re.compile(r'^\s*\[[^\]]+\]:\s*(<[^>]+>|\S+)', re.MULTILINE)
    for relative in sorted(set(doc_paths)):
        path = ROOT / relative
        try:
            text = path.read_text()
        except Exception as error:
            misses.append({'document': relative, 'error': repr(error)})
            continue
        targets = [match.group(1) for match in link_pattern.finditer(text)]
        targets.extend(match.group(1) for match in definition_pattern.finditer(text))
        for raw in targets:
            target = parse_inline_target(raw)
            if not target or target.startswith('#') or target.startswith('//') or re.match(r'^[A-Za-z][A-Za-z0-9+.-]*:', target):
                continue
            local = unquote(target.split('#', 1)[0].split('?', 1)[0])
            resolved = (path.parent / local).resolve() if local else path.parent.resolve()
            record = {'document': relative, 'target': target, 'resolved': str(resolved)}
            found.append(record)
            if not resolved.exists():
                misses.append(record)
    return {'checkedDocuments': sorted(set(doc_paths)), 'linkCount': len(found),
            'missingCount': len(misses), 'missing': misses}


def tracked_cache_audit():
    tree_result = run_git('ls-tree', '-r', '-z', 'HEAD', '--', '.cache')
    tree = tree_result.stdout.split(b'\0')
    entries = []
    for record in tree:
        if not record:
            continue
        header, path_bytes = record.split(b'\t', 1)
        mode, kind, oid = header.decode().split()
        entries.append({'mode': mode, 'kind': kind, 'oid': oid,
                        'path': os.fsdecode(path_bytes)})
    links = [entry for entry in entries if entry['mode'] == '120000']
    objects = run_git('cat-file', '--batch', input_bytes=(''.join(e['oid'] + '\n' for e in links)).encode())
    object_data = {}
    raw = objects.stdout
    offset = 0
    while offset < len(raw):
        end = raw.index(b'\n', offset)
        header = raw[offset:end].decode().split()
        offset = end + 1
        size = int(header[2])
        data = raw[offset:offset + size]
        offset += size
        if offset < len(raw) and raw[offset:offset + 1] == b'\n':
            offset += 1
        object_data[header[0]] = data
    link_records = []
    for entry in links:
        path = ROOT / entry['path']
        expected_target = object_data[entry['oid']]
        try:
            details = path.lstat()
            is_link = stat.S_ISLNK(details.st_mode)
            actual_target = os.fsencode(os.readlink(path)) if is_link else None
            matches = (is_link and actual_target == expected_target)
            record = {'path': entry['path'], 'headGitMode': entry['mode'],
                      'currentLstatMode': oct(details.st_mode), 'isSymlink': is_link,
                      'headTarget': os.fsdecode(expected_target),
                      'currentTarget': os.fsdecode(actual_target) if actual_target is not None else None,
                      'matchesHead': matches}
        except Exception as error:
            record = {'path': entry['path'], 'headGitMode': entry['mode'],
                      'headTarget': os.fsdecode(expected_target), 'error': repr(error), 'matchesHead': False}
        link_records.append(record)
    diff = run_git('diff', '--quiet', 'HEAD', '--', '.cache')
    raw_diff = run_git('diff', '--raw', 'HEAD', '--', '.cache').stdout.decode(errors='replace')
    return {'headTrackedEntryCount': len(entries), 'headRegularFileCount': sum(e['mode'] in ('100644', '100755') for e in entries),
            'headSymlinkCount': len(links), 'symlinkMatchCount': sum(e['matchesHead'] for e in link_records),
            'symlinkMismatchCount': sum(not e['matchesHead'] for e in link_records),
            'symlinks': link_records, 'trackedWorktreeDiffExitCode': diff.returncode,
            'trackedWorktreeDiffRaw': raw_diff}


def process_snapshot():
    saved = VERIFY / 'preflight-v4/process-cleanup-check.json'
    if saved.exists():
        return {'sourcePath': str(saved.relative_to(ROOT)), **read_json(saved)}
    try:
        result = subprocess.run(['ps', '-axo', 'pid=,ppid=,command='], capture_output=True, text=True)
    except PermissionError as error:
        return {'available': False, 'error': repr(error), 'matchingProcesses': []}
    if result.returncode:
        return {'available': False, 'exitCode': result.returncode,
                'stderr': result.stderr.strip(), 'matchingProcesses': []}
    keywords = ('run-pair.mjs', 'store-values-proof.localhost', 'benchmark/proof-v1',
                'chrome-headless-shell', 'chromium')
    lines = [line.strip() for line in result.stdout.splitlines()
             if any(keyword in line.lower() for keyword in keywords)]
    return {'available': True, 'exitCode': 0, 'matchingProcesses': lines}


started = time.time()
docs = {
    'final-master-plan.md', 'implementation-checkpoint.md', 'paper.md',
    'implementation/2026-10-18-first-pass/design.md',
    'implementation/2026-10-18-store-values/design.md',
    'implementation/2026-10-18-store-values/source-review.md',
    'implementation/2026-10-18-store-values/results.md',
    'implementation/2026-10-18-store-values/benchmark/README.md',
}
changed = run_git('diff', '--name-only', 'HEAD').stdout.decode().splitlines()
docs.update(path for path in changed if path.lower().endswith('.md'))
subject_paths = sorted(docs | {
    'research.ipynb',
    'implementation/2026-10-18-store-values/verification/darwin-v1/receipt.json',
    'implementation/2026-10-18-store-values/verification/darwin-v2/receipt.json',
    'implementation/2026-10-18-store-values/verification/darwin-v3/receipt.json',
    'implementation/2026-10-18-store-values/verification/darwin-v4/receipt.json',
    'implementation/2026-10-18-store-values/verification/darwin-v4/source-before.json',
    'implementation/2026-10-18-store-values/verification/darwin-v4/source-after.json',
    'implementation/2026-10-18-store-values/benchmark/proof-v1/build-proof.json',
    'implementation/2026-10-18-store-values/benchmark/proof-v1/source-lock.json',
    'implementation/2026-10-18-store-values/benchmark/proof-v1/pair-one-shot.json',
    'implementation/2026-10-18-store-values/benchmark/proof-v1/run-authorization.json',
    'implementation/2026-10-18-store-values/benchmark/run-pair.mjs',
    'implementation/2026-10-18-store-values/verification/preflight-v4/process-cleanup-check.json',
})
input_fingerprints_before = [file_fingerprint(path) for path in subject_paths]

base_notebook = json.loads(run_git('show', 'HEAD:research.ipynb').stdout)
current_notebook = read_json(ROOT / 'research.ipynb')
base_cells = base_notebook.get('cells', [])
current_cells = current_notebook.get('cells', [])
notebook_audit = {
    'headCellCount': len(base_cells), 'currentCellCount': len(current_cells),
    'priorCellsExactIncludingMetadataAndOutputs': current_cells[:len(base_cells)] == base_cells,
    'rootMetadataExact': current_notebook.get('metadata') == base_notebook.get('metadata'),
    'notebookFormatExact': all(current_notebook.get(key) == base_notebook.get(key)
                               for key in ('nbformat', 'nbformat_minor')),
    'newCells': current_cells[len(base_cells):],
}

links_audit = local_markdown_links(docs)

v4_dir = VERIFY / 'darwin-v4'
v4_before = read_json(v4_dir / 'source-before.json').get('inputs', [])
v4_after = read_json(v4_dir / 'source-after.json').get('inputs', [])
v4_before_map = {entry['path']: (entry['sha256'], entry['bytes']) for entry in v4_before}
v4_after_map = {entry['path']: (entry['sha256'], entry['bytes']) for entry in v4_after}
v4_actual_before = verify_entries(v4_before, ROOT)
v4_actual_after = verify_entries(v4_after, ROOT)
v4_inputs_audit = {'beforeCount': len(v4_before), 'afterCount': len(v4_after),
                   'samePathSetAndHashes': v4_before_map == v4_after_map,
                   'beforeActual': v4_actual_before, 'afterActual': v4_actual_after}

pair = read_json(PAIR_PATH)
pair_hash = sha256_bytes(PAIR_PATH.read_bytes())
pair_hash_audit = {}
for label in ('sourceBefore', 'sourceAfter'):
    entries = pair.get(label, [])
    disk_mismatches = []
    recorded_mismatches = []
    for entry in entries:
        path = ROOT / entry['path']
        try:
            actual = sha256_bytes(path.read_bytes())
            if actual != entry.get('actual'):
                disk_mismatches.append({'path': entry['path'], 'recordedActual': entry.get('actual'), 'currentActual': actual})
        except Exception as error:
            disk_mismatches.append({'path': entry['path'], 'error': repr(error)})
        if entry.get('matches') is not True or entry.get('expected') != entry.get('actual'):
            recorded_mismatches.append({'path': entry['path'], 'expected': entry.get('expected'),
                                        'actual': entry.get('actual'), 'matches': entry.get('matches')})
    pair_hash_audit[label] = {'count': len(entries), 'recordedMismatchCount': len(recorded_mismatches),
                              'recordedMismatches': recorded_mismatches,
                              'currentDiskMismatchCount': len(disk_mismatches), 'currentDiskMismatches': disk_mismatches}

fixture_hash_audit = []
for step in read_json(v4_dir / 'receipt.json')['steps']:
    if not re.fullmatch(r'compiled-\d{2}', step.get('name', '')):
        continue
    fixture_hash_audit.append({'fixture': step['name'], 'status': step.get('status'),
                               'before': step.get('debugCompilerSha256Before'),
                               'after': step.get('debugCompilerSha256After')})
v4_compiler_hash = read_json(v4_dir / 'receipt.json').get('debugCompiler', {}).get('sha256AfterBuild')
for entry in fixture_hash_audit:
    entry['matchesV4Compiler'] = entry['before'] == v4_compiler_hash and entry['after'] == v4_compiler_hash

archives = []
for version in (2, 3, 4):
    archives.append(verify_archive(version, 'package-before', 'packaging-before.json', 'packaging-before'))
    archives.append(verify_archive(version, 'package-after', 'packaging-after.json', 'packaging-after'))
    archives.append(verify_archive(version, 'changed-fixtures', 'fixture-artifacts.json', 'fixture-artifacts'))

v1_receipt = read_json(VERIFY / 'darwin-v1/receipt.json')
v1_note = {'receiptStatus': v1_receipt.get('status'), 'stepCount': len(v1_receipt.get('steps', [])),
           'errors': v1_receipt.get('errors', []),
           'packageAfterCount': len(v1_receipt.get('packageCacheAfter', {}).get('files', [])),
           'fixtureArchiveCount': len(v1_receipt.get('fixtureArtifacts', {}).get('files', [])),
           'interpretation': 'Preserved preflight-only output: zero gate steps and no captured fixture baseline; fixture/package snapshots are existing-state archives, not new executed proof.'}

receipt = read_json(v4_dir / 'receipt.json')
authorization_path = ROOT / 'implementation/2026-10-18-store-values/benchmark/proof-v1/run-authorization.json'
build_proof_path = ROOT / 'implementation/2026-10-18-store-values/benchmark/proof-v1/build-proof.json'
authorization = read_json(authorization_path)
build_proof = read_json(build_proof_path)
deno_log = (v4_dir / 'logs/deno-full.log').read_text(errors='replace')
cargo_log = (v4_dir / 'logs/cargo-test.log').read_text(errors='replace')
artifact_log = (v4_dir / 'logs/artifact-conformance.log').read_text(errors='replace')
three_log = (v4_dir / 'logs/three-host-7.log').read_text(errors='replace')
package_after_meta = read_json(v4_dir / 'packaging-after.json')
fixture_meta = read_json(v4_dir / 'fixture-artifacts.json')
results_text = RESULTS.read_text()
results_claims = {
    'runtimeTests929': '929 passed | 0 failed' in deno_log and '929 runtime tests' in results_text,
    'rustTests54': bool(re.search(r'test result: ok\. 54 passed', cargo_log)) and '54 Rust tests' in results_text,
    'artifactChecks24': 'PASS compiler artifact conformance (24 checks)' in artifact_log and '24 artifact checks' in results_text,
    'compiledFixtures17': len(fixture_hash_audit) == 17 and all(e['status'] == 'PASS' for e in fixture_hash_audit),
    'threeCases7': 'ℹ pass 7' in three_log and 'seven Three cases' in results_text,
    'twoBoundedRetentionChecks': all(any(s.get('name') == name and s.get('status') == 'PASS' and s.get('exitCode') == 0 for s in receipt['steps'])
                                     for name in ('direct-intent-gc', 'native-candidate-gc')) and 'two bounded retention checks' in results_text,
    'packageFiles458': len(package_after_meta.get('files', [])) == 458 and '458 archived files' in results_text,
    'fixtureArchive109': len(fixture_meta.get('files', [])) == 109 and '109 files' in results_text,
    'correctnessInputs792': len(v4_before) == 792 and len(v4_after) == 792 and '792 correctness inputs' in results_text,
    'pairHashes742': len(pair.get('sourceBefore', [])) == 742 and len(pair.get('sourceAfter', [])) == 742 and '742 source/compiler/artifact hashes' in results_text,
    'pairTimingMatches': pair.get('comparison', {}).get('nativeTransactionToMutationObserverMs') == pair.get('arms', [{}])[0].get('result', {}).get('dispatchToMutationObserverMs') and '4.2 / 0.8 ms' in results_text,
    'reactTimingMatches': len(pair.get('arms', [])) == 2 and pair.get('comparison', {}).get('reactTransactionToMutationObserverMs') == pair.get('arms', [{}, {}])[1].get('result', {}).get('dispatchToMutationObserverMs'),
    'pairScopeDescriptive': pair.get('status') == 'PASS_DESCRIPTIVE_JOINT_INPUT_PAIR_ONLY' and 'does not qualify CPU' in results_text,
    'pairNativeSlowerClaim': pair.get('comparison', {}).get('nativeMinusReactMs', 0) > 0 and 'Native was slower' in results_text,
    'pairMountDisposalAndBundleClaims': (pair.get('arms', [{}, {}])[0].get('result', {}).get('mountDurationMs') - 8.4 < 0.1 and
                                         pair.get('arms', [{}, {}])[1].get('result', {}).get('mountDurationMs') - 5.7 < 0.1 and
                                         pair.get('arms', [{}, {}])[0].get('result', {}).get('disposeDurationMs') - 0.8 < 0.1 and
                                         pair.get('arms', [{}, {}])[1].get('result', {}).get('disposeDurationMs') - 0.4 < 0.1 and
                                         pair.get('bundleBytes', {}).get('javascript') == 520110 and '8.4 / 5.7 ms' in results_text and
                                         '0.8 / 0.4 ms' in results_text and '520,110 bytes' in results_text),
    'pairAuthorizationBindsProof': authorization.get('status') == 'APPROVED_FOR_ONE_DESCRIPTIVE_PAIR' and
                                   authorization.get('buildProofSha256') == sha256_bytes(build_proof_path.read_bytes()) and
                                   pair.get('buildProofSha256') == sha256_bytes(build_proof_path.read_bytes()),
}

pair_arms = []
for arm in pair.get('arms', []):
    result = arm.get('result', {})
    disposal = result.get('disposal', {})
    pair_arms.append({'arm': arm.get('arm'), 'status': result.get('status'),
                      'dispatchToMutationObserverMs': result.get('dispatchToMutationObserverMs'),
                      'mountDurationMs': result.get('mountDurationMs'), 'disposeDurationMs': result.get('disposeDurationMs'),
                      'retainedHostIdentity': result.get('retainedHostIdentity'),
                      'retainedRowIdentity': result.get('retainedRowIdentity'),
                      'retainedRowState': result.get('retainedRowState'),
                      'fallbackVisible': result.get('fallbackVisible'),
                      'healthReadyBeforeTiming': result.get('healthReadyBeforeTiming'),
                      'healthRevealedAfterTiming': result.get('healthRevealedAfterTiming'),
                      'remainingChildren': disposal.get('remainingChildren'),
                      'disposed': disposal.get('disposed'),
                      'positionResources': disposal.get('position'), 'cameraResources': disposal.get('camera'),
                      'collectionResources': disposal.get('collection')})
pair_cleanup = {'allArmsPass': all(arm.get('status') == 'PASS' for arm in pair_arms),
                'allArmsDisposed': all(arm.get('disposed') is True for arm in pair_arms),
                'allArmsEmpty': all(arm.get('remainingChildren') == 0 for arm in pair_arms),
                'allArmsNoRetainedListeners': all(
                    (arm.get('positionResources') or {}).get('listeners', 0) == 0 and
                    (arm.get('cameraResources') or {}).get('listeners', 0) == 0
                    for arm in pair_arms if isinstance(arm.get('positionResources'), dict) and
                    isinstance(arm.get('cameraResources'), dict)),
                'recordErrors': pair.get('errors'), 'stopReason': pair.get('stopReason')}

run_pair_source = (ROOT / 'implementation/2026-10-18-store-values/benchmark/run-pair.mjs').read_text()
v1_source_review = (ROOT / 'implementation/2026-10-18-store-values/source-review.md').read_text()
v1_doc_labeling = {'resultsLabelsFixtureSnapshotAsExistingAndNotProof':
                   'Its fixture archive contains pre-existing snapshots' in results_text and 'not new executed proof' in results_text,
                   'sourceReviewLabelsFixtureAndPackageSnapshotsAsExisting':
                   'existing fixture/package snapshots are preserved' in v1_source_review,
                   'resultsLabelsNotNewProof': 'not new executed proof' in results_text}

cache_audit = tracked_cache_audit()
process_audit = process_snapshot()
input_fingerprints_after = [file_fingerprint(path) for path in subject_paths]
fingerprint_changes = [after for before, after in zip(input_fingerprints_before, input_fingerprints_after)
                       if before != after]

audit = {
    'schemaVersion': 'final-doc-evidence-audit-v1',
    'generatedAtUnixSeconds': int(time.time()),
    'exitCodeOfAuditScript': 0,
    'inputFreeze': {'startedAtUnixSeconds': int(started), 'subjectFileCount': len(subject_paths),
                    'before': input_fingerprints_before, 'after': input_fingerprints_after,
                    'changedDuringAudit': fingerprint_changes},
    'auditAttemptHistory': {'firstAttemptExitCode': 1,
                            'firstAttemptError': 'Default sandbox denied spawning ps at the process-cleanup audit step.',
                            'firstAttemptLog': 'final-doc-evidence-audit.first-attempt.stderr.log',
                            'finalAttemptExitCode': 0, 'finalAttemptLog': 'final-doc-evidence-audit.stdout.log'},
    'notebook': notebook_audit,
    'markdownLinks': links_audit,
    'v4CorrectnessInputs': v4_inputs_audit,
    'pairProofHashes': {'recordPath': str(PAIR_PATH.relative_to(ROOT)), 'recordSha256': pair_hash,
                        **pair_hash_audit},
    'v4CompiledFixtureCompilerHashes': {'expectedCount': 17, 'actualCount': len(fixture_hash_audit),
                                        'compilerSha256': v4_compiler_hash, 'fixtures': fixture_hash_audit},
    'archiveVerificationsV2V3V4': archives,
    'v1PreflightArchiveNote': v1_note,
    'v1SnapshotDocumentation': v1_doc_labeling,
    'resultsClaimsAgainstReceipt': results_claims,
    'pairOutcome': {'status': pair.get('status'), 'comparison': pair.get('comparison'), 'arms': pair_arms,
                    'cleanup': pair_cleanup,
                    'buildProofSha256': pair.get('buildProofSha256'), 'sourceLockSha256': pair.get('sourceLockSha256'),
                    'integrity': {'sourceBeforeCount': len(pair.get('sourceBefore', [])),
                                  'sourceAfterCount': len(pair.get('sourceAfter', [])),
                                  'sourceBeforeMismatchCount': pair_hash_audit['sourceBefore']['recordedMismatchCount'],
                                  'sourceAfterMismatchCount': pair_hash_audit['sourceAfter']['recordedMismatchCount'],
                                  'blockedRequests': len(pair.get('blockedRequests', [])),
                                  'requestFailures': len(pair.get('requestFailures', [])),
                                  'pageErrors': len(pair.get('pageErrors', [])),
                                  'consoleErrors': len(pair.get('consoleErrors', [])),
                                  'errors': pair.get('errors'), 'stopReason': pair.get('stopReason')}},
    'trackedCache': cache_audit,
    'processSnapshot': process_audit,
    'mismatches': {
        'notebook': [key for key, value in notebook_audit.items()
                     if key in ('priorCellsExactIncludingMetadataAndOutputs', 'rootMetadataExact', 'notebookFormatExact') and not value],
        'markdownLinks': links_audit['missing'],
        'v4SourceBeforeAfterSet': not v4_inputs_audit['samePathSetAndHashes'],
        'v4SourceBefore': v4_actual_before['mismatches'],
        'v4SourceAfter': v4_actual_after['mismatches'],
        'pairSourceBefore': pair_hash_audit['sourceBefore']['recordedMismatches'] + pair_hash_audit['sourceBefore']['currentDiskMismatches'],
        'pairSourceAfter': pair_hash_audit['sourceAfter']['recordedMismatches'] + pair_hash_audit['sourceAfter']['currentDiskMismatches'],
        'fixtureCompilerHashes': [entry for entry in fixture_hash_audit if not entry['matchesV4Compiler']],
        'archives': [{'version': item.get('version'), 'archive': item.get('archive'), 'mismatches': item.get('mismatches', [])}
                     for item in archives if item.get('mismatchCount', 0) or item.get('status') != 'ARCHIVED'],
        'resultsClaims': [key for key, value in results_claims.items() if not value],
        'v1SnapshotDocumentation': [key for key, value in v1_doc_labeling.items() if not value],
        'pairCleanup': [key for key, value in pair_cleanup.items() if key not in ('recordErrors', 'stopReason') and value is not True and value != [] and value is not None],
        'trackedCacheSymlinks': [item for item in cache_audit['symlinks'] if not item['matchesHead']],
        'trackedCacheDiffExitCode': cache_audit['trackedWorktreeDiffExitCode'],
        'inputFreeze': fingerprint_changes,
    },
}
audit['overallStatus'] = 'PASS' if not any(audit['mismatches'].values()) else 'MISMATCHES_RECORDED'
out_path = VERIFY / 'final-doc-evidence-audit.json'
out_path.write_text(json.dumps(audit, indent=2, ensure_ascii=False) + '\n')
print(json.dumps({'overallStatus': audit['overallStatus'], 'output': str(out_path),
                  'notebook': {key: value for key, value in notebook_audit.items() if key != 'newCells'},
                  'markdownLinkCount': links_audit['linkCount'], 'missingMarkdownLinks': links_audit['missingCount'],
                  'v4Inputs': [len(v4_before), len(v4_after)],
                  'pairHashes': [len(pair.get('sourceBefore', [])), len(pair.get('sourceAfter', []))],
                  'fixtureCompilerHashes': len(fixture_hash_audit),
                  'archiveResults': [{'version': a.get('version'), 'archive': a.get('archive'),
                                      'status': a.get('status'), 'checked': a.get('checked'),
                                      'mismatchCount': a.get('mismatchCount')} for a in archives],
                  'cache': {'trackedEntries': len(cache_audit['symlinks']) + cache_audit['headRegularFileCount'],
                            'symlinkMismatches': cache_audit['symlinkMismatchCount'],
                            'trackedWorktreeDiffExitCode': cache_audit['trackedWorktreeDiffExitCode']},
                  'processSnapshot': process_audit,
                  'resultClaimMismatches': audit['mismatches']['resultsClaims']}, ensure_ascii=False, indent=2))
