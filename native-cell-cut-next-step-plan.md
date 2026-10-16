# Native cell-cut: next implementation decision

13 October 2026. Continue the compiled JavaScript runtime and the original
library scope. Mandatory Rust/OXC compilation, retained VDOM, ordinary TSX,
coherent async state and public rendering hosts remain the design.

## Evidence now available

- The archived candidate passes 573 Deno tests, 29 Rust tests, 58 recorded
  integration commands and six production correctness pilots.
- The separate allocation study passes 109 independent verification checks.
  Native/React sampled allocation ratios are 0.817, 0.718 and 0.736. This is one
  fresh pair per size, not a latency result or a retained-memory win.
- Hash-verified resources for the matched compiled application total 159,188
  bytes native versus 227,561 React. Independent gzip level 9 estimates are
  44,745 versus 71,660 bytes. These are application artifact sizes, not complete
  library sizes or a feature-parity comparison.

See `native-cell-cut-allocation-findings.md` and
`results/product-mixed-native-cell-cut-bundle-size.json` for provenance and limits.

## Finite next decision

1. Primary review the new timing protocol, collector, analyzer and independent
   verifier. Freeze them and the existing source/build before registration.
2. Collect exactly one 30-page confirmation: five fresh pairs at each of three
   sizes, 7,200 measured frames. Apply equal isolation headers and the registered
   conservative five-clock-tick rule. Preserve failures and unresolved results.
3. Independently verify the result, inspect the SVG, and archive all evidence.
   Apply the existing 0.80 median and 1.10 p95 ratio thresholds unchanged.
4. If the speed gate misses, use attributed costs to select one bounded change.
   `world-dirty-journal-design.md` specifies a candidate for recurring dirty
   container churn, with owner-major order, captured-version acknowledgements
   and retention checks. Do not implement a broader layout solely from the
   allocation ratios.
5. If this workload passes, record that narrow result and resume remaining
   feature acceptance. Independent-device performance and comparative human
   maintenance evidence remain open; one local run does not complete the goal.

## Team boundaries

Luna high agents own the collector/protocol/config, the analyzer/verifier, and
the conditional journal design separately. Primary reviews schema agreement,
locks, failure handling and numerical decisions, then runs and integrates the
study. Runtime edits remain paused during collection. The full Sol review stays
held under `sol-review-prerequisites.md` until its maintenance prerequisite is
actually established or the user changes it.

Workers, streaming, hydration and Wasm remain deferred under the existing plan.
