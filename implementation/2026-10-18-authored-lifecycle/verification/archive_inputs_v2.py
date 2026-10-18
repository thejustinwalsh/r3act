import hashlib, json, os, pathlib, re, stat, subprocess, shutil

root = pathlib.Path.cwd()
out = root / 'implementation/2026-10-18-authored-lifecycle/verification/preflight-v2'
assert not out.exists(), f'output already exists: {out}'
out.mkdir(parents=True)
source_roots = ['src', 'compiler', 'packages', 'scripts']
excluded = {'.git', '.cache', 'node_modules', 'target', 'dist', 'evidence', 'verification', 'benchmark', 'proof', 'images', 'image', 'generated'}
paths = []

def walk(directory):
    for entry in sorted(directory.iterdir(), key=lambda p: p.name):
        if entry.name in excluded or re.match(r'^(?:proof|evidence|images?|generated)(?:-|$)', entry.name):
            continue
        if entry.is_dir() and not entry.is_symlink():
            walk(entry)
        elif entry.is_file() and not entry.is_symlink():
            paths.append(entry.relative_to(root).as_posix())
        else:
            raise RuntimeError(f'unsupported source entry: {entry}')

for name in source_roots:
    walk(root / name)
for entry in root.iterdir():
    if entry.is_file() and (entry.name in {'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'deno.json', 'deno.browser.json', 'deno.lock', 'LICENSE'} or re.match(r'^tsconfig[^/]*\.json$', entry.name) or re.match(r'^vite[^/]*\.ts$', entry.name)):
        paths.append(entry.name)
paths.append('implementation/2026-10-16-publication/verification/deno-runtime.lock')
fixed = ['.github/workflows/native-package-portability.yml']
units = ['native-platforms', 'resource-values', 'store-values', 'store-subtrees', 'store-projections', 'joint-async-inputs', 'component-forwarding', 'authored-lifecycle']
for unit in units:
    fixed += [f'implementation/2026-10-18-{unit}/{suffix}' for suffix in ('design.md', 'source-review.md')]
fixed += [f'implementation/2026-10-18-authored-lifecycle/workload/{name}' for name in ['contract.ts', 'native_arm.tsx', 'react_arm.tsx', 'entry.ts', 'index.html', 'vite.config.ts', 'build-gate.mjs', 'run-pairs.mjs', 'README.md']]
for rel in fixed:
    if (root / rel).is_file():
        paths.append(rel)
linux = root / 'implementation/2026-10-18-native-platforms/linux'
if linux.is_dir():
    walk(linux)
paths = sorted(set(paths))
manifest = []
for rel in paths:
    src = root / rel
    data = src.read_bytes()
    dest = out / 'source-before' / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    manifest.append({'path': rel, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data), 'mode': stat.S_IMODE(src.stat().st_mode)})
(out / 'source-before-manifest.json').write_text(json.dumps({'inputCount': len(manifest), 'inputs': manifest}, indent=2) + '\n')
for item in manifest:
    data = (out / 'source-before' / item['path']).read_bytes()
    assert hashlib.sha256(data).hexdigest() == item['sha256'] and len(data) == item['bytes']

# Dynamically compare every tracked cache path with the declared HEAD before running.
raw = subprocess.check_output(['git', 'ls-tree', '-r', '-z', 'HEAD', '--', '.cache'])
entries = []
for rec in raw.split(b'\0'):
    if not rec:
        continue
    meta, rawpath = rec.split(b'\t', 1)
    mode, typ, oid = meta.decode().split()
    rel = os.fsdecode(rawpath)
    path = root / rel
    if mode == '120000':
        assert path.is_symlink(), f'tracked symlink mismatch: {rel}'
        target = os.readlink(path)
        blob = hashlib.sha1(b'blob ' + str(len(os.fsencode(target))).encode() + b'\0' + os.fsencode(target)).hexdigest()
        assert blob == oid, f'tracked symlink blob mismatch: {rel}'
        entries.append({'path': rel, 'mode': mode, 'type': typ, 'blob': oid, 'target': target})
    elif mode.startswith('100'):
        assert path.is_file() and not path.is_symlink(), f'tracked file mismatch: {rel}'
        actual_mode = stat.S_IMODE(path.stat().st_mode)
        expected_mode = int(mode[-3:], 8)
        assert actual_mode == expected_mode, f'tracked file mode mismatch: {rel} expected {mode} actual {oct(actual_mode)}'
        data = path.read_bytes()
        blob = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        assert blob == oid, f'tracked file blob mismatch: {rel}'
        entries.append({'path': rel, 'mode': mode, 'type': typ, 'blob': oid, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data), 'modeBits': actual_mode})
    else:
        raise RuntimeError(f'unsupported tracked cache mode {mode}: {rel}')
(out / 'tracked-cache-before.json').write_text(json.dumps({'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(), 'trackedEntryCount': len(entries), 'entries': entries}, indent=2) + '\n')

# Record runner-selected pre-existing fixture outputs without copying the full tracked cache.
prefix = re.compile(r'^(?:compiled-|native-resource-execution-|compiler-artifact-conformance-)')
fixtures = []
cache = root / '.cache'
for directory in sorted(cache.iterdir(), key=lambda p: p.name):
    if not directory.is_dir() or not prefix.match(directory.name):
        continue
    for path in sorted(directory.rglob('*')):
        if path.is_file() and not path.is_symlink():
            data = path.read_bytes()
            fixtures.append({'path': path.relative_to(cache).as_posix(), 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})
(out / 'fixture-artifacts-before.json').write_text(json.dumps({'files': fixtures, 'fileCount': len(fixtures)}, indent=2) + '\n')
print(json.dumps({'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(), 'sourceInputCount': len(manifest), 'sourceArchiveVerified': True, 'trackedCacheEntryCount': len(entries), 'trackedCacheVerifiedAgainstHead': True, 'fixtureBaselineCount': len(fixtures)}))
