import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { openBrowser } from 'vitexec/cli';

assert.equal(process.version, 'v24.18.0');
const unit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '2026-10-22-native-frame-publication');
const root = path.resolve(unit, '../..');
const args = process.argv.slice(2);
const arg = name => { const i = args.indexOf(name); assert.ok(i >= 0 && args[i + 1], `missing ${name}`); return args[i + 1]; };
assert.equal(args.length, 4, 'usage: run-prototype-ablation.mjs --proof-dir ABS --output-dir ABS');
assert.deepEqual(args.filter((_, i) => i % 2 === 0), ['--proof-dir', '--output-dir']);
const proofDir = path.resolve(arg('--proof-dir'));
const outDir = path.resolve(arg('--output-dir'));
assert.equal(proofDir, path.join(unit, 'proof-canvas-v3'));
assert.equal(path.dirname(outDir), path.dirname(fileURLToPath(import.meta.url)));
assert.equal(path.basename(outDir), 'runs-prototype-ablation-v1');
const receiptPath = path.join(outDir, 'receipt.json');
try { await access(outDir); throw new Error(`refusing existing output path ${outDir}`); }
catch (error) { if (error?.code !== 'ENOENT') throw error; }
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hashFile = async file => sha(await readFile(file));
const hashStream = file => new Promise((resolve, reject) => {
  const h = createHash('sha256'), stream = createReadStream(file);
  stream.on('data', chunk => h.update(chunk)); stream.once('error', reject);
  stream.once('end', () => resolve(h.digest('hex')));
});
const proofBytes = await readFile(path.join(proofDir, 'build-proof.json'));
const lockBytes = await readFile(path.join(proofDir, 'input-lock.json'));
const proofSha = sha(proofBytes), lockSha = sha(lockBytes);
const proof = JSON.parse(proofBytes), lock = JSON.parse(lockBytes);
const researchDir = path.dirname(fileURLToPath(import.meta.url));
const researchManifestPath = path.join(unit, 'reviewed-source-v7.json');
const researchManifestBytes = await readFile(researchManifestPath);
const researchManifest = JSON.parse(researchManifestBytes);
assert.equal(researchManifest.status, 'UNVERIFIED_FROZEN');
const productManifestRows = researchManifest.files.filter(item => /^(src|compiler|packages)\//.test(item.path));
assert.ok(productManifestRows.length > 0);
const ownedProtocolPaths = ['run-prototype-ablation.mjs', 'prototype-ablation-protocol.md'].map(name => path.join(researchDir, name));
assert.equal(process.env.SELENIUM_REMOTE_URL, undefined, 'local owned browser required; remote Selenium is not allowed');
assert.equal(proof.status, 'PASS_R3F_FRAME_BASELINES_CANVAS_BUILD');
assert.equal(lock.status, 'PASS_R3F_FRAME_BASELINES_CANVAS_PREPARATION');
assert.equal(proof.inputLockSha256, lockSha);
const origin = 'https://realtime-canvas.invalid';
const modes = ['native', 'react'];
const order = [
  { mode: 'native', variant: 'original' },
  { mode: 'react', variant: 'control' },
  { mode: 'native', variant: 'audit-disabled' },
  { mode: 'native', variant: 'audit-disabled' },
  { mode: 'react', variant: 'control' },
  { mode: 'native', variant: 'original' },
];
const assetEntries = modes.flatMap(mode => proof.assets[mode].map(item => ({ ...item, mode })));
const assetByKey = new Map(assetEntries.map(item => [`${item.mode}:${item.urlPath}`, item]));
assert.equal(assetByKey.size, assetEntries.length);
const nativeBundleEntry = assetEntries.find(item => item.mode === 'native' && item.urlPath.endsWith('native-B0ltTLHF.js'));
assert.ok(nativeBundleEntry, 'missing exact frozen Native bundle');
const nativeOriginalBytes = await readFile(nativeBundleEntry.path);
assert.equal(sha(nativeOriginalBytes), nativeBundleEntry.sha256);
const nativeOriginalText = nativeOriginalBytes.toString('utf8');
const functionNeedle = 'function closedNumericPrototypeIsCanonical() {';
assert.equal(nativeOriginalText.split(functionNeedle).length - 1, 1, 'prototype audit declaration must be unique');
const functionStart = nativeOriginalText.indexOf(functionNeedle);
const bodyStart = functionStart + functionNeedle.length;
const functionClose = nativeOriginalText.indexOf('\n}', bodyStart);
assert.ok(functionClose > bodyStart, 'exact prototype audit function close is required');
const functionEnd = functionClose + 2;
const originalBody = nativeOriginalText.slice(bodyStart, functionClose);
assert.ok(originalBody.includes('Reflect.ownKeys(AsyncStore.prototype)') && originalBody.includes('Object.getOwnPropertyDescriptor'),
  'source-derived audit body must contain expected prototype checks');
const originalBodyLines = originalBody.split('\n');
let insertedReplacement = false;
const replacementBodyLines = originalBodyLines.map(line => {
  if (insertedReplacement || line.length === 0) return ' '.repeat(line.length);
  const indent = line.match(/^\s*/)?.[0] ?? '';
  const replacementLine = `${indent}return true;`;
  if (replacementLine.length > line.length) return ' '.repeat(line.length);
  insertedReplacement = true;
  return replacementLine + ' '.repeat(line.length - replacementLine.length);
});
assert.ok(insertedReplacement, 'no original body line can hold the replacement statement without moving line breaks');
const replacementBody = replacementBodyLines.join('\n');
const newlineOffsets = text => [...text.matchAll(/\n/g)].map(match => match.index);
assert.deepEqual(newlineOffsets(replacementBody), newlineOffsets(originalBody), 'ablation must preserve all function-body line break offsets');
const replacementDiff = { originalBody, replacementBody };
const nativeAblatedText = nativeOriginalText.slice(0, bodyStart) + replacementBody + nativeOriginalText.slice(functionClose);
const nativeAblatedBytes = Buffer.from(nativeAblatedText, 'utf8');
assert.equal(nativeAblatedBytes.length, nativeOriginalBytes.length, 'ablation must preserve total bundle byte length');
assert.deepEqual(nativeAblatedBytes.subarray(0, Buffer.byteLength(nativeOriginalText.slice(0, bodyStart))),
  nativeOriginalBytes.subarray(0, Buffer.byteLength(nativeOriginalText.slice(0, bodyStart))), 'ablation prefix differs before function body');
assert.deepEqual(nativeAblatedBytes.subarray(Buffer.byteLength(nativeOriginalText.slice(0, functionClose))),
  nativeOriginalBytes.subarray(Buffer.byteLength(nativeOriginalText.slice(0, functionClose))), 'ablation suffix differs after function body');
assert.equal(nativeAblatedText.indexOf(functionNeedle), functionStart);
const ablationReceipt = { originalAssetPath: nativeBundleEntry.path, originalUrlPath: nativeBundleEntry.urlPath,
  originalSha256: nativeBundleEntry.sha256, originalBytes: nativeOriginalBytes.length,
  functionName: 'closedNumericPrototypeIsCanonical', declarationOccurrences: 1,
  functionStartByte: Buffer.byteLength(nativeOriginalText.slice(0, functionStart)),
  functionEndByteExclusive: Buffer.byteLength(nativeOriginalText.slice(0, functionEnd)),
  originalFunctionSha256: sha(Buffer.from(nativeOriginalText.slice(functionStart, functionEnd))),
  originalBody, replacementBody, originalBodySha256: sha(Buffer.from(originalBody)), replacementBodySha256: sha(Buffer.from(replacementBody)),
  diffSha256: sha(Buffer.from(JSON.stringify(replacementDiff))),
  replacementBodyBytes: replacementBody.length, totalBytesPreserved: nativeAblatedBytes.length === nativeOriginalBytes.length,
  prefixAndSuffixBytesExact: true, ablatedSha256: sha(nativeAblatedBytes), disposableCopyPath: null };
const anchorNeedle = 'update(epoch) {';
const anchors = {};
for (const mode of modes) {
  const entry = proof.assets[mode].find(item => item.urlPath.endsWith(mode === 'native' ? 'native-B0ltTLHF.js' : 'react-Dn0IWIE6.js'));
  assert.ok(entry, `missing frozen ${mode} bundle`);
  const bytes = await readFile(entry.path);
  assert.equal(sha(bytes), entry.sha256);
  const text = bytes.toString('utf8');
  const start = text.indexOf(anchorNeedle);
  assert.ok(start >= 0 && text.indexOf(anchorNeedle, start + 1) < 0, `${mode} authored update anchor must occur exactly once`);
  const endMarker = text.indexOf('\n\t},', start);
  assert.ok(endMarker > start, `${mode} authored update span must terminate in generated bundle`);
  const endExclusive = endMarker + 3;
  assert.equal(text.slice(endMarker, endExclusive), '\n\t}', `${mode} method closing brace must be included, neighbor comma excluded`);
  const lineStart = text.lastIndexOf('\n', start) + 1;
  const endLineStart = text.lastIndexOf('\n', endExclusive - 1) + 1;
  const startLine0 = text.slice(0, start).split('\n').length - 1;
  const startColumn0 = start - lineStart;
  const endLine0 = text.slice(0, endExclusive).split('\n').length - 1;
  const endColumn0 = endExclusive - endLineStart;
  const generatedText = text.slice(start, endExclusive);
  const requiredSentinel = mode === 'native' ? 'frameLoop.advance(epoch * (1e3 / 60))'
    : 'flushSync(() => clock.dispatch({';
  assert.ok(generatedText.includes(requiredSentinel), `${mode} source-derived method span does not contain expected operation`);
  anchors[mode] = { mode, urlPath: entry.urlPath, assetPath: entry.path, assetSha256: entry.sha256,
    startOffsetUtf8: Buffer.byteLength(text.slice(0, start)), endOffsetUtf8: Buffer.byteLength(text.slice(0, endExclusive)),
    startLine0, startColumn0, endLine0, endColumn0, sourceSpanSha256: sha(Buffer.from(generatedText)),
    uniqueNeedle: anchorNeedle, requiredSentinel };
}
const verifyInputs = [
  ...lock.inputs.filter(item => /\/consumer\/(native\.tsx|react\.tsx|scene\.ts|native\.html|react\.html|build\.mjs)$/.test(item.path)),
  ...modes.flatMap(mode => proof.assets[mode]),
];
assert.ok(verifyInputs.some(item => item.path.endsWith('/consumer/native.tsx')));
assert.ok(verifyInputs.some(item => item.path.endsWith('/consumer/react.tsx')));
const dependencyPaths = new Set();
const vitexecEntry = fileURLToPath(import.meta.resolve('vitexec/cli'));
const vitexecPackage = path.resolve(path.dirname(vitexecEntry), '..', 'package.json');
const vitexecRequire = createRequire(vitexecEntry);
const playwrightEntry = vitexecRequire.resolve('playwright');
for (const file of [vitexecEntry, vitexecPackage, playwrightEntry]) dependencyPaths.add(file);
const browserPackagePath = path.resolve(path.dirname(playwrightEntry), 'package.json');
try { await access(browserPackagePath); dependencyPaths.add(browserPackagePath); } catch {}
const deadlineAt = Date.now() + 120_000;
const remaining = () => { const n = deadlineAt - Date.now(); assert.ok(n > 0, '120-second diagnostic deadline expired'); return n; };
const sourceRows = [];
const checkFrozen = async phase => {
  assert.equal(await hashFile(path.join(proofDir, 'build-proof.json')), proofSha);
  assert.equal(await hashFile(path.join(proofDir, 'input-lock.json')), lockSha);
  assert.equal(await hashFile(researchManifestPath), sha(researchManifestBytes));
  for (const item of productManifestRows) {
    const file = path.join(root, item.path); const actual = await hashFile(file);
    assert.equal(actual, item.sha256, `${phase}: reviewed product source changed ${item.path}`);
    receipt[phase === 'before' ? 'productSourceBefore' : 'productSourceAfter'].push({ path: item.path, expected: item.sha256, actual, matches: true });
  }
  for (const file of ownedProtocolPaths) {
    const actual = await hashFile(file);
    receipt[phase === 'before' ? 'ownedProtocolBefore' : 'ownedProtocolAfter'].push({ path: file, sha256: actual });
  }
  for (const item of verifyInputs) {
    const current = await hashFile(item.path);
    assert.equal(current, item.sha256, `${phase}: frozen source/asset changed ${item.path}`);
    const row = { phase, path: item.path, expected: item.sha256, actual: current, matches: true };
    sourceRows.push(row); receipt[phase === 'before' ? 'sourceBefore' : 'sourceAfter'].push(row);
  }
};
const browserDepsBefore = [];
for (const file of dependencyPaths) browserDepsBefore.push({ path: file, sha256: await hashFile(file) });
const receipt = {
  schemaVersion: 'r3act-react-mechanism-diagnostic-v1', status: 'STARTED',
  purpose: 'Unsound isolated prototype-audit ablation diagnostic; never a performance qualification or removable-time budget.',
  startedAt: new Date().toISOString(), node: process.version, unit, root, proofDir, outDir,
  buildProofSha256: proofSha, inputLockSha256: lockSha,
  historicalDocLockContext: 'The v3 build/input lock binds the unchanged product consumer and assets. Current documentation/context has advanced since that lock; record that delta separately and do not assert a whole-worktree lock.',
  setup: { transport: 'Offline intercepted synthetic HTTPS; no project server', origin, headless: true, gpu: true,
    profiler: false, modeOrder: order, frames: { warmup: 12, measured: 60, totalUpdateCallsByHarnessPerContext: 72 },
    anchors, ablation: ablationReceipt, browserDepsBefore, browserDepsAfter: null, browserExecutable: null,
    pageErrors: [], consoleErrors: [], blockedRequests: [], requestFailures: [], errors: [], cleanupErrors: [], browserClosed: false },
  reviewedSourceManifestSha256: sha(researchManifestBytes),
  currentContextDelta: 'Product src/compiler/packages inputs are bound separately to reviewed-source-v7.json. Do not claim full old-worktree lock: documentation and research context evolved after the v3 preparation lock.',
  productSourceBefore: [], productSourceAfter: [], ownedProtocolBefore: [], ownedProtocolAfter: [],
  sourceBefore: [], sourceAfter: [], contextResults: [], sourceRows,
  interpretation: { intentionallyUnsoundAblation: true, removesEntirePrototypeAuditHelperEffect: true,
    includesJitInteraction: true, cohortSpeedClaimAllowed: false, removableBudgetClaimAllowed: false,
    noPerformanceQualification: true }
};
await mkdir(outDir, { recursive: false });
ablationReceipt.disposableCopyPath = path.join(outDir, 'ablation-asset', path.basename(nativeBundleEntry.path));
await mkdir(path.dirname(ablationReceipt.disposableCopyPath), { recursive: false });
await writeFile(ablationReceipt.disposableCopyPath, nativeAblatedBytes, { flag: 'wx' });
assert.equal(await hashFile(ablationReceipt.disposableCopyPath), ablationReceipt.ablatedSha256);
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
let browser = null, opening = null, interrupted = false, timerHandle, resolveInterrupted;
const interruption = new Promise(resolve => { resolveInterrupted = resolve; });
const stop = () => { interrupted = true; resolveInterrupted(); void browser?.close().catch(() => {}); };
timerHandle = setTimeout(stop, 120_000);
process.once('SIGINT', stop); process.once('SIGTERM', stop);
const updateStats = samples => {
  const values = samples.map(x => x.publishMs).sort((a, b) => a - b);
  const through = samples.map(x => x.updateThroughDrawMs).sort((a, b) => a - b);
  const median = xs => (xs[29] + xs[30]) / 2;
  const p95 = xs => xs[Math.ceil(.95 * xs.length) - 1];
  return { publishMs: { median: median(values), p95NearestRank: p95(values), max: values.at(-1) },
    updateThroughDrawMs: { median: median(through), p95NearestRank: p95(through), max: through.at(-1) } };
};
try {
  await checkFrozen('before');
  opening = openBrowser({ headless: true, gpu: true, handleSignals: false, timeoutMs: Math.min(30_000, remaining()) }).then(async instance => {
    if (interrupted) { await instance.close(); throw new Error('Browser opened after interruption and was closed before use'); }
    return instance;
  });
  browser = await Promise.race([opening, interruption.then(() => { throw new Error('Browser launch interrupted or diagnostic deadline expired'); })]);
  receipt.setup.browser = { version: browser.version(), headless: true, gpu: true, remoteSelenium: false };
  receipt.setup.browserExecutable = browser.browserType?.().executablePath?.() ?? null;
  if (receipt.setup.browserExecutable) {
    receipt.setup.browserExecutableSha256Before = await hashStream(receipt.setup.browserExecutable);
    receipt.setup.browserExecutableBytes = (await stat(receipt.setup.browserExecutable)).size;
  }
  for (let index = 0; index < order.length; index++) {
    remaining(); assert.ok(!interrupted, 'diagnostic interrupted');
    const spec = order[index], { mode, variant } = spec;
    const arm = { index: index + 1, mode, variant, contextClosed: false,
      rendererInfo: null, wallStats: null, harnessCalls: null, outputDigest: null, profile: null };
    receipt.contextResults.push(arm);
    const context = await browser.newContext({ viewport: { width: 700, height: 540 }, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage();
      page.setDefaultTimeout(5000);
      await page.addInitScript(() => { window.__realtimeProof = false; });
      page.on('pageerror', error => receipt.setup.pageErrors.push({ index: index + 1, mode, error: String(error) }));
      page.on('console', message => { if (message.type() === 'error') receipt.setup.consoleErrors.push({ index: index + 1, mode, text: message.text() }); });
      page.on('requestfailed', request => receipt.setup.requestFailures.push({ index: index + 1, mode,
        url: request.url(), reason: request.failure()?.errorText }));
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        const item = assetByKey.get(`${mode}:${url.pathname}`);
        if (url.origin !== origin || url.search || url.hash || !item) {
          receipt.setup.blockedRequests.push({ index: index + 1, mode, url: url.href }); await route.abort(); return;
        }
        try {
          const bytes = mode === 'native' && variant === 'audit-disabled' && item.path === nativeBundleEntry.path
            ? nativeAblatedBytes : await readFile(item.path);
          const expectedServedHash = mode === 'native' && variant === 'audit-disabled' && item.path === nativeBundleEntry.path
            ? ablationReceipt.ablatedSha256 : item.sha256;
          assert.equal(sha(bytes), expectedServedHash, `served asset drift ${item.path}`);
          await route.fulfill({ status: 200,
            headers: { 'content-type': item.path.endsWith('.html') ? 'text/html' : 'text/javascript', 'cache-control': 'no-store' }, body: bytes });
        } catch (error) { receipt.setup.errors.push(String(error)); await route.abort(); }
      });
      const response = await page.goto(`${origin}/${mode}/${mode}.html`, { waitUntil: 'load', timeout: remaining() });
      assert.equal(response.status(), 200);
      let armTimer;
      const result = await Promise.race([
        page.evaluate(() => window.realtimeHarness.done),
        new Promise((_, reject) => { armTimer = setTimeout(() => reject(new Error(`${mode} timed out waiting for 72 frames`)), Math.min(remaining(), 35_000)); })
      ]).finally(() => clearTimeout(armTimer));
      arm.result = result;
      assert.equal(result.warmup, 12); assert.equal(result.measured, 60);
      assert.equal(result.warmupSamples.length, 12); assert.equal(result.samples.length, 60);
      assert.deepEqual(result.samples.map(sample => sample.epoch), Array.from({ length: 60 }, (_, i) => i + 13));
      const all = [...result.warmupSamples, ...result.samples];
      assert.equal(all.length, 72); assert.ok(all.every(sample => sample.counters === null));
      assert.equal(result.teardown.resourcesExpected, 512); assert.equal(result.teardown.resourcesDisposed, 512);
      assert.equal(result.teardown.duplicateDisposalEvents, 0); assert.equal(result.teardown.cleanup.sceneChildren, 0);
      assert.equal(result.teardown.cleanup.registeredSetters, 0);
      if (mode === 'native') { assert.equal(result.teardown.cleanup.ownerCount, 0); assert.equal(result.teardown.cleanup.pending, 0); }
      for (const sample of all) {
        assert.equal(sample.count, 256); assert.equal(sample.retained, true); assert.ok(sample.litPixels > 0);
        assert.ok(Number.isFinite(sample.publishMs) && Number.isFinite(sample.updateThroughDrawMs));
      }
      arm.rendererInfo = result.rendererInfo;
      arm.wallStats = updateStats(result.samples);
      arm.harnessCalls = { warmup: result.warmupSamples.length, measured: result.samples.length, total: all.length };
      arm.outputDigest = sha(Buffer.from(JSON.stringify(result.samples.map(({ epoch, checksum, pixelChecksum, litPixels }) => ({ epoch, checksum, pixelChecksum, litPixels })))));
      arm.result = result;
    } finally {
      try { await context.close(); arm.contextClosed = true; }
      catch (error) { receipt.setup.cleanupErrors.push(`context close ${index + 1}: ${String(error)}`); receipt.status = 'INCOMPLETE'; }
      await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
    }
    assert.ok(Date.now() < deadlineAt, '120-second diagnostic deadline expired');
  }
  const originalContexts = receipt.contextResults.filter(item => item.variant === 'original');
  const reactContexts = receipt.contextResults.filter(item => item.variant === 'control');
  const ablatedContexts = receipt.contextResults.filter(item => item.variant === 'audit-disabled');
  assert.equal(originalContexts.length, 2); assert.equal(reactContexts.length, 2); assert.equal(ablatedContexts.length, 2);
  for (const group of [originalContexts, reactContexts, ablatedContexts]) {
    const baseline = group[0];
    for (const item of group.slice(1)) {
      assert.equal(item.rendererInfo.renderer, baseline.rendererInfo.renderer);
      assert.equal(item.rendererInfo.unmaskedRenderer, baseline.rendererInfo.unmaskedRenderer);
      assert.deepEqual(item.rendererInfo.camera, baseline.rendererInfo.camera);
      assert.deepEqual(item.rendererInfo.drawingBuffer, [640, 480]);
      assert.equal(item.outputDigest, baseline.outputDigest, `${baseline.variant} draw/value output changed within controls`);
    }
  }
  for (const item of [...reactContexts, ...ablatedContexts])
    assert.equal(item.outputDigest, originalContexts[0].outputDigest, 'Original Native, React and unsound-ablation outputs must match');
  await checkFrozen('after');
  assert.equal(receipt.setup.blockedRequests.length, 0);
  assert.equal(receipt.setup.requestFailures.length, 0);
  assert.equal(receipt.setup.pageErrors.length, 0);
  assert.equal(receipt.setup.consoleErrors.length, 0);
  assert.equal(receipt.setup.errors.length, 0);
  assert.ok(receipt.contextResults.every(item => item.contextClosed));
  const rendererBaseline = receipt.contextResults[0].rendererInfo;
  for (const item of receipt.contextResults.slice(1)) {
    assert.equal(item.rendererInfo.renderer, rendererBaseline.renderer);
    assert.equal(item.rendererInfo.unmaskedRenderer, rendererBaseline.unmaskedRenderer);
    assert.deepEqual(item.rendererInfo.camera, rendererBaseline.camera);
    assert.deepEqual(item.rendererInfo.drawingBuffer, rendererBaseline.drawingBuffer);
    assert.deepEqual([item.rendererInfo.outputColorSpace, item.rendererInfo.toneMapping, item.rendererInfo.pixelRatio, item.rendererInfo.antialias, item.rendererInfo.preserveDrawingBuffer],
      [rendererBaseline.outputColorSpace, rendererBaseline.toneMapping, rendererBaseline.pixelRatio, rendererBaseline.antialias, rendererBaseline.preserveDrawingBuffer]);
  }
  if (receipt.setup.browserExecutable) {
    receipt.setup.browserExecutableSha256After = await hashStream(receipt.setup.browserExecutable);
    assert.equal(receipt.setup.browserExecutableSha256After, receipt.setup.browserExecutableSha256Before);
  }
  for (const file of dependencyPaths) {
    const actual = await hashFile(file); const row = browserDepsBefore.find(x => x.path === file);
    assert.equal(actual, row.sha256, `browser tooling changed ${file}`);
  }
  const ablatedCopyAfterSha256 = await hashFile(ablationReceipt.disposableCopyPath);
  assert.equal(ablatedCopyAfterSha256, ablationReceipt.ablatedSha256, 'disposable ablation copy changed during study');
  ablationReceipt.disposableCopyAfterSha256 = ablatedCopyAfterSha256;
  receipt.ownedProtocolAfter = await Promise.all(receipt.ownedProtocolBefore.map(async row => {
    const actual = await hashFile(row.path); assert.equal(actual, row.sha256, `owned protocol changed during run ${row.path}`);
    return { path: row.path, sha256: actual };
  }));
  receipt.setup.browserDepsAfter = await Promise.all(browserDepsBefore.map(async row => ({ ...row, afterSha256: await hashFile(row.path) })));
  receipt.status = 'PASS_BOUNDED_PROTOTYPE_ABLATION_DIAGNOSTIC';
} catch (error) {
  receipt.errors = [...(receipt.errors ?? []), error instanceof Error ? error.stack : String(error)];
  receipt.status = 'INCOMPLETE';
} finally {
  clearTimeout(timerHandle); process.off('SIGINT', stop); process.off('SIGTERM', stop);
  if (browser) try { await browser.close(); receipt.setup.browserClosed = true; }
  catch (error) { receipt.setup.cleanupErrors.push(String(error)); receipt.status = 'INCOMPLETE'; }
  if (receipt.setup.cleanupErrors.length || receipt.contextResults.some(context => !context.contextClosed)) receipt.status = 'INCOMPLETE';
  receipt.completedAt = new Date().toISOString();
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2));
}
if (receipt.status === 'INCOMPLETE') process.exitCode = 1;
else console.log(JSON.stringify({ status: receipt.status, receiptPath }));
