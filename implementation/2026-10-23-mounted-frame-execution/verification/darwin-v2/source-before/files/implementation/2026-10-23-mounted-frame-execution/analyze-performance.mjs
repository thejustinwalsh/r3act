import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const [input, output] = process.argv.slice(2);
assert.ok(input && output && process.argv.length === 4);
const bytes = await readFile(input), record = JSON.parse(bytes);
assert.equal(record.status, 'PASS_R3F_FRAME_BASELINES_CANVAS_DESCRIPTIVE_TIMING');
assert.equal(record.arms.length, 20);
assert.equal(record.browserClosed, true);
const median = values => {
  const sorted = [...values].sort((a, b) => a - b), middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const quantile = (values, q) => [...values].sort((a, b) => a - b)[Math.ceil(q * values.length) - 1];
const native = record.arms.filter(arm => arm.mode !== 'react');
assert.equal(native.length, 16);
const pairs = Array.from({ length: 8 }, (_, index) => {
  const pair = native.slice(index * 2, index * 2 + 2);
  assert.deepEqual(pair.map(arm => arm.mode).sort(), ['native', 'prechange']);
  return { prechange: pair.find(arm => arm.mode === 'prechange'),
    candidate: pair.find(arm => arm.mode === 'native') };
});
let timerQuantum = Infinity;
for (const arm of record.arms) {
  assert.equal(arm.contextClosed, true);
  assert.equal(arm.result.samples.length, 60);
  const times = [...new Set([...arm.result.warmupSamples, ...arm.result.samples]
    .flatMap(sample => ['updateStart', 'publishEnd', 'drawStart', 'drawEnd']
      .map(name => Math.round(sample[name] * 1000))))].sort((a, b) => a - b);
  for (let index = 1; index < times.length; index++) {
    const delta = (times[index] - times[index - 1]) / 1000;
    if (delta > 0) timerQuantum = Math.min(timerQuantum, delta);
  }
}
assert.ok(Number.isFinite(timerQuantum) && timerQuantum > 0);
let seed = 0x52334143;
const random = () => {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
};
const metrics = [];
for (const field of ['publishMs', 'updateThroughDrawMs']) {
  for (const statistic of ['median', 'p90']) {
    const value = arm => statistic === 'median'
      ? median(arm.result.samples.map(sample => sample[field]))
      : quantile(arm.result.samples.map(sample => sample[field]), 0.9);
    const blocks = pairs.map(pair => ({ prechange: value(pair.prechange),
      candidate: value(pair.candidate) }));
    const differences = blocks.map(block => block.candidate - block.prechange);
    const tolerance = Math.max(median(blocks.map(block => block.prechange)) * 0.05, timerQuantum);
    const resampled = Array.from({ length: 100_000 }, () =>
      median(Array.from({ length: pairs.length }, () => differences[Math.floor(random() * pairs.length)])));
    const upper95 = quantile(resampled, 0.95), lower95 = quantile(resampled, 0.05);
    metrics.push({ field, statistic, blocks, pairedMedianChangeMs: median(differences),
      toleranceMs: tolerance, lowerOneSided95Ms: lower95, upperOneSided95Ms: upper95,
      status: upper95 <= tolerance ? 'WITHIN_DECLARED_MARGIN'
        : lower95 > tolerance ? 'REGRESSION_EXCEEDS_MARGIN' : 'INCONCLUSIVE',
      candidateMedianAcrossContexts: median(blocks.map(block => block.candidate)),
      prechangeMedianAcrossContexts: median(blocks.map(block => block.prechange)),
      reactMedianAcrossContexts: median(record.arms.filter(arm => arm.mode === 'react').map(value)) });
  }
}
const result = { status: metrics.every(metric => metric.status === 'WITHIN_DECLARED_MARGIN')
  ? 'WITHIN_DECLARED_MARGIN' : metrics.some(metric => metric.status === 'REGRESSION_EXCEEDS_MARGIN')
    ? 'REGRESSION_EXCEEDS_MARGIN' : 'INCONCLUSIVE',
  sourceSha256: createHash('sha256').update(bytes).digest('hex'),
  method: 'Median paired-context differences; percentile block bootstrap,100000 draws, xorshift32 initial seed0x52334143; one-sided95% bounds per metric',
  tolerance: 'Larger of5% prechange context-median statistic and one observed timer quantum',
  timerQuantumMs: timerQuantum, metrics,
  limits: 'Eight pairs on one device; within-metric bounds, no simultaneous-family coverage or universal no-regression guarantee; dependent frames are not bootstrap units' };
await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: result.status, output }));
