# Changed-slot capture audit

## Result

Withhold the proposed changed-slot lease-check/read reduction. `executePreparedNumericRows` accepts readonly array types, but those types do not prohibit accessor-backed arrays or Proxies. Its per-input loop reads `values[index]` while it proceeds through the cut. A later getter can synchronously mutate a `sourceLease` or `columnLease` that was checked for an earlier changed slot. The later per-row dependency validation is therefore observable and necessary for the current public behavior.

The concrete counterexample is in `baseline/src/changed_capture_getter_regression_test.ts`:

- For one row, reading the second changed value revokes the first changed slot's source lease. The baseline returns `null`; it does not mirror sources, run projectors, or write the host.
- For two rows, reading the second row's changed value revokes an untouched dependency of the first row. The baseline returns `null` before mirrors, projectors, or host writes.
- A later values getter throws. The error propagates, with mirrors, projectors, and host output unchanged.

The first two cases fail the stale-lease invariant if the row pass simply trusts the earlier per-input validation and skips its dependency lease check. Retaining a second lease check would retain the cost this change was meant to remove. No optimization patch was staged.

## Verification

Command:

```sh
deno test --frozen --config deno.browser.json .cache/owner-row-changed-capture-stage/baseline/src/changed_capture_getter_regression_test.ts
```

Result: 3 passed, 0 failed. A first test draft had incorrect imports and failed typechecking; it was corrected before this passing run. No live or staged runtime source was modified.

Baseline `src/vdom_snapshot_runtime.ts` SHA-256: `00d8516d2164d1f212e804dd3a579bc13588158eb361e756e2ebd25753b73aab`.

Regression test SHA-256: `398c27ae2c160050d0c2cf1e47fdee378cd0360ebbdc1cdb20bec1ab375c8569`.
