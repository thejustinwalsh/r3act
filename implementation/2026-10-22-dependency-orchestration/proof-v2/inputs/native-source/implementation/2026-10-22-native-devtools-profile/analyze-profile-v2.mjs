import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const unit = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] ?? '');
assert.equal(path.dirname(out), path.join(unit, 'evidence'));
assert.equal(path.basename(out), 'devtools-profile-v3');
const sha = value => createHash('sha256').update(value).digest('hex');
const receiptPath = path.join(out, 'receipt.json');
const receiptBytes = await readFile(receiptPath), receipt = JSON.parse(receiptBytes);
assert.equal(receipt.status, 'CAPTURE_COMPLETE_PENDING_OFFLINE_ANALYSIS');
assert.equal(receipt.controls.length, 4);
const originalAnalysisPath = path.join(out, 'analysis.json');
const originalAnalysisBytes = await readFile(originalAnalysisPath);
const mapPath = path.join(unit, 'source-map.json');
const nativeCostPath = path.join(unit, 'native-cost-map.md');
const mapBytes = await readFile(mapPath), sourceMap = JSON.parse(mapBytes);
const nativeCostBytes = await readFile(nativeCostPath);
const proofBytes = await readFile(receipt.source.proofPath);
const proof = JSON.parse(proofBytes);
assert.equal(sha(proofBytes), receipt.source.proofSha256);
assert.equal(sourceMap.kind, 'source-only-generated-bundle-map');
const expectedNativeAsset = receipt.assets.native.originalSha256;
assert.equal(sourceMap.sha256, expectedNativeAsset);
const ownedEvidenceFiles = new Map(receipt.source.ownFiles.map(item => [item.path, item.sha256]));
assert.equal(ownedEvidenceFiles.get(mapPath), sha(mapBytes));
assert.equal(ownedEvidenceFiles.get(nativeCostPath), sha(nativeCostBytes));
const originalAnalyzerPath = path.join(unit, 'analyze-profile.mjs');
assert.equal(ownedEvidenceFiles.get(originalAnalyzerPath), sha(await readFile(originalAnalyzerPath)));
const repairAnalyzerBytes = await readFile(fileURLToPath(import.meta.url));
const repairNotePath = path.join(unit, 'analysis-repair.md');
const repairNoteBytes = await readFile(repairNotePath);
const outputPath = path.join(out, 'analysis-v2.json');
const result = { schemaVersion: 'native-devtools-profile-analysis-v2', status: 'STARTED',
  receiptSha256: sha(receiptBytes), preservedOriginalAnalysisSha256: sha(originalAnalysisBytes),
  sourceMapSha256: sha(mapBytes), sourceMap: sourceMap.spans,
  repairAnalyzerSha256: sha(repairAnalyzerBytes), repairNoteSha256: sha(repairNoteBytes),
  clockModel: { traceTimestampUnit: 'microseconds', userTimingAndCpuProfileClock: 'Perfetto trace timestamp domain',
    cpuProfileStart: 'Profile event ts; args.data.startTime is intentionally ignored because it is CLOCK_MONOTONIC',
    sampleIntervalRule: 'Accumulate signed raw V8 deltas from Profile head ts, sort sample points by timestamp/sample ID/original index, then use nonnegative gaps to the previous chronological point as backward weights. The first point has no inferred interval; crossing intervals remain boundary-unattributed.',
    ancestryCrossCheck: 'Sample point timestamps and measured-script ancestry are reported per update as an independent trace-clock bridge check' },
  updateAnchors: [], controls: [], errors: [] };
let outputInitialized = false;
const save = async () => {
  await writeFile(outputPath, JSON.stringify(result, null, 2) + '\n', { flag: outputInitialized ? 'w' : 'wx' });
  outputInitialized = true;
};
await save();

const dataOf = event => event.args?.data ?? {};
const eventId = event => String(event.id ?? event.id2?.global ?? event.id2?.local ?? dataOf(event).profileId ?? dataOf(event).id ?? '');
const frameKey = frame => JSON.stringify([frame.url ?? '', frame.functionName ?? '', frame.lineNumber ?? -1, frame.columnNumber ?? -1]);
const frameInfo = (frame, id = null) => ({ id, functionName: frame.functionName || '(anonymous)',
  url: frame.url || '', lineNumber: Number.isInteger(frame.lineNumber) ? frame.lineNumber + 1 : null,
  columnNumber: Number.isInteger(frame.columnNumber) ? frame.columnNumber + 1 : null,
  columnNumberZeroBased: Number.isInteger(frame.columnNumber) ? frame.columnNumber : null });
