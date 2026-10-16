# Numeric state-lanes CPU attribution protocol

Prepared before collection, 13 October 2026. This is a one-run CPU attribution
profile of the frozen numeric state-lanes candidate. It is not a latency verdict
and does not establish that state lanes caused any observed cost difference.

## Frozen candidate and eligibility

The candidate archive is
`implementation/2026-10-13-numeric-state-lanes/source-and-build.tar.gz`, SHA-256
`83c99cd500cb9462094c637014f3e8adf3cf8bc0280e5d154442141408f192c3`. Its status
is `NUMERIC_STATE_LANES_CORRECTNESS_VERIFIED`: 629 runtime tests, 32 Rust tests,
12 primary integration commands, and 6 correctness pilot pages. The status
records 853 source/build files and 93 verification artifacts. The performance
field in that immutable checkpoint is `UNMEASURED_FOR_THIS_CANDIDATE`, because
the checkpoint predates timing collection. The subsequent independently verified
confirmation failed the fixed speed gate at all sizes; see
`numeric-state-lanes-timing-findings.md`. This CPU study attributes current work
after that failure and cannot replace the latency result.

Before registration, the collector verifies and locks the status file, archive,
all source/build files and verification artifacts listed by the status, all six
pilot pages and their manifest, the execution, state-layout, lane-cut, and lane-
lifecycle proofs, compiler proof files, schedule, existing Vite config, this
protocol, collector, and independent verifier. It verifies the five production
files against their frozen build hashes. Preregistration is written with
exclusive-create semantics before either diagnostic page runs. The output
directory must be new and empty; existing evidence is never overwritten.

## Collection

Use the already-built `dist-product-mixed-state-lanes` through the existing
Portless preview at
`https://compiled-state-lanes-cpu.localhost:1355/product-mixed-v2.html`. Do not
rebuild the product. Before preregistration, check CDP profiler availability on
`about:blank` and fetch the five static production files through the browser
request context; do not navigate to the product or execute its harness during
preflight.

Collect exactly schedule sequence 20 (React, 1,024 rows), then sequence 21
(native, 1,024 rows). Use a fresh headed browser context for each page, GPU
disabled, a 1,200 by 900 viewport, and bring each page to the foreground. Run
serially. Start CDP CPU profiling on `about:blank` before navigation with a
1,000-microsecond sampling interval. Keep the existing workload unchanged: 60
warmup frames, 240 measured frames, and eight structural frames. Require the
harness status to be `PASS`, all five correctness checks to pass, exactly 240
measured samples, and no uncaught page errors. Retain the complete raw harness
result and CDP profile (`nodes`, `samples`, and `timeDeltas`). A failed or
incomplete page remains in the output and invalidates a passing run; do not
rerun, replace, or exclude it.

The profile spans module import, initial mount, warmup, measured frames,
harness inspection, and disposal. The existing harness result includes its
measured disposal step. Do not add per-step timing instrumentation. For each
profile frame that resolves to one of the five locked production files, record
its emitted-file path and hash, line and column, UTF-16 code-unit offset,
surrounding excerpt bounds, and exact excerpt text. Reject out-of-range line or
column coordinates instead of clamping them. Built-in and unresolved frames
remain in the raw profile without invented source locations. Record each page's
loaded production resources and served-byte hashes, require the selected arm's
production bundle, and reject loading the opposite arm. Rehash the complete
frozen input set after both pages and write the post-collection lock report.

## Output and interpretation

Write only to `results/product-mixed-state-lanes-cpu/`. The output contains
`preregistration.json`, `20-react-1024.json`, `21-native-1024.json`,
`source-build-post-lock.json`, and `results.json`. Page files retain the complete
profile and harness result, resource hashes, weighted sampled self-time summary,
and verified source excerpts. Preserve error details and partial profiles when a
collection step fails.

Weighted sampled self time sums each sample's corresponding `timeDelta`. It is a
sampling estimate, not exact instruction time or update-only cost. The profile
includes module import, mount, warmup, harness inspection, and disposal, not
only frame updates. Function names, URLs, and combined minified arm bundles are
attribution hints and do not establish causality or cleanly separate application
from runtime work. These two pages do not measure allocation counts, establish
GC causality, include browser layout/paint/GPU costs, or support independent
device claims. This is current-candidate attribution only; it is not a causal
comparison with prior timing evidence. Do not use these profiles as a latency
verdict or combine them with a latency study.
