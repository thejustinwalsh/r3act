import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openBrowser } from 'vitexec/cli';

assert.equal(process.version, 'v24.18.0');
const unit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
assert.equal(args.length, 4);
assert.equal(args[0], '--phase'); assert.equal(args[2], '--proof-dir');
const phase = args[1], proofDir = path.resolve(args[3]);
assert.ok(['proof', 'timing'].includes(phase));
assert.equal(path.dirname(proofDir), unit);
assert.match(path.basename(proofDir), /^proof-canvas-v[1-9]\d*$/);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = async file => sha(await readFile(file));
const proofBytes = await readFile(path.join(proofDir, 'build-proof.json'));
const lockBytes = await readFile(path.join(proofDir, 'input-lock.json'));
const proof = JSON.parse(proofBytes), lock = JSON.parse(lockBytes);
assert.equal(proof.status, 'PASS_REALTIME_CANVAS_BUILD');
assert.equal(lock.status, 'PASS_REALTIME_CANVAS_PREPARATION');
assert.equal(proof.inputLockSha256, sha(lockBytes));
const modes = ['native', 'react', 'imperative'];
const origin = 'https://realtime-canvas.invalid';
const assets = new Map();
for (const mode of modes) for (const item of proof.assets[mode]) {
  assert.ok(item.urlPath.startsWith(`/${mode}/`));
  assert.ok(!assets.has(item.urlPath)); assets.set(item.urlPath, { ...item, mode });
}
let priorBytes = null, authorizationBytes = null;
if (phase === 'timing') {
  priorBytes = await readFile(path.join(proofDir, 'canvas-proof-one-shot.json'));
  const prior = JSON.parse(priorBytes);
  assert.equal(prior.status, 'PASS_REALTIME_CANVAS_UNTIMED_PROOF');
  assert.equal(prior.buildProofSha256, sha(proofBytes));
  assert.equal(prior.inputLockSha256, sha(lockBytes));
  authorizationBytes = await readFile(path.join(proofDir, 'canvas-timing-authorization.json'));
  const auth = JSON.parse(authorizationBytes);
  assert.equal(auth.status, 'APPROVED_FOR_ONE_REALTIME_CANVAS_TIMING_COMPARISON');
  assert.equal(auth.buildProofSha256, sha(proofBytes));
  assert.equal(auth.inputLockSha256, sha(lockBytes));
  assert.equal(auth.proofSha256, sha(priorBytes));
}
const outputPath = path.join(proofDir, phase === 'proof' ? 'canvas-proof-one-shot.json' : 'canvas-timing-one-shot.json');
const record = { schemaVersion: 'realtime-canvas-browser-v1', status: 'STARTED', phase, origin,
  transport: 'Offline intercepted synthetic HTTPS; no server', order: modes,
  buildProofSha256: sha(proofBytes), inputLockSha256: sha(lockBytes),
  priorProofSha256: priorBytes ? sha(priorBytes) : null,
  authorizationSha256: authorizationBytes ? sha(authorizationBytes) : null,
  sourceBefore: [], sourceAfter: [], arms: [], blockedRequests: [], requestFailures: [],
  pageErrors: [], consoleErrors: [], errors: [], cleanupErrors: [], browserClosed: false };
