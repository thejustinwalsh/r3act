# State-resolution allocation diagnostic protocol

Frozen before collection, 12 October 2026. This is allocation attribution on a
tested compiled product, separate from latency confirmation.

## Qualification and locks

Use `implementation/2026-10-12-state-resolution/source-and-build.tar.gz`, SHA-256
`709e184ef1fc7dbd2e8020a1dfdfd2b6d6050ef2d333c3a482cb1540921fae6d`.
Status must be `STATE_RESOLUTION_CORRECTNESS_VERIFIED`: 495 runtime tests, 28 Rust
tests, 50 integration checks including the six-page production pilot. Verify
native three bindings, keyed lowering and prop-only proof, and React Compiler row
and board memo-cache proof. Validate the six archived pilot records and their
hashes, all five production assets and the authored source/schedule locks.

The collector is `scripts/profile_product_mixed_state_resolution_memory.mjs`.
Require the reviewed archive hash as `EXPECTED_STATE_RESOLUTION_ARCHIVE_SHA256`.
Before profiling, exclusively write a preregistration freezing this protocol,
archive, status, collector, schedule, pilot/proof and source/build hashes. A blank
CDP support preflight may precede registration; it runs no product workload.
Recheck the identical lock inventory afterward and preserve every failure.
Use a new `results/product-mixed-state-resolution-memory` directory; never
overwrite previous CPU, memory or latency studies.

## Collection

Use the existing Portless production preview at
`https://compiled-state-resolution.localhost:1355/product-mixed-v2.html`.
Collect fixed sequences 0/1, 10/11 and 20/21: React then native at 128, 512 and
1,024 rows, pair zero. Each page runs in a fresh, serial, headed browser context,
GPU disabled, viewport 1,200 by 900, brought to the foreground. No simultaneous
browser verification or instrumentation is run by the agent.

Use CDP HeapProfiler sampling at 32,768 bytes with collected minor/major-GC
objects included. Start on about:blank before navigation. Record baseline JS
heap after forced GC, stop sampling after the harness has disposed, then record
post-teardown heap before and after forced GC. The scope includes import, mount,
60 warmup frames, 240 measured frames, correctness inspection and disposal.

Require frames 61 through 300, eight structural frames, all five exact checks,
production mode, correct lifecycle counts and no browser/harness errors. Verify
served common assets and the selected arm against archived bytes; the opposite
arm is not expected to load. Save raw stopped sampling profile, tree, flat
samples, harness result, heap readings and any failure immediately. Profiled
commit times remain diagnostic and do not enter a speed verdict.

## Independent analysis and limits

Independently traverse the stopped tree and sum **node selfSize**, grouping by
URL/function/line/column. Do not sum inclusive subtrees repeatedly. Separately
sum raw flat sample sizes; these CDP representations need not agree. Preserve
both. Verify emitted offsets/excerpts against locked served source bytes and
recompute summaries. Retain unresolved/inlined/anonymous attribution rather than
assigning arbitrary allocation bytes to framework work.

Report allocation estimates and ranked sites, separating harness, authored code
and framework where verified emitted source permits. Sampling is probabilistic;
one pair per size is a diagnostic, not a release allocation gate. Post-GC heap is
after disposal, not a mounted-cache measurement or universal leak guarantee.
JS heap readings exclude DOM/GPU/presentation memory. This study cannot prove CPU
speed, causal improvements over historical checkpoints, independent-device
performance or a general advantage over React. Current release gates remain open.
