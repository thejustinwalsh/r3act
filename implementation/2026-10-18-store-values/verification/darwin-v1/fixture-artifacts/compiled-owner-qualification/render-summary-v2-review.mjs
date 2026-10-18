import { openBrowser } from 'vitexec/cli';
import { readFile } from 'node:fs/promises';
const browser=await openBrowser({headless:true,gpu:false});
try { const page=await browser.newPage({viewport:{width:1020,height:520}}); await page.setContent(`<html><body style="margin:0">${await readFile('results/product-mixed-compiled-owner-rows-confirmation/summary-v2.svg','utf8')}</body></html>`); await page.screenshot({path:'.cache/compiled-owner-qualification/summary-v2-review.png'}); } finally {await browser.close();}
