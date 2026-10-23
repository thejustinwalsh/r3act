# Audited execution refactor boundary

The integrated production refactor passes its correctness, installed delivery, HMR and predeclared non-regression boundary. It does not establish realtime parity with React Compiler or completion of the full master plan. Two Sol-medium agents implemented the bounded Store/target/dependency work; the primary integrated and independently reviewed it; Luna ran consolidated verification and the one timing episode.

## Production change and retirement

Root retains immutable Store execution geometry with private per-candidate buffers; unchanged groups survive unrelated topology/order changes. Existing mounted key buckets retain member/owner lookup, and mounted nodes retain target geometry. Code/owner/target invalidation uses existing authorities. Successful application installs plans; discarded preparation cannot poison accepted bindings. Task retry invalidation derives actual input changes from frozen cuts.

The old request append/seal/consume builder, schedule append/seal construction path, per-frame stable bucket rebuilding and duplicate transition-side input diff are retired. The draft per-frame recipe-binding registry was rejected and removed. Required live checks, generic fallback, history, acknowledgement and failure quarantine remain. [Detailed retirement and original requirement matrix](retirement-review.md). Maintained code: production +669/−255, tests/helpers +422/−112; generated evidence/dependencies are excluded. This slice is a net code addition, not a net reduction.

## Correctness and delivery

[Repair-v4 receipt](verification/repair-v4/receipt.json) passes all70 affected steps: full Deno1306 tests; native tooling;62 actual compiled fixtures plus collection GC; host/GC; fresh package build and consumer. Unchanged Rust108 tests/compiler/artifact/plugin prerequisites are carried explicitly by input hashes from the preserved earlier boundary. Initial gate and repair failures remain intact.

[Installed proof](proof-canvas-v3/canvas-proof-one-shot.json) passes native, React, React frame-hook, imperative and immutable prechange arms plus minified/rebundled native delivery. Output/pixel/snapshot/resource/CSP checks remain in the harness. [HMR](proof-hmr-v2/attempt-receipt.json) passes exact-source native revision invalidation/reload over owned Portless HTTPS. Route, listeners and private TLS are removed and source restored exactly. The upstream [Portless skill](https://github.com/vercel-labs/portless/blob/main/skills/portless/SKILL.md) was loaded and preserved with its hash in source-basis; no machine-wide server configuration changed.

The first browser launches aborted before creating contexts; failures remain in offline-v2/HMR-v1 receipts. Fresh runs used native process permission with byte-identical built assets, without changing workload or weakening checks. No timing ran in those failed attempts.

## One matched performance comparison

[Raw20-context episode](proof-canvas-v3/canvas-timing-one-shot.json), [frozen analysis](proof-canvas-v3/canvas-timing-analysis.json), [independent primary recomputation](primary-verification.json). Eight alternating prechange/candidate pairs and four distributed React controls;12 warmups and60 measured frames/context; identical authored256-mesh scene and production-minified dependencies. No builds/tests/source work overlaps timing. No repeat.

Values below are medians across context-level statistics, in milliseconds:

| Interval/statistic | Prechange | Candidate | React |
| --- | ---: | ---: | ---: |
| Store update median |2.40|2.40|0.60|
| Store update p90 |2.70|2.70|0.70|
| Update through draw median |4.90|4.80|2.75|
| Update through draw p90 |5.30|5.10|2.95|

All four upper one-sided95% paired-context bootstrap bounds fall within the predeclared tolerance: larger of5% baseline latency and0.10ms observed timer quantum. Bounds are0.00/0.00/+0.05/−0.05ms against0.120/0.135/0.245/0.265ms tolerances. Independent Python recomputation matches all paired differences and bounds using the fixed100000-draw RNG protocol. These are per-metric bounds on one device, not simultaneous-family coverage or universal non-regression guarantees. Raw p95/max and every sample remain preserved. Through-draw includes draw inspection/readback and does not measure physical presentation.

No median publication speedup is established. Candidate per-context publish median2.30–2.45ms and p902.50–2.80ms remain slower than React. Some tails/through-draw improve in this observation; do not attribute those differences causally to a particular helper.

All20 contexts and browser closed, with no recorded request/page/console/cleanup errors. All24865 before/after source/asset observations match, and28 maintained frozen source files match after HMR/timing.

## Remaining work

The original B2 mount-lifetime execution/repair gap is substantially closed on reviewed supported routes. Broader helper/dynamic-key/component-tree dependency discovery and general same-root whole-tree/cache merging remain unfinished; whole-root guards remain. This boundary does not select another speculative physical layout or helper benchmark loop. Realtime parity, cold/retained-memory/lifecycle cost, full host conformance, portability and independent-device/human evidence remain master-plan obligations. The full master plan remains unachieved; the audited refactor objective is closed by [completion audit](completion-audit.md). Changes remain uncommitted; no PR or publication occurred.
