# World dirty-journal CPU profile protocol

Prepared before collection, 13 October 2026. This is a one-run diagnostic of the
frozen world dirty-journal checkpoint. It is not a latency confirmation or a
claim that the journal caused any observed cost difference.

## Frozen candidate and eligibility

The candidate archive is
`implementation/2026-10-13-world-dirty-journal/source-and-build.tar.gz`, SHA-256
`262914378f2cebb79d77805e7dda341d6b9c58b00de9c9a7eba801d621202468`. Its status
is `WORLD_DIRTY_JOURNAL_CORRECTNESS_VERIFIED`: 582 runtime tests, 29 Rust tests,
9 primary integration commands, and 6 correctness pilot pages. Its performance
gate is `UNMEASURED_FOR_THIS_CANDIDATE`. These counts and the exact checkpoint
status are eligibility checks, not CPU-performance evidence.

Before registration, the collector must verify and lock the status file, archive,
all 815 source/build files listed in `status.json`, all verification files listed
in `verificationSha256`, all six pilot page records, the pilot manifest, the
schedule, this protocol, the collector, and the independent verifier. It also
records the compiler proof files and execution proof, and verifies the five
served production files against their frozen build hashes. The preregistration
is written with exclusive-create semantics before either diagnostic page runs.
The output directory must be new and empty; the collector refuses to overwrite
any prior evidence.

## Collection

Use the already-built `dist-product-mixed-world-journal` through the existing
Portless preview at
`https://compiled-world-journal.localhost:1355/product-mixed-v2.html`. Do not
rebuild the product. Do not launch, restart, or expose a numbered-port server as
part of this protocol. Before preregistration, check CDP profiler availability on
`about:blank` and fetch the five static production files through the browser
request context; do not navigate to the product or execute its harness during
preflight.

Collect exactly the fixed schedule pages in order: sequence 20, React at 1,024
rows; then sequence 21, native at 1,024 rows. Use a fresh headed browser context
for each page, GPU disabled, a 1,200 by 900 viewport, and bring each page to the
foreground. Run serially. Start CDP CPU profiling on `about:blank` before
navigation with a 1,000-microsecond sampling interval. Keep the existing workload
unchanged: 60 warmup frames, 240 measured frames, and eight structural frames.
Require the harness status to be `PASS`, all five correctness checks to pass,
exactly 240 measured samples, and no uncaught browser page errors. Preserve the
full harness sample list and the raw CDP profile (`nodes`, `samples`, and
`timeDeltas`) for independent verification. A failed or incomplete page remains
in the output and invalidates a passing run; do not rerun, replace, or exclude it.

For each CPU frame that resolves to one of the five locked production files,
store its emitted-file path and hash, line/column, UTF-16 code-unit offset,
surrounding excerpt bounds, and exact excerpt text. Reject out-of-range line or
column coordinates instead of attributing them to a clamped end-of-file offset.
Built-in and unresolved frames remain in
the raw profile and are not assigned invented source locations. Record each page's
loaded production resources and served-byte hashes. Once both pages finish,
rehash the complete frozen input set and write the post-collection lock report.

## Output and interpretation

Write only to `results/product-mixed-world-journal-cpu/`. The output contains
`preregistration.json`, `20-react-1024.json`, `21-native-1024.json`,
`source-build-post-lock.json`, and `results.json`. The page files include the
complete raw profile, checked harness result, loaded resource hashes, a weighted
self-time summary, and verified source excerpts. The final manifest records both
page statuses and the lock status. Preserve all error details and partial raw
profiles when a collection step fails.

Profile scope includes module import, initial mount, warmup, measured frames,
harness inspection, and disposal. Weighted sampled self time is computed by
summing each sample's corresponding `timeDelta`; it is an estimate from profiler
sampling, not exact instruction time or update-only cost. The profile is useful
for ranking sampled current costs and selecting later investigations. Function
names, URL heuristics, and combined minified arm bundles do not establish
causality or cleanly separate application from runtime work. These two pages do
not establish allocation counts, GC causality, layout/paint/GPU cost,
independent-device behavior, or universal superiority. Do not use profile timing
as a latency verdict or combine it with a latency study.
