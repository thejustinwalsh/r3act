"""Recompute allocation diagnostics and render SVG; never modify raw evidence.

Run from the project root with Python and matplotlib 3.10.8.
"""
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path.cwd()
RAW = ROOT / "results/product-mixed-native-cell-cut-memory"
OUT = ROOT / "results/product-mixed-native-cell-cut-memory-analysis"
OUT.mkdir(exist_ok=True)
read = lambda p: json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
assert read(RAW / "FINALresults.json")["status"] == "PASS"
assert read(RAW / "verification.json")["status"] == "PASS"
assert read(RAW / "verification.json")["summary"]["failed"] == 0


def verified_frame(frame):
    """Resolve only assets with the verifier's locked excerpt and offset."""
    excerpt = frame.get("emittedExcerpt")
    if not excerpt:
        return None
    path = ROOT / excerpt["file"]
    assert sha(path) == excerpt["sha256"] == excerpt["verifiedServedSha256"]
    # JavaScript offsets are UTF-16 code units, not Python code points.
    units = path.read_text().encode("utf-16-le")
    text = units[2 * excerpt["start"]:2 * excerpt["end"]].decode("utf-16-le")
    assert text == excerpt["text"]
    return {"file": excerpt["file"], "sha256": excerpt["sha256"],
            "offset": excerpt["offset"], "excerpt": excerpt["text"]}


pages = []
for filename in ["00-react-128.json", "01-native-128.json", "10-react-512.json",
                 "11-native-512.json", "20-react-1024.json", "21-native-1024.json"]:
    data = read(RAW / filename)
    assert data["status"] == "PASS"
    head = data["cdp"]["stoppedSamplingProfile"]["head"]
    grouped, callers = {}, {}
    def walk(node, nearest=None):
        frame = node["callFrame"]
        frame = {**frame, "functionName": frame.get("functionName") or "(anonymous)"}
        key = tuple(frame.get(k, "") for k in
                    ["url", "functionName", "lineNumber", "columnNumber"])
        grouped[key] = grouped.get(key, 0) + node["selfSize"]
        if "/assets/" in urlparse(frame["url"]).path:
            nearest = key
        elif not frame["url"] and nearest and node["selfSize"]:
            context = (frame["functionName"], nearest)
            callers[context] = callers.get(context, 0) + node["selfSize"]
        for child in node.get("children", []):
            walk(child, nearest)
    walk(head)
    verified = {}
    for frame in data["cdp"]["topFrameAttribution"]:
        key = tuple(frame[k] for k in ["url", "functionName", "lineNumber", "columnNumber"])
        assert grouped[key] == frame["sampledAllocationBytes"]
        resolved = verified_frame(frame)
        if resolved:
            verified[key] = resolved
    ledger = [{"url": k[0], "functionName": k[1], "lineNumber": k[2],
               "columnNumber": k[3], "sampledSelfBytes": n,
               "verifiedEmittedSource": verified.get(k)}
              for k, n in sorted(grouped.items(), key=lambda pair: -pair[1])]
    contexts = [{"builtin": k[0], "nearestEmittedAncestor": list(k[1]),
                 "sampledSelfBytes": n, "verifiedAncestor": verified.get(k[1])}
                for k, n in sorted(callers.items(), key=lambda pair: -pair[1])]
    pages.append({"rawFile": filename, "sha256": sha(RAW / filename),
                  "arm": data["arm"], "size": data["size"],
                  "treeSelfBytes": sum(grouped.values()),
                  "flatSampleBytes": sum(s["size"] for s in data["cdp"]["stoppedFlatSamples"]),
                  "postDisposalGCUsedBytes": data["heapUsageAfterForcedGC"]["usedSize"],
                  "frames": ledger, "builtinCallerContexts": contexts})

pairs = []
for size in [128, 512, 1024]:
    react, native = [next(p for p in pages if p["size"] == size and p["arm"] == arm)
                     for arm in ["react", "native"]]
    pairs.append({"size": size, "reactTreeBytes": react["treeSelfBytes"],
                  "nativeTreeBytes": native["treeSelfBytes"],
                  "nativeOverReactTreeRatio": native["treeSelfBytes"] / react["treeSelfBytes"],
                  "reactFlatBytes": react["flatSampleBytes"],
                  "nativeFlatBytes": native["flatSampleBytes"]})
analysis = {"schemaVersion": 1, "runId": read(RAW / "FINALresults.json")["runId"],
            "verificationSha256": sha(RAW / "verification.json"),
            "scope": "Import, mount, 60 warmup + 240 measured frames, inspection and disposal",
            "limits": ["One pair per size; probabilistic allocation estimates, not a latency verdict",
                       "Tree self sizes and flat sample sums are separate CDP representations",
                       "Builtin nearest ancestor is coarse context, not exact statement attribution",
                       "Post-disposal GC heap does not establish mounted memory or leak freedom"],
            "pairs": pairs, "pages": pages}
(OUT / "analysis.json").write_text(json.dumps(analysis, indent=2) + "\n")

plt.rcParams.update({"svg.fonttype": "none", "font.family": "DejaVu Sans", "font.size": 11})
fig, ax = plt.subplots(figsize=(9, 5.4))
x = list(range(3))
for offset, arm, color in [(-.18, "react", "#526677"), (.18, "native", "#147d80")]:
    values = [p[f"{arm}TreeBytes"] / 1e6 for p in pairs]
    bars = ax.bar([v + offset for v in x], values, .32, label=arm.title(), color=color)
    ax.bar_label(bars, labels=[f"{v:.1f}" for v in values], padding=5, fontsize=10)
ax.set_xticks(x, ["128 rows", "512 rows", "1,024 rows"])
ax.set_ylabel("Sampled allocation estimate (MB, decimal)")
ax.set_ylim(0, max(max(p["reactTreeBytes"], p["nativeTreeBytes"]) for p in pairs) / 1e6 * 1.16)
ax.spines[["top", "right"]].set_visible(False)
ax.set_axisbelow(True)
ax.yaxis.grid(True, color="#e3e7e8")
ax.legend(frameon=False, loc="upper left")
fig.suptitle("Compiled mixed workload: full-page allocation diagnostic", x=.11, ha="left", fontsize=15)
fig.text(.11, .895, "One React/native pair per size · CDP tree node self sizes · 32 KiB sampling", fontsize=10)
fig.text(.11, .03, "Includes startup, warmup, updates, inspection and disposal. No latency or causal improvement verdict.", fontsize=9)
fig.subplots_adjust(left=.11, right=.98, bottom=.14, top=.83)
fig.savefig(OUT / "allocation.svg")
fig.savefig(OUT / "allocation.png", dpi=150)
print(json.dumps({"status": "RECOMPUTED", "pairs": pairs, "output": str(OUT)}))
