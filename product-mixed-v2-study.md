# Compiled product mixed V2: correctness passes, speed gate fails

**Collected:** 12 October 2026. **Decision:** FAIL. All 30 scheduled pages are valid;
no page was replaced or excluded. Six separate allocation profiles also pass
correctness. This is one physical computer, not independent-device replication.

## What was compared

The archived mandatory-compiler product and React 19.3 + React Compiler run actual
TSX with matching three-field local state, pixel strings, DOM output, keyed row
lifetimes and two-phase structural commits. Native rows emit three prop-only
writers and the board an eligible collection region; ReactRow and ReactBoard emit
memo-cache code. Every measured step includes state updates, collection planning,
host commit, mount and cleanup. This is the named V2 reimplementation of mixed V1,
whose hand-bound kernel and external-store React arm remain separate historical
evidence. It does not isolate the effect of one kernel change.

Sizes are 128/512/1024 rows, five page pairs each, counterbalanced in the frozen
schedule. Each page warms for 60 frames then records 240 updates, with eight
remove/insert/reorder frames. All 7,200 recorded frames pass the declared
output/order/identity/lifetime checks. Teardown leaves no writers; native owner,
collection reader and retained batch counts are zero.

## Commit results

Times below are medians across page summaries. The decision ratios are computed
within each pair before aggregation, so they need not equal ratios of the rounded
table times.

| Rows | React median / p95 (ms) | Native median / p95 (ms) | Paired median ratio, geometric mean | Median paired p95 ratio | Decision |
| ---: | ---: | ---: | ---: | ---: | --- |
| 128 | 0.30 / 0.40 | 0.70 / 0.90 | Unresolved (2.262 descriptive) | Unresolved (2.250 descriptive) | Clock-coarse denominators |
| 512 | 0.80 / 1.00 | 2.10 / 2.50 | 2.675 | 2.400 | Fail |
| 1024 | 1.40 / 2.00 | 3.70 / 5.70 | 2.670 | 3.000 | Fail |

The preregistered target was a paired median ratio <=0.80 at at least two sizes,
with median paired p95 ratio <=1.10 at every size and all correctness contracts
passing. No resolved size meets either timing target. The calibrated clock tick is
0.100 ms; the frozen denominator floor is five ticks (0.500 ms). The 128-row ratios
remain descriptive and do not determine a threshold outcome.

Structural-frame p95 page medians are 1.40/4.10 ms (React/native) at 128 rows,
2.60/10.40 ms at 512, and 3.70/16.40 ms at 1024. Ordinary-frame medians also favor
React at all sizes. This is not merely a bad structural tail concealing an
otherwise faster compiled path.

Mount + sum of the 240 measured commits + disposal has page medians:

| Rows | React measured lifecycle CPU (ms) | Native measured lifecycle CPU (ms) |
| ---: | ---: | ---: |
| 128 | 77.5 | 193.1 |
| 512 | 219.0 | 573.2 |
| 1024 | 373.0 | 1008.3 |

Warmup CPU, module imports, layout/paint/GPU and physical presentation are outside
these totals. RAF intervals are separate preceding intervals; do not attribute
them to the following sample's structural flag. The observed median RAF interval
changes from roughly 16.7 ms at the smaller sizes to 8.3 ms at 1024 for both arms;
this is a scheduling limitation, not a presentation or independent-device result.

## Separate allocation and heap profiles

One fresh untimed profile per arm/size sampled JS allocations at 32 KiB intervals,
including module import, initialization, warmup, measured work, correctness checks
and teardown. Both major- and minor-GC collected objects are included. The numbers
are sampled estimates, not exact allocation totals or pure update costs.

| Rows | React sampled allocation-tree bytes (MB, decimal) | Native sampled allocation-tree bytes (MB) | React post-GC JS heap (MB) | Native post-GC JS heap (MB) |
| ---: | ---: | ---: | ---: | ---: |
| 128 | 48.15 | 169.45 | 2.343 | 2.366 |
| 512 | 162.69 | 557.80 | 2.297 | 2.413 |
| 1024 | 317.82 | 1056.32 | 2.337 | 2.439 |

Native sampled allocations are roughly 3.3–3.5 times React's on these six pages;
post-GC JS heap is similar. This makes transient allocation a useful diagnostic
lead. It does not establish the responsible subsystem or prove absence of leaks:
there is one profile per arm/size, no mounted-only heap reading, and native DOM/GPU
memory is excluded. Minified function labels are insufficient for causal
attribution. Sampling overhead never enters the latency records.

## Conclusion and next decision

The current compiler/runtime does **not** establish the intended real-time speed
advantage on this workload. Avoiding component re-execution is insufficient when
state publication and binding dispatch have greater total cost. The VDOM, ECS,
DAG, async store and adapter mechanisms are not disproved by these results; their
performance claims remain workload-specific and unproved for this product case.

Withhold dynamic-realtime superiority claims. Retain prior fixed-topology evidence
with its original scope; do not substitute it for this failed compiled product
gate. Next is a bounded attribution of the hot state-write/binding/structural
paths on the same archived artifact, then an explicitly justified implementation
change and new named confirmation if warranted. Do not start another storage,
worker or Wasm family on the strength of allocation counts alone. Independent
hardware and human maintenance gates remain open; Sol's full verdict remains held.

## Auditable artifacts

- Frozen [protocol](./product-mixed-v2-protocol.md) and [preregistration](./results/product-mixed-v2-preregistration.json).
- [Thirty-page manifest](./results/product-mixed-v2-manifest.json) and [raw records](./results/product-mixed-v2/).
- [Recomputed summary](./results/product-mixed-v2-summary.json) and [SVG chart](./results/product-mixed-v2-summary.svg).
- [Six separate memory profiles](./results/product-mixed-v2-memory/results.json), including their own pre-profile lock and raw CDP trees.
- [Independent verifier](./scripts/verify_product_mixed_v2_evidence.mjs) recomputes paired ratios and lifecycle totals and checks record hashes.
- Source/build archive: [verified baseline](./implementation/2026-10-12-namespace-three/status.json). Collector validates all live source/build hashes before and after collection; analysis validates every archive member against the frozen lock.

The protocol's zero-collected header records its pre-collection state and is
intentionally unchanged. This results report supplies the current collection
status. The original research notebook and prior archives remain unchanged.
