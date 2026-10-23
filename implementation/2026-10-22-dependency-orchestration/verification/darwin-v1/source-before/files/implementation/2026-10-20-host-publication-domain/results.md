# Shared host publication domain: source and results

Basis: local main `3b6303d3ec52906b1eb67611e94a9fc7eab1f084`, MIT, origin https://github.com/thejustinwalsh/r3act.git. No push or PR occurs. See [design](design.md), [primary review](source-review.md) and [protocol](protocol.md).

## Implemented contract

One WeakMap keyed by exact VDOMHost object replaces the gap between root-local application barriers and individual queue locks. Several roots/containers and separate native queues may share a host. A group claims its domains all or none before application; contention stays pending, including contention created between preparation entries or by final validation. Distinct hosts outside a failed group remain independent. No domain ordering registry, token registry, new source versions, eager tree copying or public claim/partition API is added.

Existing private candidate receipts carry the group claim. Standalone candidates hold their claim from host application through publication or failure; pre-host discard remains legal, post-host discard remains forbidden. The generic queue gains precommit admission and lease release. Partial host failures quarantine touched domains, while its existing conservative policy terminates every member of a failed group. Managed accepted pointers and exact acknowledgements retain their existing authority; newer actions and per-root histories survive.

One lazy waiter records whether an explicit flush was requested. Direct intents/explicit flushes resume after availability; automatic Store work still uses the configured scheduler. Opaque bodies do not run on a busy direct path. Resource-suspended intents remain parked. Safe unwind borrows the existing claim for synchronous same-root teardown, preserving original and cleanup errors; another root's physical teardown waits. A throwing physical removal quarantines the host. After a public candidate-validation callback, private lifecycle and full-tree base checks reject disposal/revocation before a writer begins. Healthy siblings remain usable when rejection occurs before application.

Arbitrary host mutations cannot be rolled back, custom setters may observe intermediate physical writes, and distinct host instances sharing external objects remain caller-managed. This is no cross-renderer visual-atomicity or React-island commit guarantee.

## Immutable baseline and consolidated gates

The [old-source characterization](verification/baseline-v1-supervisor.json) runs once, exit 0 in 0.320 seconds. It observes a nested second-root write and accepted advance before the first writer throws, followed by another unquarantined second-root update. All 325 archived source rows and the characterization remain unchanged; [integrity receipt](verification/baseline-v1-integrity.json).

All four consolidated runs remain preserved:

| Run | Result | Meaning |
| --- | --- | --- |
| [Darwin-v1](verification/darwin-v1/receipt.json) | FAIL, 59/61 phases | Eighteen reported runtime failures expose delayed same-root cleanup and scheduler bypass; compiled refusal regex misses `failure`. |
| [Darwin-v2](verification/darwin-v2/receipt.json) | FAIL, 60/61 | 1076 runtime tests pass; fresh-host fixture recovery omitted its required custom property writer. |
| [Darwin-v3](verification/darwin-v3/receipt.json) | PASS, 61/61 | Pre-final-recheck source; its installed proof and sole timing pair retain this scope. |
| [Darwin-v4](verification/darwin-v4/receipt.json) | PASS, 61/61 | Corrected source, including disposal from public validation before any update writer. |

Final v4 passes **1077 runtime tests**, **83 Rust tests**, **42 compiled fixtures**, **20 actual Three cases**, three retention checks and thirteen package checks. All 1351 runner inputs match before/after each gate; each archives 1361 source/context rows. V4 captures 233 fixture artifacts and fresh packages. Raw UTC/numeric supervisors retain 51.213/49.456/48.157/49.342 seconds, with exits 1/1/0/0 and no deadline stops. Existing semantic assertions remain intact.

The new actual Rust/OXC fixture checks source/owner/revision registration, then emits runnable TSX through Vite/OXC. It exercises shared Three roots and separate queues, an all-or-none mixed DOM/Three group, old accepted snapshots inside writers, deferred unknown bodies, independent hosts, retained identities, partial-failure quarantine, cleanup and fresh-host recovery. Authored/transformed/emitted/result-or-failure artifacts remain archived. Additional runtime cases cover candidate pauses, preparation-time contention, explicit versus automatic scheduling, immediate disposal eligibility and throwing teardown.

## Corrected-source installed proof

