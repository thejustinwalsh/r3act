import hashlib,json,tarfile
from pathlib import Path
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
lock=json.loads(Path('.cache/owner-row-fusion-pilot-primary/tool-lock.json').read_text())
for p,h in lock.items():
    assert sha(p)==h, p
verification=json.loads(Path('results/product-mixed-owner-row-fusion-pilot/verification.json').read_text())
assert verification['status']=='PASS' and verification['pilotPagesVerified']==6
out=Path('implementation/2026-10-13-owner-row-fusion-pilot');out.mkdir(exist_ok=False)
notes=out/'findings.md'
notes.write_text('''# Owner-row executor fusion: production correctness pilot

The frozen JavaScript runtime and Rust/OXC-generated TSX passed the six-page production pilot: native and React at 128, 512 and 1,024 rows. Each page has 60 measured harness samples with structural samples at frames 35 and 65. Checks cover output, order, identity, visibility, lifecycle and disposal. The independent verifier checks all 1,093 source-checkpoint members, five local/served production assets, isolation headers, the exact browser engine tuple, compiler proofs and the authored/Three correctness proofs.

This is correctness evidence only. Pilot samples do not establish a performance improvement. The latest qualified confirmatory study remains the earlier owner-row revision, which failed its speed gate and was 27–43% slower than React Compiler for steady updates. The fused revision requires its own fixed comparative study and allocation qualification. The installed package was qualified before fusion and must be requalified; package source-map usability, independent-device evidence and human maintenance comparisons remain open. The Sol review remains held.

The reused v5 World diagnostic is historical evidence with six byte-identical inputs; it is not a new fused-VDOM browser diagnostic. This archive supplements the pre-pilot source checkpoint without modifying it. The temporary Portless preview was stopped after collection.
''')
paths=sorted(set(list(lock)+[str(p) for p in Path('results/product-mixed-owner-row-fusion-pilot').glob('*.json')]+['.cache/owner-row-fusion-pilot-primary/tool-lock.json','.cache/owner-row-fusion-pilot-primary/collection.log','.cache/owner-row-fusion-pilot-primary/verification.log','.cache/owner-row-fusion-pilot-primary/archive.py',str(notes)]))
inventory={p:sha(p) for p in paths}
archive=out/'evidence.tar.gz'
with tarfile.open(archive,'x:gz') as t:
    for p in paths:t.add(p,arcname=p,recursive=False)
with tarfile.open(archive) as t:
    observed={m.name:hashlib.sha256(t.extractfile(m).read()).hexdigest() for m in t.getmembers()}
assert observed==inventory
status={'schemaVersion':1,'status':'PRODUCTION_CORRECTNESS_PILOT_VERIFIED','goalStatus':'ACTIVE','pilotPages':6,'sourceCheckpoint':verification['sourceArchive'],'performanceClaim':'None; fused runtime timing and allocation gates remain unmeasured.','archive':'evidence.tar.gz','archiveSha256':sha(archive),'archiveMembers':len(inventory),'evidenceSha256':inventory}
(out/'status.json').write_text(json.dumps(status,indent=2)+'\n')
print(json.dumps({k:v for k,v in status.items() if k!='evidenceSha256'},indent=2))
