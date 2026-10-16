# Compiled product mixed identity V3: decision

12 October 2026. **Speed gate: FAIL. Correctness: 30/30 pages pass.**

The archived state-change identity candidate does not meet the existing realtime
product target. All 7,200 measured frames pass output, ordering, retained-node
identity and lifecycle checks; no page was excluded or replaced. The collector,
analysis script, protocol, production assets and compiler proofs were frozen
before collection. Independent recomputation validates the full record set,
archive contents, decision ratios and six separate allocation profiles.

## Commit results

Values below are medians across five fresh page summaries per arm, in milliseconds.
Frame observations are nested within pages; they are not independent replications.

| Rows | React median | Native median | React p95 | Native p95 | Paired median ratio | Paired p95 ratio |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 128 | 0.20 | 0.40 | 0.30 | 0.60 | Unresolved | Unresolved |
| 512 | 0.60 | 1.50 | 0.80 | 1.80 | 2.49999999 | 2.25000000 |
| 1,024 | 1.10 | 2.90 | 1.40 | 4.30 | 2.61792571 | 3.23076922 |

The median ratio is the geometric mean of paired page-median native/React ratios.
The p95 ratio is the median of paired page-p95 ratios. Neither is a ratio of the
rounded arm values in the table. Lower is faster. The unchanged targets are a
median ratio at most 0.80 at two sizes and p95 ratio at most 1.10 at every size.
Both resolved sizes fail both targets.

The calibrated positive clock tick is about 0.10 ms; the five-tick denominator
floor is about 0.50 ms. All 128-row React denominators are below the floor, so
those decision ratios remain unresolved. The SVG marks them explicitly:
[paired ratios](./results/product-mixed-identity-v3-summary.svg).

Ordinary-frame medians equal the all-frame medians shown above. Structural page
p95 medians are React 1.10/2.10/3.20 ms versus native 3.20/8.60/13.30 ms. Measured
lifecycle CPU (mount + 240 step timings + disposal) is React 52.60/160.20/291.90 ms
versus native 126.90/418.70/812.50 ms. This total excludes warmup CPU, module
loading and browser rendering. RAF interval medians are about 8.30 ms for every
arm/size; an interval precedes its recorded update and is not a presentation
measurement or a structural-frame cost.

## Separate allocation profiles

Each arm/size has one additional fresh headed browser context. Sampling starts
before navigation and covers module loading, mount, warmup, measured steps,
harness checks and disposal. The 32 KiB sampler includes objects collected by
major and minor GC. These pages do not contribute latency observations.

| Rows | React sampled tree bytes | Native sampled tree bytes | Native/React | React post-disposal GC heap | Native post-disposal GC heap |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 128 | 48,577,192 | 140,016,888 | 2.88 | 2,269,436 | 2,371,612 |
| 512 | 159,638,160 | 446,427,144 | 2.80 | 2,296,148 | 2,420,900 |
| 1,024 | 306,501,668 | 814,269,608 | 2.66 | 2,334,560 | 2,433,320 |

Tree bytes sum the stopped sampling profile's node `selfSize` values. They are
sampled allocation estimates, not exact allocation counters. The protocol also
exposes sample-level `size` values; their totals differ in these raw records, so
the verifier preserves both representations rather than imposing equality.
Their definitions are in the [official CDP schema](https://github.com/ChromeDevTools/devtools-protocol/blob/master/json/js_protocol.json).
The first verifier incorrectly asserted equality; that failure and the corrected
verifier are archived. No raw profile changed. Similar post-disposal GC heaps do
not establish mounted memory cost, absence of leaks or low allocation churn.

## What this decides

The identity cache is insufficient to deliver the required product advantage.
Native still incurs roughly 2.7–2.9 times the sampled allocation-tree volume of
React and has slower ordinary commits, structural tails and lifecycle CPU.
Dynamic-realtime superiority remains unproved.

Compared descriptively with V2, resolved median ratios move from 2.6745/2.6700
to 2.5000/2.6179. The 1,024-row p95 ratio moves from 3.0 to 3.2308. This is not
a single-change causal estimate: numeric reentrant restoration also changed,
the runs occurred at different times and RAF conditions changed at smaller
sizes. Authored arm/contract/schedule sources and the React Compiler proof are
unchanged; emitted asset hashes are locked separately for each study. Lower
absolute times in both arms cannot be credited to the native identity cache.

Source inspection identifies a concrete remaining integration gap: native root
preparation calls `prepareCommit(expanded)` with generic binding grouping. The
VDOM already has a direct property/style writer mode, but root compilation does
not select it. Generic style bindings materialize a complete style object and
call the full style setter. The prior locked CPU excerpts identify this code;
they do not quantify its cost in V3 or prove that enabling the mode will win.

The next bounded implementation seam is to connect compiler-proven property
writers to root preparation and incremental keyed writer maintenance, preserving
compound bindings, reentrancy, generic fallbacks and coordinated publication.
It needs correctness and cost attribution before another confirmation. Adding a
new storage/backend family is not supported by this result. Independent-device,
comparative human maintenance and the held Sol review gates remain open.

## Reproduction and limits

The frozen candidate is
`implementation/2026-10-12-state-change-identity/source-and-build.tar.gz`;
preregistration and raw records are under `results/product-mixed-identity-v3*`.
Run `scripts/verify_product_mixed_identity_v3_evidence.mjs` with Node 24 to verify
the evidence. Collection refuses replacement records. Historical V2 results,
archives and notebook remain unchanged.

This is one physical machine/browser, not independent-device replication. DOM
validation and diagnostics occur outside the step timer but can affect later
frames. Layout, paint, GPU presentation and network/async transitions are outside
this comparison. Allocation sampling includes the harness and startup; it is not
an update-only measurement. The smooth Three demo does not overturn this result.
