# Native cell-cut allocation diagnostic protocol

Frozen for the `NATIVE_CELL_CUT_CORRECTNESS_VERIFIED` checkpoint, 13 October
2026. This is allocation attribution on a tested compiled product, separate
from latency confirmation. Do not begin registration or collection until the
collector and this protocol have been independently reviewed.

## Qualification and locks

Use `implementation/2026-10-13-native-cell-cut/source-and-build.tar.gz`,
SHA-256
`1687915fd6d6ba51d457a4265100e0c72eed5e2641af230257fd29185ec3ac45`.
Require `EXPECTED_NATIVE_CELL_CUT_ARCHIVE_SHA256` to equal that exact digest.
The status must be `NATIVE_CELL_CUT_CORRECTNESS_VERIFIED`: 573 runtime tests,
29 Rust tests, 58 integration commands, and six production pilot pages. The
pilot must retain the native three-binding/delta/prop-only qualification and
the React Compiler row and board memo-cache qualification. Validate all six
archived pilot records and their hashes, all five production assets, the five
authored/config source locks, and the schedule lock. Also hash-lock
`verification/execution-proof.json` against `status.json`'s verification map;
require its eligible numeric cuts to report no ordinary capture, at least one
native capture, and exactly the 1/4/32 density frames with one batch, 2/8/64
source updates, and 5/20/160 projections. Hash-lock
`verification/product-compiler-proof/native.js` against that same verification
map and verify its three static numeric descriptors and three-argument binding
calls. The authored/config source set is
`src/browser/native_product_mixed_arm.tsx`,
`src/browser/product_mixed_react_arm.tsx`,
`src/browser/product_mixed_harness.ts`,
`src/browser/product_mixed_schedule.ts`, and
`vite.product-mixed-native-cell-cut.config.ts`.

The collector is `scripts/profile_product_mixed_native_cell_cut_memory.mjs`.
Before profiling, exclusively write a preregistration freezing this protocol,
archive, status, collector, schedule, pilot/proof and source/build hashes. A
blank CDP support preflight may precede registration; it runs no product
workload. Recheck the identical lock inventory afterward and preserve every
failure. Use the new, initially empty
`results/product-mixed-native-cell-cut-memory` directory. Never overwrite
previous CPU, memory, or latency studies. Build bytes are locked under
`dist-product-mixed-native-cell-cut/` and served at the existing Portless
preview origin `https://compiled-native-cell-cut.localhost:1355`.

## Collection

Collect sequences 0/1, 10/11, and 20/21: React then native at 128, 512, and
1,024 rows, pair zero. Each page runs in a fresh, serial, headed browser
context, GPU disabled, viewport 1,200 by 900, brought to the foreground. Do
not run simultaneous browser verification or instrumentation.

Use CDP HeapProfiler sampling at 32,768 bytes with objects collected by both
minor and major GC included. Start on `about:blank` before navigation. Record
baseline JavaScript heap after forced GC, stop sampling after the harness has
disposed, then record post-teardown heap before and after forced GC. The scope
includes module import, initial mount, 60 warmup frames, 240 measured frames,
correctness inspection, and disposal.

Require exactly frames 61 through 300, eight structural frames, all five exact
checks, production mode, correct lifecycle counts, and no browser or harness
errors. Verify served common assets and the selected arm against archived
bytes; the opposite arm must not load. Save the raw stopped sampling profile,
tree, flat samples, harness result, heap readings, and any failure immediately.
Profiled commit times remain diagnostic and do not enter a speed verdict.

## Independent analysis and limits

Independently traverse the stopped tree and sum node `selfSize`, grouping by
URL/function/line/column. Do not sum inclusive subtrees repeatedly. Separately
sum raw flat sample sizes; these CDP representations need not agree. Verify
emitted offsets and excerpts against locked served source bytes and recompute
summaries. Retain unresolved, inlined, and anonymous attribution rather than
assigning arbitrary allocation bytes to framework work.

Report allocation estimates and ranked sites, separating harness, authored
code, and framework where verified emitted source permits. Sampling is
probabilistic; one pair per size is a diagnostic, not a release allocation
gate. Post-GC heap is after disposal, not a mounted-cache measurement or
universal leak guarantee. JavaScript heap readings exclude DOM, GPU, and
presentation memory. The study cannot prove CPU speed, causal improvement over
historical checkpoints, independent-device performance, or a general advantage
over React. Current release gates remain open.
