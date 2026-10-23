import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const [input, output] = process.argv.slice(2);
assert.ok(input && output && path.resolve(input) !== path.resolve(output));
const bytes = await readFile(input), receipt = JSON.parse(bytes);
assert.equal(receipt.status, 'PASS_R3F_FRAME_BASELINES_CANVAS_DESCRIPTIVE_TIMING');
assert.equal(receipt.phase, 'timing'); assert.equal(receipt.minify, true);
assert.equal(receipt.buildMode, 'production'); assert.equal(receipt.browserClosed, true);
const order = ['native', 'react', 'react', 'native', 'react', 'native', 'native', 'react'];
assert.deepEqual(receipt.order, order);
assert.deepEqual(receipt.arms.map(arm => arm.mode), order);
for (const field of ['errors', 'cleanupErrors', 'pageErrors', 'consoleErrors', 'blockedRequests', 'requestFailures'])
  assert.deepEqual(receipt[field], []);
const sorted = values => [...values].sort((a, b) => a - b);
const median = values => { const v = sorted(values), n = v.length;
  return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2; };
const summarize = values => { assert.ok(values.every(value => Number.isFinite(value) && value >= 0));
  const v = sorted(values); return { n: v.length, median: median(v),
    p90: v[Math.ceil(v.length * .90) - 1], p95: v[Math.ceil(v.length * .95) - 1], max: v.at(-1) }; };
const contexts = receipt.arms.map((arm, index) => {
  assert.equal(arm.contextClosed, true); assert.equal(arm.result.samples.length, 60);
  assert.equal(arm.result.warmupSamples.length, 12);
  assert.ok([...arm.result.warmupSamples, ...arm.result.samples].every(row => row.counters === null));
  return { runIndex: index + 1, mode: arm.mode,
    update: summarize(arm.result.samples.map(row => row.publishMs)),
    throughDraw: summarize(arm.result.samples.map(row => row.updateThroughDrawMs)),
    thermalBefore: arm.thermalBefore, thermalAfter: arm.thermalAfter };
});
const pairs = [];
for (let index = 0; index < contexts.length; index += 2) {
  const pair = contexts.slice(index, index + 2), native = pair.find(item => item.mode === 'native'),
    react = pair.find(item => item.mode === 'react');
  assert.ok(native && react);
  const ratios = {};
  for (const interval of ['update', 'throughDraw']) for (const statistic of ['median', 'p90']) {
    assert.ok(react[interval][statistic] > 0);
    ratios[`${interval}.${statistic}`] = native[interval][statistic] / react[interval][statistic];
  }
  pairs.push({ pair: index / 2 + 1, order: pair.map(item => item.mode),
    nativeRunIndex: native.runIndex, reactRunIndex: react.runIndex, nativeOverReact: ratios });
}
const medianPairRatios = Object.fromEntries(Object.keys(pairs[0].nativeOverReact)
  .map(key => [key, median(pairs.map(pair => pair.nativeOverReact[key]))]));
const result = { status: 'PASS_BOUNDED_MATCHED_COMPARISON_ANALYSIS',
  receiptSha256: createHash('sha256').update(bytes).digest('hex'),
  primary: ['median', 'p90'], secondary: ['p95', 'max'], quantile: 'nearest-rank',
  aggregation: 'Each context summarized separately; summary is median of four adjacent pair ratios. Frames are not pooled across contexts.',
  order: 'ABBA/BAAB; Native=A, React=B', contexts, pairs, medianPairRatios,
  parity: Object.values(medianPairRatios).every(ratio => ratio <= 1) ? 'PASS_DESCRIPTIVE_PARITY' : 'FAIL_DESCRIPTIVE_PARITY',
  limits: ['One machine, one fixed balanced episode; no causal old/new estimate.',
    'Thermal telemetry cannot rule out nonlinear thermal, JIT, GPU or OS drift.',
    'p95 retained as diagnostic; no timer-bug cause established.',
    'No independent-device, cold/memory or presentation qualification.'] };
await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: result.status, parity: result.parity, medianPairRatios }));