const overlap = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
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

async function verifyServedAssetAndAnchor(mode) {
  const recorded = receipt.assets[mode];
  const originalRow = proof.assets[mode].find(item => item.urlPath === recorded.urlPath);
  assert.ok(originalRow, `Frozen proof has no ${mode} entry asset`);
  const original = await readFile(originalRow.path);
  assert.equal(sha(original), recorded.originalSha256);
  assert.equal(original.length, recorded.originalBytes);
  const patchedPath = path.join(out, 'instrumented-assets', path.basename(originalRow.path));
  const patched = await readFile(patchedPath);
  assert.equal(sha(patched), recorded.servedSha256);
  assert.equal(patched.length, recorded.servedBytes);
  const measure = Buffer.from(recorded.insertedText);
  const offset = recorded.insertionOffset;
  assert.deepEqual(patched.subarray(0, offset), original.subarray(0, offset));
  assert.deepEqual(patched.subarray(offset, offset + measure.length), measure);
  assert.deepEqual(patched.subarray(offset + measure.length), original.subarray(offset));
  const originalText = original.toString('utf8');
  const anchor = recorded.updateAnchor;
  assert.equal(originalText.split(anchor.signature).length - 1, 1, `${mode} update anchor is not unique`);
  const start = originalText.indexOf(anchor.signature);
  assert.equal(anchor.profilerFunctionColumnZeroBased,
    anchor.startColumnZeroBased + anchor.signature.indexOf('('), 'Profiler function column is not derived from the source anchor');
  const openBrace = start + anchor.signature.lastIndexOf('{');
  const end = findMethodCloseBrace(originalText, openBrace) + 1;
  const snippet = originalText.slice(start, end);
  assert.equal(sha(Buffer.from(snippet)), anchor.methodSnippetSha256);
  assert.equal(snippet, anchor.methodSnippet);
  assert.equal(originalText.slice(0, start).split('\n').length, anchor.startLine);
  assert.equal(start - originalText.lastIndexOf('\n', start - 1) - 1, anchor.startColumnZeroBased);
  assert.equal(originalText.slice(0, end).split('\n').length, anchor.endLine);
  assert.equal(recorded.originalNewlineCount, recorded.servedNewlineCount);
  return { ...anchor, urlPath: recorded.urlPath, originalSha256: recorded.originalSha256,
    servedSha256: recorded.servedSha256, insertionOffset: offset };
}

function extractMeasures(events, control) {
  const prefix = `r3act-devtools-${control.mode}-`;
  const selected = events.filter(event => event.name?.startsWith(prefix));
  const groups = new Map();
  for (const event of selected) {
    const epoch = Number(event.name.slice(prefix.length));
    assert.ok(Number.isInteger(epoch) && epoch >= 1 && epoch <= 72, `Bad UserTiming epoch: ${event.name}`);
    const key = JSON.stringify([event.pid, event.tid, event.name]);
    let pair = groups.get(key);
    if (!pair) { pair = { mode: control.mode, epoch, pid: event.pid, tid: event.tid, name: event.name, begin: null, end: null, complete: null }; groups.set(key, pair); }
    if (['X', 'x'].includes(event.ph)) { assert.equal(pair.complete, null); pair.complete = event; }
    else if (['B', 'b'].includes(event.ph)) { assert.equal(pair.begin, null); pair.begin = event; }
    else if (['E', 'e'].includes(event.ph)) { assert.equal(pair.end, null); pair.end = event; }
  }
  assert.ok(selected.length >= 72 && selected.length <= 144,
    `Expected 72 unique UserTiming spans, found ${selected.length} trace events`);
  const measures = [...groups.values()].map(pair => {
    let startUs, endUs;
    if (pair.complete) {
      assert.ok(!pair.begin && !pair.end, `Complete UserTiming event also has a begin/end pair: ${pair.name}`);
      startUs = pair.complete.ts; endUs = pair.complete.ts + pair.complete.dur;
    } else {
      assert.ok(pair.begin && pair.end, `Unpaired UserTiming event ${pair.name}`);
      assert.ok(Number.isFinite(pair.begin.ts) && Number.isFinite(pair.end.ts));
      startUs = pair.begin.ts; endUs = pair.end.ts;
    }
    assert.ok(Number.isFinite(startUs) && Number.isFinite(endUs) && endUs >= startUs);
    return { mode: pair.mode, epoch: pair.epoch, pid: pair.pid, tid: pair.tid,
      name: pair.name, startUs, endUs, durationUs: endUs - startUs, phase: pair.complete?.ph ?? 'B/E' };
  }).sort((a, b) => a.epoch - b.epoch);
  assert.equal(measures.length, 72);
  assert.deepEqual(measures.map(item => item.epoch), Array.from({ length: 72 }, (_, i) => i + 1));
  const pageThreads = new Set(measures.map(item => `${item.pid}:${item.tid}`));
  assert.equal(pageThreads.size, 1, 'UserTiming marks span more than one trace thread');
  return measures;
}

