import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBrowser } from 'vitexec/cli';
const here=path.dirname(fileURLToPath(import.meta.url));
const work=path.resolve(here,'..');
const root=path.resolve(work,'../..');
const args=process.argv.slice(2);
const option=k=>{const i=args.indexOf(k);return i<0?null:args[i+1]??null};
const mode=option('--mode'),arm=option('--arm'),rows=Number(option('--rows'));
assert.equal(process.version,'v24.18.0','Recording requires pinned Node v24.18.0');
assert.ok(args.length===6||args.length===8,'Usage: collect-one.mjs --mode original|off|on|count --arm native|react --rows 128|1024|10000 [--origin PORTLESS_HTTPS_ORIGIN]');
assert.ok(['original','off','on','count'].includes(mode));
assert.ok(['native','react'].includes(arm));
assert.ok([128,1024,10000].includes(rows));
const sha=x=>createHash('sha256').update(x).digest('hex');
const hash=async x=>sha(await readFile(x));
const frozen=JSON.parse(await readFile(path.join(root,'results/current-owner-kernel-headless-v1/frozen-config.json')));
assert.equal(await hash(path.join(root,frozen.candidate.sourceArchivePath)),frozen.candidate.sourceArchiveSha256);
const diagnostic=mode!=='original';
const lock=diagnostic?JSON.parse(await readFile(path.join(work,'build-lock.json'))):null;
if(diagnostic){
  assert.equal(lock.schemaVersion,'dense-ledger-build-lock-v1');
  assert.equal(await hash(path.join(work,'source-manifest.json')),lock.sourceManifestSha256);
  assert.equal(await hash(path.join(work,'build/build-proof.json')),lock.buildProofSha256);
  assert.equal(process.version,lock.nodeVersion,'Node version differs from diagnostic build');
  for(const [name,expected] of Object.entries(lock.tooling))assert.equal(await hash(path.join(here,name)),expected,`tooling drift ${name}`);
  const sourceManifest=JSON.parse(await readFile(path.join(work,'source-manifest.json')));
  for(const [name,expected] of Object.entries(sourceManifest.after))assert.equal(await hash(path.join(work,'snapshot',name)),expected,`diagnostic source drift ${name}`);
}
const dist=diagnostic?path.join(work,'build/dist'):frozen.distDirectory;
const assets=diagnostic?lock.assets:frozen.productionAssets.map(x=>({file:x.file,sha256:x.sha256}));
for(const asset of assets) assert.equal(await hash(path.join(dist,asset.file)),asset.sha256,`local asset mismatch ${asset.file}`);
const assetMap=new Map(assets.filter(x=>!x.file.endsWith('.map')).map(x=>['/'+x.file,x.sha256]));
const origin=diagnostic?option('--origin'):frozen.origin;
if(diagnostic)assert.ok(origin&&new URL(origin).protocol==='https:'&&new URL(origin).hostname.endsWith('.localhost'),'diagnostic origin must be Portless HTTPS .localhost');
if(!diagnostic)assert.ok(!option('--origin')||option('--origin')===frozen.origin,'original origin must equal frozen config');
const runId=`${Date.now()}-${randomUUID()}`;
const out=path.join(work,'runs',`${mode}-${arm}-${rows}-${runId}`);
await mkdir(out,{recursive:true});
const recordPath=path.join(out,'record.json');
const record={schemaVersion:'dense-ledger-record-v1',mode,arm,rows,runId,status:'STARTED',nodeVersion:process.version,sourceIdentity:diagnostic?'archived-source-diagnostic-snapshot':'frozen-qualified-build04',buildLockSha256:diagnostic?await hash(path.join(work,'build-lock.json')):await hash(path.join(root,'results/current-owner-kernel-headless-v1/frozen-config.json')),origin,startedAt:new Date().toISOString(),browser:null,navigation:null,timerQuantumMs:null,assetResponses:[],pageErrors:[],cleanupErrors:[],result:null,stopReason:null,error:null,completedAt:null};
await writeFile(recordPath,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
const responses=[];const responseJobs=[];const errors=[];
let browser,context,page,stopResolve;
const stopped=new Promise(resolve=>{stopResolve=resolve});
const deadlineAt=Date.now()+90_000;
function stop(reason){if(record.stopReason)return;record.stopReason=reason;stopResolve(reason);browser?.close().catch(e=>record.cleanupErrors.push(`stop browser close: ${String(e)}`));}
const sigint=()=>stop('SIGINT'),sigterm=()=>stop('SIGTERM');
process.on('SIGINT',sigint);process.on('SIGTERM',sigterm);
const deadline=setTimeout(()=>stop('deadline-90s'),90_000);
const remaining=()=>Math.max(1,Math.min(80_000,deadlineAt-Date.now()));
try{
  const opening=openBrowser({headless:true,gpu:false,handleSignals:false}).then(async instance=>{if(record.stopReason){await instance.close().catch(e=>record.cleanupErrors.push(`late browser close: ${String(e)}`));throw Error('Stopped during browser opening')}return instance});
  browser=await Promise.race([opening,stopped.then(reason=>{throw Error(`stopped opening: ${reason}`)})]);
  record.browser={version:browser.version(),headless:true,gpu:false,viewport:{width:1200,height:900}};
  context=await browser.newContext({viewport:{width:1200,height:900},deviceScaleFactor:1});
  page=await context.newPage();
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('response',response=>{responseJobs.push((async()=>{
    const url=new URL(response.url());if(url.origin!==origin||!assetMap.has(url.pathname))return;
    const body=await response.body();
    responses.push({path:url.pathname,status:response.status(),sha256:sha(body),expectedSha256:assetMap.get(url.pathname),headers:await response.allHeaders()});
  })());});
  const url=new URL('/high-frequency.html',origin);
  for(const [k,v] of Object.entries({arm,rows:String(rows),dirty:'all',placement:'contiguous',programs:'homogeneous'}))url.searchParams.set(k,v);
  if(diagnostic)url.searchParams.set('ledger',mode);
  const navigation=await page.goto(url.toString(),{waitUntil:'domcontentloaded',timeout:remaining()});
  record.navigation={status:navigation?.status(),headers:await navigation?.allHeaders(),crossOriginIsolated:await page.evaluate(()=>globalThis.crossOriginIsolated)};
  await page.waitForFunction(()=>globalThis.__highFrequencyResult!==undefined,undefined,{timeout:remaining()});
  record.result=await page.evaluate(()=>globalThis.__highFrequencyResult);
  record.timerQuantumMs=await page.evaluate(()=>{let previous=performance.now(),minimum=Infinity;for(let i=0;i<4096;i++){const next=performance.now(),delta=next-previous;if(delta>0&&delta<minimum)minimum=delta;previous=next}return Number.isFinite(minimum)?minimum:null});
  await Promise.all(responseJobs);
  assert.equal(record.navigation.status,200);
  assert.equal(record.navigation.crossOriginIsolated,true);
  assert.equal(record.navigation.headers['cross-origin-opener-policy'],'same-origin');
  assert.equal(record.navigation.headers['cross-origin-embedder-policy'],'require-corp');
  assert.equal(record.result.status,'PASS');
  assert.equal(record.result.production,true);
  assert.equal(record.result.arm,arm);assert.equal(record.result.rows,rows);
  assert.equal(record.result.samples.length,240);assert.equal(record.result.warmupSamples.length,60);
  assert.ok(Number.isFinite(record.timerQuantumMs)&&record.timerQuantumMs>0);
  assert.deepEqual(record.result.checks,{output:true,order:true,identity:true,lifecycle:true,deadSetters:true,visible:true});
  assert.deepEqual(record.result.errors,[]);
  assert.deepEqual(record.result.active,{mounts:rows,cleanups:0,writers:rows});
  assert.deepEqual(record.result.afterDispose,{mounts:rows,cleanups:rows,writers:0});
  assert.equal(record.result.deadSetterProbeCount,rows);
  assert.equal(record.result.deadSetterThrows,arm==='native'?rows:0);
  assert.deepEqual(errors,[]);
  if(diagnostic){
    assert.equal(record.result.ledger?.mode,mode);
    assert.ok(mode==='on'?record.result.ledger.events.length>0:record.result.ledger.events.length===0);
    assert.ok(mode==='count'?Object.keys(record.result.ledger.counts).length>0:Object.keys(record.result.ledger.counts).length===0);
  }
  const needed=['/high-frequency.html',...assets.filter(x=>x.file.endsWith('.css')||x.file.endsWith('.js')).map(x=>'/'+x.file).filter(x=>!x.includes(arm==='native'?'react_high_frequency_arm-':'native_high_frequency_arm-'))];
  for(const name of needed) assert.ok(responses.some(x=>x.path===name),`missing served asset ${name}`);
  for(const item of responses)assert.ok(item.status===200&&item.sha256===item.expectedSha256,`served asset drift ${item.path}`);
  record.status='PASS';
}catch(e){record.status=record.stopReason?'INCOMPLETE':'FAIL';record.error=String(e?.stack??e)}
finally{
  const closeBounded=async(label,promise)=>{
    if(!promise)return;
    const ms=Math.max(1,Math.min(5000,deadlineAt-Date.now()));
    let timer;
    try{await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(`cleanup timeout after ${ms} ms`)),ms)})])}
    catch(e){record.cleanupErrors.push(`${label}: ${String(e)}`)}
    finally{clearTimeout(timer)}
  };
  await closeBounded('context close',context?.close());
  await closeBounded('browser close',browser?.close());
  clearTimeout(deadline);process.off('SIGINT',sigint);process.off('SIGTERM',sigterm);
  record.assetResponses=responses;record.pageErrors=errors;record.completedAt=new Date().toISOString();
  if(record.stopReason&&record.status==='PASS'){record.status='INCOMPLETE';record.error=`Stop requested: ${record.stopReason}`}
  if(record.cleanupErrors.length&&record.status==='PASS'){record.status='FAIL';record.error=`Cleanup failed: ${record.cleanupErrors.join('; ')}`}
  await writeFile(recordPath,JSON.stringify(record,null,2)+'\n');
}
if(record.status!=='PASS')process.exitCode=1;
console.log(`${record.status} ${recordPath}`);
