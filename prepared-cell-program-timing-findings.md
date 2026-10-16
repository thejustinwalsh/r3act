# Prepared cell programs: matched product result

13 October 2026. Run `c4a2e815-0744-4c36-aeb2-b7f02869946b`, using the frozen prepared-cell archive `fe0e7491dc0c9f52891f5d90aa5407679876527e4ca007bf821298fabb6e0886`.

## Result

All 30 preregistered pages and 7,200 measured frames passed correctness. All 981 input locks, served asset checks and post-collection locks passed. All 15 pairs resolved under the five-clock-tick rule. The independently recomputed speed gate **fails at every size**.

| Rows | React page-median summary (ms) | Native page-median summary (ms) | Paired median geometric mean ratio | Median paired p95 ratio |
|---:|---:|---:|---:|---:|
| 128 | 0.175 | 0.265 | 1.534342 | 1.490909 |
| 512 | 0.580 | 0.945 | 1.624147 | 1.547297 |
| 1,024 | 1.110 | 1.960 | 1.762371 | 1.902256 |

Ratios are native/React; lower is faster. Targets remain median ratio ≤0.80 at two sizes and p95 ratio ≤1.10 at every size. Arm summaries are medians of page medians; the decision uses paired ratios. They are not interchangeable estimates.

Ordinary-frame medians still lose. Structural-frame page-median summaries are native/React 1.570/0.415 ms, 3.460/0.890 ms and 6.185/1.635 ms. Eight structural edits occur among 240 measured frames on every page. Both ordinary commit work and structural publication require further improvement.

This is synchronous application step time, including state dispatch and commit. Browser layout, paint and presentation are excluded. The comparison uses production React Compiler memoization and ordinary compiler-transformed native TSX with the same three state sites per row. It is one machine under the registered isolation environment. No universal superiority, independent-device, allocation or causal historical improvement claim follows.

## Verification repair

The first collector preflight failed before browser launch or preregistration because it named `source-and-build.tar.gz` instead of the candidate's `source-and-evidence.tar.gz`. The failure log is preserved. That filename was corrected before the one registered collection; no confirmatory page was repeated.

The original frozen independent verifier failed after collection because it counted binding calls across executable code and embedded JSON metadata (six instead of three). A new V2 verifier scopes the count to the executable prefix, preserves the original script and failure log, checks all original preregistered locks, and recomputes the same raw pages and gate. Its repair provenance and both verifier hashes are recorded in `verification.json`. Primary execution of V2 passed. No raw page, original analyzer, protocol, target or original verifier was changed.

## Design consequence

Preparing writer fanout and removing redundant membership lookups is insufficient to reach the performance target. The current candidate remains useful correctness evidence for that API and its invalidation model, but it does not establish the proposed fast runtime.

The next bounded investigation examines the engine layout of actual numeric cells. Activation changes their own `value` property from data to an accessor; an isolated Node/V8 diagnostic reproduced a transition from fast properties to dictionary properties for that source pattern. This is a hypothesis about a remaining structural cost, not browser evidence or a latency claim. Verify actual World cells in Chromium before deciding on a stable cell representation. Keep authoritative lane storage, candidate isolation, exact versions, promotion, coherent publication and adapter behavior intact.

The full implementation goal and its compatibility, device and comparative maintenance gates remain open. The Sol review remains held under its existing prerequisites.