function parseProfiles(events) {
  const heads = events.filter(event => event.name === 'Profile');
  const chunks = events.filter(event => event.name === 'ProfileChunk');
  assert.ok(heads.length > 0, 'Trace contains no V8 Profile head');
  assert.ok(chunks.length > 0, 'Trace contains no V8 ProfileChunk events');
  const groups = new Map();
  for (const head of heads) {
    const key = `${head.pid}:${eventId(head)}`;
    assert.notEqual(eventId(head), '', 'Profile head has no profile id');
    assert.ok(!groups.has(key), `Duplicate Profile head ${key}`);
    groups.set(key, { key, pid: head.pid, tid: head.tid, headTs: head.ts, head, chunks: [] });
  }
  for (const chunk of chunks) {
    const key = `${chunk.pid}:${eventId(chunk)}`;
    const group = groups.get(key);
    assert.ok(group, `ProfileChunk has no matching head: ${key}`);
    group.chunks.push(chunk);
  }
  return [...groups.values()].map(group => {
    group.chunks.sort((a, b) => a.ts - b.ts);
    const nodeMap = new Map(), samples = [], timeDeltas = [];
    const append = event => {
      const data = dataOf(event), cpu = data.cpuProfile ?? {};
      for (const node of cpu.nodes ?? []) {
        const prior = nodeMap.get(node.id);
        if (prior) {
          assert.deepEqual(prior.callFrame, node.callFrame, `Profile node ${node.id} changed callFrame`);
          const merged = { ...prior, ...node };
          if (prior.children || node.children) merged.children = [...new Set([...(prior.children ?? []), ...(node.children ?? [])])];
          nodeMap.set(node.id, merged);
        } else nodeMap.set(node.id, node);
      }
      if (cpu.samples?.length || data.timeDeltas?.length) {
        assert.equal(cpu.samples?.length ?? 0, data.timeDeltas?.length ?? 0,
          'V8 CPU samples and timeDeltas length mismatch');
        samples.push(...(cpu.samples ?? []));
        timeDeltas.push(...(data.timeDeltas ?? []));
      }
    };
    append(group.head);
    for (const chunk of group.chunks) append(chunk);
    assert.ok(samples.length > 0, `Empty CPU profile ${group.key}`);
    assert.equal(samples.length, timeDeltas.length);
    for (const delta of timeDeltas) assert.ok(Number.isFinite(delta), `Invalid V8 timeDelta ${delta}`);
    let rawTimestampUs = group.headTs;
    const rawPoints = samples.map((nodeId, originalIndex) => {
      const rawDeltaUs = timeDeltas[originalIndex];
      rawTimestampUs += rawDeltaUs;
      return { nodeId, originalIndex, rawDeltaUs, pointUs: rawTimestampUs };
    });
    const chronologicalPoints = [...rawPoints].sort((a, b) => a.pointUs - b.pointUs || a.originalIndex - b.originalIndex);
    let priorPointUs = null;
    const orderedPoints = chronologicalPoints.map(point => {
      const backwardWeightUs = priorPointUs === null ? null : point.pointUs - priorPointUs;
      if (backwardWeightUs !== null) assert.ok(backwardWeightUs >= 0);
      const row = { ...point, backwardWeightUs, intervalStartUs: priorPointUs ?? point.pointUs,
        intervalEndUs: point.pointUs };
      priorPointUs = point.pointUs;
      return row;
    });
    const rawDeltaSorted = [...timeDeltas].sort((a, b) => a - b);
    const sortedPositiveWeights = orderedPoints.map(point => point.backwardWeightUs)
      .filter(value => value !== null && value > 0).sort((a, b) => a - b);
    const timestampRangeUs = orderedPoints.at(-1).pointUs - orderedPoints[0].pointUs;
    for (const id of samples) assert.ok(nodeMap.has(id), `Sample references missing V8 node ${id}`);
    const parentById = new Map();
    for (const node of nodeMap.values()) {
      if (node.parent !== undefined && node.parent !== null) parentById.set(node.id, node.parent);
      for (const child of node.children ?? []) {
        const existing = parentById.get(child);
        assert.ok(existing === undefined || existing === node.id, `Profile child ${child} has multiple parents`);
        parentById.set(child, node.id);
      }
    }
    for (const node of nodeMap.values()) {
      if (node.parent !== undefined && parentById.has(node.id))
        assert.equal(parentById.get(node.id), node.parent, `Conflicting parent data for profile node ${node.id}`);
    }
    const roots = [...nodeMap.keys()].filter(id => !parentById.has(id));
    assert.equal(roots.length, 1, `Expected one V8 profile root, got ${roots.length}`);
    return { ...group, nodeMap, parentById, rootNodeId: roots[0], samples, timeDeltas, rawPoints,
      orderedPoints, rawDeltaSorted, negativeDeltaCount: timeDeltas.filter(delta => delta < 0).length,
      reorderedSampleCount: orderedPoints.reduce((count, point, sortedIndex) =>
        count + Number(point.originalIndex !== sortedIndex), 0),
      timestampTieCount: orderedPoints.slice(1).reduce((count, point, index) =>
        count + Number(point.pointUs === orderedPoints[index].pointUs), 0),
      sortedPositiveWeights, timestampRangeUs };
  });
}

