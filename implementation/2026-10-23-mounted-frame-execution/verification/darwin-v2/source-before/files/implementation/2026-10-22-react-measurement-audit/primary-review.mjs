import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, '../..');
const receiptPath = path.join(unit, 'evidence/run-v2/receipt.json');
const eventsPath = path.join(unit, 'evidence/run-v2/ordering-events.json');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receiptBytes = await readFile(receiptPath), eventBytes = await readFile(eventsPath);
const receipt = JSON.parse(receiptBytes), events = JSON.parse(eventBytes);
assert.equal(receipt.status, 'PASS_BOUNDED_REACT_INTERVAL_AUDIT');
assert.equal(receipt.setup.browserClosed, true);
for (const key of ['errors', 'pageErrors', 'consoleErrors', 'blockedRequests', 'requestFailures', 'cleanupErrors'])
  assert.equal(receipt.setup[key].length, 0, key);
assert.equal(receipt.sourceBefore.length, 6887);
assert.equal(receipt.sourceAfter.length, receipt.sourceBefore.length);
for (let i = 0; i < receipt.sourceBefore.length; i++) {
  const before = receipt.sourceBefore[i], after = receipt.sourceAfter[i];
  assert.equal(before.path, after.path);
  assert.equal(before.actual, before.expected);
  assert.equal(before.actual, after.actual);
  assert.equal(hash(await readFile(path.resolve(root, before.path))), before.actual, before.path);
}
for (const entry of receipt.researchHashesAfter)
  assert.ok(receipt.researchHashesBefore.some(before => before.path === entry.path && before.sha256 === entry.sha256));

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b), n = sorted.length;
  return { n, median: n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2,
    p95: sorted[Math.ceil(n * .95) - 1], min: sorted[0], max: sorted[n - 1] };
}
const controls = [];
for (const context of receipt.contexts) {
  const result = context.result;
  assert.equal(context.contextClosed, true);
  assert.equal(context.outputDigest, receipt.contexts[0].outputDigest);
  assert.equal(result.samples.length, 60);
  assert.equal(result.warmupSamples.length, 12);
  assert.deepEqual(result.samples.map(sample => sample.epoch), Array.from({ length: 60 }, (_, i) => i + 13));
  assert.equal(result.teardown.resourcesExpected, 512);
  assert.equal(result.teardown.resourcesDisposed, 512);
  assert.equal(result.teardown.duplicateDisposalEvents, 0);
  assert.equal(result.teardown.cleanup.sceneChildren, 0);
  assert.equal(result.teardown.cleanup.registeredSetters, 0);
  const samples = result.samples;
  if (context.mode === 'manual-timer') {
    assert.ok([...result.warmupSamples, ...samples].every(sample => sample.valuesChecked === 769));
    controls.push({ index: context.index, mode: context.mode, updateMs: stats(samples.map(s => s.updateMs)),
      updateAndInspectionRpcMs: stats(samples.map(s => s.updateInspectRpcMs)), drawMs: stats(samples.map(s => s.drawMs)),
      interpretation: 'Different manual workload. Node outer interval includes IPC and 769-value validation; no phase subtraction.' });
  } else if (!context.instrumented) controls.push({ index: context.index, mode: context.mode,
    updateMs: stats(samples.map(s => s.publishMs)), throughDrawMs: stats(samples.map(s => s.updateThroughDrawMs)),
    drawMs: stats(samples.map(s => s.drawMs)), timerQuantumMs: result.timerQuantumMs });
}

