# Adjacent-token row-record cache stage

## Candidate

`vdom_snapshot_runtime.patch` changes only `#executePreparedNumericRows`. The invocation keeps the immediately previous token and its record in locals. A matching token reuses that record; a different token still performs the existing WeakMap lookup. Every iteration still rereads `changedRowIndices`, `changedSlots`, `tokens`, and `values` in the same order and repeats the record/root/active/token/layout/slot/source/column checks. Second-pass dependency lease checks are unchanged. No record is stored on the root or token and there are no new arrays, maps, counters, lifecycle flags, or public API changes.

`adjacent_token_cache_test.ts` structurally observes the only intended reduction: three consecutive changes on one row make three `WeakMap.get` calls on baseline and one in the candidate. An interleaved row-token sequence still makes three calls. Malformed, proxy-wrapped, and foreign tokens continue to decline.

## Scope limitation

If user code replaces `WeakMap.prototype.get` during a `values` getter, baseline invokes that replacement for the next repeated token while candidate's cache hit skips the call. The focused test records this difference: baseline throws from the replacement; candidate completes. The parent accepted intact native built-ins as the scope for this internal dictionary optimization. No equivalence claim is made when callers patch `WeakMap.prototype.get` during a cut.

The cache does preserve the requested getter and lifecycle cases under normal built-ins: later values getters can revoke an earlier changed or untouched dependency lease; a later getter can dispose the row; later getters can throw; each declines/throws before source mirroring, projection, or bound host writes. Existing prepared-row tests cover nested reentry, projector failure, disposal cancellation, stale/foreign prepared state, and retry cleanup.

## Verification

Focused staged commands:

```sh
deno test --frozen --config deno.browser.json .cache/owner-row-adjacent-token-stage/baseline/src/changed_capture_getter_regression_test.ts .cache/owner-row-adjacent-token-stage/baseline/src/adjacent_token_cache_test.ts .cache/owner-row-adjacent-token-stage/baseline/src/prepared_owner_row_program_test.ts
deno test --frozen --config deno.browser.json .cache/owner-row-adjacent-token-stage/candidate/src/changed_capture_getter_regression_test.ts .cache/owner-row-adjacent-token-stage/candidate/src/adjacent_token_cache_test.ts .cache/owner-row-adjacent-token-stage/candidate/src/prepared_owner_row_program_test.ts
```

Both final focused runs passed 22/22. Final full copied-`src` suites passed 724/724 on baseline and candidate with `--frozen`. The staged source trees symlinked `compiler/` read-only to the live compiler fixtures because a source-only copy otherwise lacks those test imports. No live source was changed. No browser, benchmark, or live-source test was run.

The instrumentation result is structural, not timing data: on the consecutive three-change case, baseline made 3 `WeakMap.get` calls and candidate made 1; the interleaved three-change case made 3 on both. The instrumentation wrapper returned the original native lookup results.

Live baseline `src/vdom_snapshot_runtime.ts` SHA-256: `00d8516d2164d1f212e804dd3a579bc13588158eb361e756e2ebd25753b73aab`.

Candidate `vdom_snapshot_runtime.ts` SHA-256: `cdc774b77a5938ce684537dc5f026bef7622a1fbba073bf2f95a01566275a58d`.

Patch SHA-256: `11ddebb73cd2bf047876ea905efa6241c678d36cc57a0847e33bda4be2c93b91`.

Candidate focused regression hashes: `changed_capture_getter_regression_test.ts` `fbdbe4af212a1fdb044e1b115903ad47fe566768934cd1827954c34f51d3d843`; `adjacent_token_cache_test.ts` `fe1478c11d6b275b06f922567047896f808a0784b977546644ffb03c972f97d1`; existing `prepared_owner_row_program_test.ts` `5f6e852c7f8d7fc4e732ef00f922fd0c0fe32c87b8f5665672d79cab58584a54`.

The live World and Root sources were not modified; their SHA-256 values remain `e9aadf02db1e8f29f18b2999b60b93681c1458e0f18dd2891f2b36e8f43c2d34` and `dc6ceceba93b59c6c688e250cb0cce2be3ed836296994d4101de218fada602a9` respectively.
