"""Recompute bundle self time from the frozen CDP samples; not a latency study."""
import collections
import hashlib
import html
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
raw = root / 'results/product-mixed-state-lanes-cpu'
out = root / 'results/product-mixed-state-lanes-cpu-analysis'
out.mkdir(exist_ok=True)
verification = raw / 'verification.json'
assert json.loads(verification.read_text())['status'] == 'PASS'
records = []
for filename in ('20-react-1024.json', '21-native-1024.json'):
    record = json.loads((raw / filename).read_text())
    profile = record['profile']
    nodes = {node['id']: node['callFrame'] for node in profile['nodes']}
    totals = collections.defaultdict(int)
    assert len(profile['samples']) == len(profile['timeDeltas'])
    for sample, delta in zip(profile['samples'], profile['timeDeltas']):
        frame = nodes[sample]
        bundle_prefix = 'native_product_mixed_arm-' if record['arm'] == 'native' else 'product_mixed_react_arm-'
        if bundle_prefix in frame['url']:
            totals[(frame['functionName'], frame['lineNumber'], frame['columnNumber'])] += delta
    contexts = [dict(functionName=key[0], line=key[1], column=key[2], selfMs=value / 1000)
                for key, value in sorted(totals.items(), key=lambda item: -item[1])]
    records.append(dict(arm=record['arm'], sampledBundleSelfMs=sum(totals.values()) / 1000,
                        contexts=contexts))
summary = dict(status='DERIVED_FROM_VERIFIED_RAW',
               scope='Whole page sampled self: import, mount, warmup, measured frames, inspection, disposal. Not commit latency.',
               verificationSha256=hashlib.sha256(verification.read_bytes()).hexdigest(), records=records)
(out / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
contexts = records[1]['contexts'][:12]
maximum = max(context['selfMs'] for context in contexts)
svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="840" height="535" viewBox="0 0 840 535">',
       '<rect width="840" height="535" fill="white"/>',
       '<text x="20" y="30" font-family="sans-serif" font-size="20">Native bundle: whole-page sampled self time</text>']
for index, context in enumerate(contexts):
    y = 65 + index * 35
    label = html.escape(f"{context['functionName']} @ {context['line']}:{context['column']}")
    width = context['selfMs'] / maximum * 420
    svg += [f'<text x="20" y="{y+15}" font-family="sans-serif" font-size="13">{label}</text>',
            f'<rect x="290" y="{y}" width="{width:.2f}" height="22" fill="#3867d6"/>',
            f'<text x="{300+width:.2f}" y="{y+15}" font-family="sans-serif" font-size="13">{context["selfMs"]:.3f} ms</text>']
svg += ['<text x="20" y="510" font-family="sans-serif" font-size="13">Includes startup, warmup, inspection and disposal; not per-frame latency.</text>', '</svg>']
(out / 'summary.svg').write_text('\n'.join(svg) + '\n')
print(json.dumps({record['arm']: record['sampledBundleSelfMs'] for record in records}))