[Build proof-v2](proof-v2/build-proof.json) passes 19/19 assertions, including four public installed publication-domain controls and six resource-lifetime controls. Five fresh tarballs, 26 authored inputs, four frozen comparison sources, 3168 installed files and 1361 staged source/context rows are bound. Core and host exports resolve into the isolated installed graph. Node conformance controls precede browser construction.

The existing async Native application, scene, controller and React comparator retain their prior bytes. Native app/scene revisions remain `native-v1-f202b4a94279cb6c` / `native-v1-7ef9e248f2166c23`, with four/three lowered hooks and matching owners. React Projection/Result/App emit actual `_c(14)` / `_c(14)` / `_c(23)`. Packaged Darwin ARM64 compiler SHA-256 is `458498f59bca4904718114168142a187ca2e48f85e4124bb63e08aa4e498933c`; generic plans gain no purity.

[Untimed proof-v2](proof-v2/proof-pair-one-shot.json) passes 27 main, four cancellation and three immediate-disposal stages per arm. All 26 main identity checks per arm hold; fallback additions are zero. Retained A, fork divergence/convergence, late A/B rejection, C acceptance across DOM/Three and twenty urgent actions pass. Native lifecycle cleanup balances 2/2 and React effects 4/4 under their own contracts; exposed roots, interests, hosts and listeners clean up, owned assets release and borrowed assets survive host disposal. All 9209 hash checks match before/after; both contexts and Chromium close with empty error/cleanup arrays. Prepare/proof supervisors exit 0 in 4.600/6.588 seconds.

## Sole timing pair: pre-correction source only

The [proof-v1 timing pair](proof-v1/timing-pair-one-shot.json) completed before the final lifecycle recheck. It is preserved for its archived v3 source only. Corrected v4/proof-v2 source has **no timing run or inherited timings**; no second timing authorization exists.

| Twenty urgent dispatch-to-observer intervals | Native ms | React ms |
| --- | ---: | ---: |
| First | 1.4 | 0.5 |
| Median | 0.6 | 0.2 |
| p95 | 1.2 | 0.5 |
| Sum | 15.8 | 5.4 |
| C settlement to observer | 0.7 | 0.6 |

Native is slower in this fixed Native-first observation. Observed quantum is about 0.1 ms. Twenty dependent near-floor observations, observer/harness work, fixed order, controlled providers and unequal JavaScript graphs (2731914/1065024 bytes for the measured builds) establish no CPU, population-tail, cold/setup/allocation/retained-memory, physical input/presentation, network-frontier, contention-cost, independent-device or release-budget qualification. The unchanged browser workload does not isolate shared-host contention. Corrected untimed build JS sizes are 2732238/1065024 bytes. The sole timing supervisor exits 0 in 6.237 seconds; there is no favorable retry.

Both pre-correction browser phases and corrected untimed proof use bounded, interruptible, headless GPU-disabled exact offline synthetic HTTPS replay. No project server or VM starts.

Receipt SHA-256:

- Corrected build: `bc22f5156f6a82c7500a4c75d872e598539870a2471be7972ad6993fbd5afd47`.
- Corrected input lock: `71544490abba80253e193a9f32e36dd48f7ecec184d8af5289935c4e3c6662fe`.
- Corrected untimed proof: `6680c59d8f99a48a3e6fe2a7cf113b553ba2fa85561003a59fe713aaabfcd1df`.
- Pre-correction timing: `dc55d3ce199279197011059fa2371d39818b8ee9cf72c855c9573569f4c66a16`.

Final results, guide/checkpoint and notebook updates are post-run documentation. Three fixed tracked cache outputs are restored to their historical bytes after new outputs are archived in gate fixture-artifacts; all 936 fresh cache evidence entries, including four negative-fixture symlinks, are retained. Archived source and historical receipts remain unchanged.

## Remaining scope and memory

The full-plan first pass remains active. Release performance, cold/memory budgets, current other-platform and independent-device requirements remain open. Human participants remain zero with no maintenance advantage claimed. Historic stable-binding wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain their source scopes. This finite semantic repair establishes no universal compatibility, performance or leak-absence claim.

Apple tooling, storage and logs remain on Depot. Saved user/service defaults are one CPU, 256 MiB/container and 512 MiB/build. The [process readback](verification/environment-readiness/vm-process-readback.json) finds no matching running VM; startup permissions and effective VM caps remain unverified. No memory increase or administrator prompt occurs. The original completion audit's overly broad Darwin-coverage inference is preserved with its byte-level corrective supplement: all 840 basis product inputs matched the previous passing gate, while historical Linux evidence remains older source.
