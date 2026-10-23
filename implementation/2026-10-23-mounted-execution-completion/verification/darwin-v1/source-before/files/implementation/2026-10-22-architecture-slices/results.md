# Slice 1 cleanup: correctness passes; realtime parity remains unmet

Retired execution schemas1/2, the scalar-kernel proof/capture adapter, duplicate raw Store preparation and the production raw projection wrapper. Current execution schema3 with optional verified batch kernels and interpreted fallback remains; host schemas1–7 are separate current compiler output. Root uses sealed bound schedules with existing generic/nonpassive fallback. The publication queue now exposes `enqueueTransaction` for cells/collections/resources instead of three redundant methods; `enqueueStores` retains its distinct continuation behavior. Removed unused candidate publication argument and duplicate resource-lease coverage. Static native task declarations are snapshotted once per queued operation, with fresh input-generation resources/cancellation/results. Deleted the standalone synchronous TaskGraph prototype and sole runners; historical outputs/source archives remain. [Plan and dependencies](plan.md), [source review](source-review.json).

The first consolidated Darwin arm64 gate preserves FAIL80/81 after185.03s:1,277Deno pass/one failure. A mixed batch/interpreted fixture still requested retired execution schema1. Correcting only that fixture to schema3 without a batch kernel passes all1,278Deno tests. Product/compiler/package inputs remain unchanged. Rust107, all62actualcompiled fixtures, package build and installed consumer passed originally and were not repeated. Source-before/after MATCH across2,461runner inputs; primary independently verifies all2,471archived files, including10context files. [Original failure](verification/darwin-v1/receipt.json), [archive review](verification/primary-v1-review.json), [Deno repair](verification/darwin-repair-v2-supervisor.json).

Fresh installed minified-production proof passes six headless contexts,72matched value/pixel frames each,512exact disposals/context, saved snapshot epoch72/73 and12,440source checks at each boundary. Native and React controls compile. Both Native delivery variants pass CSP checks. Actual Portless HTTPS HMR passes in19.89s, including exact source restoration, invalidation/fullreload/remount and owned route/process/listener/TLS cleanup. Primary recomputes output equivalence and rehashes24,880source rows; its first offline checker incorrectly expected a Native-only cleanup field in every comparator and was corrected without repeating a browser workload. [Installed proof](proof-canvas-v1/canvas-proof-one-shot.json), [review](verification/primary-correctness-review.json), [HMR](proof-hmr-v1/attempt-receipt.json).

## One bounded matched comparison

The sole18.42s minified-production ABBA/BAAB episode uses12warmups/60measured frames per fresh context, diagnostics off and all implementation agents idle. No other source/Git/build/test work overlaps timing. Median+p90 are primary; p95/max and every sample remain secondary. No favorable rerun.

| Run | Arm | Update median / p90 ms | Through draw median / p90 ms |
| --- | --- | ---: | ---: |
| 1 | Native | 5.35 / 7.20 | 8.85 / 10.80 |
| 2 | React | 0.60 / 0.70 | 2.90 / 3.30 |
| 3 | React | 0.60 / 0.70 | 2.80 / 3.00 |
| 4 | Native | 2.70 / 3.00 | 5.20 / 5.50 |
| 5 | React | 0.60 / 0.70 | 2.80 / 3.00 |
| 6 | Native | 2.70 / 2.90 | 5.20 / 5.40 |
| 7 | Native | 2.60 / 2.90 | 4.95 / 5.20 |
| 8 | React | 0.60 / 0.70 | 2.70 / 3.00 |

Median of four adjacent Native/React ratios is4.50×update median/4.21×p90 and1.86×throughdraw median/1.82×p90: descriptive parity FAIL. First Native context is materially slower; no thermal/JIT/GC/timer cause is established. Available pmset pressure records are not measured frequency/temperature and cannot rule out throttling. Primary independently recomputes quantiles, pairs and timestamp formulas. [Raw receipt](proof-canvas-v1/canvas-timing-one-shot.json), [analysis](verification/timing-analysis.json), [primary recomputation](verification/primary-timing-review.json).

All8contexts match outputs/pixels, dispose512resources once and close without errors; all12,440source rows match before/after. Cleanup alone carries no speed claim. Keep the reduced architecture and proceed to the already authorized integrated realtime slice; do not revert isolated helpers or start another diagnostic campaign. No causal historical speedup, smooth presentation, cold/retained-memory, second-device or maintenance-advantage claim. The full first-pass goal remains active and unachieved.
