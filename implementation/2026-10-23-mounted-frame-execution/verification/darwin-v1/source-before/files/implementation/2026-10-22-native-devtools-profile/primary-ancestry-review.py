import bisect
import collections
import hashlib
import json
import pathlib
import statistics
import urllib.parse

unit = pathlib.Path(__file__).resolve().parent
root = unit.parent.parent
evidence = unit / 'evidence/devtools-profile-v3'
digest = lambda data: hashlib.sha256(data).hexdigest()
receipt_bytes = (evidence / 'receipt.json').read_bytes()
receipt = json.loads(receipt_bytes)
assert receipt['status'] == 'CAPTURE_COMPLETE_PENDING_OFFLINE_ANALYSIS'
assert receipt['browserClosed'] and not receipt['errors'] and not receipt['cleanupErrors']
assert receipt['source']['inputRows'] == receipt['source']['inputRowsAfter']
assert receipt['source']['ownFiles'] == receipt['source']['ownFilesAfter']
assert receipt['source']['toolchainBefore'] == receipt['source']['toolchainAfter']
for row in receipt['source']['inputRows']:
    assert row.get('matches', True) and row['expected'] == row['actual']
    assert digest((root / row['path']).read_bytes()) == row['expected'], row['path']

mapping = json.loads((unit / 'source-map.json').read_text())['spans']
mapping = sorted((s for s in mapping if s['bundleLines']),
                 key=lambda s: s['bundleLines'][1] - s['bundleLines'][0])
report = {'status': 'PRIMARY_ANCESTRY_FILTERED_TRACE_REVIEW_PASS',
          'receiptSha256': digest(receipt_bytes), 'currentInputRowsVerified': len(receipt['source']['inputRows']),
          'samplingWeightsAreExactCpuTimes': False, 'controls': []}
