import assert from 'node:assert/strict';
import {utimes,writeFile} from 'node:fs/promises';
import {openBrowser} from 'vitexec/cli';
const browser=await openBrowser({gpu:false});const errors=[];
try{
 const context=await browser.newContext({ignoreHTTPSErrors:true});const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('https://async-transition-stress.localhost:1355/native-resource-boundaries.html',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__nativeResourceBoundaryDiagnostics?.snapshot().activeProviderTimers===0);
 await page.getByRole('button',{name:/Start replacement/}).click();
 await page.evaluate(()=>window.__previousResourceFacade=window.__nativeResourceBoundaryDiagnostics);
 const now=new Date();await utimes('src/browser/native_resource_boundaries.tsx',now,now);
 await page.waitForFunction(()=>window.__nativeResourceBoundaryDiagnostics&&window.__nativeResourceBoundaryDiagnostics!==window.__previousResourceFacade);
 const result=await page.evaluate(()=>({old:window.__previousResourceFacade.snapshot(),current:window.__nativeResourceBoundaryDiagnostics.snapshot()}));
 assert.equal(result.old.disposed,true);assert.equal(result.old.activeProviderTimers,0);assert.equal(result.old.pulseTimerActive,false);
 assert.equal(result.old.queue.activeWork.length,0);assert.equal(result.old.queueScopes.length,0);assert.equal(result.old.effects.active,0);
 assert.equal(result.old.roots.length,3);for(const root of result.old.roots){assert.equal(root.disposed,true);assert.equal(root.ownerCount,0);}
 for(const store of Object.values(result.old.stores))for(const key of ['roots','readers','listeners','retainedActions','transitions'])assert.equal(store[key],0,`${key} leaked`);
 assert.equal(result.current.disposed,false);assert.equal(result.current.effects.active,1);assert.equal(result.current.queue.activeWork.length,0);assert.equal(result.current.operations.length,0);assert.equal(result.current.stores.urgentScore.value,18);
 assert.equal(await page.getByRole('textbox',{name:'Main working note',exact:true}).count(),1);
 assert.equal(await page.getByRole('textbox',{name:'Sidecar working note',exact:true}).count(),1);
 assert.equal(await page.locator('.ledger-panel').count(),1);
 await page.waitForFunction(()=>window.__nativeResourceBoundaryDiagnostics.snapshot().activeProviderTimers===0);
 assert.deepEqual(errors,[]);
 await writeFile('.cache/native-resource-milestone/hmr-result.json',JSON.stringify({status:'PASS',...result,errors},null,2));
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 console.log('PASS resource HMR: discarded pending observers, providers/scopes/owners/store readers/effects released, one fresh pair plus workbench, new startup resources reveal.');
}finally{await browser.close();}
