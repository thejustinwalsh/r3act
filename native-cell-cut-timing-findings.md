# Native cell-cut timing decision

13 October 2026. **Correctness passes; the registered speed gate fails.**

The one registered confirmation collected all 30 fresh headed pages and 7,200
measured frames, with five paired loads per size. Independent verification
recomputed the metrics and verdict. All pages passed the five correctness checks,
all source/build/input locks matched, both arms were cross-origin isolated, and
all paired timing ratios were resolved under the conservative five-tick rule.
No page was excluded, replaced or rerun.

| Rows | Paired geometric mean of median ratios | Median paired p95 ratio | React median, ms | Native median, ms |
| --- | ---: | ---: | ---: | ---: |
| 128 | 1.712897 | 1.518519 | 0.180 | 0.310 |
| 512 | 1.835690 | 2.344371 | 0.575 | 1.055 |
| 1,024 | 1.878854 | 2.449438 | 1.115 | 2.095 |

Ratios are native/React; lower is faster. Absolute times are the median of page
medians and are descriptive, rather than the paired decision statistic. The
fixed targets were at most 0.80 for median ratios at two sizes and at most 1.10
for p95 ratios at every size. Neither target passed at any size.

The baseline includes React Compiler row and board memoization. The native arm
uses real Rust/OXC-compiled TSX, retained keyed identity, executable numeric
programs and native cell cuts. This result therefore rejects a realtime
superiority claim for this integrated path even with those mechanisms present.
At the 1,024-row descriptive React time, reaching 0.80 would require about
0.892 ms native versus the observed 2.095 ms, approximately 57% less synchronous
work. That illustration is not a replacement acceptance rule.

## What the result does and does not explain

The separate allocation study found 18–28% lower sampled allocation totals and
the matched application resources are smaller. Fewer allocations and skipped
component executions did not translate into a faster integrated commit path.
This supports distinguishing allocation, artifact size and latency claims.

The clock environment was prospectively improved with equal COOP/COEP headers;
all five production resource hashes remained unchanged. These measurements must
not be pooled with the earlier unisolated V3 run or used as a causal estimate of
an individual optimization. Synchronous step timing includes React execution,
native dispatch/planning/projection/writes and structural work inside the step;
browser layout, paint and GPU presentation are outside its scope. This is one
machine and one workload, not an independent-device or general React verdict.

## Next bounded implementation

The current allocation ledger attributes recurring container work to World
dispatch and acknowledgement. `world-dirty-journal-design.md` specifies a small
candidate that preserves owner-major pending order while reusing dirty entries.
Implement and review that contract, including randomized parity, version cuts,
private preparation, reentry and destruction. It is a measured allocation-cost
candidate, not a prediction of the required 57% speed recovery.

Before claiming a speed gain or selecting a broader storage family, obtain
current CPU attribution and integrated evidence. Retained object cells, repeated
identity/liveness/version resolution and generic mixed-frame batching remain
possible costs. A journal alone must not be presented as a complete performance
solution. Maintain the original async/store/transition, compiler, host and
compatibility scope; independent-device and comparative human maintenance gates
remain open, and the full Sol review remains held.

## Evidence

- Protocol: `product-mixed-native-cell-cut-confirmation-protocol.md`.
- Raw registration, 30 records, manifests, postlock, summary and SVG:
  `results/product-mixed-native-cell-cut-confirmation/`.
- Independent verification log:
  `.cache/native-cell-cut-milestone/timing-confirmation-verification.log`.
- Candidate source/build archive SHA-256:
  `1687915fd6d6ba51d457a4265100e0c72eed5e2641af230257fd29185ec3ac45`.
- Separate allocation archive SHA-256:
  `b8ff4de1b91e4575bcde7d6844c4cb5bbf30c9d93b7020c7c8095f3c36bb555a`.

Archive this decision and the complete confirmation evidence before editing the
runtime. The overall implementation goal remains active.
