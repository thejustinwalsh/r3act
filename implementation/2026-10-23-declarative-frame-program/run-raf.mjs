import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openBrowser} from 'vitexec/cli';
const unit=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(unit,'../..');
const proof=path.resolve(process.argv[2]??'');assert.equal(path.dirname(proof),unit);
const mode=process.argv[3];assert.ok(['proof','timing'].includes(mode));
const buildBytes=await readFile(path.join(proof,'build-proof.json'));
const build=JSON.parse(buildBytes);assert.equal(build.status,'PASS');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceFreeze=JSON.parse(await readFile(path.join(unit,'source-review-current.json'),'utf8'));
const order=mode==='proof'?['native','react','react-frame','native-rebundled']:
 ['native','react','react-frame','react-frame','react','native','react','react-frame','native','native','react-frame','react'];
const output=path.join(proof,mode==='proof'?'browser-proof.json':'raf-timing-one-shot.json');
let authorizationSha256=null;
if(mode==='timing'){
 const priorBytes=await readFile(path.join(proof,'browser-proof.json'));
 const prior=JSON.parse(priorBytes);assert.equal(prior.status,'PASS');assert.equal(prior.browserClosed,true);
 const authorizationBytes=await readFile(path.join(proof,'raf-timing-authorization.json'));
 const authorization=JSON.parse(authorizationBytes);
 assert.equal(authorization.status,'PRIMARY_RELEASED_ONE_BALANCED_RAF_EPISODE');
 assert.equal(authorization.buildSha256,sha(buildBytes));
 assert.equal(authorization.proofSha256,sha(priorBytes));
 authorizationSha256=sha(authorizationBytes);
}
function thermal(){
 if(process.platform!=='darwin')return {available:false};
 const result=spawnSync('/usr/bin/pmset',['-g','therm'],{encoding:'utf8',timeout:3000,maxBuffer:65536});
 return {at:new Date().toISOString(),available:result.status===0,status:result.status,
  stdout:result.stdout,stderr:result.stderr,error:result.error?String(result.error):null};
}
const receipt={status:'STARTED',authorizationSha256,mode,order,buildSha256:sha(buildBytes),contexts:[],errors:[],
 sourceAuditBefore:[],sourceAuditAfter:[],browserClosed:false};
await writeFile(output,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
receipt.harnessSources=await Promise.all(['run-raf.mjs','prepare-raf.mjs','analyze-raf.mjs'].map(async name=>{
 const source=path.join(unit,name);return {path:source,sha256:sha(await readFile(source))};
}));
const inventory=[...receipt.harnessSources,...sourceFreeze.source.map(item=>({...item,path:path.join(root,item.path)})),
 ...build.assets,...build.inputs,...build.packages,...build.packageSources];
async function check(field){for(const item of inventory){
 const actual=sha(await readFile(item.path));receipt[field].push({path:item.path,match:actual===item.sha256});
 assert.equal(actual,item.sha256,`Source/asset mismatch: ${item.path}`);
}}
let browser,opening,interrupted=false,rejectStop;
const stopped=new Promise((_,reject)=>{rejectStop=reject;});void stopped.catch(()=>{});
const stop=()=>{interrupted=true;rejectStop(new Error('RAF episode interrupted/deadline'));
 void browser?.close().catch(()=>{});};
process.once('SIGINT',stop);process.once('SIGTERM',stop);const deadline=setTimeout(stop,90000);
try{
 await check('sourceAuditBefore');
 opening=openBrowser({headless:true,gpu:true,handleSignals:false}).then(async value=>{
  if(interrupted){await value.close();throw new Error('Interrupted browser launch');}return value;});
 browser=await Promise.race([opening,stopped]);
 for(const arm of order){
  const row={arm,status:'STARTED',errors:[],closed:false,
   thermalBefore:mode==='timing'?thermal():null};receipt.contexts.push(row);
  const context=await browser.newContext({viewport:{width:640,height:480}});
  try{
   await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    const asset=build.assets.find(item=>item.urlPath===url.pathname);
    if(url.origin!=='https://declarative-frame.invalid'||!asset){
     if(url.pathname==='/favicon.ico'){await route.fulfill({status:204,body:''});return;}
     row.errors.push(`Unexpected request ${url}`);await route.abort();return;
    }
    await route.fulfill({status:200,body:await readFile(asset.path),headers:{
     'content-type':asset.path.endsWith('.html')?'text/html':'text/javascript',
     'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'"}});
   });
   const page=await context.newPage();page.setDefaultTimeout(15000);
   page.on('pageerror',error=>row.errors.push(String(error)));
   page.on('console',message=>{if(message.type()==='error')row.errors.push(message.text());});
   await page.goto(`https://declarative-frame.invalid/${arm}/${arm==='native-rebundled'?'native':arm}.html${mode==='proof'&&arm.startsWith('native')?'?proof=1':''}`,{waitUntil:'load',timeout:15000});
   await page.waitForFunction(()=>window.__frameProgram?.ready(),null,{polling:'raf',timeout:15000});
   row.result=await Promise.race([page.evaluate(async()=>{
    window.__frameProgram.run();return await window.__frameProgram.done;
   }),stopped]);
   row.cleanup=await page.evaluate(()=>window.__frameProgram.dispose());
   assert.equal(row.result.samples.length,72);assert.ok(row.result.litPixels>0);
   assert.equal(row.cleanup.resources,512);assert.equal(row.cleanup.exactDisposals,512);assert.equal(row.cleanup.remaining,0);
   if(arm!=='react')assert.ok(row.result.samples.every(sample=>sample.drawnEpoch===sample.epoch),
     `${arm} drew stale requested props`);
   if(mode==='proof'&&arm.startsWith('native')){
    assert.ok(row.result.proofDiagnostics?.ownedDataVerifiedRows>0);
    assert.ok(row.result.proofDiagnostics?.ownedDataBatches>0);
    assert.ok(row.result.proofDiagnostics?.callbackPosition>0);
    assert.equal(row.result.proofDiagnostics?.componentRenders,0);
    assert.equal(row.result.proofDiagnostics?.directCuts,72);
   }else assert.equal(row.result.proofDiagnostics,undefined);
   assert.deepEqual(row.errors,[]);row.status='PASS';
  }catch(error){row.status='FAIL';row.errors.push(error.stack??String(error));throw error;}
  finally{await context.close();row.closed=true;row.thermalAfter=mode==='timing'?thermal():null;}
 }
 await check('sourceAuditAfter');receipt.status='PASS';
}catch(error){receipt.status='FAIL';receipt.errors.push(error.stack??String(error));}
finally{
 clearTimeout(deadline);process.off('SIGINT',stop);process.off('SIGTERM',stop);
 if(browser)try{await browser.close();receipt.browserClosed=true;}catch(error){receipt.errors.push(String(error));}
 if(interrupted||receipt.errors.length)receipt.status='FAIL';
 await writeFile(output,JSON.stringify(receipt,null,2)+'\n');
}
assert.equal(receipt.status,'PASS');console.log(JSON.stringify({status:receipt.status,output}));
