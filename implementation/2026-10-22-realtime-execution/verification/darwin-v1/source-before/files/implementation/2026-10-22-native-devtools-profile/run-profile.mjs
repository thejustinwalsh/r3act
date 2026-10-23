import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createBrowserArgs, openBrowser } from 'vitexec/cli';

assert.equal(process.version, 'v24.18.0');
const unit = path.dirname(fileURLToPath(import.meta.url));
const proofDir = path.resolve(unit, '../2026-10-22-native-frame-publication/proof-canvas-v3');
const args = process.argv.slice(2);
assert.equal(args.length, 2);
assert.equal(args[0], '--output');
const outputDir = path.resolve(args[1]);
assert.equal(path.dirname(outputDir), path.join(unit, 'evidence'));
assert.equal(path.basename(outputDir), 'devtools-profile-v3');
const sha = value => createHash('sha256').update(value).digest('hex');
const fileHash = async file => sha(await readFile(file));
function findMethodCloseBrace(source, openBraceIndex) {
  let depth = 1, mode = 'code', escaped = false;
  const templateExpressions = [];
  for (let index = openBraceIndex + 1; index < source.length; index++) {
    const char = source[index], next = source[index + 1];
    if (mode === 'single' || mode === 'double') {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (mode === 'single' && char === "'") mode = 'code';
      else if (mode === 'double' && char === '"') mode = 'code';
      continue;
    }
    if (mode === 'line-comment') { if (char === '\n') mode = 'code'; continue; }
    if (mode === 'block-comment') { if (char === '*' && next === '/') { mode = 'code'; index++; } continue; }
    if (mode === 'template') {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '`') mode = 'code';
      else if (char === '$' && next === '{') {
        templateExpressions.push(depth); depth++; mode = 'code'; index++;
      }
      continue;
    }
    if (char === '/' && next === '/') { mode = 'line-comment'; index++; continue; }
    if (char === '/' && next === '*') { mode = 'block-comment'; index++; continue; }
    if (char === "'") { mode = 'single'; continue; }
    if (char === '"') { mode = 'double'; continue; }
    if (char === '`') { mode = 'template'; continue; }
    if (char === '{') depth++;
    else if (char === '}') {
      depth--;
      if (templateExpressions.at(-1) === depth) { templateExpressions.pop(); mode = 'template'; continue; }
      if (depth === 0) return index;
      assert.ok(depth > 0, 'Unbalanced method braces');
    }
  }
  throw new Error('Unclosed authored update method');
}
const proofPath = path.join(proofDir, 'build-proof.json');
const lockPath = path.join(proofDir, 'input-lock.json');
const repoRoot = path.resolve(unit, '../..');
const reviewedSourcePath = path.join(unit, '../2026-10-22-native-frame-publication/reviewed-source-v7.json');
const proofBytes = await readFile(proofPath), lockBytes = await readFile(lockPath);
const proof = JSON.parse(proofBytes), lock = JSON.parse(lockBytes);
const reviewedSourceBytes = await readFile(reviewedSourcePath);
const reviewedSource = JSON.parse(reviewedSourceBytes);
assert.equal(proof.status, 'PASS_R3F_FRAME_BASELINES_CANVAS_BUILD');
assert.equal(lock.status, 'PASS_R3F_FRAME_BASELINES_CANVAS_PREPARATION');
assert.equal(proof.inputLockSha256, sha(lockBytes));
assert.equal(reviewedSource.status, 'UNVERIFIED_FROZEN');
const productRows = reviewedSource.files.filter(item => ['src/', 'compiler/', 'packages/'].some(prefix => item.path.startsWith(prefix)));
assert.equal(productRows.length, 585, 'Expected the frozen 585-row product source scope');

const sourceGroups = [lock.inputs, lock.staged, lock.packageSources, lock.rendererSourceBasis,
  lock.tarballs, lock.installed, [lock.report, lock.compiler],
  ...['native', 'react'].map(mode => [...proof.transforms[mode], ...proof.assets[mode], proof.captures[mode]])];
