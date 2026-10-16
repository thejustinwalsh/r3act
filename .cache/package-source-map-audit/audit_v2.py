import hashlib,json,posixpath,tarfile
from pathlib import Path
p=Path('.cache/compiled-owner-rows-package-v2/compiled-ui-runtime.tgz')
with tarfile.open(p) as t:
    members={m.name:m for m in t.getmembers() if m.isfile()}
    missing=[];maps=0;inline=0
    for name,m in members.items():
        if not name.endswith('.map'):continue
        d=json.load(t.extractfile(m));maps+=1
        for i,s in enumerate(d.get('sources',[])):
            resolved=posixpath.normpath(posixpath.join(posixpath.dirname(name),d.get('sourceRoot',''),s))
            contents=d.get('sourcesContent',[])
            embedded=i<len(contents) and contents[i] is not None
            if embedded:inline+=1
            if resolved not in members and not embedded:missing.append({'map':name,'source':s,'resolved':resolved})
report={'scope':'Installed V2 package source-map resolvability; no new package build or benchmark','tarball':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'mapsInspected':maps,'embeddedSources':inline,'unresolvableSources':len(missing),'missing':missing}
Path('.cache/package-source-map-audit/v2-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='missing'},indent=2))
