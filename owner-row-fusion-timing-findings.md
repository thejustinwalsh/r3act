# Owner-row executor fusion: qualified timing result

The fixed study passes all 30 correctness pages and 7,200 measured frames, with no exclusions or replacements. Independent recomputation verifies the frozen source archive, input locks and clock rules. The speed gate fails at every size.

| Rows | Paired median native/React | Median paired p95 native/React |
|---:|---:|---:|
| 128 | 1.2525 | 1.1385 |
| 512 | 1.3897 | 1.4070 |
| 1024 | 1.3833 | 1.4983 |

Ratios above 1 favor React. This candidate is about 25–39% slower in paired median commit work. The registered target remains at most 0.80 at two sizes and p95 at most 1.10 at every size. At 1,024 rows, descriptive page-median summaries are 1.715 ms native and 1.260 ms React; structural medians are 5.790 and 1.845 ms, and mount medians are 49.610 and 15.640 ms. These descriptive aggregates differ from paired gate estimators.

The result does not establish a causal change relative to the prior checkpoint: this is a separate study on the current candidate. Commit CPU excludes browser layout/paint/presentation. Raw records retain check outcomes rather than per-frame DOM snapshots; independent verification checks the locked harness and contract that produced those outcomes. One device supplies this evidence. Allocation and human-maintenance claims remain unproven.

## Preserved tooling repairs

The preregistered analyzer failed before output because metadata hashing called an undefined helper. Versioned analyzer V3 fixes that helper, identifies its actual source hash, preserves the failure log, and analyzes the same raw records and estimators. The adapted V2 independent verifier then expected an HTTP-status field absent from the collector’s served-byte metadata. Versioned V3 verifier checks the recorded hashes and headers; the locked collector checks HTTP200 before recording them. All original tools and failed logs remain unchanged. No pages were rerun, omitted or changed.

## Implementation decision

Loop fusion is correct but insufficient to meet the product performance target. Review a smaller scheduling patch using the existing pending queue to remove repeated acknowledgment lookups, retaining exact World liveness/version checks and coherent publication. Its savings remain unmeasured. Preserve the compiler/VDOM/ECS/async/host direction, but make no claim that this runtime currently beats React Compiler. The goal and Sol maintenance-review hold remain active.