function sourceStage(node, mode) {
  const frame = node.callFrame ?? {};
  if (mode !== 'native') return null;
  const url = frame.url ?? '';
  if (!url.endsWith(path.basename(receipt.assets.native.urlPath))) return null;
  const line = Number.isInteger(frame.lineNumber) ? frame.lineNumber + 1 : null;
  if (line === null) return null;
  const matching = sourceMap.spans.filter(span => span.bundleLines && line >= span.bundleLines[0] && line <= span.bundleLines[1])
    .sort((a, b) => (a.bundleLines[1] - a.bundleLines[0]) - (b.bundleLines[1] - b.bundleLines[0]));
  return matching[0]?.stage ?? null;
}

function traceGc(events, measures, pid, tid) {
  const gc = events.filter(event => event.pid === pid && event.tid === tid &&
    /(?:^|[., ])(?:V8\.GC|GCEvent|MinorGC|MajorGC)(?:$|[., ])/i.test(`${event.name} ${event.cat ?? ''}`));
  return measures.map(measure => ({ epoch: measure.epoch, events: gc.filter(event => {
    const start = event.ts, end = start + (event.dur ?? 0);
    return overlap(start, end, measure.startUs, measure.endUs) > 0;
  }).map(event => ({ name: event.name, category: event.cat, phase: event.ph, ts: event.ts, dur: event.dur ?? null })) }));
}

