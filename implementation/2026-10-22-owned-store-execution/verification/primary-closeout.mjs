import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {nativeVerificationInputs,nativeVerificationContext} from '/Volumes/Depot/Developer/r3act/scripts/native_verification_inputs.mjs';
const root='/Volumes/Depot/Developer/r3act', unit='implementation/2026-10-22-owned-store-execution';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const before=JSON.parse(await readFile(`${root}/${unit}/verification/darwin-v3/source-archive.json`,'utf8'));
const current=[...await nativeVerificationInputs(root)];
for(const row of await nativeVerificationContext(root)) if(row.available&&!current.includes(row.path)) current.push(row.path);
const old=new Map(before.inputs.map(row=>[row.path,row]));
const changed=[],added=[],missing=[];
for(const name of current){const bytes=await readFile(`${root}/${name}`), prior=old.get(name);const item={path:name,sha256:hash(bytes),bytes:bytes.length};if(!prior)added.push(item);else if(item.sha256!==prior.sha256)changed.push({...item,gateSha256:prior.sha256});}
for(const name of old.keys())if(!current.includes(name))missing.push(name);
const allowedChanged=new Set(['README.md','final-master-plan.md','implementation-checkpoint.md','HANDOFF-PROMPT.txt','RESEARCH-GUIDE.md',`${unit}/consumer/verify.mjs`,`${unit}/source-review.md`]);
const allowedAdded=new Set([`${unit}/results.md`,`${unit}/summary.json`]);
assert.deepEqual(missing,[]);for(const row of changed)assert(allowedChanged.has(row.path),`Unrecorded drift: ${row.path}`);for(const row of added)assert(allowedAdded.has(row.path),`Unrecorded addition: ${row.path}`);
const docs=[];for(const path of ['README.md','final-master-plan.md','implementation-checkpoint.md','HANDOFF-PROMPT.txt','RESEARCH-GUIDE.md','paper.md','research.ipynb']){const bytes=await readFile(`${root}/${path}`);docs.push({path,sha256:hash(bytes),bytes:bytes.length});}
const notebook=JSON.parse(await readFile(`${root}/research.ipynb`,'utf8'));assert.equal(notebook.cells.at(-1).id,'owned-store-execution-20261022');
const out={status:'PASS_PRIMARY_CLOSEOUT_SOURCE_AUDIT',basis:'Darwin-v3 source archive plus exactly enumerated post-gate verifier, review, result and maintained-document follow-ons; no product source changed.',gateArchiveEntries:before.inputs.length,currentInputAndContextCount:current.length,changed,added,missing,maintainedDocuments:docs,notebookCells:notebook.cells.length,scope:'No new product execution, timing repeat or performance claim. Luna independently audited archive/installed/proof/timing bindings. Git indexing audit follows separately.'};
await writeFile(`${root}/${unit}/verification/primary-closeout.json`,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:out.status,changed:changed.map(x=>x.path),added:added.map(x=>x.path),notebookCells:out.notebookCells}));
