"""Recompute whole-page bundle self samples from independently verified profiles."""
import collections
import hashlib
import html
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
raw = root / "results/product-mixed-compiled-owner-rows-cpu"
output = root / "results/product-mixed-compiled-owner-rows-cpu-analysis"
verification_path = raw / "verification-v2.json"
verification = json.loads(verification_path.read_text())
assert verification["status"] == "PASS"
records = []
for filename in ("20-react-1024.json", "21-native-1024.json"):
    record_path = raw / filename
    record = json.loads(record_path.read_text())
    assert record["status"] == "PASS"
    profile = record["profile"]
    frames = {node["id"]: node["callFrame"] for node in profile["nodes"]}
    assert len(profile["samples"]) == len(profile["timeDeltas"])
    prefix = ("native_product_mixed_arm-" if record["arm"] == "native"
              else "product_mixed_react_arm-")
    totals = collections.defaultdict(int)
    for sample, delta in zip(profile["samples"], profile["timeDeltas"]):
        assert sample in frames and isinstance(delta, (float, int)) and delta >= 0
        frame = frames[sample]
        if prefix in frame["url"]:
            totals[(frame["url"], frame["functionName"],
                    frame["lineNumber"], frame["columnNumber"])] += delta
    contexts = [dict(url=key[0], functionName=key[1], line=key[2],
                     column=key[3], selfMs=value / 1000)
                for key, value in sorted(totals.items(), key=lambda pair: -pair[1])]
    records.append(dict(arm=record["arm"], rawPath=str(record_path.relative_to(root)),
                        rawSha256=hashlib.sha256(record_path.read_bytes()).hexdigest(),
                        sampledBundleSelfMs=sum(totals.values()) / 1000,
                        contexts=contexts))

summary = dict(
    status="DERIVED_FROM_VERIFIED_RAW",
    scope="Whole-page sampled arm bundle self time: import, mount, warmup, updates, checks and disposal. Includes authored application and runtime; cannot assign samples to frame categories. This is not commit latency or a causal comparison.",
    verificationSha256=hashlib.sha256(verification_path.read_bytes()).hexdigest(),
    analysisScriptSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    records=records,
)
output.mkdir(exist_ok=True)
assert not (output / "summary.json").exists() and not (output / "summary.svg").exists()
(output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
contexts = next(record for record in records if record["arm"] == "native")["contexts"][:12]
maximum = max((context["selfMs"] for context in contexts), default=1) or 1
svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="560" viewBox="0 0 1000 560" role="img">',
       '<title>Compiled owner row native bundle sampled self time</title>',
       '<rect width="1000" height="560" fill="white"/>',
       '<text x="24" y="30" font-family="sans-serif" font-size="20">Native bundle whole-page sampled self time</text>',
       '<text x="24" y="52" font-family="sans-serif" font-size="13">Function and zero-based bundle line:column identify sample locations.</text>']
for index, context in enumerate(contexts):
    y = 72 + index * 34
    label = html.escape(f"{context['functionName'] or '(anonymous)'} @ {context['line']}:{context['column']}")
    width = context["selfMs"] / maximum * 500
    svg.extend([
        f'<text x="24" y="{y+16}" font-family="sans-serif" font-size="13">{label}</text>',
        f'<rect x="360" y="{y}" width="{width:.2f}" height="23" fill="#3867d6"/>',
        f'<text x="{370+width:.2f}" y="{y+16}" font-family="sans-serif" font-size="13">{context["selfMs"]:.3f} ms</text>',
    ])
svg.extend([
    '<text x="24" y="512" font-family="sans-serif" font-size="13">Includes startup, warmup, measured work, checks and disposal.</text>',
    '<text x="24" y="536" font-family="sans-serif" font-size="13">Sampled attribution only; application and runtime share this bundle.</text>',
    '</svg>',
])
(output / "summary.svg").write_text("\n".join(svg) + "\n")
print(json.dumps({record["arm"]: record["sampledBundleSelfMs"] for record in records}))
