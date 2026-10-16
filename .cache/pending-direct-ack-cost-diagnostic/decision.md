# Direct pending-key acknowledgement: withhold default integration

The staged Root integration passes 703 runtime tests after the race-injection hook is migrated to the new capture API. That establishes staged correctness, not a speed advantage. The Node queue diagnostic preserves 120 matched pairs, 240 arm records and all 96 measured samples per arm. Independent verification recomputes paired arm medians and geometric mean keyed/baseline ratios.

| Case | Queue size | Density | Warm paired B/A | Cold paired B/A |
|---|---:|---|---:|---:|
| accepted | 128 | sparse-1pct | 1.057 | 2.124 |
| legacy-decline | 128 | sparse-1pct | 1.054 | 1.273 |
| accepted | 128 | dense-100pct | 1.010 | 1.570 |
| legacy-decline | 128 | dense-100pct | 1.130 | 1.610 |
| accepted | 1024 | sparse-1pct | 1.037 | 1.663 |
| legacy-decline | 1024 | sparse-1pct | 1.116 | 2.035 |
| accepted | 1024 | dense-100pct | 0.934 | 1.322 |
| legacy-decline | 1024 | dense-100pct | 1.115 | 1.822 |
| accepted | 10000 | sparse-1pct | 1.051 | 1.658 |
| legacy-decline | 10000 | sparse-1pct | 1.139 | 1.906 |
| accepted | 10000 | dense-100pct | 0.824 | 1.361 |
| legacy-decline | 10000 | dense-100pct | 1.093 | 1.602 |

B is keyed capture/acknowledgement. Values below 1 favor B. The independent paired analysis uses an averaged median for even 96-sample sets; the collector separately verifies its nearest-rank pooled descriptive summaries. Frames are nested observations, not independent replications. Nanosecond timer units do not establish nanosecond accuracy, especially for very short sparse batches.

Dense accepted cuts at larger sizes show a queue-level benefit. Sparse accepted cuts, cold setup and legacy declines add cost. The new capability allocation, buffer stores, private-brand checks and cleanup do not produce a uniform improvement. This diagnostic uses simplified queue handles on Node, includes common assertions, and has no World, DOM, Three or browser commit work. It cannot support an integrated React or Root speed claim.

## Decision

Keep the current live queue path. Do not fold this patch into every Root update. Preserve the staged implementation as a possible specialized strategy if a future compiler/kernel workload justifies it. Prioritize a homogeneous compiler-emitted primitive update kernel that can remove repeated dynamic projection dispatch across a whole cut, while preserving ordering and publication guarantees. The measured live fusion speed gate remains FAIL; the goal remains active.
