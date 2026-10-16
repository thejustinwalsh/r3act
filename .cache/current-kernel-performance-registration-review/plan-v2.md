# Current-kernel qualification constraints after the user stop

This supersedes the execution proposals in `plan.md`; it is not a frozen
benchmark protocol and does not authorize starting a workload.

The user stopped focus-stealing browser workloads. No headed, fullscreen,
focused or maximized automated browser runs are permitted without an explicit
request for that run. Any future automated browser qualification must be
headless, bounded and interruptible. It is a different environment from the
preserved headed results; no direct causal before/after claim follows.

The eight-commits-per-RAF proposal in `plan.md` is rejected. The requested
high-frequency workload is one declarative state-to-prop commit per frame,
already represented by the staged `high_frequency_harness.ts`. Preserve that
contract: dirty selection precedes timing; setters and synchronous host commit
are timed; correctness inspection follows timing. Do not batch extra commits
just to increase the clock denominator.

A future finite matrix must cover dense, one-dirty, bucket-dirty and mixed
program cases through 10,000 rows using that same authored TSX, ordinary state
setters and common layout. Choose and freeze its cells before comparative
collection. A dense win does not qualify sparse or heterogeneous cuts. Cold
initialization, disposal and mixed structural work need their own measurements.

Keep all raw failures and incomplete records. Preserve the original mixed
confirmation schedule and thresholds if repeating that named workload, but
collect into new paths against the actual new candidate. The user's broader
at-or-better target is stronger than the old p95 allowance: meeting the old
study gate alone does not establish that target.

Use clock isolation and independent calibration. A ratio below the registered
React denominator floor remains unresolved, not a pass or failure. No rerun,
exclusion or threshold change may turn an observed regression into success.
The six-page build03 pilot only establishes all-dirty homogeneous correctness;
its saved timing values are not a preregistered comparative speed study.

First complete the compiler/local-bookkeeping changes and source review.
Browser workloads remain stopped during this implementation pass.
