import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openBrowser} from 'vitexec/cli';
const here=path.dirname(fileURLToPath(import.meta.url)),work=path.resolve(here,'..');
const args=process.argv.slice(2),option=k=>{const i=args.indexOf(k);return i<0?null:args[i+1]??null};
assert.equal(process.version,'v24.18.0','Recording requires pinned Node v24.18.0');
assert.equal(args.length,6,'Usage: collect-allocation-one.mjs --arm native|react --rows 128|1024|10000 --origin PORTLESS_HTTPS_ORIGIN');
const arm=option('--arm'),rows=Number(option('--rows')),origin=option('--origin');
assert.ok(['native','react'].includes(arm)&&[128,1024,10000].includes(rows));
assert.ok(origin&&new URL(origin).protocol==='https:'&&new URL(origin).hostname.endsWith('.localhost'));
const sha=x=>createHash('sha256').update(x).digest('hex'),hash=async f=>sha(await readFile(f));
const lock=JSON.parse(await readFile(path.join(work,'build-lock.json')));
assert.equal(process.version,lock.nodeVersion);
assert.equal(await hash(path.join(work,'source-manifest.json')),lock.sourceManifestSha256);
for(const [name,expected] of Object.entries(lock.tooling))assert.equal(await hash(path.join(here,name)),expected,`tooling drift ${name}`);
const sourceManifest=JSON.parse(await readFile(path.join(work,'source-manifest.json')));
for(const [name,expected] of Object.entries(sourceManifest.after))assert.equal(await hash(path.join(work,'snapshot',name)),expected);
const assets=new Map();
for(const item of lock.assets){assert.equal(await hash(path.join(work,'build/dist',item.file)),item.sha256);if(!item.file.endsWith('.map'))assets.set('/'+item.file,item.sha256)}
const runId=`${Date.now()}-${randomUUID()}`,out=path.join(work,'allocation-runs',`${arm}-${rows}-${runId}`);
await mkdir(out,{recursive:true});
const recordPath=path.join(out,'record.json'),profilePath=path.join(out,'sampled-allocation.json');
const record={schemaVersion:'dense-ledger-allocation-v1',status:'STARTED',arm,rows,runId,sourceIdentity:'archived-source-diagnostic-snapshot',buildLockSha256:await hash(path.join(work,'build-lock.json')),origin,nodeVersion:process.version,samplingIntervalBytes:32768,scope:'After 60 warmup frames, 240 immediate all-dirty synchronous commits; no RAF, dirty selection, DOM inspection or disposal inside sampled window. Separate allocation diagnostic; never a latency comparator.',browser:null,navigation:null,heapBefore:null,heapAfter:null,profile:null,result:null,assetResponses:[],pageErrors:[],cleanupErrors:[],stopReason:null,error:null};
await writeFile(recordPath,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
const replies=[],jobs=[],errors=[];
let browser,context,page,session,sampling=false,stopResolve;
const stopped=new Promise(resolve=>{stopResolve=resolve}),deadlineAt=Date.now()+90_000;
function stop(reason){if(record.stopReason)return;record.stopReason=reason;stopResolve(reason);browser?.close().catch(e=>record.cleanupErrors.push(`stop browser close: ${String(e)}`))}
const sigint=()=>stop('SIGINT'),sigterm=()=>stop('SIGTERM');
process.on('SIGINT',sigint);process.on('SIGTERM',sigterm);const deadline=setTimeout(()=>stop('deadline-90s'),90_000);
const remaining=()=>Math.max(1,deadlineAt-Date.now());
const gate=async label=>page.waitForFunction(expected=>globalThis.__denseLedgerGate===expected,label,{timeout:remaining()});
try{
  const opening=openBrowser({headless:true,gpu:false,handleSignals:false}).then(async x=>{if(record.stopReason){await x.close().catch(e=>record.cleanupErrors.push(`late browser close: ${String(e)}`));throw Error('stopped opening')}return x});
  browser=await Promise.race([opening,stopped.then(reason=>{throw Error(`stopped opening ${reason}`)})]);
  record.browser={version:browser.version(),headless:true,gpu:false,viewport:{width:1200,height:900}};
  context=await browser.newContext({viewport:{width:1200,height:900},deviceScaleFactor:1});page=await context.newPage();
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('response',response=>jobs.push((async()=>{const u=new URL(response.url());if(u.origin!==origin||!assets.has(u.pathname))return;const body=await response.body();replies.push({path:u.pathname,status:response.status(),sha256:sha(body),expectedSha256:assets.get(u.pathname)})})()));
  session=await context.newCDPSession(page);await session.send('Runtime.enable');await session.send('HeapProfiler.enable');
  const url=new URL('/high-frequency.html',origin);
  for(const [k,v] of Object.entries({arm,rows:String(rows),dirty:'all',placement:'contiguous',programs:'homogeneous',ledger:'allocation'}))url.searchParams.set(k,v);
  const response=await page.goto(url.toString(),{waitUntil:'domcontentloaded',timeout:remaining()});
  record.navigation={status:response?.status(),headers:await response?.allHeaders(),crossOriginIsolated:await page.evaluate(()=>globalThis.crossOriginIsolated)};
  await gate('warmup-complete');
  record.heapBefore=await session.send('Runtime.getHeapUsage');
  await session.send('HeapProfiler.startSampling',{samplingInterval:32768,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true});sampling=true;
  await page.evaluate(()=>globalThis.__denseLedgerRelease());
  await gate('updates-complete');
  const stoppedProfile=await session.send('HeapProfiler.stopSampling');sampling=false;
  record.heapAfter=await session.send('Runtime.getHeapUsage');
  assert.ok(stoppedProfile.profile?.head);
  await writeFile(profilePath,JSON.stringify(stoppedProfile.profile)+'\n',{flag:'wx'});
  record.profile={path:'sampled-allocation.json',sha256:await hash(profilePath)};
  await page.evaluate(()=>globalThis.__denseLedgerRelease());
  await page.waitForFunction(()=>globalThis.__highFrequencyResult!==undefined,undefined,{timeout:remaining()});
  record.result=await page.evaluate(()=>globalThis.__highFrequencyResult);
  await Promise.all(jobs);
  assert.equal(record.navigation.status,200);assert.equal(record.navigation.crossOriginIsolated,true);
  assert.equal(record.navigation.headers['cross-origin-opener-policy'],'same-origin');assert.equal(record.navigation.headers['cross-origin-embedder-policy'],'require-corp');
  assert.equal(record.result.status,'PASS');assert.equal(record.result.ledger.mode,'allocation');
  assert.equal(record.result.samples.length,240);assert.equal(record.result.arm,arm);assert.equal(record.result.rows,rows);
  assert.deepEqual(record.result.checks,{output:true,order:true,identity:true,lifecycle:true,deadSetters:true,visible:true});
  assert.deepEqual(record.result.errors,[]);
  assert.deepEqual(record.result.active,{mounts:rows,cleanups:0,writers:rows});
  assert.deepEqual(record.result.afterDispose,{mounts:rows,cleanups:rows,writers:0});
  assert.equal(record.result.deadSetterProbeCount,rows);
  assert.equal(record.result.deadSetterThrows,arm==='native'?rows:0);
  assert.deepEqual(errors,[]);
  for(const item of replies)assert.ok(item.status===200&&item.sha256===item.expectedSha256);
  for(const name of ['/high-frequency.html',...lock.assets.filter(x=>x.file.endsWith('.js')||x.file.endsWith('.css')).map(x=>'/'+x.file).filter(x=>!x.includes(arm==='native'?'react_high_frequency_arm-':'native_high_frequency_arm-'))])assert.ok(replies.some(x=>x.path===name),`missing asset ${name}`);
  record.status='PASS';
}catch(e){record.status=record.stopReason?'INCOMPLETE':'FAIL';record.error=String(e?.stack??e)}
finally{
  const closeBounded=async(label,promise)=>{
    if(!promise)return;const ms=Math.max(1,Math.min(5000,deadlineAt-Date.now()));let timer;
    try{await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(`cleanup timeout after ${ms} ms`)),ms)})])}
    catch(e){record.cleanupErrors.push(`${label}: ${String(e)}`)}finally{clearTimeout(timer)}
  };
  if(sampling&&session)await closeBounded('HeapProfiler stop',session.send('HeapProfiler.stopSampling'));
  await closeBounded('CDP detach',session?.detach());
  await closeBounded('context close',context?.close());
  await closeBounded('browser close',browser?.close());
  clearTimeout(deadline);process.off('SIGINT',sigint);process.off('SIGTERM',sigterm);
  record.assetResponses=replies;record.pageErrors=errors;record.completedAt=new Date().toISOString();
  if(record.stopReason&&record.status==='PASS'){record.status='INCOMPLETE';record.error=`Stop requested: ${record.stopReason}`}
  if(record.cleanupErrors.length&&record.status==='PASS'){record.status='FAIL';record.error=`Cleanup failed: ${record.cleanupErrors.join('; ')}`}
  await writeFile(recordPath,JSON.stringify(record,null,2)+'\n');
}
if(record.status!=='PASS')process.exitCode=1;
console.log(`${record.status} ${recordPath}`);
