import hashlib, json, os, pathlib, stat, subprocess, tempfile

root = pathlib.Path.cwd()
base = root / 'implementation/2026-10-18-authored-lifecycle/verification'
before = json.loads((base / 'preflight-v1/tracked-cache-before.json').read_text())
restored = []

def current_matches(entry):
    path = root / entry['path']
    if entry['mode'] == '120000':
        return path.is_symlink() and os.readlink(path) == entry['target']
    return path.is_file() and not path.is_symlink() and hashlib.sha1(b'blob ' + str(path.stat().st_size).encode() + b'\0' + path.read_bytes()).hexdigest() == entry['blob'] and stat.S_IMODE(path.stat().st_mode) == int(entry['mode'][-3:], 8)

for entry in before['entries']:
    path = root / entry['path']
    if current_matches(entry):
        continue
    path.parent.mkdir(parents=True, exist_ok=True)
    if entry['mode'] == '120000':
        if path.exists() or path.is_symlink():
            path.unlink()
        os.symlink(entry['target'], path)
        kind = 'symlink'
    else:
        data = subprocess.check_output(['git', 'cat-file', 'blob', entry['blob']])
        fd, temporary = tempfile.mkstemp(prefix='.codex-cache-restore-', dir=path.parent)
        try:
            with os.fdopen(fd, 'wb') as handle:
                handle.write(data)
            os.chmod(temporary, int(entry['mode'][-3:], 8))
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
        kind = 'file'
    restored.append({'path': entry['path'], 'kind': kind})

for entry in before['entries']:
    assert current_matches(entry), entry['path']
report = {'head': before['head'], 'trackedEntryCount': len(before['entries']), 'restoredCount': len(restored), 'restored': restored, 'status': 'PASS'}
(base / 'darwin-v1/tracked-cache-restoration.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'trackedEntryCount': report['trackedEntryCount'], 'restoredCount': report['restoredCount'], 'status': report['status']}))
