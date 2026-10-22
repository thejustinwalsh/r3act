import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { openBrowser } from 'vitexec/cli';
import { initReactBoundaryAudit } from './make-ordering-variant.mjs';

assert.equal(process.version, 'v24.18.0');
const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, '../..');
const defaultProof = path.join(root, 'implementation/2026-10-22-native-frame-publication/proof-canvas-v3');
const args = process.argv.slice(2);
const names = ['--proof-dir', '--off-manifest', '--ordering-dir', '--manual-proof-dir', '--manual-source-manifest', '--output-dir'];
assert.equal(args.length, names.length * 2, `usage: run-audit.mjs ${names.map(x => `${x} ABS`).join(' ')}`);
for (let i = 0; i < names.length; i++) assert.equal(args[i * 2], names[i]);
const values = Object.fromEntries(names.map((name, index) => [name, path.resolve(args[index * 2 + 1])]));
const proofDir = values['--proof-dir'], offManifestPath = values['--off-manifest'];
const orderingDir = values['--ordering-dir'], manualProofDir = values['--manual-proof-dir'];
const manualSourceManifestPath = values['--manual-source-manifest'], outDir = values['--output-dir'];
assert.equal(proofDir, defaultProof, 'use the frozen v3 baseline proof');
assert.ok(outDir.startsWith(path.join(unit, 'evidence') + path.sep), 'output must be in a fresh audit evidence directory');
assert.equal(path.basename(outDir), 'run-v2');
assert.equal(process.env.SELENIUM_REMOTE_URL, undefined, 'local owned browser required; remote Selenium is not allowed');
const receiptPath = path.join(outDir, 'receipt.json');
try { await access(outDir); throw new Error(`refusing existing output path ${outDir}`); }
catch (error) { if (error?.code !== 'ENOENT') throw error; }

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hashFile = async file => sha(await readFile(file));
const hashStream = file => new Promise((resolve, reject) => {
  const hash = createHash('sha256'), stream = createReadStream(file);
  stream.on('data', chunk => hash.update(chunk)); stream.once('error', reject);
  stream.once('end', () => resolve(hash.digest('hex')));
});
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const proofBytes = await readFile(path.join(proofDir, 'build-proof.json'));
const inputLockBytes = await readFile(path.join(proofDir, 'input-lock.json'));
const proofHash = sha(proofBytes), inputLockHash = sha(inputLockBytes);
const proof = JSON.parse(proofBytes), lock = JSON.parse(inputLockBytes);
assert.equal(proof.status, 'PASS_R3F_FRAME_BASELINES_CANVAS_BUILD');
assert.equal(lock.status, 'PASS_R3F_FRAME_BASELINES_CANVAS_PREPARATION');
assert.equal(proof.inputLockSha256, inputLockHash);
const offManifest = await readJson(offManifestPath);
assert.equal(offManifest.status, 'COMPLETE_COMPILER_OFF_CONTROL');
assert.equal(offManifest.control, 'react-compiler-off');
assert.equal(offManifest.onlyConfigDelta, 'Remove babel-plugin-react-compiler from reactOptions.babel.plugins; preserve all other React/Vite/native plugin settings, authored source and pins.');
assert.equal(offManifest.config.compilerPlugin, false);
assert.ok(offManifest.transform.compilerMemoCallsAbsent && offManifest.transform.compilerRuntimeImportAbsent);
const manualCapture = await readJson(path.join(manualProofDir, 'capture-react.json'));
assert.equal(manualCapture.status, 'PASS');
assert.equal(manualCapture.reactMemoized, true, 'manual variant must retain Compiler ON memoization');
for (const name of ['Position', 'Rotation'])
  assert.ok(manualCapture.compilerEvents.some(event => event.kind === 'CompileSuccess' && event.fnName === name), `manual build missed Compiler ON ${name} capture`);
