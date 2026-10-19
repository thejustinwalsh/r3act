import assert from 'node:assert/strict';
import {openBrowser} from 'vitexec/cli';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.NATIVE_TEST_ORIGIN??'https://async-transition-stress.localhost:1355';
const output=process.env.NATIVE_INPUT_RESULT??'.cache/store-matrix-milestone/input-browser-results.json';
const browser=await openBrowser({gpu:false});const errors=[];
try{
const context=await browser.newContext({ignoreHTTPSErrors:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto(origin+'/native-task-transitions.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__nativeTaskTransitionDiagnostics);
const main=page.locator('[data-native-root="task-transition-main"]');const query=main.getByRole('textbox',{name:'Live query',exact:true});
await page.getByRole('button',{name:/Quick.*600/}).click();await page.waitForFunction(()=>window.__nativeTaskTransitionDiagnostics.snapshot().operations.every(o=>o.status!=='pending'));
await page.getByRole('button',{name:/Deep.*1,800/}).click();await query.focus();
await query.evaluate(node=>{window.__compositionNode=node;window.__compositionTrace=[];for(const kind of ['compositionstart','compositionupdate','compositionend','input'])node.addEventListener(kind,e=>window.__compositionTrace.push({kind,isComposing:e.isComposing??null,value:node.value,data:e.data??null}));node.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''}));});
// Browser composition protocol simulation. This is not an OS IME test.
await query.evaluate(node=>{node.value='あ';node.setSelectionRange(1,1);node.dispatchEvent(new CompositionEvent('compositionupdate',{bubbles:true,data:'あ'}));node.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertCompositionText',data:'あ',isComposing:true}));});
await page.waitForFunction(()=>window.__nativeTaskTransitionDiagnostics.snapshot().stores.query.value==='あ');
await query.evaluate(node=>{node.value='あい';node.setSelectionRange(1,1);node.dispatchEvent(new CompositionEvent('compositionupdate',{bubbles:true,data:'あい'}));node.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertCompositionText',data:'あい',isComposing:true}));});
await page.waitForFunction(()=>window.__nativeTaskTransitionDiagnostics.snapshot().operations.every(o=>o.status!=='pending'),null,{timeout:10000});
const during=await query.evaluate(node=>({sameNode:node===window.__compositionNode,focused:node===document.activeElement,value:node.value,start:node.selectionStart,end:node.selectionEnd,trace:window.__compositionTrace}));
assert.equal(during.sameNode,true);assert.equal(during.focused,true);assert.equal(during.value,'あい');assert.equal(during.start,1);assert.equal(during.end,1);assert.equal(during.trace.filter(e=>e.kind==='compositionend').length,0);
assert.equal(await page.locator('.error-card').count(),0);assert.equal(await page.locator('.spinner').count(),0);
await query.evaluate(node=>{node.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'あい'}));node.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'あい',isComposing:false}));});
await page.keyboard.type('Z');assert.equal(await query.inputValue(),'あZい');
await page.waitForFunction(()=>window.__nativeTaskTransitionDiagnostics.snapshot().stores.query.value==='あZい');
const final=await page.evaluate(()=>({state:window.__nativeTaskTransitionDiagnostics.snapshot(),trace:window.__compositionTrace}));
assert.equal(final.state.stores.requests.activeScopes,0);assert.equal(final.state.activeProviderTimers,0);assert.equal(final.state.stores.feed.state.items[0].pendingLikeOperationIds.length,0);assert.deepEqual(errors,[]);
await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
await mkdir(new URL('.',new URL(output,'file://'+process.cwd()+'/')),{recursive:true});
await writeFile(output,JSON.stringify({status:'PASS',scope:'Real keyboard/caret check plus simulated browser composition events; not OS IME validation',during,final,errors},null,2));
console.log('PASS async native input: retained node/focus/selection through overlapping task restart/publication, simulated composition lifecycle, real subsequent keyboard insertion and scope cleanup.');
}finally{await browser.close();}