reference = None
for control in receipt['controls']:
    result = control['result']
    frames = result['warmupSamples'] + result['samples']
    assert len(frames) == 72 and control['contextClosed']
    sequence = [[f[k] for k in ('epoch', 'checksum', 'count', 'retained', 'pixelChecksum', 'litPixels')]
                for f in frames]
    if reference is None:
        reference = sequence
    assert sequence == reference
    assert all(f['counters'] is None for f in frames)
    teardown = result['teardown']
    assert teardown['resourcesExpected'] == teardown['resourcesDisposed'] == 512
    assert teardown['duplicateDisposalEvents'] == 0
    assert teardown['cleanup']['sceneChildren'] == teardown['cleanup']['registeredSetters'] == 0
    trace_bytes = pathlib.Path(control['tracePath']).read_bytes()
    assert digest(trace_bytes) == control['traceSha256']
    events = json.loads(trace_bytes)['traceEvents']
    measures = {}
    prefix = 'r3act-devtools-' + control['mode'] + '-'
    for event in events:
        if not event.get('name', '').startswith(prefix):
            continue
        epoch = int(event['name'][len(prefix):])
        pair = measures.setdefault(epoch, {})
        assert event['ph'] in ('b', 'e') and event['ph'] not in pair
        pair[event['ph']] = event
    assert sorted(measures) == list(range(1, 73))
    thread = measures[1]['b']
    for epoch, pair in measures.items():
        assert pair['b']['pid'] == pair['e']['pid'] == thread['pid']
        assert pair['b']['tid'] == pair['e']['tid'] == thread['tid']
        assert abs((pair['e']['ts'] - pair['b']['ts']) / 1000 - frames[epoch - 1]['publishMs']) <= .1
    heads = [e for e in events if e.get('name') == 'Profile'
             and e['pid'] == thread['pid'] and e['tid'] == thread['tid']]
    assert len(heads) == 1
    head = heads[0]
    chunks = sorted((e for e in events if e.get('name') == 'ProfileChunk'
                     and e['pid'] == head['pid'] and e['id'] == head['id']), key=lambda e: e['ts'])
    nodes = {}
    points = []
    raw_deltas = []
    cursor = head['ts']
    for chunk in chunks:
        data = chunk['args']['data']
        profile = data.get('cpuProfile', {})
        for node in profile.get('nodes', []):
            assert node['id'] not in nodes or nodes[node['id']] == node
            nodes[node['id']] = node
        deltas, samples = data.get('timeDeltas', []), profile.get('samples', [])
        assert len(deltas) == len(samples)
        for delta, sample in zip(deltas, samples):
            cursor += delta
            points.append((cursor, len(points), sample))
            raw_deltas.append(delta)
    assert all(point[2] in nodes for point in points)
    points.sort(key=lambda point: (point[0], point[1]))
    assert points[0][0] >= head['ts']
    assert head['ts'] <= measures[1]['b']['ts'] and points[-1][0] >= measures[72]['e']['ts']
    timestamps = [point[0] for point in points]
    leaf_counts = collections.Counter()
    partition = collections.Counter()
    ancestry_partition = collections.Counter()
    ancestry_leaves = collections.Counter()
    ancestry_weights = collections.Counter()
    contained_count = point_count = update_ancestry_count = 0
    coverage_us = boundary_us = 0
    anchor = receipt['assets'][control['mode']]['updateAnchor']
    url_path = receipt['assets'][control['mode']]['urlPath']
    for epoch in range(13, 73):
        start, end = measures[epoch]['b']['ts'], measures[epoch]['e']['ts']
        lo, hi = bisect.bisect_left(timestamps, start), bisect.bisect_right(timestamps, end)
        point_count += hi - lo
        for index in range(lo, hi):
            timestamp, original_index, node_id = points[index]
            chain = []
            seen = set()
            while node_id is not None:
                assert node_id not in seen
                seen.add(node_id)
                node = nodes[node_id]
                chain.append(node)
                node_id = node.get('parent')
            in_update = any(n.get('callFrame', {}).get('functionName') == 'update'
                   and urllib.parse.urlparse(n['callFrame'].get('url', '')).path == url_path
                   and n['callFrame'].get('lineNumber', -1) + 1 == anchor['startLine']
                   and n['callFrame'].get('columnNumber') == anchor['profilerFunctionColumnZeroBased']
                   for n in chain)
            if in_update:
                update_ancestry_count += 1
            previous = points[index - 1][0] if index else head['ts']
            if previous < start:
                boundary_us += timestamp - start
                continue
            contained_count += 1
            coverage_us += timestamp - previous
            leaf = chain[0].get('callFrame', {})
            key = (leaf.get('functionName', '(anonymous)'), leaf.get('url', ''),
                   leaf.get('lineNumber', -1) + 1, leaf.get('columnNumber', -1))
            leaf_counts[key] += 1
            stage = 'unmapped'
            if control['mode'] == 'native':
                for node in chain:
                    cf = node.get('callFrame', {})
                    if not cf.get('url', '').endswith('/native-B0ltTLHF.js'):
                        continue
                    line = cf.get('lineNumber', -1) + 1
                    matched = next((s for s in mapping if s['bundleLines'][0] <= line <= s['bundleLines'][1]), None)
                    if matched:
                        stage = matched['stage']
                        break
            if leaf.get('functionName') == '(garbage collector)':
                stage = 'garbage-collector'
            partition[stage] += 1
            if in_update:
                ancestry_partition[stage] += 1
                ancestry_leaves[key] += 1
                ancestry_weights[stage] += timestamp - previous
        following = points[hi][0] if hi < len(points) else None
        if following is not None:
            previous = points[hi - 1][0] if hi else head['ts']
            boundary_us += max(0, end - max(start, previous))
    assert sum(partition.values()) == contained_count
    assert update_ancestry_count > 0
    selected = sorted(f['publishMs'] for f in result['samples'])
    report['controls'].append({'index': control['index'], 'mode': control['mode'],
        'traceSha256': control['traceSha256'], 'rawSamples': len(points),
        'rawNegativeDeltas': sum(d < 0 for d in raw_deltas), 'rawMinimumDeltaUs': min(raw_deltas),
        'rawSampleOrderChanged': sum(index != point[1] for index, point in enumerate(points)),
        'chronologicalCadenceMedianUs': statistics.median(b - a for a, b in zip(timestamps, timestamps[1:])),
        'updateMedianMs': statistics.median(selected), 'updateP95Ms': selected[56],
        'measuredWindowPointSamples': point_count, 'measuredWindowExactUpdateAncestryPoints': update_ancestry_count,
        'containedSamples': contained_count, 'backwardSamplingWeightUs': coverage_us,
        'boundaryUnattributedUs': boundary_us,
        'nonOverlappingStackFamilyCounts': dict(partition.most_common()),
        'updateAncestryContainedSamples': sum(ancestry_partition.values()),
        'updateAncestryFamilyCounts': dict(ancestry_partition.most_common()),
        'updateAncestryBackwardWeightsUs': dict(ancestry_weights.most_common()),
        'updateAncestryExclusiveLeaves': [{'name': k[0], 'url': k[1], 'line': k[2], 'column': k[3], 'samples': n}
                                        for k, n in ancestry_leaves.most_common(30)],
        'exclusiveLeaves': [{'name': k[0], 'url': k[1], 'line': k[2], 'column': k[3], 'samples': n}
                            for k, n in leaf_counts.most_common(30)]})
(unit / 'primary-ancestry-review.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
