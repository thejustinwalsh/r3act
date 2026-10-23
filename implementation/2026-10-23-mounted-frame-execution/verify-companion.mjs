import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBrowser } from 'vitexec/cli';
const unit = path.dirname(fileURLToPath(import.meta.url)), proof = path.resolve(process.argv[2]);
assert.equal(path.dirname(proof), unit);
const attempt = process.argv[3] ?? 'game-companion';
assert.match(attempt, /^game-companion(?:-v[1-9]\d*)?$/);
const out = path.join(proof, attempt), bytes = await readFile(path.join(out, 'build-proof.json'));
const build = JSON.parse(bytes), sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(build.status, 'PASS_MOUNTED_GAME_BUILD');
const record = { status: 'STARTED', buildProofSha256: sha(bytes), errors: [], sourceBefore: [], sourceAfter: [],
  browserClosed: false, contextClosed: false, result: null };
const output = path.join(out, 'browser-proof.json');
await writeFile(output, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
async function verify(field) {
  for (const item of [...build.sources, ...build.assets, ...build.capture.transformed]) {
    for (const file of [item.path, item.stagedPath, item.archivePath].filter(Boolean)) {
      const actual = sha(await readFile(file)); record[field].push({ path: file, matches: actual === item.sha256 });
      assert.equal(actual, item.sha256);
    }
  }
}
let browser, context, opening, interrupted = false, rejectStop;
const stopped = new Promise((_, reject) => { rejectStop = reject; });
const stop = () => { interrupted = true; rejectStop(new Error('Companion interrupted or deadline expired')); void browser?.close().catch(() => {}); };
process.once('SIGINT', stop); process.once('SIGTERM', stop);
const timer = setTimeout(stop, 60000);
try {
  await verify('sourceBefore');
  opening = openBrowser({ headless: true, gpu: true, handleSignals: false }).then(async value => {
    if (interrupted) { await value.close(); throw new Error('Interrupted browser launch'); }
    return value;
  });
  browser = await Promise.race([opening, stopped]);
  assert.equal(interrupted, false);
  context = await browser.newContext({ viewport: { width: 300, height: 240 } });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url()), item = build.assets.find(item => item.urlPath === url.pathname);
    if (url.origin !== 'https://mounted-game.invalid' || !item) {
      record.errors.push(`Unexpected request ${url}`); await route.abort(); return;
    }
    await route.fulfill({ status: 200, body: await readFile(item.path),
      headers: { 'content-type': item.path.endsWith('.html') ? 'text/html' : 'text/javascript',
        'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'" } });
  });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', error => record.errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') record.errors.push(message.text()); });
  await page.goto('https://mounted-game.invalid/index.html', { waitUntil: 'load', timeout: 30000 });
  record.result = await page.evaluate(() => window.gameLifecycleResult);
  assert.equal(record.result?.status, 'PASS'); assert.equal(record.result.owners, 1024);
  assert.equal(record.result.resources, 2054); assert.equal(record.result.disposals, 2054);
  assert.ok(record.result.rendering.litPixels > 0); assert.match(record.result.rendering.version, /^WebGL/);
  assert.deepEqual(record.errors, []); await verify('sourceAfter'); record.status = 'PASS_MOUNTED_GAME_BROWSER';
} catch (error) { record.status = 'FAIL_OR_INCOMPLETE'; record.errors.push(error.stack ?? String(error)); }
finally {
  clearTimeout(timer); process.off('SIGINT', stop); process.off('SIGTERM', stop);
  if (context) try { await context.close(); record.contextClosed = true; } catch (error) { record.errors.push(String(error)); }
  if (browser) try { await browser.close(); record.browserClosed = true; } catch (error) { record.errors.push(String(error)); }
  if (interrupted || record.errors.length) record.status = 'FAIL_OR_INCOMPLETE';
  await writeFile(output, JSON.stringify(record, null, 2) + '\n');
}
assert.equal(record.status, 'PASS_MOUNTED_GAME_BROWSER');
console.log(JSON.stringify({ status: record.status, output }));