const ordering = receipt.contexts.find(context => context.instrumented);
assert.equal(ordering.ordering.status, 'PASS');
assert.equal(ordering.ordering.violations.length, 0);
const frameRows = [];
const workKinds = ['input', 'snapshot', 'listener-begin', 'listener-end', 'render', 'commit', 'write', 'root-render', 'root-commit', 'get-snapshot'];
for (let epoch = 1; epoch <= 72; epoch++) {
  const window = ordering.ordering.frames[epoch - 1];
  const raw = events.filter(e => e.epoch === epoch && e.phase !== 'teardown');
  const byKind = kind => raw.filter(e => e.kind === kind);
  const actualCounts = Object.fromEntries(workKinds.map(kind => [kind, byKind(kind).length]));
  assert.deepEqual(actualCounts, { input: 1, snapshot: 1, 'listener-begin': 257, 'listener-end': 257,
    render: 257, commit: 257, write: 769, 'root-render': 1, 'root-commit': 1, 'get-snapshot': 771 });
  assert.equal(byKind('app-render').length, 0);
  for (const event of raw.filter(e => workKinds.includes(e.kind))) {
    assert.equal(event.phase, 'update');
    assert.ok(event.atMs >= window.updateStart && event.atMs <= window.publishEnd);
    assert.ok(event.sourceAnchor);
  }
  const firstInput = raw.indexOf(byKind('input')[0]);
  const snapshot = raw.indexOf(byKind('snapshot')[0]);
  const lastListener = raw.indexOf(byKind('listener-end').at(-1));
  const rootRender = raw.indexOf(byKind('root-render')[0]);
  const rootCommit = raw.indexOf(byKind('root-commit')[0]);
  assert.ok(firstInput < snapshot && snapshot < lastListener && lastListener < rootRender && rootRender < rootCommit);
  const writes = byKind('write'), keys = new Set();
  for (const write of writes) {
    assert.ok(raw.indexOf(write) > rootCommit);
    const key = `${write.id}/${write.field}`;
    assert.ok(!keys.has(key)); keys.add(key);
    const coefficient = write.id === 'marker' ? 1 : write.field === 'position-x' ? (write.id % 2 ? .0025 : .01)
      : write.field === 'position-y' ? (write.id % 2 ? .0075 : .005) : (write.id % 2 ? .0002 : .0001);
    assert.ok(Math.abs(write.previous - (epoch - 1) * coefficient) < 1e-9);
    assert.ok(Math.abs(write.value - epoch * coefficient) < 1e-9);
  }
  assert.equal(keys.size, 769);
  const hostKeys = new Set(byKind('commit').map(event => event.id));
  assert.equal(hostKeys.size, 257);
  for (const kind of ['renderer-enter', 'renderer-exit']) {
    assert.equal(byKind(kind).length, 1);
    assert.equal(byKind(kind)[0].phase, 'after-update');
    assert.ok(byKind(kind)[0].atMs >= window.publishEnd);
  }
  const outsideKinds = [...new Set(raw.filter(e => e.phase === 'after-update').map(e => e.kind))].sort();
  assert.ok(outsideKinds.every(kind => ['checkpoint', 'renderer-enter', 'renderer-exit'].includes(kind)));
  frameRows.push({ epoch, counts: actualCounts, uniqueWrites: keys.size, appRenders: 0, outsideKinds });
}
const review = { status: 'PRIMARY_RAW_RECOMPUTATION_PASS', receiptSha256: hash(receiptBytes),
  rawEventsSha256: hash(eventBytes), rawEventCount: events.length, currentSourceHashesVerified: 6887,
  contexts: controls, outputDigest: receipt.contexts[0].outputDigest, orderingFrames: frameRows,
  claims: { updateInputAndRequiredWritesInsideOriginalWindow: true, noObservedReactUpdateTail: true,
    rendererAfterUpdate: true, compilerNotNecessaryForSubmillisecondUpdatesInTheseControls: true,
    stableCompilerCausalEffectEstablished: false, instrumentedTimingComparable: false,
    presentationOrWholeFrameMeasuredByUpdateTimer: false, nativeImplementationChanged: false } };
await writeFile(path.join(unit, 'primary-review.json'), JSON.stringify(review, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: review.status, sourceHashes: 6887, events: events.length, contexts: controls }));
