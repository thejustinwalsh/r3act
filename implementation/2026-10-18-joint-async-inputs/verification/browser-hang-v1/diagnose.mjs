import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { openBrowser } from 'vitexec/cli';

const root = process.cwd();
const proofDir = path.join(root, 'implementation/2026-10-18-joint-async-inputs/benchmark/proof-v2');
const proof = JSON.parse(await readFile(path.join(proofDir, 'build-proof.json'), 'utf8'));
const origin = 'https://r3act-joint-async-inputs.localhost';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const manifest = new Map(proof.assets.map((asset) => [asset.urlPath, asset]));
const htmlPath = [...manifest.keys()].find((item) => item.endsWith('.html'));
const output = path.join(root, 'implementation/2026-10-18-joint-async-inputs/verification/browser-hang-v1');
const record = { status: 'STARTED', origin, proofSha256: sha(await readFile(path.join(proofDir, 'build-proof.json'))), browserVersion: null,
  steps: [], servedAssets: [], errors: [], paused: null, dom: null, scriptUrls: [], processCleanup: 'browser.close in finally' };
let browser, context, page, cdp, paused = false;
const started = Date.now();
const step = (name, detail = {}) => record.steps.push({ name, atMs: Date.now() - started, ...detail });
try {
  step('launch');
  browser = await openBrowser({ headless: true, gpu: false, handleSignals: false });
  record.browserVersion = browser.version();
  context = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  page = await context.newPage();
  page.on('pageerror', (error) => record.errors.push({ type: 'pageerror', error: String(error) }));
  page.on('console', (message) => { if (message.type() === 'error') record.errors.push({ type: 'console', error: message.text() }); });
  page.on('requestfailed', (request) => record.errors.push({ type: 'requestfailed', url: request.url(), reason: request.failure()?.errorText }));
  await context.route('**/*', async (route) => {
    const request = new URL(route.request().url());
    if (request.origin !== origin) { record.errors.push({ type: 'blocked', url: request.href }); await route.abort(); return; }
    const asset = manifest.get(request.pathname);
    if (!asset) { record.errors.push({ type: 'missing-asset', url: request.href }); await route.abort(); return; }
    const body = await readFile(path.join(root, asset.path));
    if (sha(body) !== asset.sha256) throw new Error(`asset hash mismatch: ${request.pathname}`);
    record.servedAssets.push({ path: request.pathname, sha256: asset.sha256, bytes: body.length });
    const type = request.pathname.endsWith('.html') ? 'text/html; charset=utf-8' : request.pathname.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'application/octet-stream';
    await route.fulfill({ status: 200, headers: { 'content-type': type, 'cache-control': 'no-store' }, body });
  });
  step('goto-start', { path: htmlPath });
  const response = await page.goto(new URL(htmlPath, origin).href, { waitUntil: 'load', timeout: 8000 });
  step('goto-done', { responseStatus: response?.status(), title: await page.title() });
  cdp = await context.newCDPSession(page);
  await cdp.send('Debugger.enable');
  const scriptIds = new Map();
  cdp.on('Debugger.scriptParsed', (event) => { scriptIds.set(event.scriptId, { url: event.url, scriptId: event.scriptId, hash: event.hash }); });
  record.pageReady = await page.evaluate(() => ({ secure: isSecureContext, hasRunner: Boolean(window.__jointAsyncInputsPair), html: document.body.innerHTML }));
  if (!record.pageReady.hasRunner) throw new Error('joint benchmark runner did not initialize');
  await page.evaluate(() => { window.__diagnosticRun = window.__jointAsyncInputsPair.run('native').then((value) => { window.__diagnosticResult = value; }, (error) => { window.__diagnosticError = String(error); }); });
  step('native-run-started');
  await new Promise((resolve) => setTimeout(resolve, 1500));
  let pausedEvent;
  const eventPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Debugger.paused event timeout')), 2000);
    cdp.once('Debugger.paused', (event) => { clearTimeout(timer); resolve(event); });
  });
  await cdp.send('Debugger.pause');
  try {
    pausedEvent = await eventPromise;
    paused = true;
    record.paused = { reason: pausedEvent.reason, data: pausedEvent.data, hitBreakpoints: pausedEvent.hitBreakpoints,
      callFrames: pausedEvent.callFrames, scriptUrls: [...scriptIds.values()] };
    const dom = await cdp.send('Runtime.evaluate', { expression: `JSON.stringify({url:location.href,readyState:document.readyState,body:document.body.innerHTML,activeElement:document.activeElement?.outerHTML??null,runSettled:Boolean(window.__diagnosticResult),runError:window.__diagnosticError??null})`, returnByValue: true, awaitPromise: false });
    record.dom = dom.result?.result?.value ?? dom.result;
    const snapshot = await cdp.send('DOMSnapshot.captureSnapshot', { computedStyles: [] });
    await writeFile(path.join(output, 'dom-snapshot.json'), JSON.stringify(snapshot));
    step('paused-captured', { callFrames: pausedEvent.callFrames.length, scripts: scriptIds.size });
  } catch (error) {
    record.errors.push({ type: 'cdp-pause', error: String(error) });
    record.dom = await page.evaluate(() => ({ url: location.href, readyState: document.readyState, body: document.body.innerHTML,
      runSettled: Boolean(window.__diagnosticResult), runError: window.__diagnosticError ?? null })).catch((e) => ({ error: String(e) }));
    record.scriptUrls = [...scriptIds.values()];
  }
  record.status = record.paused ? 'PAUSED_CAPTURED' : 'DOM_CAPTURED_CDP_UNAVAILABLE';
} catch (error) {
  record.status = 'INCOMPLETE'; record.errors.push({ type: 'diagnostic', error: String(error), stack: error?.stack });
} finally {
  if (paused && cdp) { try { await cdp.send('Debugger.resume'); step('debugger-resumed'); } catch (error) { record.errors.push({ type: 'resume', error: String(error) }); } }
  try { await context?.close(); } catch (error) { record.errors.push({ type: 'context-close', error: String(error) }); }
  try { await browser?.close(); } catch (error) { record.errors.push({ type: 'browser-close', error: String(error) }); }
  record.finishedAtMs = Date.now() - started;
  await writeFile(path.join(output, 'diagnostic.json'), JSON.stringify(record, null, 2) + '\n');
}
console.log(JSON.stringify({ status: record.status, finishedAtMs: record.finishedAtMs, diagnostic: path.join(output, 'diagnostic.json') }));
if (record.status === 'INCOMPLETE') process.exitCode = 1;
