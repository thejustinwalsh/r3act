import hashlib, json, os, pathlib, shutil, stat, subprocess, sys
root = pathlib.Path.cwd()
out = root / 'implementation/2026-10-18-component-forwarding/verification/darwin-v1'
assert not out.exists()
out.mkdir(parents=True)
source_root_names = ['src','compiler','packages','scripts']
excluded = {'.git','.cache','node_modules','target','dist','evidence','verification','benchmark','proof','images','image','generated'}
paths=[]
def walk(directory):
    for entry in sorted(directory.iterdir(), key=lambda p:p.name):
        if entry.name in excluded or __import__('re').match(r'^(?:proof|evidence|images?|generated)(?:-|$)', entry.name): continue
        if entry.is_dir() and not entry.is_symlink(): walk(entry)
        elif entry.is_file() and not entry.is_symlink(): paths.append(entry.relative_to(root).as_posix())
        else: raise RuntimeError(f'unsupported source entry: {entry}')
for name in source_root_names: walk(root/name)
for p in root.iterdir():
    if p.is_file() and (p.name in {'package.json','pnpm-lock.yaml','pnpm-workspace.yaml','deno.json','deno.browser.json','deno.lock','LICENSE'} or __import__('re').match(r'^tsconfig[^/]*\.json$',p.name) or __import__('re').match(r'^vite[^/]*\.ts$',p.name)):
        paths.append(p.name)
paths.append('implementation/2026-10-16-publication/verification/deno-runtime.lock')
for relative in [
'.github/workflows/native-package-portability.yml',
'implementation/2026-10-18-native-platforms/design.md','implementation/2026-10-18-native-platforms/source-review.md',
'implementation/2026-10-18-resource-values/design.md','implementation/2026-10-18-resource-values/source-review.md',
'implementation/2026-10-18-store-values/design.md','implementation/2026-10-18-store-values/source-review.md',
'implementation/2026-10-18-store-subtrees/design.md','implementation/2026-10-18-store-subtrees/source-review.md',
'implementation/2026-10-18-store-projections/design.md','implementation/2026-10-18-store-projections/source-review.md',
'implementation/2026-10-18-joint-async-inputs/design.md','implementation/2026-10-18-joint-async-inputs/source-review.md',
'implementation/2026-10-18-component-forwarding/design.md','implementation/2026-10-18-component-forwarding/source-review.md']:
    if (root/relative).is_file(): paths.append(relative)
linux=root/'implementation/2026-10-18-native-platforms/linux'
if linux.is_dir(): walk(linux)
paths=sorted(set(paths))
manifest=[]
for rel in paths:
    src=root/rel
    data=src.read_bytes()
    dest=out/'source-before'/rel
    dest.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(src,dest)
    manifest.append({'path':rel,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'mode':stat.S_IMODE(src.stat().st_mode)})
(out/'source-before-manifest.json').write_text(json.dumps({'inputCount':len(manifest),'inputs':manifest},indent=2)+'\n')
# Snapshot every HEAD-tracked .cache entry, including symlinks and mode. Restore only changed entries after gate.
raw=subprocess.check_output(['git','ls-tree','-r','-z','HEAD','--','.cache'])
entries=[]
cacheout=out/'tracked-cache-before'
for rec in raw.split(b'\0'):
    if not rec: continue
    meta, rawpath=rec.split(b'\t',1)
    mode,typ,oid=meta.decode().split()
    rel=os.fsdecode(rawpath)
    src=root/rel
    ent={'path':rel,'mode':mode,'type':typ,'blob':oid}
    if mode=='120000':
        target=os.readlink(src)
        dest=cacheout/rel; dest.parent.mkdir(parents=True,exist_ok=True); os.symlink(target,dest)
        ent['target']=target
    elif mode.startswith('100'):
        data=src.read_bytes()
        dest=cacheout/rel; dest.parent.mkdir(parents=True,exist_ok=True); dest.write_bytes(data); os.chmod(dest,stat.S_IMODE(src.stat().st_mode))
        ent.update(sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),modeBits=stat.S_IMODE(src.stat().st_mode))
    else: raise RuntimeError(f'unsupported tracked cache mode {mode} {rel}')
    entries.append(ent)
(out/'tracked-cache-before.json').write_text(json.dumps({'trackedEntryCount':len(entries),'entries':entries},indent=2)+'\n')
# Verify archived source copy and cache copy against the just-captured source records before any gate.
for item in manifest:
    archived=(out/'source-before'/item['path']).read_bytes()
    assert hashlib.sha256(archived).hexdigest()==item['sha256'] and len(archived)==item['bytes']
for ent in entries:
    path=cacheout/ent['path']
    if ent['mode']=='120000': assert os.readlink(path)==ent['target']
    else:
        data=path.read_bytes(); assert hashlib.sha256(data).hexdigest()==ent['sha256'] and len(data)==ent['bytes']
print(json.dumps({'sourceInputCount':len(manifest),'sourceArchiveVerified':True,'trackedCacheEntryCount':len(entries),'trackedCacheArchiveVerified':True,'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()}))