await writeFile(outputPath, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
let browser, opening, timer, stopped = false, signalStop;
const stoppedPromise = new Promise((_, reject) => { signalStop = () => reject(new Error('Browser run interrupted or timed out')); });
const deadline = Date.now() + 120_000;
const remain = () => { const ms = deadline - Date.now(); if (stopped || ms <= 0) throw new Error('120-second bounded run expired or interrupted'); return ms; };
const stop = () => { stopped = true; signalStop(); void browser?.close().catch(() => {}); };
process.once('SIGINT', stop); process.once('SIGTERM', stop);
timer = setTimeout(stop, 120_000);
async function verify(field) {
  const groups = [lock.inputs, lock.staged, lock.packageSources, lock.tarballs, lock.installed, [lock.report, lock.compiler],
    ...modes.map(mode => [...proof.transforms[mode], ...proof.assets[mode], proof.captures[mode]])];
  for (const group of groups) for (const item of group) {
    remain();
    for (const file of [item.path, item.archivePath].filter(Boolean)) {
      const actual = await hash(file);
      record[field].push({ path: file, expected: item.sha256, actual, matches: actual === item.sha256 });
      assert.equal(actual, item.sha256, `Source/asset drift: ${file}`);
    }
  }
  assert.equal(await hash(path.join(proofDir, 'build-proof.json')), sha(proofBytes));
  assert.equal(await hash(path.join(proofDir, 'input-lock.json')), sha(lockBytes));
  if (priorBytes) assert.equal(await hash(path.join(proofDir, 'canvas-proof-one-shot.json')), sha(priorBytes));
  if (authorizationBytes) assert.equal(await hash(path.join(proofDir, 'canvas-timing-authorization.json')), sha(authorizationBytes));
}
async function runArm(mode) {
  const entry = { mode, contextClosed: false };
  record.arms.push(entry);
  const context = await browser.newContext({ viewport: { width: 700, height: 540 }, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    await page.addInitScript(value => { window.__realtimeProof = value; }, phase === 'proof');
    page.on('pageerror', error => record.pageErrors.push({ mode, error: String(error) }));
    page.on('console', message => { if (message.type() === 'error') record.consoleErrors.push({ mode, text: message.text() }); });
    page.on('requestfailed', request => record.requestFailures.push({ mode, url: request.url(), reason: request.failure()?.errorText }));
    await context.route('**/*', async route => {
      const url = new URL(route.request().url()), item = assets.get(url.pathname);
      if (url.origin !== origin || url.search || url.hash || item?.mode !== mode) {
        record.blockedRequests.push({ mode, url: url.href }); await route.abort(); return;
      }
      try {
        const body = await readFile(item.path);
        assert.equal(sha(body), item.sha256);
        await route.fulfill({ status: 200, headers: { 'content-type': item.path.endsWith('.html') ? 'text/html' : 'text/javascript', 'cache-control': 'no-store' }, body });
      } catch (error) { record.errors.push(String(error)); await route.abort(); }
    });
    const response = await page.goto(`${origin}/${mode}/${mode}.html`, { waitUntil: 'load', timeout: remain() });
    assert.equal(response.status(), 200);
    let armTimer;
    const result = await Promise.race([
      page.evaluate(() => (window).realtimeHarness.done),
      new Promise((_, reject) => { armTimer = setTimeout(() => reject(new Error(`${mode} browser deadline`)), Math.min(remain(), 30_000)); })
    ]).finally(() => clearTimeout(armTimer));
    entry.result = result;
    assert.equal(result.warmupSamples.length, 12);
    assert.equal(result.firstUpdate.epoch, 1);
    assert.equal(result.samples.length, 60);
    assert.equal(result.warmup, 12);
    assert.deepEqual(result.samples.map(sample => sample.epoch), Array.from({ length: 60 }, (_, id) => id + 13));
    assert.equal(result.teardown.cleanup.sceneChildren, 0);
    if (mode !== 'imperative') assert.equal(result.teardown.cleanup.registeredSetters, 0);
    if (mode === 'native') {
      assert.equal(result.teardown.cleanup.ownerCount, 0);
      assert.equal(result.teardown.cleanup.pending, 0);
    }
    if (mode === 'react') assert.equal(result.teardown.cleanup.hostChildren, 0);
    for (const sample of result.samples) {
      assert.equal(sample.count, 256); assert.equal(sample.retained, true);
      assert.ok(sample.publishMs >= 0 && sample.drawMs >= 0 && sample.callbackMs >= 0 && sample.stateAgeMs >= 0 && sample.validationMs >= 0);
    }
  } finally { await context.close(); entry.contextClosed = true; }
}
try {
  await verify('sourceBefore');
  opening = openBrowser({ headless: true, gpu: false, handleSignals: false }).then(async instance => {
    if (stopped) { await instance.close(); throw new Error('Stopped during browser launch'); }
    return instance;
  });
  browser = await Promise.race([opening, stoppedPromise]);
  record.browser = { version: browser.version(), headless: true, gpu: false };
  for (const mode of modes) await runArm(mode);
  const outputs = record.arms.map(arm => arm.result.samples.map(({ epoch, checksum, pixelChecksum }) => ({ epoch, checksum, pixelChecksum })));
  assert.deepEqual(outputs[0], outputs[1]); assert.deepEqual(outputs[0], outputs[2]);
  await verify('sourceAfter');
  assert.equal(record.blockedRequests.length, 0); assert.equal(record.requestFailures.length, 0);
  assert.equal(record.pageErrors.length, 0); assert.equal(record.consoleErrors.length, 0);
  record.status = phase === 'proof' ? 'PASS_REALTIME_CANVAS_UNTIMED_PROOF' : 'PASS_REALTIME_CANVAS_DESCRIPTIVE_TIMING';
} catch (error) { record.errors.push(error instanceof Error ? error.stack : String(error)); record.status = 'INCOMPLETE'; }
finally {
  clearTimeout(timer); process.off('SIGINT', stop); process.off('SIGTERM', stop);
  if (!browser && opening && stopped) try { await Promise.race([opening.catch(() => {}), new Promise(resolve => setTimeout(resolve, 5000))]); }
  catch (error) { record.cleanupErrors.push(String(error)); }
  if (browser) try { await browser.close(); record.browserClosed = true; }
  catch (error) { record.cleanupErrors.push(String(error)); record.status = 'INCOMPLETE'; }
  if (stopped || record.cleanupErrors.length || record.arms.some(arm => !arm.contextClosed)) record.status = 'INCOMPLETE';
  await writeFile(outputPath, JSON.stringify(record, null, 2) + '\n');
}
if (record.status === 'INCOMPLETE') process.exitCode = 1;
else console.log(JSON.stringify({ status: record.status, outputPath }));
