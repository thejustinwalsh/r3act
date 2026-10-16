import {openBrowser} from 'vitexec/cli';
import {readFile} from 'node:fs/promises';
const browser=await openBrowser({gpu:false});
try {
 const page=await browser.newPage({viewport:{width:1020,height:520}});
 await page.setContent(await readFile('results/product-mixed-identity-v3-summary.svg','utf8'));
 await page.screenshot({path:'.cache/product-mixed-identity-v3-evidence/chart.png'});
 console.log('Rendered SVG at native figure dimensions.');
} finally {await browser.close();}
