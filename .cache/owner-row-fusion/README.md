# Staged prepared owner-row executor fusion

This staged patch changes only `src/vdom_snapshot_runtime.ts` and the focused
`src/prepared_owner_row_program_test.ts`. The frozen live VDOM source remains
unchanged.

## Change

- Fuse dependency lease validation with scratch capture and explicit changed
  value overlay into one slot pass. All records complete this pass before any
  `ScalarSource` mirror, projection, or host write.
- Store each changed input's validated row record in a reusable parallel scratch
  buffer. Fanout collection reuses it instead of repeating the token WeakMap
  lookup.
- Track only the successfully written scratch prefix, so an early invalid input
  does not clear across the full supplied count. Clear that reference prefix in
  `finally`; disposal clears the buffer immediately when inactive and lets the
  active call clear it after cancellation.

No lease or token validation was removed. Fanout order, projections-before-host
writes, duplicate conflict behavior, source mirroring, cancellation, and
terminal host-failure handling stay in the same sequence.

## Structural work-count proof

The staged test uses 1,000 one-slot rows and temporarily counts
`WeakMap.prototype.get` during only the executor call. Against the unchanged
frozen source and identical test, the baseline performs 2,000 WeakMap reads and
reports 7,000 `preparedNumericRowWorkVisits`. The staged copy performs 1,000
WeakMap reads and reports 6,000 visits. The work-visit counter does not include
the new per-input reference store and prefix-clear operations; this is not a
claim that total operations, memory, or CPU time decrease. The measured lookup
count falls by half, and the executor visits one fewer dependency slot per row.
The reusable array keeps high-water capacity with cleared entries.

## Verification

Both commands use the frozen dependency lock and staged copies:

```sh
deno test --frozen --config deno.browser.json .cache/owner-row-fusion/baseline/src/prepared_owner_row_program_test.ts
deno test --frozen --config deno.browser.json .cache/owner-row-fusion/stage/src/prepared_owner_row_program_test.ts .cache/owner-row-fusion/stage/src/native_prepared_row_cut_test.ts
```

Baseline: 12 passed. Staged: 19 passed. The staged suite covers invalid first
input, later conflicting input, stale untouched lease rejection before
mirroring, successful cuts after declines, projector errors, reentry, disposal
cancellation, Root retry/publication, host failure, and the new operation-count
assertions. Scratch capacity has no public diagnostic, so the repeated-cut test
checks subsequent results rather than reporting the private buffer length.

## Review artifacts

- `vdom.patch`: patch against the frozen source.
- `tests.patch`: focused test instrumentation and reduced-work assertions.
- `stage/src/vdom_snapshot_runtime.ts`: staged implementation.
- `stage/src/prepared_owner_row_program_test.ts` and
  `stage/src/native_prepared_row_cut_test.ts`: staged test inputs.
- Frozen baseline source SHA-256:
  `a4e7cff53fec9db00ffc2f514a323b84bfbf47023c3d496cdd1e399deca864dd`.

No live source, build, or archive file was edited.
