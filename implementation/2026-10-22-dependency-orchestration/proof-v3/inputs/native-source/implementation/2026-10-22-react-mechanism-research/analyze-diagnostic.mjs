import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const researchDir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = name => { const i = args.indexOf(name); assert.ok(i >= 0 && args[i + 1], `missing ${name}`); return args[i + 1]; };
assert.equal(args.length, 4, 'usage: analyze-diagnostic.mjs --receipt ABS --output ABS');
const receiptPath = path.resolve(arg('--receipt'));
const outputPath = path.resolve(arg('--output'));
assert.equal(path.dirname(receiptPath), path.join(researchDir, 'runs-diagnostic-v1'));
assert.equal(path.dirname(outputPath), path.dirname(receiptPath));
assert.equal(path.basename(outputPath), 'analysis.json');
const receiptBytes = await readFile(receiptPath);
const receipt = JSON.parse(receiptBytes);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = sha(receiptBytes);
const modeOrder = receipt.setup.order;
const modeAnchors = receipt.setup.anchors;
const profileRows = [];
const keyOf = node => {
  const frame = node.callFrame ?? {};
  return `${frame.url ?? ''}:${frame.lineNumber ?? -1}:${frame.columnNumber ?? -1}:${frame.functionName ?? ''}`;
};
const insideAnchor = (frame, anchor) => {
  if (frame.url !== `${receipt.setup.origin}${anchor.urlPath}`) return false;
  const before = frame.lineNumber < anchor.startLine0 ||
    (frame.lineNumber === anchor.startLine0 && frame.columnNumber < anchor.startColumn0);
  const after = frame.lineNumber > anchor.endLine0 ||
    (frame.lineNumber === anchor.endLine0 && frame.columnNumber >= anchor.endColumn0);
  return !before && !after;
};
for (const context of receipt.contextResults) {
  if (!context.profiling || !context.profilePath) continue;
  const profileBytes = await readFile(context.profilePath);
  const profile = JSON.parse(profileBytes);
  const nodes = new Map(profile.nodes.map(node => [node.id, node]));
  assert.equal(nodes.size, profile.nodes.length, `context ${context.index}: duplicate profile node ids`);
  const parent = new Map();
  for (const node of profile.nodes) for (const child of node.children ?? []) {
    assert.ok(nodes.has(child), `context ${context.index}: missing child node ${child}`);
    assert.ok(!parent.has(child), `context ${context.index}: multiple parents for ${child}`);
    parent.set(child, node.id);
  }
  const counts = { totalSamples: profile.samples?.length ?? 0, updateAncestrySamples: 0, idleSamples: 0,
    garbageCollectorSamples: 0, outsideUpdateJavaScriptSamples: 0, otherRuntimeSamples: 0,
    missingLeafNodeSamples: 0, updateLeafSamples: 0 };
  const inclusive = new Map(), exclusive = new Map();
  for (const id of profile.samples ?? []) {
    const leaf = nodes.get(id);
    if (!leaf) { counts.missingLeafNodeSamples++; continue; }
    const leafFrame = leaf.callFrame ?? {};
    const leafName = leafFrame.functionName ?? '';
    const chain = [];
    let cursor = id;
    const seenNodes = new Set();
    while (cursor !== undefined) {
      assert.ok(!seenNodes.has(cursor), `context ${context.index}: cycle in profile node tree`);
      seenNodes.add(cursor);
      const node = nodes.get(cursor); assert.ok(node, `context ${context.index}: missing parent node ${cursor}`);
      chain.push(node); cursor = parent.get(cursor);
    }
    const anchor = modeAnchors[context.mode];
    const isUpdate = chain.some(node => insideAnchor(node.callFrame ?? {}, anchor));
    if (isUpdate) {
      counts.updateAncestrySamples++;
      if (insideAnchor(leafFrame, anchor)) counts.updateLeafSamples++;
      const seenFrames = new Set();
      for (const node of chain) {
        const key = keyOf(node); if (seenFrames.has(key)) continue; seenFrames.add(key);
        inclusive.set(key, (inclusive.get(key) ?? 0) + 1);
      }
      exclusive.set(keyOf(leaf), (exclusive.get(keyOf(leaf)) ?? 0) + 1);
    } else if (leafName === '(idle)') counts.idleSamples++;
    else if (leafName === '(garbage collector)') counts.garbageCollectorSamples++;
    else if (leafFrame.url && leafName !== '(program)') counts.outsideUpdateJavaScriptSamples++;
    else counts.otherRuntimeSamples++;
  }
  const table = map => [...map.entries()].map(([frame, samples]) => ({ frame, samples }))
    .sort((a, b) => b.samples - a.samples || a.frame.localeCompare(b.frame));
  assert.equal(counts.totalSamples, counts.updateAncestrySamples + counts.idleSamples + counts.garbageCollectorSamples +
    counts.outsideUpdateJavaScriptSamples + counts.otherRuntimeSamples + counts.missingLeafNodeSamples,
    `context ${context.index}: disjoint sample categories do not sum to total`);
  const deltas = profile.timeDeltas ?? [];
  profileRows.push({ context: context.index, block: context.block, mode: context.mode,
    profileSha256: sha(profileBytes), anchor: { urlPath: modeAnchors[context.mode].urlPath,
      spanSha256: modeAnchors[context.mode].sourceSpanSha256,
      generatedRange: [modeAnchors[context.mode].startLine0, modeAnchors[context.mode].startColumn0,
        modeAnchors[context.mode].endLine0, modeAnchors[context.mode].endColumn0] },
    counts, updateSamplesAsFractionOfAllProfileSamples: counts.totalSamples ? counts.updateAncestrySamples / counts.totalSamples : null,
    timeDeltasDiagnosticOnly: { count: deltas.length, min: deltas.length ? deltas.reduce((a, b) => Math.min(a, b), Infinity) : null,
      median: deltas.length ? [...deltas].sort((a, b) => a - b)[Math.floor(deltas.length / 2)] : null,
      max: deltas.length ? deltas.reduce((a, b) => Math.max(a, b), -Infinity) : null },
    exclusiveLeafSamplesInsideUpdate: table(exclusive),
    inclusiveAncestorSamplesInsideUpdateNonAdditive: table(inclusive) });
  assert.equal(counts.totalSamples, context.profile.sampleCount, `context ${context.index}: raw profile count differs from receipt`);
  assert.equal(counts.updateAncestrySamples, context.profile.counts.updateAncestrySamples,
    `context ${context.index}: independent update ancestry count differs`);
}
const nearestP95 = values => [...values].sort((a, b) => a - b)[Math.ceil(.95 * values.length) - 1];
const med = values => { const xs = [...values].sort((a, b) => a - b); return xs.length % 2 ? xs[(xs.length - 1) / 2] : (xs[xs.length / 2 - 1] + xs[xs.length / 2]) / 2; };
const deltas = [];
for (const block of [1, 2]) for (const mode of ['native', 'react']) {
  const off = receipt.contextResults.find(x => x.block === block && x.mode === mode && !x.profiling);
  const on = receipt.contextResults.find(x => x.block === block && x.mode === mode && x.profiling);
  if (off?.wallStats && on?.wallStats) deltas.push({ block, mode,
    profilerOnMinusOffPublishMedianMs: on.wallStats.publishMs.median - off.wallStats.publishMs.median,
    profilerOnMinusOffPublishP95Ms: on.wallStats.publishMs.p95NearestRank - off.wallStats.publishMs.p95NearestRank,
    profilerOnMinusOffThroughDrawMedianMs: on.wallStats.updateThroughDrawMs.median - off.wallStats.updateThroughDrawMs.median,
    profilerOnMinusOffThroughDrawP95Ms: on.wallStats.updateThroughDrawMs.p95NearestRank - off.wallStats.updateThroughDrawMs.p95NearestRank });
}
const contextRows = receipt.contextResults.map(item => ({ index: item.index, block: item.block, mode: item.mode,
  profiling: item.profiling, contextClosed: item.contextClosed, harnessCalls: item.harnessCalls,
  outputDigest: item.outputDigest, publishMs: item.wallStats?.publishMs ?? null,
  updateThroughDrawMs: item.wallStats?.updateThroughDrawMs ?? null,
  updateCallsExpectedFromHarness: item.harnessCalls?.total ?? null,
  updateCallCoverageBySampling: 'Not measurable: sampling cannot prove each call was observed; zero matched update-ancestry samples makes that profiled context INCOMPLETE.' }));
