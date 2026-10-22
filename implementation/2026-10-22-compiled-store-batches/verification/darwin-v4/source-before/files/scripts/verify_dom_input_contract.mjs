import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {transformWithOxc} from 'vite';
import {openBrowser} from 'vitexec/cli';
import {nativeModuleCompilerPlugin} from '../compiler/vite_native_module.ts';
const origin=process.env.NATIVE_TEST_ORIGIN??'https://async-transition-stress.localhost:1355';
const directory=path.resolve('.');const output=path.join(directory,'.cache/dom-input-contract.mjs');
const authored=`// @native-ui
/** @jsxRuntime classic */
/** @jsx jsx */
import {createDOMRoot,useState,jsx} from '${origin}/src/native_runtime_api.ts';
function InputContract(){
 const[checked,setChecked]=useState(false);
 const[text,setText]=useState('seed');
 return <section><label>Probe checkbox<input type="checkbox" checked={checked} onChange={(event:Event)=>setChecked((event.target as HTMLInputElement).checked)}/></label><button onClick={()=>setChecked(false)}>Reset checkbox</button><label>Probe text<input value={text} onInput={(event:Event)=>setText((event.target as HTMLInputElement).value)}/></label><output data-probe-text="yes">{text}</output><button onClick={()=>setText('')}>Reset text</button><button aria-pressed={checked} data-enabled={checked}>Probe toggle</button></section>;
}
export function mount(container:HTMLElement){const root=createDOMRoot(container,{rootId:'dom-input-contract'});root.mount(<InputContract/>);return()=>root.dispose();}
`;
const plugin=nativeModuleCompilerPlugin({root:directory});
try{
const result=await plugin.transform.call({addWatchFile(){},error(message){throw Error(String(message));}},authored,path.join(directory,'.cache/dom-input-contract.tsx'));
assert.ok(result.code.includes('useStateAt'),'Probe must use real Rust state lowering');
const emitted=await transformWithOxc(result.code,'.cache/dom-input-contract.tsx',{lang:'tsx',jsx:{runtime:'classic'}});
await mkdir(path.dirname(output),{recursive:true});await writeFile(output,emitted.code);
}finally{await plugin.closeBundle();}
const browser=await openBrowser({gpu:false});const errors=[];
try{
const context=await browser.newContext({ignoreHTTPSErrors:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto(origin+'/native-task-transitions.html',{waitUntil:'networkidle'});
await page.evaluate(async()=>{const module=await import('/.cache/dom-input-contract.mjs');const container=document.createElement('div');container.id='dom-input-contract';document.body.append(container);window.__disposeDOMProbe=module.mount(container);});
const fixture=page.locator('#dom-input-contract');const checkbox=fixture.getByRole('checkbox',{name:'Probe checkbox'});
assert.equal(await checkbox.isChecked(),false);await checkbox.check();assert.equal(await checkbox.isChecked(),true);
await fixture.getByRole('button',{name:'Reset checkbox',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#dom-input-contract input[type=checkbox]').checked);
const toggle=fixture.getByRole('button',{name:'Probe toggle',exact:true});assert.equal(await toggle.getAttribute('aria-pressed'),'false');assert.equal(await toggle.getAttribute('data-enabled'),'false');
const text=fixture.getByRole('textbox',{name:'Probe text',exact:true});await text.fill('abc');await text.focus();await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');assert.equal(await text.evaluate(n=>n.selectionStart),1);await page.keyboard.type('Z');
assert.equal(await text.inputValue(),'aZbc');assert.equal(await fixture.locator('output').textContent(),'aZbc');assert.equal(await text.evaluate(n=>n.selectionStart),2);
await fixture.getByRole('button',{name:'Reset text',exact:true}).click();assert.equal(await text.inputValue(),'');
const propertyCases=await page.evaluate(async()=>{const {DOMVDOMHost}=await import('/src/vdom_snapshot_runtime.ts');const host=new DOMVDOMHost();
const result={};for(const tag of ['input','textarea','select']){const node=document.createElement(tag);if(tag==='select'){const option=document.createElement('option');option.value='old';node.append(option);}host.setProp(node,'value','old',undefined);host.setProp(node,'value',null,'old');result[tag]=node.value;}
const option=document.createElement('option');host.setProp(option,'selected',true,undefined);host.setProp(option,'selected',false,true);result.selected=option.selected;
const input=document.createElement('input');host.setProp(input,'readOnly',true,undefined);host.setProp(input,'readOnly',null,true);result.readOnly=input.readOnly;
const aria=document.createElement('button');host.setProp(aria,'aria-hidden',false,undefined);result.ariaFalse=aria.getAttribute('aria-hidden');host.setProp(aria,'aria-hidden',undefined,false);result.ariaRemoved=aria.hasAttribute('aria-hidden');return result;});
assert.deepEqual(propertyCases,{input:'',textarea:'',select:'',selected:false,readOnly:false,ariaFalse:'false',ariaRemoved:false});
await page.evaluate(()=>{window.__disposeDOMProbe();document.getElementById('dom-input-contract').remove();window.dispatchEvent(new Event('pagehide'));});assert.deepEqual(errors,[]);
console.log('PASS native DOM inputs: Rust-authored checkbox/state updates, false/null live property clearing, ARIA/data false values, controlled keyboard insertion/caret and disposal.');
}finally{await browser.close();}
