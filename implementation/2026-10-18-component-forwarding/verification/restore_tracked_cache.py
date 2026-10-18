import hashlib,json,os,pathlib,stat,shutil
root=pathlib.Path.cwd(); base=root/'implementation/2026-10-18-component-forwarding/verification'
archive=base/'preflight-v1'; report=[]
for ent in json.loads((archive/'tracked-cache-before.json').read_text())['entries']:
 p=root/ent['path']; saved=archive/'tracked-cache-before'/ent['path']
 if ent['mode']=='120000':
  matches=p.is_symlink() and os.readlink(p)==ent['target']
  if not matches:
   if p.exists() or p.is_symlink(): p.unlink()
   p.parent.mkdir(parents=True,exist_ok=True); os.symlink(ent['target'],p)
   report.append({'path':ent['path'],'restored':True,'kind':'symlink'})
 else:
  matches=p.is_file() and not p.is_symlink() and hashlib.sha256(p.read_bytes()).hexdigest()==ent['sha256'] and stat.S_IMODE(p.stat().st_mode)==ent['modeBits']
  if not matches:
   p.parent.mkdir(parents=True,exist_ok=True)
   tmp=p.with_name(p.name+'.codex-restore-tmp')
   shutil.copyfile(saved,tmp); os.chmod(tmp,ent['modeBits']); os.replace(tmp,p)
   report.append({'path':ent['path'],'restored':True,'kind':'file'})
# Full post-restore verification against preflight bytes/modes/symlinks.
for ent in json.loads((archive/'tracked-cache-before.json').read_text())['entries']:
 p=root/ent['path']
 if ent['mode']=='120000': assert p.is_symlink() and os.readlink(p)==ent['target'],ent['path']
 else:
  assert p.is_file() and not p.is_symlink(),ent['path']
  data=p.read_bytes(); assert hashlib.sha256(data).hexdigest()==ent['sha256'] and stat.S_IMODE(p.stat().st_mode)==ent['modeBits'],ent['path']
(base/'darwin-v1'/'tracked-cache-restoration.json').write_text(json.dumps({'trackedEntryCount':18855,'restoredCount':len(report),'restored':report,'status':'PASS'},indent=2)+'\n')
print(json.dumps({'trackedEntryCount':18855,'restoredCount':len(report),'status':'PASS'}))