const pathsByPhase = new Map();
for (const row of receipt.sourceRows ?? []) {
  const set = pathsByPhase.get(row.phase) ?? new Set(); set.add(row.path); pathsByPhase.set(row.phase, set);
}
const beforePaths = pathsByPhase.get('before') ?? new Set();
const afterPaths = pathsByPhase.get('after') ?? new Set();
const sourceAndRuntimeAssetsMatch = beforePaths.size > 0 && beforePaths.size === afterPaths.size &&
  [...beforePaths].every(file => afterPaths.has(file) &&
    (receipt.sourceRows ?? []).some(row => row.phase === 'before' && row.path === file && row.matches === true) &&
    (receipt.sourceRows ?? []).some(row => row.phase === 'after' && row.path === file && row.matches === true));
const sameRows = (before, after, key) => before?.length > 0 && before.length === after?.length &&
  before.every((left, i) => left[key] === after[i][key] && left.sha256 === after[i].sha256 &&
    (left.matches === undefined || left.matches === true));
const productSourceMatch = sameRows(receipt.productSourceBefore, receipt.productSourceAfter, 'path');
const ownedProtocolMatch = sameRows(receipt.ownedProtocolBefore, receipt.ownedProtocolAfter, 'path');
const browserDependencyMatch = Boolean(receipt.setup.browserExecutableSha256Before) &&
  receipt.setup.browserExecutableSha256Before === receipt.setup.browserExecutableSha256After &&
  sameRows(receipt.setup.browserDepsBefore, receipt.setup.browserDepsAfter, 'path');
