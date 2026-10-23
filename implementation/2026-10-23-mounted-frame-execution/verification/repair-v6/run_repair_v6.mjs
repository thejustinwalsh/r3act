import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
const unit = path.join(root, 'implementation/2026-10-23-mounted-frame-execution');
const out = path.dirname(fileURLToPath(import.meta.url));
const freeze = JSON.parse(await readFile(path.join(unit, 'source-review-v6.json'), 'utf8'));
assert.equal(freeze.status, 'PRIMARY_REVIEWED_MOUNTED_FRAME_EXECUTION_FREEZE_V6');
assert.equal(freeze.source.length, 72);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const checkFreeze = async () => {
  const bad = [];
  for (const f of freeze.source) {
    const b = await readFile(path.join(root, f.path));
    if (b.length !== f.bytes || hash(b) !== f.sha256) bad.push(f.path);
  }
  return bad;
};
assert.deepEqual(await checkFreeze(), [], 'v6 source mismatch before commands');
const nodePin = '/Users/mini/.local/share/mise/installs/node/24.18.0/bin';
const environment = { ...process.env, CI: 'true', PATH: `${nodePin}:/Users/mini/.cargo/bin:${process.env.PATH}`,
  CARGO_HOME: '/Volumes/Depot/Developer/r3act/.cache/cargo', CARGO_BUILD_JOBS: '1' };
const base = JSON.parse(await readFile(path.join(unit, 'verification/repair-v4/receipt.json'), 'utf8'));
assert.equal(base.status, 'PASS');
assert.equal(base.sourceAuditAfter.status, 'MATCH');
const baseFreeze = JSON.parse(await readFile(path.join(unit, 'source-review-v5.json'), 'utf8'));
const baseByPath = new Map(baseFreeze.source.map(x => [x.path, x]));
const changed = freeze.source.filter(x => baseByPath.get(x.path)?.sha256 !== x.sha256 || baseByPath.get(x.path)?.bytes !== x.bytes)
  .map(x => x.path).sort();
assert.deepEqual(changed, ['src/vdom_mounted_frame_execution_test.ts', 'src/vdom_snapshot_runtime.ts']);
const compiler = path.join(root, 'compiler/oxc-spike/target/debug/ui-graph-compiler-spike');
const compilerSha = await readFile(compiler).then(hash);
const v3Receipt = JSON.parse(await readFile(path.join(unit, 'verification/darwin-v3/receipt.json'), 'utf8'));
const v3CompilerPass = v3Receipt.steps.find(s => s.name === 'compiled-63');
assert.equal(v3CompilerPass?.status, 'PASS');
assert.equal(compilerSha, v3CompilerPass.debugCompilerSha256After);
await mkdir(path.join(out, 'logs'), { recursive: true });
const carried = { status: 'CARRIED_FORWARD_BY_SOURCE_AND_ARTIFACT_HASH', from: 'verification/repair-v4/receipt.json',
  rationale: 'The v5-to-v6 freeze diff changes only VDOM mounted frame preparation and its mounted-frame regression test. The v4 correctness gate already passed; v5 changes were companion-only and excluded from this correctness slice. Rust108, install, compiler artifact, compiler metadata, plugins, all fixtures outside 54/56/57/58/59/63, and prior GC checks are carried; dependent VDOM runtime/compiled fixtures and source/package checks rerun.',
  changedSinceV4: changed, sourceFreeze: 'source-review-v6.json', sourceEntries: freeze.source.length,
  carriedSteps: base.steps.filter(s => !['deno-full','native-tooling','compiled-54','compiled-56','compiled-57','compiled-58','compiled-59','compiled-63','package-build','package-consumer'].includes(s.name)).map(s => ({ name:s.name,status:s.status,command:s.command,debugCompilerSha256Before:s.compilerSha256Before??s.debugCompilerSha256Before??null,debugCompilerSha256After:s.compilerSha256After??s.debugCompilerSha256After??null })),
  debugCompiler: { path: compiler, sha256: compilerSha, carriedFrom: 'verification/darwin-v3/receipt.json', sourceReceiptStep: 'compiled-63' }, environment: { nodePathFirst: nodePin, cargoHome: environment.CARGO_HOME, cargoBuildJobs: environment.CARGO_BUILD_JOBS, ci: environment.CI } };
