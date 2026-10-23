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
assert.equal(proof.status, 'PASS_R3F_FRAME_BASELINES_CANVAS_BUILD');
assert.equal(lock.status, 'PASS_R3F_FRAME_BASELINES_CANVAS_PREPARATION');
assert.equal(proof.inputLockSha256, sha(lockBytes));
const modes = ['native', 'react', 'react-frame', 'imperative'];
const deliveryModes = ['native-minified', 'native-rebundled'];
assert.deepEqual(Object.keys(proof.delivery), ['minified', 'rebundled']);
const frameCaptureBytes = await readFile(proof.captures['react-frame'].path);
assert.equal(sha(frameCaptureBytes), proof.captures['react-frame'].sha256);
const frameCapture = JSON.parse(frameCaptureBytes);
assert.ok(['PASS', 'FRAME_COMPILER_DECLINE_PENDING_PRIMARY_REVIEW'].includes(frameCapture.status));
if (frameCapture.status === 'PASS') assert.deepEqual(frameCapture.motionCompiled, { Position: true, Rotation: true });
else assert.ok(Object.values(frameCapture.motionCompiled).includes(false));
let frameReviewBytes = null;
if (frameCapture.status === 'FRAME_COMPILER_DECLINE_PENDING_PRIMARY_REVIEW') {
  frameReviewBytes = await readFile(path.join(proofDir, 'frame-compiler-review.json'));
  const review = JSON.parse(frameReviewBytes);
  assert.equal(review.status, 'APPROVED_FRAME_COMPILER_FALLBACK_FOR_PROOF');
  assert.equal(review.captureSha256, sha(frameCaptureBytes));
  assert.equal(review.buildProofSha256, sha(proofBytes));
  assert.equal(review.inputLockSha256, sha(lockBytes));
}
const origin = 'https://realtime-canvas.invalid';
const assets = new Map();
for (const mode of modes) for (const item of proof.assets[mode]) {
  assert.ok(item.urlPath.startsWith(`/${mode}/`));
  assert.ok(!assets.has(item.urlPath)); assets.set(item.urlPath, { ...item, mode });
}
for (const variant of ['minified', 'rebundled']) for (const item of proof.delivery[variant].assets) {
  assert.ok(item.urlPath.startsWith(`/native-${variant}/`));
  assert.ok(!assets.has(item.urlPath)); assets.set(item.urlPath, { ...item, mode: `native-${variant}` });
}
let priorBytes = null, authorizationBytes = null;
if (phase === 'timing') {
  priorBytes = await readFile(path.join(proofDir, 'canvas-proof-one-shot.json'));
  const prior = JSON.parse(priorBytes);
  assert.equal(prior.status, 'PASS_R3F_FRAME_BASELINES_CANVAS_UNTIMED_PROOF');
  assert.equal(prior.buildProofSha256, sha(proofBytes));
  assert.equal(prior.inputLockSha256, sha(lockBytes));
  authorizationBytes = await readFile(path.join(proofDir, 'canvas-timing-authorization.json'));
  const auth = JSON.parse(authorizationBytes);
  assert.equal(auth.status, 'APPROVED_FOR_ONE_R3F_FRAME_BASELINES_CANVAS_TIMING_COMPARISON');
  assert.equal(auth.buildProofSha256, sha(proofBytes));
  assert.equal(auth.inputLockSha256, sha(lockBytes));
  assert.equal(auth.proofSha256, sha(priorBytes));
}
const outputPath = path.join(proofDir, phase === 'proof' ? 'canvas-proof-one-shot.json' : 'canvas-timing-one-shot.json');
const record = { schemaVersion: 'r3f-frame-baselines-canvas-browser-v1', status: 'STARTED', phase, origin,
  transport: 'Offline intercepted synthetic HTTPS; no server', order: modes,
  workload: '256 retained Three meshes and alternating motion programs; Native and declarative React use a shared Store clock, frame hooks read passive phase input, and authored local controls reset before timing',
  comparator: 'Native Three host versus React Compiler declarative R3F 10.0.0-alpha.6 primary baseline, separate R3F useFrame arm with reported compiler outcome, and imperative manual floor',
  updateIntervalSemantics: { native: 'Store dispatch through accepted host publication',
    react: 'external Store dispatch through declarative React commit',
    'react-frame': 'passive phase assignment and explicit R3F scheduler advance through hook writes; no per-frame React state publication',
    imperative: 'manual Three host update' },
  setupComparison: 'Native excludes createThreeNativeRoot while R3F includes root.configure; setup intervals are incomparable and no cold claim follows',
  buildProofSha256: sha(proofBytes), inputLockSha256: sha(lockBytes),
  priorProofSha256: priorBytes ? sha(priorBytes) : null,
  authorizationSha256: authorizationBytes ? sha(authorizationBytes) : null,
  frameCompilerOutcome: { status: frameCapture.status, motionCompiled: frameCapture.motionCompiled,
    compilerEvents: frameCapture.compilerEvents },
  frameCompilerReviewSha256: frameReviewBytes ? sha(frameReviewBytes) : null,
  sourceBefore: [], sourceAfter: [], arms: [], deliveryArms: [], compiledDelivery: null,
  expectedPolicyErrors: [],
  blockedRequests: [], requestFailures: [],
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
  const groups = [lock.inputs, lock.staged, lock.packageSources, lock.rendererSourceBasis, lock.tarballs, lock.installed, [lock.report, lock.compiler],
    ...modes.map(mode => [...proof.transforms[mode], ...proof.assets[mode], proof.captures[mode]]),
    ...Object.values(proof.delivery).map(item => [item.capture, ...item.assets])];
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
  if (frameReviewBytes) assert.equal(await hash(path.join(proofDir, 'frame-compiler-review.json')), sha(frameReviewBytes));
}
async function runArm(mode) {
  const delivery = deliveryModes.includes(mode);
  const native = mode === 'native' || delivery;
  const entry = { mode, contextClosed: false };
  (delivery ? record.deliveryArms : record.arms).push(entry);
  const context = await browser.newContext({ viewport: { width: 700, height: 540 }, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    await page.addInitScript(value => { window.__realtimeProof = value; }, phase === 'proof');
    page.on('pageerror', error => record.pageErrors.push({ mode, error: String(error) }));
    page.on('console', message => {
      if (message.type() !== 'error') return;
      const item = { mode, text: message.text() };
      if (delivery && /(?:unsafe-eval|Evaluating a string as JavaScript|Refused to evaluate a string)/i.test(item.text)) {
        record.expectedPolicyErrors.push(item);
      } else record.consoleErrors.push(item);
    });
    page.on('requestfailed', request => record.requestFailures.push({ mode, url: request.url(), reason: request.failure()?.errorText }));
    await context.route('**/*', async route => {
      const url = new URL(route.request().url()), item = assets.get(url.pathname);
      if (url.origin !== origin || url.search || url.hash || item?.mode !== mode) {
        record.blockedRequests.push({ mode, url: url.href }); await route.abort(); return;
      }
      try {
        const body = await readFile(item.path);
        assert.equal(sha(body), item.sha256);
        await route.fulfill({ status: 200, headers: {
          'content-type': item.path.endsWith('.html') ? 'text/html' : 'text/javascript',
          'cache-control': 'no-store',
          ...(delivery ? { 'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'none'; img-src data:; worker-src 'none'" } : {}),
        }, body });
      } catch (error) { record.errors.push(String(error)); await route.abort(); }
    });
    const response = await page.goto(`${origin}/${mode}/${delivery ? 'native' : mode}.html`, { waitUntil: 'load', timeout: remain() });
    assert.equal(response.status(), 200);
    if (delivery) assert.equal(response.headers()['content-security-policy'].includes("'unsafe-eval'"), false);
    let armTimer;
    const result = await Promise.race([
      page.evaluate(() => (window).realtimeHarness.done),
      new Promise((_, reject) => { armTimer = setTimeout(() => reject(new Error(`${mode} browser deadline`)), Math.min(remain(), 30_000)); })
    ]).finally(() => clearTimeout(armTimer));
    entry.result = result;
    if (delivery) {
      entry.csp = await page.evaluate(() => globalThis.__r3actScalarCsp);
      assert.equal(entry.csp.blocked, true, 'actual external module must observe blocked string compilation');
      assert.deepEqual(entry.csp.violations, ['eval'], 'only the explicit negative probe may violate CSP');
      assert.ok(record.expectedPolicyErrors.filter(item => item.mode === mode).length <= 1);
    }
    assert.equal(result.warmupSamples.length, 12);
    assert.equal(result.firstUpdate.epoch, 1);
    assert.equal(result.samples.length, 60);
    assert.equal(result.warmup, 12);
    const allSamples = [...result.warmupSamples, ...result.samples];
    assert.deepEqual(result.samples.map(sample => sample.epoch), Array.from({ length: 60 }, (_, id) => id + 13));
    if (phase === 'timing') for (const sample of allSamples) assert.equal(sample.counters, null,
      `${mode} timing must omit proof instrumentation on every frame`);
    assert.equal(result.teardown.cleanup.sceneChildren, 0);
    assert.equal(result.teardown.resourcesExpected, 512);
    assert.equal(result.teardown.resourcesDisposed, 512);
    assert.equal(result.teardown.duplicateDisposalEvents, 0);
    if (mode !== 'imperative') assert.equal(result.teardown.cleanup.registeredSetters, 0);
    assert.match(result.rendererInfo.version, /^WebGL/);
    assert.ok(result.rendererInfo.renderer.length > 0);
    assert.equal(result.rendererInfo.pixelRatio, 1);
    assert.equal(result.rendererInfo.antialias, false);
    assert.equal(result.rendererInfo.preserveDrawingBuffer, true);
    assert.deepEqual(result.rendererInfo.drawingBuffer, [640, 480]);
    assert.equal(result.rendererInfo.camera.manual, true);
    assert.deepEqual([result.rendererInfo.camera.left, result.rendererInfo.camera.right,
      result.rendererInfo.camera.top, result.rendererInfo.camera.bottom], [-4, 4, 4, -4]);
    if (native) {
      assert.equal(result.teardown.cleanup.ownerCount, 0);
      assert.equal(result.teardown.cleanup.pending, 0);
      if (phase === 'proof') {
        const observation = result.teardown.cleanup.counters;
        assert.ok(observation['proof.compact.root-observation-delta'] > 0,
          `${mode} explicit generic observation must exercise Root materialization`);
        assert.ok(observation['proof.compact.prop-observation-delta'] > 0,
          `${mode} explicit ordinary observations must exercise prop materialization`);
        assert.equal(observation['proof.compact.saved-snapshot-immutable'], 1);
        assert.equal(observation['proof.compact.observed-epoch'], 72);
        assert.equal(observation['proof.compact.later-epoch'], 73);
        let previousVersion = 0;
        for (const sample of allSamples) {
          assert.equal(sample.counters['frame.group.committed'], sample.epoch);
          assert.equal(sample.counters['frame.draws'], sample.epoch);
          assert.ok(sample.counters['frame.accepted-root-version'] > previousVersion,
            `${mode} draw must follow a new accepted group publication`);
          previousVersion = sample.counters['frame.accepted-root-version'];
        }
      }
    }
    if (mode === 'react') {
      const capture = JSON.parse(await readFile(proof.captures.react.path, 'utf8'));
      assert.equal(capture.primaryComparator, 'declarative-r3f-10.0.0-alpha.6-react-compiler');
      assert.equal(capture.reactMemoized, true);
    }
    if (mode === 'react-frame') {
      const capture = JSON.parse(await readFile(proof.captures['react-frame'].path, 'utf8'));
      assert.equal(capture.frameComparator, 'useFrame-r3f-10.0.0-alpha.6-compiler-pipeline');
      assert.equal(capture.frameScheduler, 'rootStore.getState().advance with frameloop never');
      assert.equal(result.teardown.cleanup.registeredFrameCallbacks, 0);
      assert.equal(result.teardown.cleanup.rootStopped, true);
      if (phase === 'proof') {
        assert.equal(result.teardown.cleanup.renderCalls, 72);
        for (const sample of allSamples) {
          assert.equal(sample.counters.frameCallbacks, 257);
          assert.equal(sample.counters.motionCallbacks, 256);
          assert.equal(sample.counters.markerCallbacks, 1);
          assert.equal(sample.counters.renderTakeovers, 1);
          assert.equal(sample.counters.controlCommitsDuringUpdate, 0);
          assert.equal(sample.counters.drawsDuringAdvance, 0);
        }
      }
    }
    for (const sample of result.samples) {
      assert.equal(sample.count, 256); assert.equal(sample.retained, true);
      assert.ok(sample.litPixels > 0, 'real WebGL scene must contain visible meshes');
      assert.ok(sample.publishMs >= 0 && sample.drawMs >= 0 && sample.callbackMs >= 0 && sample.stateAgeMs >= 0 && sample.validationMs >= 0);
    }
  } finally { await context.close(); entry.contextClosed = true; }
}
try {
  await verify('sourceBefore');
  opening = openBrowser({ headless: true, gpu: true, handleSignals: false }).then(async instance => {
    if (stopped) { await instance.close(); throw new Error('Stopped during browser launch'); }
    return instance;
  });
  browser = await Promise.race([opening, stoppedPromise]);
  record.browser = { version: browser.version(), headless: true, gpu: true };
  for (const mode of modes) await runArm(mode);
  record.renderers = record.arms.map(arm => ({ mode: arm.mode, ...arm.result.rendererInfo }));
  const commonSettings = record.renderers.map(({ outputColorSpace, toneMapping, pixelRatio, antialias, preserveDrawingBuffer }) =>
    ({ outputColorSpace, toneMapping, pixelRatio, antialias, preserveDrawingBuffer }));
  assert.deepEqual(commonSettings[0], commonSettings[1]);
  for (let index = 1; index < modes.length; index++) {
    assert.deepEqual(commonSettings[0], commonSettings[index]);
    assert.equal(record.renderers[0].renderer, record.renderers[index].renderer);
    assert.equal(record.renderers[0].unmaskedRenderer, record.renderers[index].unmaskedRenderer);
    assert.deepEqual(record.renderers[0].camera, record.renderers[index].camera);
    assert.deepEqual(record.renderers[0].drawingBuffer, record.renderers[index].drawingBuffer);
  }
  const outputs = record.arms.map(arm => arm.result.samples.map(({ epoch, checksum, pixelChecksum, litPixels }) =>
    ({ epoch, checksum, pixelChecksum, litPixels })));
  for (let index = 1; index < modes.length; index++) assert.deepEqual(outputs[0], outputs[index]);
  if (phase === 'proof') {
    for (const mode of deliveryModes) await runArm(mode);
    for (const arm of record.deliveryArms) {
      const output = arm.result.samples.map(({ epoch, checksum, pixelChecksum, litPixels }) =>
        ({ epoch, checksum, pixelChecksum, litPixels }));
      assert.deepEqual(output, outputs[0], `${arm.mode} must preserve the installed native scene`);
    }
  }
  await verify('sourceAfter');
  assert.equal(record.blockedRequests.length, 0); assert.equal(record.requestFailures.length, 0);
  assert.equal(record.pageErrors.length, 0); assert.equal(record.consoleErrors.length, 0);
  record.compiledDelivery = phase === 'proof'
    ? { status: 'PASS_VERIFIED_SCALAR_DELIVERY', variants: ['baseline', 'minified', 'rebundled'],
      csp: 'unsafe-eval blocked; only the explicit negative probe violates policy' }
    : { status: 'BOUND_UNTIMED_DELIVERY_PROOF', proofSha256: sha(priorBytes) };
  record.status = phase === 'proof' ? 'PASS_R3F_FRAME_BASELINES_CANVAS_UNTIMED_PROOF' : 'PASS_R3F_FRAME_BASELINES_CANVAS_DESCRIPTIVE_TIMING';
} catch (error) { record.errors.push(error instanceof Error ? error.stack : String(error)); record.status = 'INCOMPLETE'; }
finally {
  clearTimeout(timer); process.off('SIGINT', stop); process.off('SIGTERM', stop);
  if (!browser && opening && stopped) try { await Promise.race([opening.catch(() => {}), new Promise(resolve => setTimeout(resolve, 5000))]); }
  catch (error) { record.cleanupErrors.push(String(error)); }
  if (browser) try { await browser.close(); record.browserClosed = true; }
  catch (error) { record.cleanupErrors.push(String(error)); record.status = 'INCOMPLETE'; }
  if (stopped || record.cleanupErrors.length || [...record.arms, ...record.deliveryArms].some(arm => !arm.contextClosed)) record.status = 'INCOMPLETE';
  await writeFile(outputPath, JSON.stringify(record, null, 2) + '\n');
}
if (record.status === 'INCOMPLETE') process.exitCode = 1;
else console.log(JSON.stringify({ status: record.status, outputPath }));
