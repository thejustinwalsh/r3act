# Compiled Store batch boundary

Correctness, installed delivery and HMR pass. The sole realtime comparison fails parity on all four approved metrics. This integrated slice delivers same-thread batching over a captured Store frame; it is not a demonstrated speed solution. Full-plan first-pass work remains active.

## Delivered behavior

New compiler execution schema 3 emits one bounded batch kernel with Store-only expression trees hoisted before the row loop and owner-varying inputs in columns. Exact arithmetic grouping, signed zero and full prop indices remain. An authenticated candidate schedule replaces ordinary request-description adapters and selected per-owner mixed input gathering; the existing frame authority executes into final immutable row arrays instead of scalar scratch transfers. Distinct Store identities/readers and per-root accepted histories remain independent. Computation grouping preserves original host order. Existing identity, version, acknowledgement, resource and publication authorities remain; no second registry, worker or host writer is introduced.

Legacy scalar and interpreted paths remain available. Old accepted snapshots, newer reentrant actions, generic progress, forks, live code/owner/writer checks, complete admitted/final scans, per-write guards and failed-host quarantine remain. New grouping/columns/matrix headers, capabilities and finite proof impose costs that this episode does not attribute. See [design](design.md), [primary source review](source-review.md) and Astra's [exact orchestration](../2026-10-22-astra-current-speed-gap/orchestration-v2.md).

## Consolidated verification and preserved failures

The final [Darwin-v5 gate](verification/darwin-v5/receipt.json) passes 79/79 phases, 1,287 runtime tests, 107 Rust tests, all 59 actual compiled fixtures, tooling, packaging and installed consumers. Primary independently verifies all 2,259 source/context archive files and matching before/after source audit. [Primary review](verification/darwin-v5-primary-review.json).

All earlier gate failures remain. V1 exposed one emitted-text assertion, recursive-trie typing and a new fixture's strong trace retaining removed nodes. V2 exposed an incorrect whole-flush coherence assumption across independent Store candidates. V3 exposed confusion between attempted verified-metadata staging and actual batch execution counters. V4 passed; installed minified delivery then rejected valid lexical renames. The finite proof now accepts the exact emitted lexical loop/alias forms while rejecting shadowed input reads and unsafe var collisions, with adverse tests. No production publication semantics were weakened to fit a fixture.

Two preparation failures are also preserved: omitted inherited diagnostic provenance and an obsolete schema-2 build assertion. Current tooling retains original authored workload bytes, package pins and timing intervals, and requires actual schema-3 batch-only emission. Historical manifests remain untouched. The failed installed proof and source-based repair are in [delivery review](verification/canvas-proof-v3-primary-review.json) and [repair](repair-a-delivery.md).

Fresh [six-context installed proof](proof-canvas-v4/canvas-proof-one-shot.json) passes baseline/minified/rebundled CSP, actual React Compiler selection, values/pixels/identities, saved snapshots 72/73, exactly 512 disposals per context and no duplicates. Ordinary Native frames select three batch calls, 257 batch/direct-reader/direct-capture rows, zero scalar calls, one producer cut reuse, one full pre-write and one full final target scan. All 12,429 source checks match before and after, all contexts/browser close without errors. Rebundling consumes compiled minified JS with plugins disabled; runtime counters establish its actual batch selection. [Primary review](verification/canvas-proof-v4-primary-review.json).

Actual [Portless HTTPS HMR](proof-hmr-v1/attempt-receipt.json) passes controls/reset, running clock, revision invalidation, full reload/new realm/remount and old/final disposal. Exact source restoration and owned route/listener/process/private-TLS cleanup pass. This establishes no granular state-preserving HMR claim. [Primary review](verification/hmr-v1-primary-review.json).

## Sole matched comparison

The [single episode](proof-canvas-v4/canvas-timing-one-shot.json) uses unchanged four authored arms in fixed order, 12 warmup/60 measured frames, null diagnostic counters and no timed delivery variants. All 12,429 source checks match; each context disposes 512 resources once and closes cleanly. Timer quantum is approximately 0.1 ms. Primary independently recomputes medians and nearest-rank p95 from all raw samples; no repeat occurs.

| Median / p95, ms | Native | Declarative React Compiler/R3F | R3F useFrame | Imperative |
| --- | ---: | ---: | ---: | ---: |
| Update | 2.80 / 3.40 | 0.90 / 1.20 | 3.80 / 4.20 | 0.20 / 0.40 |
| Through common draw/readback | 5.70 / 6.60 | 3.80 / 4.70 | 6.80 / 7.20 | 4.90 / 7.00 |

Native loses all four parity metrics. Its maximum update is 4.10 ms and maximum through-draw 7.30 ms; every raw tail remains preserved. Frame hooks and imperative updates have different obligations and do not replace the primary declarative comparator. [Raw recomputation](verification/canvas-timing-v4-primary-review.json).

These observations establish no causal before/after regression or saving, phase/GC attribution, presentation advantage, matched cold/memory result or independent-device qualification. Earlier narrow wins and the historical integrated dense loss remain scoped to their original source. Current source inherits none of their timings.

## Disposition

Close this finite candidate as a performance solution. Do not dispatch another arithmetic/kernel/cache/container/writer optimization in response. Retain the delivered declarative same-thread batching capability with honest costs and fallback. Continue the full master-plan requirements: structural locality, dependency-scoped async/reveal behavior and resource conformance, host/package adoption, lifecycle/cold/retained-memory costs, and independent-device evidence. No human maintenance advantage is claimed with zero participants. Performance parity and the full first-pass goal remain unachieved.