function analyzeControl(control, events, updateAnchor) {
  const measures = extractMeasures(events, control);
  const profiles = parseProfiles(events);
  const thread = measures[0];
  const candidateProfiles = profiles.filter(profile => profile.pid === thread.pid && profile.tid === thread.tid &&
    measures.every(measure => profile.orderedPoints[0].pointUs <= measure.startUs &&
      profile.orderedPoints.at(-1).pointUs >= measure.endUs));
  assert.equal(candidateProfiles.length, 1, `Expected one complete V8 profile on UserTiming thread; got ${candidateProfiles.length}`);
  const profile = candidateProfiles[0];
  const rows = [];
  for (const point of profile.orderedPoints) {
    const deltaUs = point.backwardWeightUs ?? 0;
    const endUs = point.intervalEndUs, startUs = point.intervalStartUs;
    const nodeId = point.nodeId, node = profile.nodeMap.get(nodeId);
    const chain = [];
    let current = node;
    const seen = new Set();
    while (current) {
      assert.ok(!seen.has(current.id), `Cycle in profile node ancestry at ${current.id}`);
      seen.add(current.id);
      chain.push(current);
      const parentId = profile.parentById.get(current.id) ?? null;
      if (parentId === null) break;
      current = profile.nodeMap.get(parentId);
      assert.ok(current, `Missing profile parent ${parentId}`);
    }
    chain.reverse();
    assert.equal(chain[0]?.id, profile.rootNodeId, `Sample ${nodeId} does not reach the unique profile root`);
    rows.push({ index: point.originalIndex, sortedIndex: rows.length, pointUs: point.pointUs,
      rawDeltaUs: point.rawDeltaUs, startUs, endUs, deltaUs, hasBackwardWeight: point.backwardWeightUs !== null,
      nodeId, node,
      chain: chain.map(item => ({ node: item, info: frameInfo(item.callFrame ?? {}, item.id), stage: sourceStage(item, control.mode) })) });
  }

  const frameAnalyses = measures.map(measure => {
    const original = control.frames[measure.epoch - 1];
    const bridgeDeltaMs = measure.durationUs / 1000 - original.publishMs;
    const fullyContained = rows.filter(sample => sample.hasBackwardWeight && sample.startUs >= measure.startUs && sample.endUs <= measure.endUs);
    const pointSamples = rows.filter(sample => sample.pointUs >= measure.startUs && sample.pointUs <= measure.endUs);
    const expectedPath = updateAnchor.urlPath;
    const updateMethodPointSamples = pointSamples.filter(sample => sample.chain.some(item => {
      let pathname;
      try { pathname = new URL(item.info.url).pathname; } catch { pathname = ''; }
      return pathname === expectedPath && item.info.functionName === updateAnchor.functionName &&
        item.info.lineNumber === updateAnchor.startLine &&
        item.info.columnNumberZeroBased === updateAnchor.profilerFunctionColumnZeroBased;
    }));
    const intersects = rows.filter(sample => sample.hasBackwardWeight && overlap(sample.startUs, sample.endUs, measure.startUs, measure.endUs) > 0);
    const boundary = intersects.filter(sample => sample.startUs < measure.startUs || sample.endUs > measure.endUs);
    const fullWeightUs = fullyContained.reduce((sum, sample) => sum + sample.deltaUs, 0);
    const boundaryOverlapUs = boundary.reduce((sum, sample) => sum + overlap(sample.startUs, sample.endUs, measure.startUs, measure.endUs), 0);
    const gapUs = Math.max(0, measure.durationUs - fullWeightUs - boundaryOverlapUs);
    const self = new Map(), inclusive = new Map(), stackRows = new Map(), stages = new Map();
    let unclassified = { samples: 0, weightedUs: 0 }, garbageCollector = { samples: 0, weightedUs: 0 };
    for (const sample of fullyContained) {
      const chain = sample.chain;
      const leaf = chain.at(-1);
      const leafName = `${leaf.info.functionName} ${leaf.info.url}`;
      const isGc = /garbage.?collector|\bGC\b/i.test(leafName);
      if (isGc) { garbageCollector.samples++; garbageCollector.weightedUs += sample.deltaUs; }
      else if (!leaf.info.url && /^(?:\(program\)|\(idle\)|\(root\)|)$/i.test(leaf.info.functionName)) {
        unclassified.samples++; unclassified.weightedUs += sample.deltaUs;
      }
      const leafKey = frameKey(leaf.info);
      const selfRow = self.get(leafKey) ?? { ...leaf.info, samples: 0, weightedUs: 0 };
      selfRow.samples++; selfRow.weightedUs += sample.deltaUs; self.set(leafKey, selfRow);
      const stackKey = JSON.stringify(chain.map(item => frameKey(item.info)));
      const stack = stackRows.get(stackKey) ?? { stack: chain.map(item => item.info), samples: 0, weightedUs: 0 };
      stack.samples++; stack.weightedUs += sample.deltaUs; stackRows.set(stackKey, stack);
      for (const entry of chain) {
        const key = frameKey(entry.info);
        const row = inclusive.get(key) ?? { ...entry.info, samples: 0, weightedUs: 0 };
        row.samples++; row.weightedUs += sample.deltaUs; inclusive.set(key, row);
      }
      const leafStage = leaf.stage;
      if (leafStage) {
        const row = stages.get(leafStage) ?? { stage: leafStage, selfSamples: 0, selfWeightedUs: 0, inclusiveSamples: 0, inclusiveWeightedUs: 0 };
        row.selfSamples++; row.selfWeightedUs += sample.deltaUs; stages.set(leafStage, row);
      }
      for (const stage of new Set(chain.map(item => item.stage).filter(Boolean))) {
        const row = stages.get(stage) ?? { stage, selfSamples: 0, selfWeightedUs: 0, inclusiveSamples: 0, inclusiveWeightedUs: 0 };
        row.inclusiveSamples++; row.inclusiveWeightedUs += sample.deltaUs; stages.set(stage, row);
      }
    }
    const round = rows => rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) =>
      [key, typeof value === 'number' && /(?:Us|Ms)$/.test(key) ? Number(value.toFixed(3)) : value])));
    return { epoch: measure.epoch, warmup: measure.epoch <= 12, pid: measure.pid, tid: measure.tid,
      traceStartUs: measure.startUs, traceEndUs: measure.endUs, traceDurationMs: Number((measure.durationUs / 1000).toFixed(6)),
      originalPublishMs: original.publishMs, clockBridgeDeltaMs: Number(bridgeDeltaMs.toFixed(6)),
      clockBridgeWithin100us: Math.abs(bridgeDeltaMs) <= 0.1,
      profileWindow: { samplesContained: fullyContained.length, weightedSampleUs: Number(fullWeightUs.toFixed(3)),
        pointSamples: pointSamples.length, updateMethodPointSamples: updateMethodPointSamples.length,
        updateMethodFrames: [...new Set(updateMethodPointSamples.flatMap(sample => sample.chain
          .filter(item => item.info.functionName === updateAnchor.functionName &&
            item.info.lineNumber === updateAnchor.startLine && item.info.columnNumberZeroBased === updateAnchor.profilerFunctionColumnZeroBased)
          .map(item => `${item.info.functionName}@${item.info.lineNumber}:${item.info.columnNumberZeroBased}`)))],
        boundaryCrossingSamples: boundary.length, boundaryOverlapUs: Number(boundaryOverlapUs.toFixed(3)),
        noSampleCoverageUs: Number(gapUs.toFixed(3)), gcOrUnclassified: { garbageCollector, unclassified } },
      bottomUpSelf: round([...self.values()].sort((a, b) => b.weightedUs - a.weightedUs)),
      callTree: round([...stackRows.values()].sort((a, b) => b.weightedUs - a.weightedUs)),
      inclusiveAncestors: round([...inclusive.values()].sort((a, b) => b.weightedUs - a.weightedUs)),
      sourceStages: [...stages.values()].sort((a, b) => b.selfWeightedUs - a.selfWeightedUs),
      pixels: { checksum: original.checksum, pixelChecksum: original.pixelChecksum, litPixels: original.litPixels } };
  });
  const bridgeFailures = frameAnalyses.filter(row => !row.clockBridgeWithin100us);
  return { mode: control.mode, index: control.index, tracePath: control.tracePath,
    traceSha256: control.traceSha256, traceBytes: control.traceBytes, traceFormat: control.traceFormat,
    updateAnchor,
    traceEventCount: events.length, profile: { key: profile.key, pid: profile.pid, tid: profile.tid,
      headTraceUs: profile.headTs, argsDataStartTime: dataOf(profile.head).startTime ?? null,
      argsStartTimeIgnored: true, chunks: profile.chunks.length, samples: profile.samples.length,
      timestampRangeMs: profile.timestampRangeUs / 1000, rawNegativeDeltaCount: profile.negativeDeltaCount,
      rawDeltaMinUs: profile.rawDeltaSorted[0],
      rawDeltaMedianUs: profile.rawDeltaSorted[Math.floor(profile.rawDeltaSorted.length / 2)],
      rawDeltaMaxUs: profile.rawDeltaSorted.at(-1), reorderedSampleCount: profile.reorderedSampleCount,
      timestampTieCount: profile.timestampTieCount,
      chronologicalBackwardWeightCount: profile.sortedPositiveWeights.length,
      chronologicalBackwardWeightMinUs: profile.sortedPositiveWeights[0] ?? null,
      chronologicalBackwardWeightMedianUs: profile.sortedPositiveWeights.length
        ? profile.sortedPositiveWeights[Math.floor(profile.sortedPositiveWeights.length / 2)] : null,
      chronologicalBackwardWeightMaxUs: profile.sortedPositiveWeights.at(-1) ?? null },
    frameCount: frameAnalyses.length, bridgeFailures: bridgeFailures.map(({ epoch, clockBridgeDeltaMs }) => ({ epoch, clockBridgeDeltaMs })),
    updateMethodPointSamples: frameAnalyses.reduce((sum, frame) => sum + frame.profileWindow.updateMethodPointSamples, 0),
    gcEventsOverlappingWindows: traceGc(events, measures, profile.pid, profile.tid), frames: frameAnalyses };
}

