# Mounted frame execution: implemented and verified

The integrated wave improves the unchanged dense realtime interaction, while remaining slower than contemporaneous React Compiler. It completes the [Astra wave contract](../2026-10-23-astra-realtime-next-wave/orchestration.md); the full product finish line remains open. Source remains uncommitted over `e02135abf96cf9ce451321a08531507adc4d9af0`.

## One matched production episode

| Interval/statistic | Actual prechange | Candidate | React Compiler |
| --- | ---: | ---: | ---: |
| Publication median |2.30ms|1.90ms|0.60ms|
| Publication p90 |2.50ms|2.10ms|0.70ms|
| Update through draw median |4.70ms|4.30ms|2.70ms|
| Update through draw p90 |5.00ms|4.60ms|2.90ms|

These are medians across context-level statistics, not pooled frames. Publication median improves about17%; candidate remains3.17× React at median and3.00× at p90. Parity is not met. Prechange is the preserved verified dirty source/tarballs before this wave, not Git HEAD or a historical11ms recording.

The sole fixed20-context episode alternates eight prechange/candidate pairs with four distributed React controls,12 warmups/60 measured updates per context. All use installed production/minified packages, the same authored256-mesh scene and dependencies. React Compiler compiles the actual React functions. Proof counters/profiling are disabled in timing. No source/build/test/Git or other agent work overlaps; no timing retry occurred.

Fixed100000-block bootstrap with xorshift32 seed `0x52334143` gives paired median change5th/95th percentiles: publication median−0.425..−0.400ms; publication p90−0.550..−0.400ms; through-draw median−0.500..−0.375ms; through-draw p90−0.550..−0.400ms. All four original non-regression bounds pass at the unchanged5%-or-one-quantum margin; observed quantum0.1ms. Eight context pairs on one device give no universal speed or simultaneous-family coverage. Four React controls are not eight independently paired comparators. Raw p95/max and every frame remain preserved.

[Raw timing](proof-canvas-v3/canvas-timing-one-shot.json), [fixed analysis](proof-canvas-v3/performance-analysis.json), [independent primary Python recomputation](proof-canvas-v3/primary-verification.json), [authorization](proof-canvas-v3/canvas-timing-authorization.json). Primary independently reproduces point estimates/bootstrap bounds, endpoint arithmetic, timer quantum and margins. All72 source hashes and24865 before/after source/asset observations match;20 contexts/browser close without recorded errors. Thermal-warning observations do not prove absence of throttling. Draw includes WebGL render/readback, not physical presentation.

## Production migration and limits

Root keeps one bounded mounted composition and selects consumers once with fresh cache bases. Store/World reuse mounted Store/path/reader partitions and produce one authentic candidate-private cut. VDOM consumes it through existing prepared records/publisher using retained geometry and private accepted child lists. Generic parsing remains for actual generic callers; schema1 generic owned-data continuation remains supported.

[Retirement/invariant map](retirement.md), [shared interfaces](interfaces.md), [final freeze](source-review-v6.json). Removed mechanisms include PassiveRow/output-row/region transport, owned per-owner generic staging maps, duplicate immediate eligibility discovery, warm request/binding reconstruction, per-cut reader-source/regrouping maps, owned descriptor parsing and copied target geometry. There is one identity/history/publication model and publisher. Fresh captures/pages, immutable accepted outputs/VNodes/cache identities, coverage/mixed-cell bookkeeping and required live/writer checks remain. This is not zero allocation.

The workbench repair binds actual mounted accepted child VNodes after host copy normalization instead of equating them with older parent descriptions. Cold/warm child links, membership, per-write/final sweeps and quarantine remain. Exact acknowledgements, newer actions, fork histories, discard and immutable old snapshots remain covered; arbitrary setter rollback/cross-renderer visual atomicity are not claimed.

[Actual prechange-to-final production accounting](production-source-accounting.json):1106 added/617 deleted maintained production lines across six files, excluding tests, evidence, generated output and dependencies. Old paths are removed, but this is a net addition. [Package archive sizes](package-size-comparison.json) do not qualify cold/setup or memory costs.

## Correctness and delivery

[Final affected gate](verification/repair-v6/receipt.json) passes1312 frozen Deno tests, native tooling, six affected compiler fixtures and fresh package build/consumer. Its carry manifest binds unchanged Rust108, compiler identity/artifact/plugins, remaining compiler fixtures and three separate GC checks. Across the boundary all63 actual compiled fixtures pass; collection GC is separate. The mounted-scalar fixture also checks removed-object collection while Root remains alive.

[Fresh installed dense proof](proof-canvas-v3/canvas-proof-one-shot.json) passes native/React/React-frame/imperative/prechange and native minified/rebundled delivery, including values/pixels/identity/snapshots/disposal/CSP. [Installed game proof](proof-canvas-v3/game-companion/browser-proof.json) passes1024 owners, sparse controls,12 shared-clock frames,3 structural edits, independent HUD cadence, one explicit coherent DOM/Three frame,2054 exact resource disposals and1027 balanced activations/retirements. Old snapshots remain immutable and WebGL output is nonempty. This companion is untimed; no game-speed claim follows.

[Actual workbench/HMR](proof-hmr-v2/attempt-receipt.json) passes continuous frames, structural/resource controls, native revision invalidation/full reload and exact source restoration over owned Portless HTTPS. Route/listeners/private TLS are removed; owned server/browser resources are closed. The [Portless skill](source-basis/portless-SKILL.md) and provenance are preserved. No VM or OS/architecture matrix ran.

## Preserved failures and remaining work

Native v1 fails cleanup typing, removed-object retention and old counters. V2 exposes generic continuation classification, discarded binding references and further stale counters. V3 compiler fixtures pass but readonly cleanup typing blocks Deno/packages; repair-v4 fixes that and passes. All receipts remain under verification. The companion's first installed attempt exposes TypeScript assertion narrowing and remains under proof-canvas-v2/game-companion; its named successor preserves it.

Workbench proof-hmr-v1 exposes accepted-child identity failure before HMR edit. Diagnostic-hmr-v1 fails on a wrong Cargo home before browser launch; corrected diagnostic-hmr-v2 locates VDOM3929 through transform-only console markers without production edits. The demonstrated repair and structured-copy regression pass final gates/workbench/installed proofs. Diagnostics remain outside production and are not performance evidence. Value/lifetime/group assertions were not relaxed; timing was not retried.

This wave's speed claim closes at the measured result. No automatic helper rollback, new layout/backend experiment or timing retry is selected. Full-product realtime parity, cold/startup/retained-memory costs, automatic dependency discovery, safe general same-root delta merging, independent-device/OS conformance and human maintenance evidence remain open. Historic narrow wins and qualified losses keep their original source/workload scope.
