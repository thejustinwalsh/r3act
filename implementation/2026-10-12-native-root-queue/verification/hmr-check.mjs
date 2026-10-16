import assert from 'node:assert/strict';
import {utimes,writeFile} from 'node:fs/promises';
import {openBrowser} from 'vitexec/cli';
const browser=await openBrowser({gpu:false});const errors=[];
try{
 const context=await browser.newContext({ignoreHTTPSErrors:true});const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('https://async-transition-stress.localhost:1355/native-root-queue.html',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Start overlapping batch'}).click();
 await page.evaluate(()=>window.__previousQueueFacade=window.__nativeRootQueueDemoDiagnostics);
 const now=new Date();await utimes('src/browser/native_root_queue.tsx',now,now);
 await page.waitForFunction(()=>window.__nativeRootQueueDemoDiagnostics&&window.__nativeRootQueueDemoDiagnostics!==window.__previousQueueFacade);
 const result=await page.evaluate(()=>({old:window.__previousQueueFacade.snapshot(),current:window.__nativeRootQueueDemoDiagnostics.snapshot()}));
 assert.equal(result.old.disposed,true);assert.equal(result.old.mainRoot.ownerCount,0);assert.equal(result.old.forkRoot.ownerCount,0);
 assert.equal(result.old.activeResourceTimers,0);assert.equal(result.old.clockTimerActive,false);
 for(const key of ['store','forkStore','queueStore']){assert.equal(result.old[key].roots,0);assert.equal(result.old[key].listeners,0);assert.equal(result.old[key].readers,0);assert.equal(result.old[key].retainedActions,0);assert.equal(result.old[key].transitions,0);}
 assert.equal(result.current.disposed,false);assert.equal(result.current.clockTimerActive,true);assert.equal(result.current.activeResourceTimers,0);
 assert.equal(result.current.store.value,0);assert.equal(result.current.forkStore.value,0);
 assert.equal(await page.getByRole('textbox',{name:'Main editable draft',exact:true}).count(),1);
 assert.equal(await page.getByRole('textbox',{name:'Fork editable draft',exact:true}).count(),1);
 await page.waitForTimeout(200);assert.equal(errors.length,0,errors.join('\n'));
 await writeFile('.cache/native-root-queue-milestone/hmr-result.json',JSON.stringify({status:'PASS',...result,errors},null,2));
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 console.log('PASS HMR: old timers/scopes/owners/store readers released; exactly one fresh main/fork pair with fresh stores and clock.');
}finally{await browser.close();}
