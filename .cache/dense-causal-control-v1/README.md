# Targeted native dispatch control, preregistered

This is one finite follow-up to the frozen Recording A aggregate. It does not change the archived product, the live adjacent-token patch, the diagnostic snapshot, or the existing collector. [The aggregate verdict](../dense-causal-ledger-v1/aggregate-review/report.md) remains a causal budget HOLD. `protocol.json` fixes the six balanced permutations, their seeded order, source/build identities, receipt paths and 1,024-first schedule before collection. Run the exact [command manifest](commands.md), preserving all raw pages and failed receipts. There are 18 fresh native pages at 1,024 and at most 18 at 10,000; each invokes the existing `collect-one.mjs` explicitly with one arm, size and mode, 60 warmup plus 240 measured frames, and a 90-second deadline. No count rerun is planned. Each page is a fresh browser. Do not launch this as an automated loop.

The seed is decimal `20261013`. Starting with the six lexicographic mode permutations, an unsigned xorshift32 Fisher–Yates shuffle (one draw modulo `i+1` per swap) yields:

1. original → off → on
2. on → off → original
3. original → on → off
4. off → on → original
5. off → original → on
6. on → original → off

The same predeclared order applies to both sizes. Keep only the required owned Portless preview active at each page. Concurrent aliases previously returned 404, so switch owned previews as needed; never collect all original pages first. The original URL is frozen exactly at `https://react-runtime-headless.localhost:1355`. The diagnostic URL must be one stable Portless HTTPS `.localhost` origin throughout. Stop only owned processes and leave shared routes untouched.

## Gates and analysis

Use pinned Node v24.18.0. Luna first runs the read-only synthetic gate; this agent has not run it. The gate uses preserved v1 records as templates and checks acceptance plus rejection of wrong order, duplicate run, source identity drift, incomplete lifecycle, nonfinite and negative phase intervals:

```sh
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/dense-causal-control-v1/synthetic-protocol.mjs
```

`analyze.mjs --rows 1024|10000 --out NEW_JSON` reads the predeclared receipt paths. It writes a result even when records are missing, partial or invalid, then exits nonzero for `INVALID`. It checks frozen config, source manifest and diagnostic build-lock hashes; mode, arm, size, source identity, Node/Chromium context, exact Portless origin, served asset hashes, native output/order/identity/lifecycle/dead-setter checks, zero errors and cleanup failures, 60/240 frame sequence, timing contract, exact 23-label mark order in **all 300** frames, disjoint phase intervals, commit-span reconciliation and unique chronological run IDs. Failed receipts remain raw evidence and cannot be replaced by favorable old pages.

Each fresh page contributes one median and one p95. Within each block, the analyzer reports `off−original` and `on−off` differences of those page statistics. The six block differences receive a descriptive minimum, median, p95 and maximum. These ranges include build shape, JIT, browser and environment variation; they are **not population confidence intervals**, guaranteed phase-overhead corrections, or frame-level paired estimates. Phase summaries likewise describe six `on` pages, not 1,440 independent units. It reports source-marked gross phases and residual `q`, with no sum-of-medians savings calculation. `decisionGrade` remains false.

The **preregistered descriptive quality screen** for considering 10,000 requires six complete 1,024 blocks, valid locks/assets/marks/lifecycle/order, nonnegative residual within one observed clock tick, and `on` dispatch page medians above the five-tick floor. For both `off−original` and `on−off`, the *across-block* range width **and** largest absolute block difference must each be at most 10% of the median original-page median for median differences, and at most 10% of the median original-page p95 for p95 differences. Ten percent is a pragmatic screening tolerance, not a confidence bound or derived overhead guarantee. A failure means `STOP_10000_UNRESOLVED` for this dispatch hotspot after this one targeted attempt; there are no favorable retries.

A passing numerical screen yields only `PRIMARY_REVIEW_REQUIRED_FOR_10000`. Before the conditional 10,000 recording, primary review must document a semantically removable dispatch-family amount `R_lower`, required retained work, and a credible new-cost upper estimate `δ_upper`. To justify proceeding for a possible 1,024/10,000 two-size strong win, the independently argued net budget must plausibly reach the registered 1,024 need of **39.5%** of current total; at 10,000 the need is **46.5%**. The control ranges cannot supply `R_lower` or `δ_upper`. If those bounds are absent or the plausible net budget is below the threshold, the 10,000 branch remains unresolved/stopped unless primary records a specific reason grounded in the master guide. No runtime implementation or speed claim follows from either screen. After the one targeted run, stop this hotspot with supported, falsified or unresolved evidence rather than opening another adaptive page set.