const sourceRows = async () => {
  const rows = [];
  for (const item of productRows) {
    const bytes = await readFile(path.join(repoRoot, item.path));
    rows.push({ path: item.path, expected: item.sha256, actual: sha(bytes), bytes: bytes.length,
      matches: item.sha256 === sha(bytes), group: 'reviewed-product-source' });
  }
  for (const group of sourceGroups) for (const item of group) {
    for (const file of [item.path, item.archivePath].filter(Boolean)) {
      const bytes = await readFile(file);
      rows.push({ path: file, expected: item.sha256, actual: sha(bytes), bytes: bytes.length,
        matches: item.sha256 === sha(bytes) });
    }
  }
  rows.push({ path: proofPath, expected: sha(proofBytes), actual: await fileHash(proofPath), group: 'proof-lock' });
  rows.push({ path: lockPath, expected: sha(lockBytes), actual: await fileHash(lockPath), group: 'proof-lock' });
  return rows;
};

const modes = ['native', 'react'];
const order = ['native', 'react', 'react', 'native'];
const origin = 'https://realtime-canvas.invalid';
const assets = new Map();
for (const mode of modes) for (const item of proof.assets[mode]) {
  assert.ok(item.urlPath.startsWith(`/${mode}/`));
  assert.ok(!assets.has(item.urlPath));
  assets.set(item.urlPath, { ...item, mode });
}

const patchAsset = async mode => {
  const entry = [...assets.values()].find(item => item.mode === mode && item.path.endsWith(`/${mode === 'native' ? 'native' : 'react'}-${mode === 'native' ? 'B0ltTLHF' : 'Dn0IWIE6'}.js`));
  assert.ok(entry, `Expected frozen ${mode} entry asset`);
  const before = await readFile(entry.path);
  assert.equal(sha(before), entry.sha256);
  const source = before.toString('utf8');
  const updateSignature = 'update(epoch) {';
  assert.equal(source.split(updateSignature).length - 1, 1, `${mode} authored update method anchor is not unique`);
  const updateStartOffset = source.indexOf(updateSignature);
  const updateLine = source.slice(0, updateStartOffset).split('\n').length;
  const updateColumnZeroBased = updateStartOffset - source.lastIndexOf('\n', updateStartOffset - 1) - 1;
  const openBraceOffset = updateStartOffset + updateSignature.lastIndexOf('{');
  const updateEndOffset = findMethodCloseBrace(source, openBraceOffset) + 1;
  const updateEndLine = source.slice(0, updateEndOffset).split('\n').length;
  const updateMethodSnippet = source.slice(updateStartOffset, updateEndOffset);
  const timestamp = 'const publishEnd = performance.now();';
  const count = source.split(timestamp).length - 1;
  assert.equal(count, 1, `${mode} has one original publishEnd marker`);
  const measure = `performance.measure("r3act-devtools-${mode}-" + frame, { start: updateStart, end: publishEnd, detail: { mode: "${mode}", epoch: frame } });`;
  const anchorStart = source.indexOf(timestamp), anchorEnd = anchorStart + timestamp.length;
  const prefix = source.slice(0, anchorEnd), suffix = source.slice(anchorEnd);
  const offset = Buffer.byteLength(prefix);
  const patched = Buffer.from(prefix + measure + suffix);
  assert.equal(patched.toString('utf8').split('\n').length, source.split('\n').length,
    `${mode} instrumentation must not shift generated line numbers`);
  assert.ok(patched.toString('utf8').startsWith(prefix));
  assert.ok(patched.toString('utf8').endsWith(suffix));
  return { entry, originalSha256: sha(before), originalBytes: before.length,
    servedSha256: sha(patched), servedBytes: patched.length, insertionOffset: offset,
    updateAnchor: { signature: updateSignature, functionName: 'update', startLine: updateLine,
      endLine: updateEndLine, startColumnZeroBased: updateColumnZeroBased,
      profilerFunctionColumnZeroBased: updateColumnZeroBased + updateSignature.indexOf('('),
      methodSnippetSha256: sha(Buffer.from(updateMethodSnippet)), methodSnippet: updateMethodSnippet },
    originalNewlineCount: (source.match(/\n/g) ?? []).length,
    servedNewlineCount: (patched.toString('utf8').match(/\n/g) ?? []).length,
    prefixSha256: sha(Buffer.from(prefix)), suffixSha256: sha(Buffer.from(suffix)),
    insertedText: measure, patched };
};
const patchedAssets = Object.fromEntries(await Promise.all(modes.map(async mode => [mode, await patchAsset(mode)])));