const manualSourceManifest = await readJson(manualSourceManifestPath);
assert.equal(manualSourceManifest.status, 'PREPARED_COMPILER_ON_MANUAL_COPY');
assert.equal(manualSourceManifest.api.valuesCheckedPerInspection, 769);
const orderingManifestPath = path.join(orderingDir, 'ordering-manifest.json');
const orderingManifest = await readJson(orderingManifestPath);
assert.equal(orderingManifest.sourceSha256, '6d67971492a2766a8e770d21cc101b0b595df0ec5db291c0f4829acbdca6a832');
assert.equal(orderingManifest.originalTimingValid, false);
const sourceManifestPath = path.join(path.dirname(proofDir), 'reviewed-source-v7.json');
const sourceManifestBytes = await readFile(sourceManifestPath);
const sourceManifest = JSON.parse(sourceManifestBytes);
assert.equal(sourceManifest.status, 'UNVERIFIED_FROZEN');
const productRows = sourceManifest.files.filter(item => /^(src|compiler|packages)\//.test(item.path));
assert.equal(productRows.length, 585, 'bind the reviewed product source inventory');

const urlFor = relative => `/react/${relative.replaceAll(path.sep, '/')}`;
const assetRowsFromDirectory = async (directory, cohort, { ignoredFiles = [] } = {}) => {
  const rows = [];
  const walk = async current => {
    for (const entry of await (await import('node:fs/promises')).readdir(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && ignoredFiles.includes(path.relative(directory, file))) continue;
      else if (entry.isFile()) {
        const relative = path.relative(directory, file);
        rows.push({ path: file, urlPath: urlFor(relative), sha256: await hashFile(file), bytes: (await stat(file)).size, cohort });
      } else throw new Error(`Unsupported asset entry ${file}`);
    }
  };
  await walk(directory);
  return rows.sort((a, b) => a.urlPath.localeCompare(b.urlPath));
};
const originalAssets = proof.assets.react.map(item => ({ ...item, cohort: 'compiler-on-original' }));
const offAssets = await assetRowsFromDirectory(path.join(path.dirname(offManifestPath), 'dist', 'react'), 'compiler-off');
const orderingAssets = await assetRowsFromDirectory(orderingDir, 'ordering-instrumented', { ignoredFiles: ['ordering-manifest.json'] });
const orderingAssetPath = path.join(orderingDir, orderingManifest.asset);
assert.deepEqual(orderingAssets.map(item => item.urlPath), originalAssets.map(item => item.urlPath).sort((a, b) => a.localeCompare(b)),
  'ordering directory must contain exactly the original asset inventory');
for (const item of orderingAssets) {
  const original = originalAssets.find(source => source.urlPath === item.urlPath);
  assert.ok(original, `ordering asset has no original route ${item.urlPath}`);
  const expected = item.path === orderingAssetPath ? orderingManifest.variantSha256 : original.sha256;
  assert.equal(item.sha256, expected, `ordering copy changed an unexpected asset ${item.urlPath}`);
}
const manualAssets = await assetRowsFromDirectory(path.join(manualProofDir, 'dist', 'react'), 'manual-timer');
const assetGroups = { 'compiler-on-original': originalAssets, 'compiler-off': offAssets,
  'ordering-instrumented': orderingAssets, 'manual-timer': manualAssets };
for (const [cohort, assets] of Object.entries(assetGroups)) {
  assert.equal(new Set(assets.map(item => item.urlPath)).size, assets.length, `${cohort}: duplicate asset routes`);
  assert.ok(assets.some(item => item.urlPath === '/react/react.html'), `${cohort}: missing React HTML entry`);
  for (const item of assets) assert.equal((await stat(item.path)).size, item.bytes, `${cohort}: asset byte count drift ${item.path}`);
}
const allAssets = Object.values(assetGroups).flat();
const consumerInputs = lock.inputs.map(item => item.path);
const packageInputs = lock.packageSources.map(item => item.path);
const rendererInputs = lock.rendererSourceBasis.map(item => item.path);
const installedInputs = lock.installed.map(item => item.path);
const compilerPath = proof.compiler.path;
const proofFiles = [path.join(proofDir, 'build-proof.json'), path.join(proofDir, 'input-lock.json'),
  path.join(proofDir, 'capture-react.json'), ...proof.transforms.react.map(item => item.path)];
const listFiles = async directory => {
  const found = [];
  for (const entry of await (await import('node:fs/promises')).readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await listFiles(file));
    else if (entry.isFile()) found.push(file);
    else throw new Error(`Unsupported research artifact ${file}`);
  }
  return found;
};
const generatedResearchFiles = [
  ...await listFiles(path.dirname(offManifestPath)),
  ...await listFiles(orderingDir),
  ...await listFiles(manualProofDir),
  ...Object.keys(manualSourceManifest.copiedSha256).map(name => path.join(manualSourceManifest.copy, name)),
  manualSourceManifestPath,
];
const researchFiles = [fileURLToPath(import.meta.url), fileURLToPath(import.meta.resolve('./protocol.md')),
  fileURLToPath(import.meta.resolve('./build-react-controls.mjs')),
  fileURLToPath(import.meta.resolve('./make-manual-variant.mjs')),
  fileURLToPath(import.meta.resolve('./make-ordering-variant.mjs')),
  fileURLToPath(import.meta.resolve('./controls-design.md')),
  fileURLToPath(import.meta.resolve('./ordering-design.md')),
  offManifestPath, manualSourceManifestPath, orderingManifestPath];
