# Project execution rules

## Regrounding after compaction

At the start of every resumed or compacted turn, read this file, `implementation-checkpoint.md`, and `final-master-plan.md`. Read the complete guide before choosing a new work unit; for an already active unit reread its contracts, Recording A, source basis, and dependency-ordered backlog. Inspect actual files and current agent status before continuing. Preserve the original product scope and evidence limits.

`final-master-plan.md` is the single engineering guide. Its historical freeze text describes the review checkpoint. The human subsequently said “Let’s go!” and authorized plan-led implementation. Evidence and semantic prerequisites still gate physical choices; permission does not prove performance.

## Delegation

Use only `gpt-6-sol` with `medium` reasoning for implementation agents. Reserve Luna for running tests, gates, benchmarks and collecting evidence. The primary agent reviews, integrates and maintains the checkpoint. Assign disjoint bounded file ownership. Implementation agents do not execute tests or benchmarks; hand commands to Luna after review.

## Evidence and verification

### Current human cadence override (14 October 2026)

Implement large integrated slices of the master plan. The human explicitly stopped per-change measurement and the diagnostic loop. Do source review and integration during a slice; run one consolidated correctness gate and one bounded performance comparison at its boundary, not after each helper or patch. Keep logical changes reviewable. Preserve existing evidence, but do not make another recording or causal ledger a prerequisite for implementing the approved semantic architecture. Existing traversal layouts remain until a coherent slice is evaluated; do not start a speculative container carousel. Luna stays idle during implementation and handles the consolidated gates only when the primary releases the slice.

Follow the guide's dependency order. First close Units 0–2: evidence lock, causal Recording A, and reviewed physical selection. Use isolated diagnostic snapshots; preserve production source and immutable qualified evidence until a physical change is supported. Do not infer phase cost from whole-page profiles or operation counts.

Automated browser workloads are headless, bounded, interruptible and never steal focus. Load `$portless-dev-servers` before launching or restarting any project server; route it through Portless HTTPS. Stop only owned processes and preserve shared routes. Use `--frozen` for Deno verification. Preserve failures and distinguish diagnostic timings from qualification.

## Maintenance

Name the replaced mechanism, invariant authority, required semantics, measured budget and falsifier for every work unit. Keep one shared identity/version/publication model. Avoid redundant mutable registries. Source comments should be at most two lines or public TSDoc. Use canonical language casing and clear module boundaries.
