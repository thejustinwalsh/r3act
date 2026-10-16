import {openBrowser} from 'vitexec/cli';
const browser=await openBrowser({gpu:false});
try{
 const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('https://async-transition-stress.localhost:1355/native-resource-boundaries.html',{waitUntil:'networkidle'});
 await page.waitForTimeout(1500);
 console.log(JSON.stringify({errors,text:await page.locator('body').innerText(),state:await page.evaluate(()=>window.__nativeResourceBoundaryDiagnostics?.snapshot())},null,2));
 await page.screenshot({path:'.cache/native-resource-milestone/probe.png',fullPage:true});
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
}finally{await browser.close();}
