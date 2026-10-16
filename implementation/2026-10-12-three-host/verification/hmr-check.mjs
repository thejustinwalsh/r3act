import assert from 'node:assert/strict';
import {utimes,writeFile} from 'node:fs/promises';
import {openBrowser} from 'vitexec/cli';
const browser=await openBrowser({gpu:false});const errors=[];
try{
 const context=await browser.newContext({ignoreHTTPSErrors:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://async-transition-stress.localhost:1355/native-task-transitions.html',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__nativeTaskTransitionDiagnostics);
 await page.getByRole('button',{name:/Deep.*1,800/}).click();
 await page.evaluate(()=>window.__previousTaskFacade=window.__nativeTaskTransitionDiagnostics);
 const now=new Date();await utimes('src/browser/native_task_transitions.tsx',now,now);
 await page.waitForFunction(()=>window.__nativeTaskTransitionDiagnostics&&window.__nativeTaskTransitionDiagnostics!==window.__previousTaskFacade);
 const result=await page.evaluate(()=>({old:window.__previousTaskFacade.snapshot(),current:window.__nativeTaskTransitionDiagnostics.snapshot()}));
 assert.equal(result.old.disposed,true);assert.equal(result.old.activeProviderTimers,0);assert.equal(result.old.effects.active,0);
 for(const root of result.old.roots){assert.equal(root.disposed,true);assert.equal(root.ownerCount,0);}
 for(const store of Object.values(result.old.stores))for(const key of ['roots','readers','listeners','retainedActions','transitions'])assert.equal(store[key],0,`${key} leaked`);
 assert.equal(result.current.disposed,false);assert.equal(result.current.operations.length,0);assert.equal(result.current.effects.active,3);
 assert.equal(await page.locator('[data-native-root]').count(),2);
 assert.deepEqual(errors,[]);
 await writeFile('.cache/three-host-milestone/hmr-results.json',JSON.stringify({status:'PASS',...result,errors},null,2));
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 console.log('PASS task HMR: pending providers, task interests, store scopes/readers/roots, owners/effects released; one fresh main/fork pair.');
}finally{await browser.close();}
