# Product mixed World journal allocation protocol

13 October 2026. This is a diagnostic allocation study on the frozen World dirty
journal candidate. It does not establish latency or a release verdict. The
preceding timing result is archived as FAIL; this memory study cannot reverse
that result. The current World journal candidate's speed gate is unmeasured.
Do not claim that avoiding allocations improves speed.

## Candidate and frozen inputs

Use only
`implementation/2026-10-13-world-dirty-journal/source-and-build.tar.gz`, SHA-256
`262914378f2cebb79d77805e7dda341d6b9c58b00de9c9a7eba801d621202468`. Require
`EXPECTED_WORLD_DIRTY_JOURNAL_ARCHIVE_SHA256` to equal that exact digest and the
archive's `status.json` to report
`WORLD_DIRTY_JOURNAL_CORRECTNESS_VERIFIED`: 582 Deno tests, 29 Rust tests, 9
integration commands, and six production pilot pages. The status locks exactly
815 source/build files. Check every one against `status.json`, then separately
verify the five production assets and the authored/config source files. The
candidate's recorded speed gate is `UNMEASURED_FOR_THIS_CANDIDATE`.

Validate the six archived correctness pilot records and hashes, all five
production assets, the authored/config source locks, and the unchanged 30-page
schedule. Hash-lock `verification/execution-proof.json` and
`verification/product-compiler-proof/native.js` against the archive status. The
execution proof must pass, eligible numeric cuts must report zero generic
capture calls and at least one native capture call, and the density frames must
be 1/4/32 with 1 batch, 2/8/64 source updates, and 5/20/160 projections. Verify
the three static numeric descriptors and three binding calls in the executable
compiler-emission prefix. Retain the pilot's native three-binding/delta/prop-only
and React Compiler row/board memo-cache qualifications.

The sources are `src/browser/native_product_mixed_arm.tsx`,
`src/browser/product_mixed_react_arm.tsx`,
`src/browser/product_mixed_harness.ts`,
`src/browser/product_mixed_schedule.ts`, and
`vite.product-mixed-world-journal.config.ts`. The collector is
`scripts/profile_product_mixed_world_journal_memory.mjs`; the independent
verifier is `scripts/verify_product_mixed_world_journal_memory.mjs`.

Before registration or collection, independently freeze this protocol, the
archive and status, all 815 source/build files, schedule, six pilot records and
manifest, execution proof, compiler emission, collector, verifier, and their
hashes. The collector may do a blank-page CDP support preflight before writing
its preregistration; it must not run product workload before preregistration.
It then rechecks all frozen hashes immediately before writing
`preregistration.json`, and records a post-run lock check. Preserve every
failure; do not exclude pages, rerun selected pages, or overwrite previous
results.

The output directory must be new and empty:
`results/product-mixed-world-journal-memory`. The already built product is
served at the existing Portless origin
`https://compiled-world-journal.localhost:1355` from
`dist-product-mixed-world-journal/`. Do not rebuild or launch another server for
this study. Confirm exact served bytes against the frozen build hashes and
confirm the selected arm chunk loads while the opposite arm does not.

## Collection

Collect schedule sequences 0, 1, 10, 11, 20, and 21, in that exact serial order:
React then native at 128, 512, and 1,024 rows, pair zero. Each page uses a fresh
headed browser context with GPU disabled, a 1,200 by 900 viewport, and the page
brought to the foreground. Do not run browser verification or another
instrumented workload at the same time.

Use CDP HeapProfiler sampling at 32,768 bytes, including objects collected by
minor and major GC. Start on `about:blank` before navigation. Record JavaScript
heap usage after forced GC before navigation, stop sampling after harness
disposal, then record heap usage after teardown and after another forced GC.
The profile scope is module import, initial mount, 60 warmup frames, 240
measured frames, correctness inspection, and disposal.

Require exactly measured frames 61 through 300, eight structural frames, all
five exact harness checks, production confirm mode, and no harness or browser
errors. Preserve the raw stopped sampling profile, its tree and flat samples,
flattened tree, recomputable summary, emitted-source attribution excerpts,
harness result, served-resource hashes, heap readings, and any failure. The
existing harness pilot files remain unchanged. Profiled commit times are
diagnostic only and do not enter a speed verdict.

## Independent analysis and limits

The independent verifier must validate the archive-member inventory and each
locked file, preregistration and post-locks, exact six-page ordering, all raw
page results, served production bytes and selected-arm resource, lifecycle and
five-check results, and the raw sampling data. Independently traverse the
stopped tree and sum node `selfSize` once per node; separately total flat sample
sizes because CDP's tree and flat forms can differ. Recompute frame summaries
from the raw profile. Validate emitted offsets and excerpts against the exact
locked bytes that were served. Keep unresolved, anonymous, and inlined frames;
do not attribute them arbitrarily or exclude them from totals.

Sampling is probabilistic. One pair per size is a diagnostic, not a release
allocation gate. Post-GC heap is measured after disposal, not as mounted cache
memory or universal leak proof; JavaScript heap excludes DOM, GPU, and
presentation memory. The allocation study does not prove CPU speed, causal
improvement over earlier candidates, independent-device performance, or a
general advantage over React. Report allocation and latency evidence
separately.