const sourcePaths = [...new Set([...consumerInputs, ...packageInputs, ...rendererInputs, ...installedInputs,
  compilerPath, ...proofFiles, ...generatedResearchFiles, ...researchFiles, ...allAssets.map(item => item.path)])];
const sourceHashBaseline = new Map();
const expectedSourceHashes = new Map();
const expectHash = (file, expected) => {
  const absolute = path.resolve(file), prior = expectedSourceHashes.get(absolute);
  if (prior) assert.equal(prior, expected, `conflicting frozen hashes for ${absolute}`);
  expectedSourceHashes.set(absolute, expected);
};
for (const collection of [lock.inputs, lock.packageSources, lock.rendererSourceBasis, lock.installed])
  for (const item of collection) expectHash(item.path, item.sha256);
expectHash(compilerPath, proof.compiler.sha256);
expectHash(path.join(proofDir, 'capture-react.json'), proof.captures.react.sha256);
for (const item of proof.transforms.react) expectHash(item.path, item.sha256);
for (const item of proof.assets.react) expectHash(item.path, item.sha256);
for (const item of offManifest.assets) expectHash(path.join(path.dirname(offManifestPath), item.relative), item.sha256);
expectHash(path.join(orderingDir, orderingManifest.asset), orderingManifest.variantSha256);
for (const item of originalAssets) {
  const relative = item.urlPath.replace(/^\/react\//, '');
  expectHash(path.join(orderingDir, relative), path.join(orderingDir, relative) === path.join(orderingDir, orderingManifest.asset)
    ? orderingManifest.variantSha256 : item.sha256);
}
for (const [name, expected] of Object.entries(manualSourceManifest.copiedSha256))
  expectHash(path.join(manualSourceManifest.copy, name), expected);

const vitexecEntry = fileURLToPath(import.meta.resolve('vitexec/cli'));
const vitexecPackage = path.resolve(path.dirname(vitexecEntry), '..', 'package.json');
const vitexecRequire = createRequire(vitexecEntry);
const playwrightEntry = vitexecRequire.resolve('playwright');
const browserPackage = path.resolve(path.dirname(playwrightEntry), 'package.json');
const browserDeps = [...new Set([vitexecEntry, vitexecPackage, playwrightEntry, browserPackage])];
const sourceBefore = [], sourceAfter = [], researchHashesBefore = [], researchHashesAfter = [];
const checkSources = async phase => {
  assert.equal(await hashFile(path.join(proofDir, 'build-proof.json')), proofHash, 'frozen v3 build proof changed');
  assert.equal(await hashFile(path.join(proofDir, 'input-lock.json')), inputLockHash, 'frozen v3 input lock changed');
  assert.equal(await hashFile(sourceManifestPath), sha(sourceManifestBytes), 'reviewed source manifest changed');
  for (const item of productRows) {
    const actual = await hashFile(path.join(root, item.path));
    assert.equal(actual, item.sha256, `${phase}: reviewed product source drift ${item.path}`);
    const row = { path: item.path, expected: item.sha256, actual, matches: true };
    (phase === 'before' ? sourceBefore : sourceAfter).push(row);
  }
  const target = phase === 'before' ? sourceBefore : sourceAfter;
  for (const file of sourcePaths) {
    const actual = await hashFile(file);
    const expected = expectedSourceHashes.get(path.resolve(file));
    if (expected) assert.equal(actual, expected, `${phase}: immutable input hash mismatch ${file}`);
    if (phase === 'before') sourceHashBaseline.set(file, actual);
    else assert.equal(actual, sourceHashBaseline.get(file), `research/input source changed during audit ${file}`);
    target.push({ path: file, expected: expected ?? sourceHashBaseline.get(file) ?? actual,
      actual, matches: actual === (expected ?? sourceHashBaseline.get(file) ?? actual) });
  }
  for (const [index, file] of browserDeps.entries()) {
    const actual = await hashFile(file);
    const rows = phase === 'before' ? researchHashesBefore : researchHashesAfter;
    rows.push({ kind: 'browser-tool', path: file, sha256: actual });
    if (phase === 'after') assert.equal(actual, researchHashesBefore.filter(x => x.kind === 'browser-tool')[index].sha256, `browser tooling drift ${file}`);
  }
  const browserPath = browserExecutablePath;
  if (browserPath) {
    const actual = await hashStream(browserPath);
    const rows = phase === 'before' ? researchHashesBefore : researchHashesAfter;
    rows.push({ kind: 'browser-executable', path: browserPath, sha256: actual });
    if (phase === 'after') assert.equal(actual, researchHashesBefore.find(x => x.kind === 'browser-executable').sha256, 'browser executable changed');
  }
};

const origin = 'https://react-measurement-audit.invalid';
const schedule = [
  { mode: 'compiler-on-original', timing: 'raf' },
  { mode: 'compiler-off', timing: 'raf' },
  { mode: 'ordering-instrumented', timing: 'raf', instrumented: true },
  { mode: 'manual-timer', timing: 'manual' },
  { mode: 'compiler-off', timing: 'raf' },
  { mode: 'compiler-on-original', timing: 'raf' },
];
const deadlineAt = Date.now() + 120_000;
const remaining = () => { const n = deadlineAt - Date.now(); assert.ok(n > 0, '120-second audit deadline expired'); return n; };
const median = values => { const xs = [...values].sort((a, b) => a - b); return xs.length % 2 ? xs[(xs.length - 1) / 2] : (xs[xs.length / 2 - 1] + xs[xs.length / 2]) / 2; };
const percentile = (values, p) => { const xs = [...values].sort((a, b) => a - b); return xs[Math.ceil(p * xs.length) - 1]; };
const stats = values => ({ n: values.length, median: median(values), p95NearestRank: percentile(values, .95), max: Math.max(...values), min: Math.min(...values) });
const digest = samples => sha(Buffer.from(JSON.stringify(samples.map(({ epoch, checksum, pixelChecksum, litPixels }) => ({ epoch, checksum, pixelChecksum, litPixels })))));
const assetMap = assets => new Map(assets.map(item => [item.urlPath, item]));
const receipt = {
  schemaVersion: 'react-measurement-audit-v1', status: 'STARTED',
  purpose: 'Bounded update-interval/order and Compiler-off research; no performance qualification or implementation decision.',
  startedAt: new Date().toISOString(), node: process.version, root, unit, proofDir, outDir,
  frozenBuildProofSha256: proofHash, frozenInputLockSha256: inputLockHash,
  currentContextDelta: 'The v3 input lock binds its prepared consumer and assets; current product src/compiler/packages are separately bound by reviewed-source-v7 (585 rows). This is not a whole-worktree lock.',
  sourceBefore, sourceAfter, researchHashesBefore, researchHashesAfter,
  setup: { transport: 'Offline intercepted synthetic HTTPS; no project server', origin, headless: true, gpu: true,
    remoteSelenium: false, profiler: false, schedule, frames: { warmup: 12, measured: 60, total: 72 },
    errors: [], pageErrors: [], consoleErrors: [], blockedRequests: [], requestFailures: [], cleanupErrors: [], browserClosed: false,
    browser: null, browserExecutable: null },
  offControl: { manifestPath: offManifestPath, manifestSha256: await hashFile(offManifestPath), configDelta: offManifest.onlyConfigDelta,
    transformEvidence: offManifest.transform, assetCount: offAssets.length },
  orderingControl: { manifestPath: orderingManifestPath, manifestSha256: await hashFile(orderingManifestPath),
    originalTimingValid: false, assetCount: orderingAssets.length },
  manualControl: { sourceManifestPath: manualSourceManifestPath, sourceManifestSha256: await hashFile(manualSourceManifestPath),
    capturePath: path.join(manualProofDir, 'capture-react.json'), captureSha256: await hashFile(path.join(manualProofDir, 'capture-react.json')),
    api: manualSourceManifest.api, assetCount: manualAssets.length,
    evidenceStatus: 'MANUAL_RESEARCH_BUILD_COMPLETE; derived from copied source manifest, original capture-react.json, transforms and asset inventory; not an original package build-proof status' },
  contexts: [],
  interpretation: { originalUpdateWindow: 'scene.start: performance.now immediately before arm.update(epoch) through immediately after its return',
    browserUpdateTimerIsDiagnostic: true, orderingInstrumentationDurationsValid: false,
    manualRpcIncludesTransportAndOutsideTimerWork: true, noSubtractionOfBrowserAndRpcClocks: true,
    sourcePhaseCountsAreNotCpuTime: true, noPerformanceQualification: true }
};
await mkdir(path.dirname(outDir), { recursive: true });
await mkdir(outDir, { recursive: false });
const manualTransformRows = await Promise.all((await listFiles(path.join(manualProofDir, 'transforms', 'react')))
  .map(async file => ({ path: file, sha256: await hashFile(file) })));
const manualBuildManifest = { schemaVersion: 'react-manual-research-build-v1', status: 'MANUAL_RESEARCH_BUILD_COMPLETE',
  purpose: 'Derived research inventory; not an original baseline build-proof receipt.',
  manualSourceManifestPath, manualSourceManifestSha256: await hashFile(manualSourceManifestPath),
  capturePath: path.join(manualProofDir, 'capture-react.json'), capture: manualCapture,
  transforms: manualTransformRows,
  assets: manualAssets.map(({ cohort, ...item }) => item) };
const manualBuildManifestPath = path.join(outDir, 'manual-research-build-manifest.json');
await writeFile(manualBuildManifestPath, JSON.stringify(manualBuildManifest, null, 2) + '\n', { flag: 'wx' });
receipt.manualControl.derivedManifestPath = manualBuildManifestPath;
receipt.manualControl.derivedManifestSha256 = await hashFile(manualBuildManifestPath);
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
let browser = null, opening = null, interrupted = false, timerHandle, resolveInterrupted, browserExecutablePath = null;
const interruption = new Promise(resolve => { resolveInterrupted = resolve; });
const stop = () => { interrupted = true; resolveInterrupted(); void browser?.close().catch(() => {}); };
timerHandle = setTimeout(stop, 120_000);
process.once('SIGINT', stop); process.once('SIGTERM', stop);
const checkResult = (result, label) => {
  assert.equal(result.warmup, 12, `${label}: expected 12 warmups`); assert.equal(result.measured, 60, `${label}: expected 60 measured updates`);
  assert.equal(result.warmupSamples.length, 12); assert.equal(result.samples.length, 60);
  assert.deepEqual(result.samples.map(sample => sample.epoch), Array.from({ length: 60 }, (_, i) => i + 13));
  const all = [...result.warmupSamples, ...result.samples];
  assert.equal(all.length, 72); assert.ok(all.every(sample => sample.counters === null), `${label}: timing counters must remain null`);
  for (const sample of all) {
    assert.equal(sample.count, 256); assert.equal(sample.retained, true); assert.ok(sample.litPixels > 0);
    assert.ok(Number.isFinite(sample.publishMs) && Number.isFinite(sample.updateThroughDrawMs));
  }
  const teardown = result.teardown;
  assert.equal(teardown.resourcesExpected, 512); assert.equal(teardown.resourcesDisposed, 512);
  assert.equal(teardown.duplicateDisposalEvents, 0); assert.equal(teardown.cleanup.sceneChildren, 0);
  assert.equal(teardown.cleanup.registeredSetters, 0);
  return all;
};
const timerRace = async (promise, label, timeout) => {
  let handle;
  return Promise.race([promise, new Promise((_, reject) => { handle = setTimeout(() => reject(new Error(`${label} timeout`)), timeout); })])
    .finally(() => clearTimeout(handle));
};

try {
  await mkdir(path.dirname(receiptPath), { recursive: true });
  await checkSources('before');
  opening = openBrowser({ headless: true, gpu: true, handleSignals: false, timeoutMs: Math.min(30_000, remaining()) }).then(async instance => {
    if (interrupted) { await instance.close(); throw new Error('Browser opened after interruption and was closed before use'); }
    return instance;
  });
  browser = await Promise.race([opening, interruption.then(() => { throw new Error('Browser launch interrupted or audit deadline expired'); })]);
  receipt.setup.browser = { version: browser.version(), headless: true, gpu: true, remoteSelenium: false };
  browserExecutablePath = browser.browserType?.().executablePath?.() ?? null;
  receipt.setup.browserExecutable = browserExecutablePath;
  if (browserExecutablePath) {
    receipt.setup.browserExecutableSha256Before = await hashStream(browserExecutablePath);
    receipt.setup.browserExecutableBytes = (await stat(browserExecutablePath)).size;
    researchHashesBefore.push({ kind: 'browser-executable', path: browserExecutablePath, sha256: receipt.setup.browserExecutableSha256Before });
  }
  for (let index = 0; index < schedule.length; index++) {
    remaining(); assert.ok(!interrupted, 'audit interrupted');
    const spec = schedule[index], assets = assetGroups[spec.mode], arm = { index: index + 1, ...spec, contextClosed: false,
      harnessCalls: null, outputDigest: null, rendererInfo: null, result: null, stats: null };
    receipt.contexts.push(arm);
    const context = await browser.newContext({ viewport: { width: 700, height: 540 }, deviceScaleFactor: 1 });
    let page = null;
    try {
      page = await context.newPage(); page.setDefaultTimeout(5000);
      page.on('pageerror', error => receipt.setup.pageErrors.push({ index: index + 1, mode: spec.mode, error: String(error) }));
      page.on('console', message => { if (message.type() === 'error') receipt.setup.consoleErrors.push({ index: index + 1, mode: spec.mode, text: message.text() }); });
      page.on('requestfailed', request => receipt.setup.requestFailures.push({ index: index + 1, mode: spec.mode,
        url: request.url(), reason: request.failure()?.errorText }));
      if (spec.instrumented) await page.addInitScript({ content: `(${initReactBoundaryAudit.toString()})();` });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url()), asset = assetMap(assets).get(url.pathname);
        if (url.origin !== origin || url.search || url.hash || !asset) {
          receipt.setup.blockedRequests.push({ index: index + 1, mode: spec.mode, url: url.href }); await route.abort(); return;
        }
        try {
          const bytes = await readFile(asset.path);
          assert.equal(sha(bytes), asset.sha256, `served asset drift (${spec.mode}) ${asset.path}`);
          await route.fulfill({ status: 200, headers: { 'content-type': asset.path.endsWith('.html') ? 'text/html' :
            asset.path.endsWith('.css') ? 'text/css' : 'text/javascript', 'cache-control': 'no-store' }, body: bytes });
        } catch (error) { receipt.setup.errors.push(String(error)); await route.abort(); }
      });
      const response = await page.goto(`${origin}/react/react.html`, { waitUntil: 'load', timeout: remaining() });
      assert.equal(response.status(), 200);
      if (spec.timing === 'raf') {
        const result = await timerRace(page.evaluate(() => window.realtimeHarness.done), `${spec.mode} 72 RAF updates`, Math.min(remaining(), 35_000));
        arm.result = result;
        const all = checkResult(result, spec.mode);
        arm.harnessCalls = { warmup: result.warmupSamples.length, measured: result.samples.length, total: all.length };
        arm.rendererInfo = result.rendererInfo;
        arm.outputDigest = digest(result.samples);
        arm.stats = { updateMs: stats(result.samples.map(x => x.publishMs)), throughDrawMs: stats(result.samples.map(x => x.updateThroughDrawMs)),
          firstUpdateMs: result.firstUpdate?.publishMs ?? null, timerQuantumMs: result.timerQuantumMs };
        if (spec.instrumented) {
          const audit = await page.evaluate(async () => {
            await Promise.resolve(); await new Promise(resolve => setTimeout(resolve, 0)); await new Promise(resolve => setTimeout(resolve, 0));
            const value = window.__reactBoundaryAudit;
            return { summary: value.summarize(), events: value.events };
          });
          arm.ordering = audit.summary;
          arm.orderingEventsPath = path.join(outDir, 'ordering-events.json');
          await writeFile(arm.orderingEventsPath, JSON.stringify(audit.events), { flag: 'wx' });
          assert.equal(audit.summary.status, 'PASS', `ordering boundary audit failed: ${JSON.stringify(audit.summary.violations.slice(0, 8))}`);
          assert.equal(audit.summary.originalTimingValid, false);
          assert.equal(audit.summary.frames.length, 72);
        }
      } else {
        const rendererInfo = await page.evaluate(() => {
          const arm = window.realtimeManualHarness.arm;
          const gl = arm.renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
          return { version: String(gl.getParameter(gl.VERSION)), renderer: String(gl.getParameter(gl.RENDERER)),
            unmaskedRenderer: debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : null,
            outputColorSpace: arm.renderer.outputColorSpace, toneMapping: arm.renderer.toneMapping,
            pixelRatio: arm.renderer.getPixelRatio(), antialias: gl.getContextAttributes()?.antialias,
            preserveDrawingBuffer: gl.getContextAttributes()?.preserveDrawingBuffer,
            drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
            camera: { manual: true, left: arm.camera.left, right: arm.camera.right, top: arm.camera.top, bottom: arm.camera.bottom,
              near: arm.camera.near, far: arm.camera.far, projectionMatrix: Array.from(arm.camera.projectionMatrix.elements) } };
        });
        arm.rendererInfo = rendererInfo;
        const warmupSamples = [], samples = [];
        arm.result = { warmup: 12, measured: 60, warmupSamples, samples, teardown: null,
          rendering: 'Manual run in progress; partial raw samples are retained if the episode fails' };
        const manualBatchStarted = process.hrtime.bigint();
        for (let epoch = 1; epoch <= 72; epoch++) {
          remaining(); assert.ok(!interrupted, 'manual timer audit interrupted');
          const nodeStart = process.hrtime.bigint();
          const value = await page.evaluate(epochValue => {
            const harness = window.realtimeManualHarness;
            const updateStart = performance.now();
            const publication = harness.arm.update(epochValue);
            const publishEnd = performance.now();
            if (!publication?.published) throw new Error(`Manual publication deferred at ${epochValue}`);
            const inspection = harness.inspect(epochValue);
            return { epoch: epochValue, updateMs: publishEnd - updateStart, publication,
              checksum: inspection.checksum, count: inspection.count, retained: inspection.retained,
              valuesChecked: inspection.valuesChecked, validationMs: inspection.validationMs };
          }, epoch);
          const nodeEnd = process.hrtime.bigint();
          value.updateInspectRpcMs = Number(nodeEnd - nodeStart) / 1e6;
          assert.equal(value.epoch, epoch); assert.equal(value.valuesChecked, 769);
          assert.equal(value.count, 256); assert.equal(value.retained, true);
          assert.ok(Number.isFinite(value.updateMs) && Number.isFinite(value.updateInspectRpcMs) && Number.isFinite(value.validationMs));
          if (value.publication.counters !== undefined) assert.equal(value.publication.counters, null, 'manual diagnostic counters must stay null');
          delete value.publication;
          (epoch <= 12 ? warmupSamples : samples).push(value);
          const drawNodeStart = process.hrtime.bigint();
          const pixels = await page.evaluate(() => {
            const started = performance.now();
            const output = window.realtimeManualHarness.draw();
            return { ...output, drawMs: performance.now() - started };
          });
          value.drawMs = pixels.drawMs;
          value.drawRpcMs = Number(process.hrtime.bigint() - drawNodeStart) / 1e6;
          value.pixelChecksum = pixels.pixelChecksum; value.litPixels = pixels.litPixels;
          assert.ok(value.litPixels > 0 && Number.isFinite(value.drawMs) && Number.isFinite(value.drawRpcMs));
        }
        const manualBatchWallMs = Number(process.hrtime.bigint() - manualBatchStarted) / 1e6;
        const teardown = await page.evaluate(() => window.realtimeManualHarness.stop());
        assert.equal(teardown.stopped, true);
        assert.equal(teardown.resourcesExpected, 512); assert.equal(teardown.resourcesDisposed, 512);
        assert.equal(teardown.duplicateDisposalEvents, 0); assert.equal(teardown.cleanup.sceneChildren, 0);
        assert.equal(teardown.cleanup.registeredSetters, 0);
        for (const item of [...warmupSamples, ...samples]) item.counters = null;
        arm.result = { warmup: 12, measured: 60, warmupSamples, samples, teardown,
          rendering: 'Same shared WebGL renderer render/readPixels after manual update and 769-value inspection; no presentation claim' };
        arm.harnessCalls = { warmup: warmupSamples.length, measured: samples.length, total: 72 };
        arm.outputDigest = digest(samples.map(x => ({ epoch: x.epoch, checksum: x.checksum,
          pixelChecksum: x.pixelChecksum, litPixels: x.litPixels })));
        arm.stats = { browserUpdateMs: stats(samples.map(x => x.updateMs)),
          updateInspectRpcMs: stats(samples.map(x => x.updateInspectRpcMs)), drawMs: stats(samples.map(x => x.drawMs)),
          drawRpcMs: stats(samples.map(x => x.drawRpcMs)), validationMs: stats(samples.map(x => x.validationMs)),
          manualBatchWallMs, measuredBrowserUpdateSumMs: samples.reduce((sum, x) => sum + x.updateMs, 0),
          firstUpdateBrowserMs: warmupSamples[0]?.updateMs ?? null,
          intervals: 'Per-update Node hrtime brackets one page.evaluate containing original arm.update plus 769-value inspection, but no draw. A separate page.evaluate draws/reads pixels and has separate browser/Node intervals. Browser performance.now brackets only original arm.update. Do not subtract or treat clocks as equivalent.' };
      }
    } finally {
      if (page) try {
        await page.evaluate(async () => {
          const manual = window.realtimeManualHarness;
          if (manual && !manual.stopped) await manual.stop();
          const raf = window.realtimeHarness;
          if (raf && !raf.resolved) await raf.stop();
          window.__reactBoundaryAudit?.cleanup();
        });
      } catch (error) { receipt.setup.cleanupErrors.push(`context ${index + 1} harness cleanup: ${String(error)}`); }
      try { await context.close(); arm.contextClosed = true; }
      catch (error) { receipt.setup.cleanupErrors.push(`context ${index + 1} close: ${String(error)}`); }
      await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
    }
  }
  const originalOn = receipt.contexts.filter(item => item.mode === 'compiler-on-original');
  const compilerOff = receipt.contexts.filter(item => item.mode === 'compiler-off');
  assert.equal(originalOn.length, 2); assert.equal(compilerOff.length, 2);
  for (const item of [...originalOn, ...compilerOff, receipt.contexts[2], receipt.contexts[3]])
    assert.equal(item.outputDigest, originalOn[0].outputDigest, `${item.mode}: semantic values/pixels differ from baseline`);
  const referenceRenderer = originalOn[0].rendererInfo;
  for (const context of receipt.contexts) {
    assert.equal(context.rendererInfo.renderer, referenceRenderer.renderer);
    assert.equal(context.rendererInfo.unmaskedRenderer, referenceRenderer.unmaskedRenderer);
    assert.deepEqual(context.rendererInfo.drawingBuffer, referenceRenderer.drawingBuffer);
    assert.deepEqual(context.rendererInfo.camera, referenceRenderer.camera);
  }
  await checkSources('after');
  assert.equal(receipt.setup.blockedRequests.length, 0); assert.equal(receipt.setup.requestFailures.length, 0);
  assert.equal(receipt.setup.pageErrors.length, 0); assert.equal(receipt.setup.consoleErrors.length, 0);
  assert.equal(receipt.setup.errors.length, 0); assert.equal(receipt.setup.cleanupErrors.length, 0);
  assert.ok(receipt.contexts.every(item => item.contextClosed));
  receipt.setup.browserExecutableSha256After = browserExecutablePath ? await hashStream(browserExecutablePath) : null;
  if (browserExecutablePath) assert.equal(receipt.setup.browserExecutableSha256After, receipt.setup.browserExecutableSha256Before);
  receipt.status = 'PASS_BOUNDED_REACT_INTERVAL_AUDIT';
} catch (error) {
  receipt.errors = [...(receipt.errors ?? []), error instanceof Error ? error.stack : String(error)];
  receipt.status = 'INCOMPLETE';
} finally {
  clearTimeout(timerHandle); process.off('SIGINT', stop); process.off('SIGTERM', stop);
  if (browser) try { await browser.close(); receipt.setup.browserClosed = true; }
  catch (error) { receipt.setup.cleanupErrors.push(String(error)); receipt.status = 'INCOMPLETE'; }
  if (receipt.setup.cleanupErrors.length || receipt.contexts.some(context => !context.contextClosed)) receipt.status = 'INCOMPLETE';
  receipt.completedAt = new Date().toISOString();
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2));
}
if (receipt.status === 'INCOMPLETE') process.exitCode = 1;
else console.log(JSON.stringify({ status: receipt.status, receiptPath }));
