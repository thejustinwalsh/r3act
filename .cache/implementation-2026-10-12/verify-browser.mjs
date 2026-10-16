import { openBrowser, run } from 'vitexec/cli';
import { writeFile } from 'node:fs/promises';
const browser = await openBrowser({ gpu: false });
const errors = [];
try {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1360, height: 1050 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response=>{if(response.status()>=400) errors.push(response.status()+' '+response.url());});
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('https://async-transition-stress.localhost:1355/async-transition-stress-v1.html', { waitUntil: 'networkidle' });
  await page.locator('#app').waitFor({ state: 'visible' });
  await page.locator('details.runtime summary').click();
  await run(page, "console.log('browser ready')", { onLog: line=>console.log(line) });
  await page.evaluate(() => { window.__seedNode = document.querySelector('[data-item-id="seed-1"]'); });
  for (let i = 0; i < 3; i++) await page.locator('#transition').click();
  await page.locator('#fork-transition').click();
  await page.locator('#transition').click();
  await run(page, `
    const state = globalThis.__nativeStress.getSnapshot();
    if (state.pending.length !== 5) throw new Error('Expected 5 independent overlapping transitions: '+JSON.stringify(state.pending));
    console.log('overlap', JSON.stringify({pending:state.pending,work:state.work}));
  `, { onLog: line => console.log(line) });
  await page.locator('[data-cancel-transition="T1"]').click();
  await page.locator('#like').click();
  await page.locator('#compose-input').fill('An urgent post while resources are pending');
  await page.locator('#compose-input').press('Enter');
  await page.locator('#compose-input').fill('My next unfinished draft');
  await page.waitForFunction(() => document.querySelector('#pending-count')?.textContent === '0');
  await run(page, `
    const state = globalThis.__nativeStress.getSnapshot();
    if (state.completed !== 4 || state.pending.length || state.failures || state.afterBootFallbacks) throw new Error('Invalid settled state '+JSON.stringify(state));
    if (state.workspace.items.some(item=>item.id==='remote-1')) throw new Error('Cancelled transition published');
    if (state.workspace.likes.length !== 1) throw new Error('Urgent like was lost');
    if (!state.workspace.items.some(item=>item.kind==='user')) throw new Error('Urgent post was lost');
    if (JSON.stringify(state.workspace)!==JSON.stringify(state.inspector)) throw new Error('Settled roots disagree');
    if (document.querySelectorAll('[data-root-view]').length!==3 || document.querySelectorAll('[data-item-id]').length!==state.workspace.items.length) throw new Error('Duplicate mounted roots or items');
    if (document.querySelector('[data-item-id="seed-1"]') !== window.__seedNode) throw new Error('Surviving keyed node identity changed');
    const input=document.querySelector('#compose-input');
    if(input.value!=='My next unfinished draft' || document.activeElement!==input) throw new Error('Draft/focus disrupted');
    console.log('settled',JSON.stringify({completed:state.completed,failures:state.failures,fallbacks:state.afterBootFallbacks,commitOrder:state.trace.filter(x=>x.phase==='committed').map(x=>x.id)}));
  `, { onLog: line => console.log(line) });
  const observation = await page.evaluate(() => globalThis.__nativeStress.getSnapshot());
  if(errors.length) throw new Error(errors.join('\n'));
  await writeFile('.cache/implementation-2026-10-12/browser-result.json', JSON.stringify({status:'PASS',url:page.url(),errors,observation},null,2)+'\n');
  await page.screenshot({path:'.cache/implementation-2026-10-12/browser.png',fullPage:true});
  await page.locator('#transition').click();
  await run(page, `
    const facade=globalThis.__nativeStress;
    facade.dispose();
    const state=facade.getSnapshot();
    if(globalThis.__nativeStress) throw new Error("Disposed debug facade retained");
    if(!state.disposed || state.pending.length || state.work.length || state.attachedRoots.length) throw new Error('Incomplete teardown '+JSON.stringify(state));
    if(document.querySelectorAll('[data-root-view]').length) throw new Error('Disposed host roots retained');
    console.log('teardown PASS');
  `, {onLog:line=>console.log(line)});
  if(errors.length) throw new Error(errors.join('\n'));
  console.log('Browser contracts PASS');
} finally { await browser.close(); }
