from pathlib import Path
import json,hashlib
root=Path('/Volumes/Depot/Developer/r3act');v=root/'implementation/2026-10-18-joint-async-inputs/verification'
manifest=json.loads((v/'reviewed-source-v1/manifest.json').read_text());expected={x['path']:x for x in manifest}
review='implementation/2026-10-18-joint-async-inputs/source-review.md';test='src/component_joint_async_inputs_test.ts'
reviewtext=(v/'reviewed-source-v2'/review).read_text().split('\n## First consolidated boundary\n')[0]
s=(v/'reviewed-source-v2'/test).read_text()
for name,nextname,childprops in [
 ('two resources settle in either order before joint Store reveal, then Store updates locally','a Store discovered after suspension retains a host-time newer action','left, right, store'),
 ('accepted reveal transfers the Store reader captured before suspension','joint reveal host failure preserves the old accepted fallback and error','resource, store')]:
 a=s.index('Deno.test("'+name+'"');b=s.index('Deno.test("'+nextname+'"',a);block=s[a:b]
 block=block.replace('  const health = new AsyncResource(new Promise<number>(() => {}));\n','')
 block=block.replace('  const Health = defineComponent(`${sourceFile}#component:Health`, () =>\n    jsx("output", { key: "health" }, useAt(`${sourceFile}#resource:health`, health) as number));\n  const jointNode = () => container.children[0].children[0];\n','')
 old='''    root.mount(jsx("section", {}, [
      jsx(Suspense, { key: "boundary", __nativeBoundarySite: `${id}#boundary`,
        fallback: jsx("output", { key: "joint", "data-total": "waiting" }),
        children: jsx(Joint, { key: "owner", CHILDPROPS }) }),
      jsx(Suspense, { key: "health-boundary", __nativeBoundarySite: `${id}#health-boundary`,
        fallback: jsx("output", { key: "health", "data-health": "pending" }),
        children: jsx(Health, { key: "health-owner" }) }),
    ]));'''.replace('CHILDPROPS',childprops)
 new='''    root.mount(jsx(Suspense, { key: "boundary", __nativeBoundarySite: `${id}#boundary`,
      fallback: jsx("output", { key: "joint", "data-total": "waiting" }),
      children: jsx(Joint, { key: "owner", CHILDPROPS }) }));'''.replace('CHILDPROPS',childprops)
 assert old in block,name
 block=block.replace(old,new).replace('jointNode()','container.children[0]')
 block=block.replace('    const pendingHealth = container.children[0].children[1];\n','')
 block=block.replace('    assertStrictEquals(container.children[0].children[1], pendingHealth);\n    assertEquals(pendingHealth.props["data-health"], "pending");\n','')
 s=s[:a]+block+s[b:]
s=s.replace('    assertThrows(() => root.flush(), Error,\n      "Compiled component revision is obsolete; remount with current code");','    assertEquals(root.flush(), false);')
recovered={review:reviewtext.encode(),test:s.encode()}
for rel,data in recovered.items():
 print(rel,len(data),hashlib.sha256(data).hexdigest(),'expected',expected[rel]['sha256'])
 assert len(data)==expected[rel]['bytes'] and hashlib.sha256(data).hexdigest()==expected[rel]['sha256'],rel
out=v/'archive-recovery-v1';out.mkdir()
rows=[]
for rel,data in recovered.items():
 old=v/'reviewed-source-v1'/rel;bad=old.read_bytes();backup=out/'misarchived'/rel;backup.parent.mkdir(parents=True,exist_ok=True);backup.write_bytes(bad)
 new=out/'recovered'/rel;new.parent.mkdir(parents=True,exist_ok=True);new.write_bytes(data)
 old.write_bytes(data)
 rows.append({'path':rel,'misarchivedSha256':hashlib.sha256(bad).hexdigest(),'recoveredSha256':hashlib.sha256(data).hexdigest(),'recordedV1Sha256':expected[rel]['sha256'],'bytes':len(data)})
(out/'receipt.json').write_text(json.dumps({'status':'RECOVERED_EXACT_V1_HASHES','reason':'Two v1 archive files were copied after v2 test-review edits; final audit v1 exposed mismatch. Preserve misarchived bytes and reconstruct pre-repair contents by reversing only the known test/review edits. Both full contents match independently recorded v1 source hashes and sizes before restoring the archive. Gate/source/proof records remain unchanged.','files':rows},indent=2)+'\n')