const toolUrl = import.meta.resolve('vitexec/cli');
assert.ok(toolUrl.startsWith('file:'));
const toolPath = fileURLToPath(toolUrl);
const requireFromVitexec = createRequire(toolPath);
const playwrightPath = requireFromVitexec.resolve('playwright');
const playwrightModule = await import(pathToFileURL(playwrightPath).href);
const chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium;
assert.ok(chromium, 'Resolved Playwright module does not expose Chromium');
const chromiumPath = chromium.executablePath();
await access(chromiumPath);
const toolchainPaths = [toolPath, path.join(path.dirname(toolPath), 'browser.js'),
  path.resolve(path.dirname(toolPath), '../package.json'), playwrightPath,
  path.resolve(path.dirname(playwrightPath), 'package.json'), chromiumPath];
const hashFile = async file => {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest('hex');
};
const toolchainRows = async () => Promise.all(toolchainPaths.map(async file =>
  ({ path: file, sha256: await hashFile(file) })));
const toolchainBefore = await toolchainRows();
const ownPaths = ['run-profile.mjs', 'analyze-profile.mjs', 'protocol.md', 'source-map.json', 'native-cost-map.md']
  .map(name => path.join(unit, name));

const traceConfig = {
  categories: 'devtools.timeline,v8.execute,blink.user_timing,disabled-by-default-v8.cpu_profiler,disabled-by-default-v8.cpu_profiler.hires',
  options: 'record-as-much-as-possible,sampling-frequency=10000',
  transferMode: 'ReturnAsStream', streamFormat: 'json'
};
const record = {
  schemaVersion: 'native-devtools-profile-v3', status: 'STARTED', origin,
  source: { proofPath, proofSha256: sha(proofBytes), lockPath, lockSha256: sha(lockBytes),
    reviewedSourcePath, reviewedSourceSha256: sha(reviewedSourceBytes), productRowCount: productRows.length,
    inputRows: [], toolchainBefore, ownFiles: [] },
  traceConfig, order, controls: [], assets: Object.fromEntries(modes.map(mode => {
    const item = patchedAssets[mode];
    return [mode, { urlPath: item.entry.urlPath, originalSha256: item.originalSha256,
      originalBytes: item.originalBytes, servedSha256: item.servedSha256, servedBytes: item.servedBytes,
      insertionOffset: item.insertionOffset, originalNewlineCount: item.originalNewlineCount,
      servedNewlineCount: item.servedNewlineCount, prefixSha256: item.prefixSha256,
      suffixSha256: item.suffixSha256, insertedText: item.insertedText, updateAnchor: item.updateAnchor }];
  })), browser: null, errors: [], cleanupErrors: [], browserClosed: false
};
await mkdir(path.dirname(outputDir), { recursive: true });
await mkdir(outputDir, { recursive: false });
await mkdir(path.join(outputDir, 'traces'));
await mkdir(path.join(outputDir, 'instrumented-assets'));
await writeFile(path.join(outputDir, 'receipt.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
for (const mode of modes) {
  const name = path.basename(patchedAssets[mode].entry.path);
  await writeFile(path.join(outputDir, 'instrumented-assets', name), patchedAssets[mode].patched, { flag: 'wx' });
}

let browser, opening, stopped = false, timeout, timer;
const deadline = Date.now() + 120_000;
const remaining = () => {
  const ms = deadline - Date.now();
  if (stopped || ms <= 0) throw new Error('120-second internal profile deadline expired or interrupted');
  return ms;
};
let stopReject;
const stoppedPromise = new Promise((_, reject) => { stopReject = reject; });
const stop = () => { stopped = true; stopReject(new Error('Profile run interrupted or timed out')); void browser?.close().catch(() => {}); };
process.once('SIGINT', stop); process.once('SIGTERM', stop);
timer = setTimeout(stop, 120_000);
const persist = async () => writeFile(path.join(outputDir, 'receipt.json'), JSON.stringify(record, null, 2) + '\n');

async function readTrace(session, stream, compression = 'none', allowAfterDeadline = false) {
  const chunks = []; let totalBytes = 0;
  while (true) {
    if (!allowAfterDeadline) remaining();
    const chunk = await session.send('IO.read', { handle: stream, size: 1_048_576 });
    const bytes = chunk.base64Encoded ? Buffer.from(chunk.data, 'base64') : Buffer.from(chunk.data, 'utf8');
    totalBytes += bytes.length;
    assert.ok(totalBytes < 300_000_000, 'Trace stream exceeded 300 MB safety limit');
    chunks.push(bytes);
    if (chunk.eof) break;
  }
  await session.send('IO.close', { handle: stream });
  const streamed = Buffer.concat(chunks);
  const output = compression === 'gzip' ? gunzipSync(streamed) : streamed;
  JSON.parse(output.toString('utf8'));
  return output;
}

async function capture(mode, index) {
  const control = { mode, index, contextClosed: false, tracePath: null, result: null,
    traceBytes: null, traceSha256: null, userTimingExpected: 72 };
  record.controls.push(control);
  const context = await browser.newContext({ viewport: { width: 700, height: 540 }, deviceScaleFactor: 1 });
  let session, tracingStarted = false, completePromise = null, pageRef = null;
  try {
    const page = await context.newPage(); pageRef = page;
    page.setDefaultTimeout(5000);
    const pageErrors = [], requestFailures = [];
    control.pageErrors = pageErrors; control.requestFailures = requestFailures;
    page.on('pageerror', error => pageErrors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') pageErrors.push(message.text()); });
    page.on('requestfailed', request => requestFailures.push({ url: request.url(), reason: request.failure()?.errorText }));
    await context.route('**/*', async route => {
      const url = new URL(route.request().url()), item = assets.get(url.pathname);
      if (url.origin !== origin || url.search || url.hash || item?.mode !== mode) {
        control.requestErrors ??= []; control.requestErrors.push(`Unexpected offline request: ${url.href}`);
        await route.abort().catch(() => {}); return;
      }
      try {
        let body;
        if (url.pathname === patchedAssets[mode].entry.urlPath) body = patchedAssets[mode].patched;
        else body = await readFile(item.path);
        const expectedHash = url.pathname === patchedAssets[mode].entry.urlPath
          ? patchedAssets[mode].servedSha256 : item.sha256;
        assert.equal(sha(body), expectedHash, `Served asset mismatch: ${url.pathname}`);
        await route.fulfill({ status: 200, headers: {
          'content-type': item.path.endsWith('.html') ? 'text/html' : 'text/javascript',
          'cache-control': 'no-store'
        }, body });
      } catch (error) {
        control.requestErrors ??= []; control.requestErrors.push(String(error));
        await route.abort().catch(() => {});
      }
    });
    session = await context.newCDPSession(page);
    const categories = await session.send('Tracing.getCategories');
    control.traceCategories = categories.categories;
    control.requestedHiresCategoryListed = categories.categories.includes('disabled-by-default-v8.cpu_profiler.hires');
    for (const required of ['devtools.timeline', 'v8.execute', 'blink.user_timing',
      'disabled-by-default-v8.cpu_profiler'])
      assert.ok(categories.categories.includes(required), `Chromium lacks trace category ${required}`);
    let completeResolve, completeReject;
    completePromise = new Promise((resolve, reject) => { completeResolve = resolve; completeReject = reject; });
    session.once('Tracing.tracingComplete', event => completeResolve(event));
    session.once('Tracing.bufferUsage', event => {
      if (event.percentFull >= 0.95) control.traceBufferNearFull = event;
    });
    session.on('Inspector.targetCrashed', () => completeReject(new Error('Inspected page target crashed')));
    await session.send('Tracing.start', traceConfig);
    tracingStarted = true;
    const response = await page.goto(`${origin}/${mode}/${mode}.html`, { waitUntil: 'load', timeout: remaining() });
    assert.equal(response.status(), 200);
    let armTimer;
    try {
      control.result = await Promise.race([
        page.evaluate(() => globalThis.realtimeHarness.done),
        new Promise((_, reject) => { armTimer = setTimeout(() => reject(new Error(`${mode} workload deadline`)), Math.min(remaining(), 30_000)); }),
        stoppedPromise
      ]);
    } finally { clearTimeout(armTimer); }
    assert.equal(control.result.warmupSamples.length, 12);
    assert.equal(control.result.samples.length, 60);
    assert.equal(control.result.teardown.resourcesDisposed, 512);
    assert.equal(control.result.teardown.resourcesExpected, 512);
    assert.equal(control.result.teardown.duplicateDisposalEvents, 0);
    assert.equal(control.result.teardown.cleanup.sceneChildren, 0);
    assert.equal(control.result.teardown.cleanup.registeredSetters, 0);
    if (mode === 'native') {
      assert.equal(control.result.teardown.cleanup.ownerCount, 0);
      assert.equal(control.result.teardown.cleanup.pending, 0);
    } else assert.equal(control.result.teardown.cleanup.registeredSetters, 0);
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(requestFailures, []);
    assert.deepEqual(control.requestErrors ?? [], []);
    control.pageErrors = pageErrors;
    const selectedFrames = [...control.result.warmupSamples, ...control.result.samples]
      .map(({ epoch, updateStart, publishEnd, publishMs, checksum, count, retained, pixelChecksum, litPixels, counters }) =>
        ({ epoch, updateStart, publishEnd, publishMs, checksum, count, retained, pixelChecksum, litPixels, counters }));
    assert.equal(selectedFrames.length, 72);
    assert.deepEqual(selectedFrames.map(frame => frame.epoch), Array.from({ length: 72 }, (_, i) => i + 1));
    for (const frame of selectedFrames) {
      assert.equal(frame.count, 256); assert.equal(frame.retained, true);
      assert.ok(frame.litPixels > 0); assert.equal(frame.counters, null);
    }
    control.frames = selectedFrames;
    control.rendererInfo = control.result.rendererInfo;
    const completeWait = Promise.race([completePromise, new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Tracing completion timeout')), Math.min(remaining(), 15_000));
    })]);
    await session.send('Tracing.end');
    const traceEnd = await completeWait;
    clearTimeout(timeout); timeout = null;
    assert.ok(traceEnd.stream, 'Tracing.tracingComplete did not provide a stream');
    const bytes = await readTrace(session, traceEnd.stream, traceEnd.streamCompression ?? 'none');
    control.tracePath = path.join(outputDir, 'traces', `${String(index + 1).padStart(2, '0')}-${mode}.trace.json`);
    await writeFile(control.tracePath, bytes, { flag: 'wx' });
    control.traceBytes = bytes.length;
    control.traceSha256 = sha(bytes);
    control.traceFormat = traceEnd.traceFormat ?? null;
    control.traceCompression = traceEnd.streamCompression ?? null;
    control.status = 'TRACE_CAPTURED';
    tracingStarted = false;
    assert.deepEqual(pageErrors, []);
  } finally {
    clearTimeout(timeout); timeout = null;
    if (!control.result && pageRef) {
      let stopTimer;
      try { await Promise.race([pageRef.evaluate(() => globalThis.realtimeHarness?.stop?.()),
        new Promise(resolve => { stopTimer = setTimeout(resolve, 1000); })]); }
      catch (error) { control.stopErrors = [String(error)]; }
      finally { clearTimeout(stopTimer); }
    }
    if (tracingStarted) {
      try {
        await session.send('Tracing.end');
        const traceEnd = await Promise.race([completePromise, new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Tracing completion timeout during failure cleanup')), 5000);
        })]);
        clearTimeout(timeout); timeout = null;
        if (traceEnd.stream) {
          const bytes = await readTrace(session, traceEnd.stream, traceEnd.streamCompression ?? 'none', true);
          control.tracePath ??= path.join(outputDir, 'traces', `${String(index + 1).padStart(2, '0')}-${mode}.trace.json`);
          await writeFile(control.tracePath, bytes, { flag: 'wx' });
          control.traceBytes = bytes.length; control.traceSha256 = sha(bytes);
          control.traceFormat = traceEnd.traceFormat ?? null; control.traceCompression = traceEnd.streamCompression ?? null;
          control.status = 'TRACE_PRESERVED_AFTER_FAILURE';
        }
      } catch (error) { record.cleanupErrors.push(`Trace preservation: ${String(error)}`); }
    }
    if (session) try { await session.detach(); } catch (error) { record.cleanupErrors.push(String(error)); }
    try { await context.close(); control.contextClosed = true; }
    catch (error) { record.cleanupErrors.push(`Context close ${mode}: ${String(error)}`); }
    await persist();
  }
}

