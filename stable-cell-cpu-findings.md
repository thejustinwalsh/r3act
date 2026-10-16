# Current stable-cell CPU attribution

## Evidence

One fixed React/native 1,024-row pair passes all harness checks and teardown checks. Independent verification validates 989 source checkpoint members, 68 prior timing archive members, five production assets and 1,061 pre/post input locks, and recomputes weighted profile summaries and exact UTF-16 source excerpts. The underlying timing confirmation remains FAIL.

Whole-page sampled arm-bundle self time is 319.973 ms for React and 598.039 ms for the candidate. These are not per-frame latency measurements or a causal estimate of any optimization. The capture includes imports, mount, warmup, measured ordinary/structural work, inspection and disposal. Native harness sampled self time is 371.824 ms. Sampled JavaScript callers may carry work performed by browser bindings.

| Candidate sampled context | Compiled location (zero based) | Sampled self ms |
| --- | --- | ---: |
| Prepared DOM style writer closure | 0:45078 | 102.103 |
| World captured-version acknowledgement | 0:38266 | 61.214 |
| Root lane cut (`#Ke`) | 0:152273 | 54.296 |
| Published candidate dispatch forwarding | 0:33956 | 41.229 |
| VDOM prepared cell execution (`#le`) | 0:77091 | 40.834 |
| World journal delete | 0:21281 | 30.234 |
| Root native capture/commit (`#qe`) | 0:153162 | 25.466 |
| World lane-address validation (`#g`) | 0:24518 | 21.991 |
| World journal mark | 0:20988 | 14.365 |
| Cached-token currentness query | 0:69268 | 3.017 |

These labels are grounded in the preserved production-source excerpts and current source inspection. Minified function names alone are not semantic proof. Coordinates identify the locked native arm asset, not unminified source line numbers.

## Implementation decision

Removing the duplicated token query is a small simplification; its sampled cost is approximately 0.5% of the native arm bundle. It is not a sufficient standalone recovery plan.

The next bounded candidate targets reusable journal membership and identity-based acknowledgement. Existing journal nodes are already reused, but dispatch and acknowledgement repeatedly locate their owner/site through maps. Prepare a stable, payload-free membership capability and cache it on the committed cell. Direct mark/unlink must preserve owner-major/site order, synchronous notifications, version-cut acknowledgement, newer reentrant writes, private preparation isolation, destruction and retained-token cleanup. Keep the compatibility methods. The lifecycle identity audit permits removing redundant owner/state-map lookups in exact-handle acknowledgement while retaining identity/owner/site matching and the current version rule.

The duplicated-token patch will be reviewed separately. Primary review caught an intermediate patch that returned null directly through the host-commit wrapper, which would have incremented publicationVersion before fallback. That patch was never applied; revised code must translate each declined attempt to false and test repeated decline explicitly.

Neither candidate is a speed claim. Authored TSX, lifecycle tests and the unchanged matched performance gate remain required. The SVG and raw profiles are in results/product-mixed-stable-cells-cpu-analysis and results/product-mixed-stable-cells-cpu respectively.