await writeFile(path.join(out, 'carried-prerequisites.json'), JSON.stringify(carried,null,2)+'\n', {flag:'wx'});
const receipt = { status:'RUNNING', startedAt:new Date().toISOString(), sourceFreeze:'source-review-v6.json', sourceCount:72, sourceAuditBefore:'MATCH', changed, toolchain:{node:process.execPath,version:process.version,pathFirst:nodePin,rustc:'1.97.1',cargo:'1.97.1',cargoHome:environment.CARGO_HOME,jobs:1}, carried:'carried-prerequisites.json', steps:[] };
assert.equal(process.version, 'v24.18.0');
const save = () => writeFile(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
await save();
const steps = [
  {name:'deno-full',command:'deno',args:['test','--config','deno.browser.json','--frozen','--lock=implementation/2026-10-16-publication/verification/deno-runtime.lock','src'],timeout:900000},
  {name:'native-tooling',command:'pnpm',args:['check:native-tooling'],timeout:300000},
  ...[[54,'--expose-gc','compiled_mounted_scalar_execution_test.mjs'],[56,'--expose-gc','compiled_compact_scalar_output_test.mjs'],[57,'--expose-gc','compiled_owned_scalar_capture_test.mjs'],[58,'--expose-gc','compiled_owned_frame_transaction_test.mjs'],[59,'--expose-gc','compiled_store_batch_execution_test.mjs'],[63,null,'compiled_mounted_frame_execution_test.mjs']].map(([n,gc,file])=>({name:`compiled-${n}`,command:process.execPath,args:['--experimental-transform-types',...(gc?[gc]:[]),`compiler/${file}`],timeout:300000})),
  {name:'package-build',command:'pnpm',args:['package:r3act'],timeout:900000},
  {name:'package-consumer',command:'pnpm',args:['check:r3act-packages'],timeout:900000,depends:['package-build']},
];
for(const spec of steps){
  if(spec.depends?.some(n=>receipt.steps.find(x=>x.name===n)?.status!=='PASS')){receipt.steps.push({name:spec.name,status:'SKIPPED_DEPENDENCY_FAILED',depends:spec.depends});await save();continue;}
  const startedAt=new Date().toISOString(), t=performance.now(), logPath=path.join(out,'logs',`${spec.name}.log`);
  const log=await import('node:fs').then(({createWriteStream})=>createWriteStream(logPath,{flags:'wx'}));
  const child=spawn(spec.command,spec.args,{cwd:root,env:environment,detached:true,stdio:['ignore','pipe','pipe']});
  child.stdout.pipe(log,{end:false}); child.stderr.pipe(log,{end:false});
  let timeout=false; const timer=setTimeout(()=>{timeout=true;try{process.kill(-child.pid,'SIGKILL')}catch{}},spec.timeout);
  const {code,signal}=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}));});
  clearTimeout(timer); await new Promise(resolve=>log.end(resolve));
  const status=timeout?'TIMEOUT':(code===0&&!signal?'PASS':'FAIL');
  receipt.steps.push({name:spec.name,status,command:[spec.command,...spec.args],startedAt,durationMs:Math.round(performance.now()-t),timeoutMs:spec.timeout,exitCode:code,signal,log:`logs/${spec.name}.log`});
  await save(); process.stdout.write(`${spec.name}: ${status} exit=${code}\n`);
}
const bad=await checkFreeze(); receipt.sourceAuditAfter=bad.length?{status:'MISMATCH',paths:bad}:{status:'MATCH',count:72};
receipt.finishedAt=new Date().toISOString(); receipt.status=bad.length===0&&receipt.steps.length===steps.length&&receipt.steps.every(s=>s.status==='PASS')?'PASS':'FAIL';
await save(); process.stdout.write(`Repair v6 ${receipt.status}\n`); if(receipt.status!=='PASS') process.exitCode=1;
