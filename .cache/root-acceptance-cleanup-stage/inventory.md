# Root native-cut acceptance-tail staging

This is a review-only patch against the current integrated source. No live source was edited. No benchmark, browser, or server was run.

## Proposed change

The row and lane routes have different World/VDOM preflight, token preparation, retry, counters and cleanup. After each route sets `accepted = true`, however, both perform the same three actions in the same order: update `#lastSourceValues` from the captured source/value buffers; clear World changes through the captured handles/versions; clear PendingStateChanges through those same captured versions. The staged helper `#acknowledgeNativeCellCut(count)` centralizes exactly that tail and its disposed-root guard. Route-specific counters and `finally` cleanup remain at their call sites. The helper uses existing Root buffers and adds no closure, record, map or scratch allocation.

This is a small deletion/consolidation, not a strategy abstraction: 24 repeated nonblank statements become one 15-statement helper plus two calls. Declined routes never reach it. Accepted `false` remains accepted and reaches it. Writer exceptions still exit before `accepted` and do not acknowledge.

## Files and hashes

- `implementation.patch`: SHA-256 `4757585cece100909f9dcd862fc7347fd9d5482cf340441046ebc6752626f7c0`
- Preserved source copy: SHA-256 `67d999bef9f95d16cdef833e94b0338bbc157991cdcf66646f4c105d2270440b`
- Proposed source copy: SHA-256 `dc6ceceba93b59c6c688e250cb0cce2be3ed836296994d4101de218fada602a9`
- `tests/native_prepared_row_cut_test.ts`: SHA-256 `5f64b50325412dc9ea4ea9eb582c6c6da94f9ec8d87ceefb46b27a04361dcdff`
- `tests/native_numeric_lane_cut_test.ts`: SHA-256 `3ff25e6e3a3e2a6bf59c8e198d1de78f7b94aacb70b077e3a27b0fa35e82721d`

The proposed source is `.cache/root-acceptance-cleanup-stage/proposed/src/component_state_runtime.ts`. The test copies are staged under `tests/`; the runnable overlay uses the same test files under `proposed/src/` with sibling project modules linked read-only to the current source tree.

## Targeted verification

Ran from the project root against the staged source overlay:

```sh
deno test --config deno.browser.json --frozen \
  .cache/root-acceptance-cleanup-stage/proposed/src/native_prepared_row_cut_test.ts \
  .cache/root-acceptance-cleanup-stage/proposed/src/native_numeric_lane_cut_test.ts
```

Result: **11 passed, 0 failed**. Relevant existing assertions:

- accepted no-write cut is acknowledged without retry/publication: `owner-row accepted no-write cut acknowledges without retry or publication`;
- a decline leaves publication and pending versions untouched through retry/fallback: `owner-row null retry cannot publish or acknowledge before acceptance`;
- captured outputs survive reentrant newer writes: `owner-row host reentry leaves newer work pending and preserves outer outputs`, `native lane cuts retain newer reentrant writes without scalar snapshots`;
- host errors remain terminal/unacknowledged and disposal releases cut buffers: the row and lane host-failure/disposal tests in these two files.

No new test code was needed for this exact extraction: these tests execute both route call sites and assert the acceptance boundary the helper centralizes. The stage leaves the route-specific fail/retry machinery outside the helper.
