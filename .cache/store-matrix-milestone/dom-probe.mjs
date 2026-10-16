import {openBrowser} from 'vitexec/cli';
const browser=await openBrowser({gpu:false});try{
const context=await browser.newContext({ignoreHTTPSErrors:true});const page=await context.newPage();
await page.goto('https://async-transition-stress.localhost:1355/native-task-transitions.html');
console.log(await page.evaluate(async()=>{const {DOMVDOMHost}=await import('/src/vdom_snapshot_runtime.ts');const host=new DOMVDOMHost();const box=document.createElement('input');box.type='checkbox';host.setProp(box,'checked',true,undefined);host.setProp(box,'checked',false,true);const input=document.createElement('input');host.setProp(input,'value','old',undefined);host.setProp(input,'value',null,'old');const aria=document.createElement('button');host.setProp(aria,'aria-pressed',false,true);return {checked:box.checked,value:input.value,ariaPressed:aria.getAttribute('aria-pressed')};}));
}finally{await browser.close();}
