import { openBrowser } from 'vitexec/cli';
import { readFile } from 'node:fs/promises';
const browser = await openBrowser({ headless:true,gpu:false });
try {
 const page=await browser.newPage({viewport:{width:1060,height:550}});
 await page.setContent(await readFile('results/product-mixed-owner-row-fusion-allocation/summary.svg','utf8'));
 await page.screenshot({path:'.cache/owner-row-fusion-allocation-primary/summary-review.png'});
} finally { await browser.close(); }
