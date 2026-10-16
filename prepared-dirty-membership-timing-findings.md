# Prepared dirty-membership timing decision

The independently verified fixed study passes all 30 correctness pages, 7,200 measured frames and 925 frozen input checks. Its speed gate fails at every size.

| Rows | React median ms | Candidate median ms | Paired median geometric mean ratio | Paired p95 median ratio |
| --- | ---: | ---: | ---: | ---: |
| 128 | 0.175 | 0.210 | 1.1752 | 1.4151 |
| 512 | 0.580 | 0.705 | 1.2165 | 1.1226 |
| 1024 | 1.100 | 1.385 | 1.2596 | 1.3246 |

The fixed median gate remains at most 0.80 at two sizes; the p95 gate remains at most 1.10 at every size. Every pair resolves under the unchanged five-clock-tick floor. There were no page exclusions, replacements or reruns. Both arms use their required compilers; React row/board memo caches are present. This is not an unoptimized React baseline.

Raw page records retain harness checks and errors, not per-frame DOM snapshots. Independent verification checks the frozen harness's value/order/identity logic and raw outcomes; it does not reconstruct every row value from raw records. Frame commit timers exclude layout, paint and presentation. These are single-machine measurements, not an independent-device result or a universal framework verdict.

The candidate's medians are lower than the separately collected stable-cell checkpoint's medians. Separate studies do not establish a causal savings estimate for journal membership or token-preflight changes. The current candidate still loses to React. Allocation diagnostics were not collected for this candidate, and its extra retained membership objects need assessment.

## Implementation evidence

The source checkpoint contains prepared payload-free journal membership, exact-handle acknowledgement and authoritative VDOM token preflight with bounded refresh retry. A primary-discovered updater reentry defect is fixed: a functional action that destroys its owner returns false before any subsequent cell write, dirty mark, identity installation or notification. That fix is required for the identity-only acknowledgement premise. Direct-value dispatch does not add the callback revalidation.

The checkpoint passes 663 runtime tests, 32 compiler tests, ordinary authored TSX sparse/dense execution and lifecycle proofs, production build qualification, Chromium v4 actual-cell shape checks, and six separate production correctness pilots. These prove bounded behavior and path coverage, not speed.

## Review and provenance

Before preregistration, primary review corrected the collector's obsolete qualification-status string and restored two verifier metadata checks. The tools were then frozen before pages. Analysis validates all 30 pages without a post-collection repair. Independent verification recomputes paired ratios and checks all 910 source/evidence archive members. Original historical archives, notebooks and raw records remain unchanged.

Source archive SHA-256: 38c9fc22b706bc9181c7de30f27e94fe937b0dc3993ed5d28642bf4779ca614d. Run ID: 0669b1be-641f-426f-8dca-39bff1f6c624. Authoritative reports: results/product-mixed-prepared-dirty-membership-confirmation/summary.json and verification.json. The SVG is adjacent.

## Direction

The integrated path still performs per-cell identity/lane resolution, Root capture/cache/source-history work and VDOM projection/publication bookkeeping. Structural, mount and disposal costs also remain open. A compiler-led owner/row program must reduce repeated work across a known state layout while preserving dirty ordering, captured versions, reentry, private candidates and whole-cut validation. Direct validated capabilities and row leases are candidates for review; neither their safety nor a performance gain should be assumed. Keep the compiler, retained VDOM and public declarative API intact. Workers, streaming, hydration and Wasm remain deferred by the original prerequisites. Independent-device, allocation and comparative human maintenance/adoption gates remain open.
