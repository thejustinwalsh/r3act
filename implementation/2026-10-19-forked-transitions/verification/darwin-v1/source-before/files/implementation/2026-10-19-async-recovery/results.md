# Accepted error recovery

Native Suspense now retains its accepted error output during a pending retry without resurrecting an older success. The existing boundary history and expansion journal remain the only authority. Discard and enclosing-boundary rollback preserve accepted retention. Pending candidates remain publishable, and a new fulfilled resource starts the next primary lifetime. The installed example also treats expected queue cancellation during disposal as normal control flow.

Source starts at main `cfd50f1d8c497e6743299165c01ec0cbfe317008`. This is a finite recovery continuation of master-plan Units 5/8/9. It does not complete the full-plan first-pass goal.

## Correctness

[Darwin-v3](verification/darwin-v3/receipt.json) passes **38/38 steps**, **1007 runtime tests**, **64 Rust tests**, **24 actual compiled fixtures**, two separate source proofs, seven Three cases, both retention checks and fresh five-package consumption. All **905 runner inputs** match before/after. The automatic archive preserves those inputs plus eight context files (**913 raw files**) before commands. Earlier failed gates remain unchanged.

The [actual compiled recovery fixture](../../compiler/native_async_recovery_execution_test.mjs) executes DOM, a second DOM consumer and Three sharing one World. It checks accepted success, error publication, urgent Store progress, cancelled intent, ignored late provider settlement, new success and empty teardown. Primary/error lifetimes balance 4/4 and 2/2 across the two DOM consumers; Three resource balance and empty handles are asserted. A separate primitive closed-resource leaf verifies selected rejection fails its scoped cut, releases its hold and permits generic error rendering. The second DOM consumer is not an intentionally divergent fork-frontier proof.

Cancellation removes rendering intent, not chronological Store actions or provider work. The corrected workload passes resource identities through queued tree props; independent urgent state still uses the normal Store. It does not silently undo dispatched domain actions.

The debug compiler remains `52c0021bd5bffa67de3472a0139c85159483ae20f1482dd7f8ac8c6f4160ea7f`, target aarch64-apple-darwin. Current Linux execution and installed-browser example cancellation remain unverified; previous receipts retain their original source scope.

## Production and browser proof

[Proof-v2](proof-v2/build-proof.json) archives selected raw source and compiler bytes before the Vite command. Actual Native output has revision `native-v1-7205e5a4fd63daf8` and every expected owner registration. The recovery components remain generic; no closed fast-path admission is claimed. The separate primitive leaf's closed program is checked by the compiled fixture. Actual React Compiler output contains `Ready _c(4)` and `App _c(12)`.

Only the React comparator controller handoff changes after the full v3 gate: assigning its setter in a layout effect replaces a render-time module assignment. Exact proof-v2 sources and artifacts bind that final comparator. Native/runtime/compiler/example code remains identical to v3.

[Untimed browser behavior](proof-v2/browser-behavior.json) passes both arms with null timing intervals. The same provider inputs yield identical recovered output, urgent value 2 and no stale output. Pending success/error retention, explicit cancellation, late settlement, early disposal and balanced lifetimes pass. Final ready/error lifetimes are 2/2 and 1/1 per arm; early disposal is separately checked. Native owners/pending changes, React listeners and host children return to zero. Expected React rejection is caught exactly once; unexpected page/console/request errors are zero. All 492 before/after source/compiler/artifact rows match. Chromium is 153.0.8010.12, headless and GPU-off, replaying exact local assets through synthetic HTTPS without a server, network or TLS connection.

## Sole descriptive comparison

The [one authorized Native-first pair](proof-v2/browser-measured-one-shot.json) passes at **0.9/0.9 ms Native/React** from final retry provider resolution to the first matching MutationObserver. The observed timer quantum is about **0.1 ms** in both fresh pages. Output, lifecycle and teardown checks pass, with all 492 before/after integrity rows matching and no browser errors. No timing retry occurs.

This is one generic recovery interaction, including scheduling and observer delivery before paint. It is not CPU time, physical input-to-present, replicated median/p95, cold/setup/retained-memory, independent-device or broad async UX qualification. Neither arm has a speed advantage in this observation. Shared JavaScript is 534,638 bytes; combined size is not an equivalent-feature per-arm comparison. The 2,498,856-byte source map is archived and not loaded as application code.

## Preserved failures

| Receipt | Disposition |
| --- | --- |
| Darwin-v1 | Three failed steps: invariant AsyncResource<never> test inference; an incorrect fallback policy broke existing accepted-error retention; a cancelled-render fixture incorrectly expected dispatched Store actions to disappear. |
| Darwin-v2 | 1006 runtime tests pass; one existing manual pending-candidate contract fails because rejected primary children block publication. All 24 compiled fixtures pass. |
| Darwin-v3 | All 38 steps pass after retaining raw accepted error output. Existing assertions remain intact. |
| Proof-v1 | Vite exits 0 but required React App memo output is absent. Ready has four slots. No browser/timing follows this rejected proof. |
| Proof-v2 | Final controller handoff yields actual App memo output and passes untimed behavior. |

The primary's initial policy interpretation was wrong; preserved existing contracts guided the correction. The semantic-plan proof parser also resolves its named import alias rather than assuming an emitted local name. No performance attempt was used to select a favorable repair.

## Limits and remaining work

The full-plan first-pass goal remains active. Broader async/structural authoring, installed HMR/platform coverage, cold/setup/retained-memory/lifecycle budgets, presentation and independent-device requirements remain. This generic error-recovery fixture establishes no general fast-prop, visual-atomicity, React compatibility or maintenance advantage. Human participants remain zero. Historical stable-binding wins, qualified integrated dense FAIL, exhausted Recording A and physical HOLD retain their original source and scope.

No VM starts or memory increase occur. Saved Apple defaults remain one CPU, 256 MiB/container and 512 MiB/builder; Depot launch permissions still block startup and effective limits remain unverified.

The [bounded final audit](verification/final-audit.md) verifies archived bytes, receipts and the single comparator-only gate exception. The [post-documentation audit](verification/post-doc-audit.md) verifies the original 208 notebook cells and metadata, the appended recovery cell, local links and exactly two expected current gate differences: the comparator and post-gate review prose. The [primary disposition](verification/primary-final-review.md) accepts this finite scope.