try {
  for (const control of receipt.controls) {
    const anchor = await verifyServedAssetAndAnchor(control.mode);
    result.updateAnchors.push(anchor);
    const traceBytes = await readFile(control.tracePath);
    assert.equal(traceBytes.length, control.traceBytes, `Trace byte count mismatch: ${control.tracePath}`);
    assert.equal(sha(traceBytes), control.traceSha256, `Trace SHA-256 mismatch: ${control.tracePath}`);
    const raw = JSON.parse(traceBytes.toString('utf8'));
    assert.ok(Array.isArray(raw.traceEvents), `Not an importable Chrome trace JSON: ${control.tracePath}`);
    const analyzed = analyzeControl(control, raw.traceEvents, anchor);
    result.controls.push(analyzed);
    await save();
  }
  const allFrames = result.controls.flatMap(control => control.frames);
  assert.equal(allFrames.length, 288);
  assert.ok(result.controls.every(control => control.frameCount === 72));
  assert.ok(result.controls.every(control => control.bridgeFailures.length === 0), 'UserTiming does not align with original timers');
  assert.ok(result.controls.every(control => control.updateMethodPointSamples > 0), 'No sampled update ancestry matched the exact authored update method');
  assert.equal(sha(await readFile(receiptPath)), sha(receiptBytes), 'Collector receipt changed during analysis');
  assert.equal(sha(await readFile(originalAnalysisPath)), sha(originalAnalysisBytes), 'Original failed analysis changed during repair');
  assert.equal(sha(await readFile(mapPath)), sha(mapBytes), 'Native source map changed during analysis');
  assert.equal(sha(await readFile(nativeCostPath)), sha(nativeCostBytes), 'Native cost map changed during analysis');
  assert.equal(sha(await readFile(fileURLToPath(import.meta.url))), sha(repairAnalyzerBytes), 'Repair analyzer changed during analysis');
  assert.equal(sha(await readFile(repairNotePath)), sha(repairNoteBytes), 'Repair note changed during analysis');
  for (const [file, expected] of ownedEvidenceFiles) assert.equal(sha(await readFile(file)), expected,
    `A reviewed collector/source-map input changed during analysis: ${file}`);
  for (const control of receipt.controls)
    assert.equal(sha(await readFile(control.tracePath)), control.traceSha256, `Raw trace changed during repair: ${control.tracePath}`);
  result.status = 'PASS_TRACE_ALIGNMENT_AND_OFFLINE_PROFILE_ANALYSIS';
} catch (error) {
  result.errors.push(error instanceof Error ? error.stack : String(error));
  result.status = 'INCOMPLETE_ANALYSIS';
} finally {
  result.receiptSha256After = await (async () => sha(await readFile(receiptPath)))();
  result.preservedOriginalAnalysisSha256After = await (async () => sha(await readFile(originalAnalysisPath)))();
  result.sourceMapSha256After = await (async () => sha(await readFile(mapPath)))();
  result.nativeCostMapSha256 = sha(nativeCostBytes);
  result.nativeCostMapSha256After = await (async () => sha(await readFile(nativeCostPath)))();
  result.repairAnalyzerSha256After = await (async () => sha(await readFile(fileURLToPath(import.meta.url))))();
  result.repairNoteSha256After = await (async () => sha(await readFile(repairNotePath)))();
  await save();
}
if (result.status !== 'PASS_TRACE_ALIGNMENT_AND_OFFLINE_PROFILE_ANALYSIS') process.exitCode = 1;
else console.log(JSON.stringify({ status: result.status, outputPath }));
