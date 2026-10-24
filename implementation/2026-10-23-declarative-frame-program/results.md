# Declarative frame execution boundary

The frame architecture is integrated and verified within its documented subset. Authored `useFrame` clock reads and bounded callback state updates feed retained numeric computations and prop writes through existing Store/World/Root/VDOM publication. Frame callbacks retain mount lifetime and dependency order; scalar ticks avoid component execution. Structural and opaque work retains generic reconciliation.

This is a new capability, not full product completion or React CPU parity. The synchronous performance non-regression result is **inconclusive**. No timing episode was repeated.

## Verification and retirement

[V9 correctness](verification-v9/receipt.json) passes frozen Deno1333 tests (one ignored), tooling, fresh five-package build/consumer and all75 actual compiler/Vite fixtures. Rust118 tests and compiler build carry from V8 with unchanged Rust sources/artifact. Exact compiled tests cover mixed structure, clock/local state, callback-only state beside a clock, one accepted publication per tick, revision retirement and conservative fallback.

Fresh [CPU delivery](proof-canvas-v5/canvas-proof-one-shot.json), [four-arm RAF delivery](proof-raf-v6/browser-proof.json) and [Portless HMR](proof-hmr-v4/attempt-receipt.json) pass. Native and consumer-rebundled RAF each execute72 direct cuts,72 batches and18,504 verified rows with zero component executions. Callback state remains actual once-per-tick logic. Each arm disposes512 resources once and empties its scene. HMR restores source and removes owned processes, route, listeners and TLS files. [Primary review](primary-final-audit.json) independently checks873 frozen sources, raw timing endpoints and lifecycle receipts.

The [retirement table](retirement.md) records removed warm VNode construction, unconditional cache cloning, unused declarative queue allocation, duplicate compiler bindings and the full-candidate fallback for eligible clock/state-only siblings. Retained mounted images and existing publication authority replace those mechanisms. Defensive live checks and real coordination fallbacks remain. [Maintained accounting](production-source-accounting.json) separates Rust test sections: production1,790 added/320 deleted; tests1,565 added/38 deleted. Generated evidence and dependencies are excluded. This remains a net addition.

## One matched synchronous CPU episode

Twenty balanced fresh contexts compare the committed prechange4d8b80a build, current source and React Compiler. Each has12 warmup and60 measured updates; timings include synchronous acceptance, and through-draw includes render/readback. Median and p90 are context-summary medians, in milliseconds.

| Endpoint | Prechange median/p90 | Current median/p90 | React median/p90 |
| --- | --- | --- | --- |
| Publication | 1.90 / 2.10 | 1.95 / 2.20 | 0.60 / 0.70 |
| Through draw/readback | 4.30 / 4.60 | 4.30 / 4.60 | 2.80 / 3.10 |

The fixed paired-context bootstrap finds three of four declared bounds within margin. Publication p90 is inconclusive: upper one-sided95% change bound0.15ms exceeds tolerance0.105ms. This does not establish either acceptable non-regression or a definite regression. [Raw data](proof-canvas-v5/canvas-timing-one-shot.json) and [unchanged analyzer](proof-canvas-v5/performance-analysis.json) preserve all blocks, including the slower first pair, p95/max and thermal observations. No source was reverted to chase this result.

## One natural RAF episode

Twelve balanced fresh contexts compare native declarative props, React Compiler declarative props through a minimal external Store without `flushSync`, and R3F10.0.0-alpha.6 frame/ref callbacks. Four contexts per arm contain12 warmup and60 measured frames. All use a shared application RAF and explicit draw. This does not measure default autonomous R3F scheduling. Timing is uninstrumented; the additional callback-state probe runs only in untimed delivery proof.

| Arm | Submission median/p90 ms | Through draw median/p90 ms | Fresh draws |
| --- | --- | --- | --- |
| r3act declarative props | 1.40 / 1.60 | 1.80 / 2.00 | 240/240 |
| React declarative props | 0.05 / 0.10 | 0.50 / 0.60 | 0/240 |
| R3F frame/ref callbacks | 2.40 / 2.50 | 2.80 / 2.95 | 240/240 |

React's measured draws show the prior requested epoch; all240 measured requests are subsequently observed accepted, with acceptance latency0.90/1.00ms median/p90. Its submission-through-draw interval excludes later React commits and is not total React update CPU. Native and R3F frame/ref draws show the current epoch. Native has lower observed through-draw cost than this R3F callback/ref arm while keeping declarative props. That is a scoped realtime result, not universal superiority or a claim about all possible imperative implementations.

[Raw RAF data](proof-raf-v6/raf-timing-one-shot.json) and [analysis](proof-raf-v6/raf-analysis.json) preserve p95/max, acceptance events and freshness. No callback-through-draw exceeds16.667ms and no RAF gap exceeds25ms in this episode. Available thermal status reports no warnings; it is not temperature measurement. WebGL readback occurs at the end here, unlike the synchronous control's per-frame readback; do not compare1.80ms directly with4.30ms as a speedup. Marker epochs and readback do not prove physical presentation or visual atomicity.

## Failures and remaining scope

All prior verification/proof attempts remain preserved. They include compiler/test typing, optional-child admission, mixed candidates, static Three names, zero-argument metadata, a mistaken debug/release hash comparison, idle disposal and callback-only state admission. Passing output alone did not close the slice; the installed direct-cut oracle exposed and prompted repair of hidden full-candidate work.

Open work remains explicit in the [full inventory](design.md#tail-of-discussion-task-inventory): genuine canonical nonreentrant writer capability; coherent builtin clock/local-state cuts across multiple Roots; safe mergeable same-root deltas and broader dependency discovery; cold/setup/retained-memory costs; broader host/resource conformance; quick OS smoke and independent-device qualification; human maintenance evidence. Existing explicit multi-root Store groups and loader DAG remain supported. Full-tree candidates keep whole-root guards. No arbitrary host rollback, physical canvas/DOM atomicity, universal compatibility, maintenance advantage or inherited historical timing is claimed.
