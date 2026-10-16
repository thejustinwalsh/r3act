import { openBrowser } from 'vitexec/cli';
import { readFile, writeFile } from 'node:fs/promises';
const sourcePath='src/browser/async_transition_stress_v1.tsx';
const original=await readFile(sourcePath,'utf8');
const browser=await openBrowser({gpu:false});
try {
  const context=await browser.newContext({ignoreHTTPSErrors:true});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('https://async-transition-stress.localhost:1355/async-transition-stress-v1.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>Boolean(globalThis.__nativeStress));
  await page.evaluate(()=>{globalThis.__oldFacade=globalThis.__nativeStress;});
  await page.locator('details.runtime summary').click();
  await page.locator('#transition').click();
  await writeFile(sourcePath,original+'\n// temporary HMR lifecycle verification\n');
  await page.waitForFunction(()=>globalThis.__nativeStress && globalThis.__nativeStress!==globalThis.__oldFacade);
  const result=await page.evaluate(()=>({old:globalThis.__oldFacade.getSnapshot(),current:globalThis.__nativeStress.getSnapshot(),roots:document.querySelectorAll('[data-root-view]').length,rows:document.querySelectorAll('[data-item-id]').length}));
  if(!result.old.disposed || result.old.pending.length || result.old.attachedRoots.length) throw new Error('Old HMR instance retained '+JSON.stringify(result.old));
  if(result.roots!==3 || result.rows!==2 || result.current.completed!==0) throw new Error('HMR duplicate/remount failure '+JSON.stringify(result));
  if(errors.length) throw new Error(errors.join('\n'));
  await writeFile('.cache/implementation-2026-10-12/hmr-result.json',JSON.stringify({status:'PASS',errors,...result},null,2)+'\n');
  console.log('HMR teardown/remount PASS');
} finally {
  await browser.close();
  await writeFile(sourcePath,original);
}