try {
  assert.equal(process.env.SELENIUM_REMOTE_URL, undefined, 'Remote browser sessions are not allowed');
  record.source.inputRows = await sourceRows();
  assert.ok(record.source.inputRows.every(row => row.matches !== false && row.expected === row.actual),
    'Frozen proof, source, or archived inputs differ before capture');
  record.source.ownFiles = await Promise.all(ownPaths.map(async file => ({ path: file, sha256: await fileHash(file) })));
  opening = openBrowser({ headless: true, gpu: true, handleSignals: false }).then(async instance => {
    if (stopped) { await instance.close(); throw new Error('Stopped during browser launch'); }
    return instance;
  });
  browser = await Promise.race([opening, stoppedPromise]);
  record.browser = { version: browser.version(), headless: true, gpu: true,
    args: createBrowserArgs({ headless: true, gpu: true, handleSignals: false }),
    executablePath: chromiumPath, executableSha256: toolchainBefore.at(-1).sha256 };
  for (let index = 0; index < order.length; index++) await capture(order[index], index);
  const rendererSettings = record.controls.map(control => ({
    outputColorSpace: control.rendererInfo.outputColorSpace, toneMapping: control.rendererInfo.toneMapping,
    pixelRatio: control.rendererInfo.pixelRatio, antialias: control.rendererInfo.antialias,
    preserveDrawingBuffer: control.rendererInfo.preserveDrawingBuffer,
    renderer: control.rendererInfo.renderer, unmaskedRenderer: control.rendererInfo.unmaskedRenderer,
    camera: control.rendererInfo.camera, drawingBuffer: control.rendererInfo.drawingBuffer }));
  for (let index = 1; index < rendererSettings.length; index++) assert.deepEqual(rendererSettings[index], rendererSettings[0]);
  const outputs = record.controls.map(control => control.frames.map(({ epoch, checksum, count, retained, pixelChecksum, litPixels }) =>
    ({ epoch, checksum, count, retained, pixelChecksum, litPixels })));
  for (let index = 1; index < outputs.length; index++) assert.deepEqual(outputs[index], outputs[0]);
  record.source.inputRowsAfter = await sourceRows();
  assert.deepEqual(record.source.inputRowsAfter, record.source.inputRows);
  assert.equal(await fileHash(reviewedSourcePath), record.source.reviewedSourceSha256);
  record.source.ownFilesAfter = await Promise.all(ownPaths.map(async file => ({ path: file, sha256: await fileHash(file) })));
  assert.deepEqual(record.source.ownFilesAfter, record.source.ownFiles);
  record.source.toolchainAfter = await toolchainRows();
  assert.deepEqual(record.source.toolchainAfter, toolchainBefore);
  await browser.close(); browser = null; record.browserClosed = true;
  record.status = 'CAPTURE_COMPLETE_PENDING_OFFLINE_ANALYSIS';
} catch (error) {
  record.errors.push(error instanceof Error ? error.stack : String(error));
  record.status = 'INCOMPLETE';
} finally {
  clearTimeout(timer); clearTimeout(timeout);
  process.off('SIGINT', stop); process.off('SIGTERM', stop);
  if (browser) try { await browser.close(); record.browserClosed = true; }
  catch (error) { record.cleanupErrors.push(String(error)); }
  if (record.source.inputRows && !record.source.inputRowsAfter) {
    try {
      record.source.inputRowsAfter = await sourceRows();
      record.source.inputRowsAfterMatches = JSON.stringify(record.source.inputRowsAfter) === JSON.stringify(record.source.inputRows);
      if (!record.source.inputRowsAfterMatches) record.errors.push('Frozen input/source hashes changed during the capture attempt');
    } catch (error) { record.cleanupErrors.push(`Post-run source audit: ${String(error)}`); }
  }
  if (record.source.ownFiles && !record.source.ownFilesAfter) {
    try {
      record.source.ownFilesAfter = await Promise.all(ownPaths.map(async file => ({ path: file, sha256: await fileHash(file) })));
      record.source.ownFilesAfterMatches = JSON.stringify(record.source.ownFilesAfter) === JSON.stringify(record.source.ownFiles);
      if (!record.source.ownFilesAfterMatches) record.errors.push('Collector or map source changed during the capture attempt');
    } catch (error) { record.cleanupErrors.push(`Post-run collector source audit: ${String(error)}`); }
  }
  if (!record.source.toolchainAfter) {
    try {
      record.source.toolchainAfter = await toolchainRows();
      record.source.toolchainAfterMatches = JSON.stringify(record.source.toolchainAfter) === JSON.stringify(toolchainBefore);
      if (!record.source.toolchainAfterMatches) record.errors.push('Browser or tooling binaries changed during the capture attempt');
    } catch (error) { record.cleanupErrors.push(`Post-run browser/tool audit: ${String(error)}`); }
  }
  record.source.reviewedSourceSha256After = await fileHash(reviewedSourcePath).catch(error => {
    record.cleanupErrors.push(`Reviewed-source manifest audit: ${String(error)}`); return null;
  });
  if (record.source.reviewedSourceSha256After && record.source.reviewedSourceSha256After !== record.source.reviewedSourceSha256)
    record.errors.push('Reviewed-source-v7 manifest changed during the capture attempt');
  if (record.errors.length && record.status === 'CAPTURE_COMPLETE_PENDING_OFFLINE_ANALYSIS') record.status = 'INCOMPLETE';
  if (stopped || record.cleanupErrors.length || record.controls.some(control => !control.contextClosed)) record.status = 'INCOMPLETE';
  await persist();
}
if (record.status === 'INCOMPLETE') process.exitCode = 1;
else console.log(JSON.stringify({ status: record.status, outputDir, controls: record.controls.length }));
