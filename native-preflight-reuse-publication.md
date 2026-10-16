# Prepared-token preflight reuse

Root now trusts `executePreparedNumericCells` as the authoritative token preflight instead of separately querying token currency for every captured cell. A declined preflight is converted to `false` inside `#commitHostMutation`, then Root revalidates handles and versions, refreshes cached tokens, and retries once using the originally captured values. If recovery declines, the current fallback path proceeds without a native acknowledgement. Host exceptions remain terminal, and accepted `false` results are not retried.

The whole-page CPU profile attributes 3.017 ms to token-current checks out of 598.039 ms sampled native arm-bundle self time (about 0.5%). The 598.039 figure is sampled self time, not a cell count. This change is a code-path simplification; it makes no speed claim.

Focused verification passed: `deno test --config deno.browser.json src/native_prepared_cell_cut_test.ts src/native_numeric_lane_cut_test.ts src/vdom_prepared_cell_program_test.ts` (19 passed, 0 failed). The prepared-cut tests cover stale refresh retry, double decline before fallback publication/acknowledgement, accepted `false` without retry, captured values under reentry, and terminal host failure.

Primary integration verification: `deno task test` passes all 655 runtime tests. The compiler and host adapters are unchanged by this patch. No new browser timing or allocation gate has been collected for this implementation.
