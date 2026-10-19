# Installed HMR integration: offline checkpoint

This unit is incomplete. Browser HMR conformance and the single matched build observation have not run. The full master-plan first-pass goal remains active; no release or performance qualification follows.

## Implemented boundary

`nativeReactPlugins` replaces the root configuration's manual native-file exclusion regex with source-derived exclusions supplied through public React plugin options. Native-only Vite imports remain independent of React/plugin-react. Membership changes restart Vite; revision/instance-stamped invalidation traverses dependent native modules while respecting React Refresh boundaries. Native state preservation across uncertain edits is not promised.

Affected roots retire pending queues/tasks, resource and Store interests and effects after active host work. Unrelated known roots remain live. The existing semantic registry and prepared-candidate authority govern code lifetime; accepted host trees remain caller-owned until disposal. Cleanup attempts preserve the original host error and still attempt deferred disposal. Full-tree guards, exact acknowledgements, newer actions and generic fallback remain.

## Current correctness evidence

[Darwin-v5 receipt](verification/darwin-v5/receipt.json) passes 40/40 steps: 1013 runtime tests, 64 Rust tests, 24 actual compiled execution fixtures, two separate source proofs, two plugin checks, artifact conformance, seven Three cases, both retention checks and ten fresh package checks. All 928 captured inputs match before/after; 936 raw input/context files are archived before commands. The base is main `8dd4503a09727de1ef4e123e368ce9b04af06a54` plus the archived working changes, not an assertion that those changes already existed in that commit.

The debug compiler remains `52c0021bd5bffa67de3472a0139c85159483ae20f1482dd7f8ac8c6f4160ea7f`. Fresh installed packages capture release compiler `6d727e1351ccb44ee29caf26f91fd0ef3ed7de4f40f41ccc1da435aed7857750`, Rust target aarch64-apple-darwin. Earlier Linux receipts predate this source.

[Installed proof-v2](proof-v2/build-proof.json) typechecks and builds the mixed public-import DOM/Three/React app outside checkout from five fresh tarballs. It archives four transforms and two assets, including 3,282,985 unminified JavaScript bytes. This proves installed compilation, not browser execution or equivalent-feature bundle size.

## Preserved failures and protocol correction

The [initial launch failure](verification/launch-failure-v1.txt) precedes source archival. Darwin-v1 rejects two TypeScript issues; v2 rejects five runtime assertions/fixtures; v3 rejects lease instrumentation that changed an admission capability's identity. V4 passes, but the separate installed proof-v1 rejects the helper's readonly-versus-mutable factory typing. V5 includes that correction. See [primary review](source-review.md); no failed run is removed.

Proof-v2's untimed counter proof rejects its numeric-program expectation. Actual output tracks Counter state but uses two opaque generic sinks and no numeric operations: its event closure and custom-component state read prevent closed admission. The HMR/composition unit does not require a new numeric specialization. The comparison keeps equal authored sources and must explicitly verify generic Native output against React Compiler output before any timing. This correction follows source review, with no measured results available to influence it.

[Fresh proof-v3](proof-v3/pair-proof.json) passes the corrected untimed contract. Native revision is `native-v1-014f8aad83a62cf1`, with one tracked state source, two opaque sinks and zero numeric operations/edges. Actual React Counter/Readout output contains `_c(8)`/`_c(2)` and CompileSuccess events. Both process exits are zero and both elapsed fields are null. Nineteen source rows match before/after; the harness also verifies five tarballs, 1621 selected installed-package file records, compiler bytes and application transforms/assets. The fresh [application build](proof-v3/build-proof.json) again passes. Counter bundles are 635,813/570,034 unminified bytes Native/React, not equivalent-feature or runtime evidence.

Only the pair harness and its README/design change after the v5 product gate; proof-v3 archives that delta. Counter authoring, runtime, compiler, public types and root configuration remain v5-identical. Current results/review/checkpoint prose follows the gate. There is no performance result or authorization, and the browser gate remains unrun.

The [final offline audit](evidence/final-offline-audit.json) records those source deltas and verifies proof-v3's source, selected installed files, compiler and captured assets. It explicitly distinguishes archived gate context from later checkpoint/master-plan prose.

## Pending gates and limits

The installed HMR browser protocol must prove React local-state retention without native navigation, native reload/remount, old pending-work cancellation and balanced DOM/Three/React/borrowed-resource teardown. No claim about those browser results is made here. No performance authorization or measurement exists. Whole-root checks and partial-host-failure quarantine remain; cross-renderer visual atomicity is not established.

AGENTS requires loading `portless-dev-servers` before a project server starts. That exact skill is absent; the human's replacement-skill choice remains pending. No server was started. Offline work continues independently. Browser workloads remain bounded, headless and interruptible.

No VM ran. Apple defaults remain one CPU, 256 MiB/container and 512 MiB/builder; Depot service permissions still block startup, so effective limits are unverified. Historical stable-binding wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain their scope. Cold/retained-memory, current other-platform, presentation, independent-device and broader async/structural obligations remain. Human participants remain zero; no maintenance advantage is claimed.