const analysis = {
  schemaVersion: 'r3act-react-mechanism-diagnostic-analysis-v1', status: receipt.status,
  inputReceiptPath: receiptPath, inputReceiptSha256: digest,
  buildProofSha256: receipt.buildProofSha256, inputLockSha256: receipt.inputLockSha256,
  sourceAndRuntimeAssetsMatch, productSourceMatch, ownedProtocolMatch, browserDependencyMatch,
  browserClosed: receipt.setup.browserClosed,
  allEightContextsClosed: receipt.contextResults.length === 8 && receipt.contextResults.every(x => x.contextClosed),
  allEightContextsHave72HarnessFrames: receipt.contextResults.length === 8 && receipt.contextResults.every(x => x.harnessCalls?.total === 72),
  contexts: contextRows,
  blockwiseProfilerOverheadDiagnostics: deltas,
  profilerOnOffDeltaInterpretation: 'These are paired context-level descriptive deltas from one finite episode. They are not causal savings or qualification data.',
  cpuProfileSampleCounts: profileRows,
  profileInterpretation: {
    denominator: 'All raw CDP profile sample ids in that context.',
    updateNumerator: 'Samples whose call stack contains a frame inside the exact authored update method URL + generated line/column span from the hash-verified served asset.',
    inclusiveAncestors: 'Counts overlap and must not be summed.',
    timeDeltas: 'Kept only as profile sampling diagnostics. Never summed or converted into phase CPU milliseconds.',
    calls: 'The harness executes 72 calls (12 warmup + 60 measured), but the CPU sampler cannot establish per-call coverage. No 60-sample window claim is made.',
    unsampledAndUnmapped: 'Idle, GC, other runtime, outside-update JavaScript and missing leaf cases remain visible; profiler sampling is not a complete causal ledger.'
  },
  qualification: { parityClaim: false, performanceQualification: false, clockMappedWindowFiltering: false,
    wholePageProfileFractionAsUpdateFraction: false, favorableRepeatAuthorized: false },
  errors: receipt.errors ?? [], cleanupErrors: receipt.setup.cleanupErrors ?? []
};
try { await readFile(outputPath); throw new Error(`refusing to overwrite ${outputPath}`); }
catch (error) { if (error?.code !== 'ENOENT') throw error; }
await writeFile(outputPath, JSON.stringify(analysis, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: analysis.status, outputPath }));
