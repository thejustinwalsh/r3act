import assert from 'node:assert/strict';
import {openBrowser} from 'vitexec/cli';
import {readFile,writeFile} from 'node:fs/promises';
const source='src/browser/native_collection_props.tsx';const original=await readFile(source,'utf8');const browser=await openBrowser({gpu:false});const errors=[];
try{
 const context=await browser.newContext({ignoreHTTPSErrors:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://async-transition-stress.localhost:1355/native-collection-props.html',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Insert before first',exact:true}).waitFor();
 await page.evaluate(()=>{window.__oldCollectionFacade=window.__nativeCollectionDemoDiagnostics;});
 await writeFile(source,original+'\n// Collection HMR lifecycle verification\n');
 await page.waitForFunction(()=>window.__nativeCollectionDemoDiagnostics && window.__nativeCollectionDemoDiagnostics!==window.__oldCollectionFacade);
 const old=await page.evaluate(()=>window.__oldCollectionFacade.snapshot());assert.equal(old.root.disposed,true);assert.equal(old.root.ownerCount,0);assert.equal(old.activeEffectCount,0);assert.equal(old.registeredWriterCount,0);assert.equal(old.collection.readerCount,0);assert.equal(old.collection.retainedBatches,0);
 assert.equal(await page.locator('.demo-root').count(),1);assert.equal(await page.locator('.collection-row').count(),32);
 await page.waitForTimeout(100);assert.equal(errors.length,0,errors.join('\n'));
 await writeFile('.cache/native-collection-milestone/hmr-result.json',JSON.stringify({status:'PASS',old,rows:32,hostTrees:1,errors},null,2));
 console.log('Collection HMR PASS: old effects/writers/readers disposed; exactly one remounted tree.');
}finally{await writeFile(source,original);await browser.close();}
