# Native frame publication boundary

The public frame-controller slice passes correctness, installed delivery and actual workbench HMR. Its sole descriptive comparison loses all four parity metrics to React Compiler/R3F. Concurrent read-only Git inventory limits timing qualification further. The full master-plan goal remains active and unachieved.

## Delivered behavior

`createNativeFrameLoop` owns RAF scheduling and uses the existing NativeRootWorkQueue to publish explicit root/Store groups before drawing. It replaces workbench-owned RAF/update/flush and hidden-marker readiness. Independent DOM roots retain their cadence. Delayed completion is checked against existing accepted root versions and reprepared without rerunning update when another publication intervenes. Stop, retirement and disposal release owned callbacks and queued work; failed publications remain latched against replay. Caller roots, Stores, renderers and resources remain caller-owned.

Grouped closed Store continuation now handles both compact frames and authenticated legacy scalar props. Strict all-member admission remains before the first write; later members can finish the captured cut after a newer same-identity action while preserving that action for later acceptance. Writer/target/owner/code/lifetime checks, full public prepared and final validation, exact acknowledgement, per-root history and quarantine remain. Generic structural, opaque and resource routes keep conservative checks. No new identity/version/publication registry or eager whole-tree copy is introduced.

Explicit subset publication also reconciles the existing root notification acknowledgement from canonical accepted reader receipts after publication. It clears dirtiness only when every live subscribed reader is current and membership/generation remain stable. Newer, unknown or blocked readers keep work pending. The actual workbench advances clock frames without rerendering its opaque SceneRoot, while real Studio updates still progress. See [design](design.md), [source review](source-review.md), [continuation repair](repair-group-continuation.md) and [notification repair](repair-notification-ack.md).

## Verification and preserved failures

The final [Darwin-v7 consolidated gate](verification/darwin-v7/receipt.json) passes 80/80 phases, 1,308 Deno tests, 107 Rust tests, 60 actual Rust/OXC compiled fixtures, tooling, packages and installed consumers. Primary independently validated all 2,320 archived source/context files and the matching before/after audit. [Primary review](verification/darwin-v7-primary-review.json).

Earlier v1–v6 gates remain preserved. They exposed driver typing/replay problems, unreachable frame-only continuation, missing legacy continuation, fixture metadata/Proxy construction and storage/quarantine assumptions, and a fork-overwritten setter that had failed to prove an intended local intervention. The repaired fixture checks the selected child's actual value. V3 also contains a post-lock result-freezing edit; its source mismatch disqualifies that run. Public/deferred target validation was restored rather than inheriting the internal immediate shortcut. No failed source snapshot is presented as final qualification.

Fresh [installed proof v3](proof-canvas-v3/canvas-proof-one-shot.json) passes six headless contexts: baseline Native, React Compiler/R3F, useFrame, imperative, minified Native and rebundled Native. All 72-frame value/pixel sequences and retained identities match. Each context disposes 512 resources once; all 12,440 source checks match before/after and the browser closes cleanly. Native group/draw counters and accepted root versions advance per frame; saved epoch72 snapshots remain unchanged after epoch73. Flush-only teardown counters are not a per-frame batch/sweep proof for the public queue route. Strict CSP eval blocking is directly tested for minified/rebundled delivery, not baseline. [Primary review](verification/canvas-proof-v3-primary-review.json).

The first browser attempt aborted before any page/workload, with SIGABRT and a denied cleanup signal. It remains preserved; a fresh bounded native-permission proof passed. The exact launch cause is unproven. Preparation/proof v2 passed for the preceding source; fresh v3 qualifies the final notification repair.

Actual [Portless HTTPS HMR v2](proof-hmr-v2/attempt-receipt.json) passes controls, pause/reset/resume, reduced motion, keyed edits, source revision invalidation, full reload/new realm/remount and resource disposal. Clock-only updates preserve scene and actor body counts. Exact workbench restoration and owned route/listener/process/private-TLS cleanup pass. HMR v1's pre-edit scene-rerender failure remains preserved and motivated the notification repair. No granular state-preserving HMR claim. [Primary review](verification/hmr-v2-primary-review.json).

## One descriptive comparison

The [sole episode](proof-canvas-v3/canvas-timing-one-shot.json) runs Native, declarative React Compiler/R3F, useFrame and imperative in fixed order, 12 warmups/60 measured frames, null diagnostics. Values/pixels match, each context disposes 512 resources exactly once, all source checks match and cleanup passes. Primary independently recomputes medians, nearest-rank p95 and full tails. No repeat occurred.

| Median / p95, ms | Native | React Compiler/R3F | R3F useFrame | Imperative |
| --- | ---: | ---: | ---: | ---: |
| Update | 4.10 / 4.80 | 1.10 / 1.60 | 3.50 / 3.90 | 0.10 / 0.30 |
| Through common draw/readback | 6.60 / 7.80 | 4.80 / 5.80 | 6.40 / 7.20 | 4.60 / 6.60 |

Native is slower on all four parity metrics; its maxima are 5.50ms update and 9.00ms through draw. During this run the primary executed read-only Git diff/status and file inventory for about10.2seconds. The magnitude of interference is unknown: this is not quiet-machine qualification, and no favorable rerun is substituted. Raw tails and the concurrency note remain in [primary recomputation](verification/canvas-timing-v3-primary-review.json).

Native now includes explicit Store-group publication; React uses external Store dispatch through declarative commit. Frame hooks and imperative updates have different obligations. Through draw includes shared WebGL render/readback and inspection, not physical presentation. Setup intervals are incomparable. Fixed order, dependent samples and one device constrain inference. There is no causal before/after, phase/GC, comparable cold/retained-memory, independent-device or smoother-presentation claim. Historical narrow wins and dense loss retain their original source scope; changed source inherits none of their timings.

## Remaining scope

The frame capability is delivered, but performance parity and the master-plan finish line are not. Do not start another compiler/kernel/cache/container/writer rescue series from this result. Structural and async UX qualification, host/package adoption, lifecycle/cold/retained-memory costs, independent-device evidence and honest maintenance limits remain obligations of the full plan. Zero human participants establish no maintainability advantage. Arbitrary host rollback and cross-renderer visual atomicity remain unestablished.
