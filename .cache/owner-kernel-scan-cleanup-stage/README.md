# Isolated owner-kernel scan consolidation

This stage copies the current `src/` tree and `deno.browser.json`/`deno.lock` into `candidate/`. Only `candidate/src/vdom_snapshot_runtime.ts` differs from its copy baseline; the live file remained at SHA-256 `51ae16b99002c65729a1bd343845b60aa155b15f1d23bbbe1c7a5b5de8d27d5e` before and after staging.

The reviewable change is `staged.patch` (SHA-256 `5b4ff710d8dc534e5556610fdad46c97b4ca6b016b0afc652ccadeb968cdf29e`). Candidate VDOM SHA-256: `00d8516d2164d1f212e804dd3a579bc13588158eb361e756e2ebd25753b73aab`.

`#ownerRowRecordScratch` receives a dense append-only prefix within each cut: a record is appended exactly when its cut epoch changes, and the count increments at the same write. A nonempty validated dirty cut necessarily creates at least one record. Therefore index 0 supplies the initial program candidate. When every record has that same program and sink count, `#ownerRowRecordCount` is exactly the old `kernelRowCount`; it is also a safe output-capacity upper bound. A mismatch sets the candidate to `undefined`, continues dependency capture/validation, and uses the existing generic path.

The changed scope is one VDOM method. Root, World, compiler output, runtime types, public APIs, fixtures, and historical files are untouched. The entire `src/` tree was copied so staged tests import the candidate VDOM and the candidate copies of its runtime dependencies.

Focused verification command, run from `candidate/`:

```sh
deno test --config deno.browser.json --frozen src/vdom_owner_update_kernel_test.ts src/prepared_owner_row_program_test.ts src/native_prepared_row_cut_test.ts src/compiled_owner_update_program_metadata_test.ts src/owner_numeric_layout_test.ts
```

Result: **40 passed, 0 failed** in 224 ms. This covered compiled kernel staging/fallback/error/reentry, owner-row lease and scratch behavior, Root retry/acknowledgment, metadata validation, and numeric layout activation/removal.

`deno fmt --check src/vdom_snapshot_runtime.ts` was attempted before tests and failed because the copied file already contains broad formatting differences unrelated to this patch. No formatter was applied to avoid unrelated changes. The focused test command was then run separately and passed.
