# Primary portability integration review

Basis `4254255980beb1056705d3d489dd0872f6b4f486`; the worktree was clean before this unit. The complete master plan, latest checkpoint, handoff, notebook/paper conclusions, original native-platform contract, Linux delivery result and current host-copy result were read. This is source review, not a current Linux pass or a new runtime performance result.

## Shared selection and transfer

Three separate selection loops become one shared authority: the platform runner, Docker host staging and Linux bootstrap import `scripts/native_verification_inputs.mjs`. The selected roots and current dated unit sources, examples, required root manifests/configs/license/README, frozen Deno lock and existing platform benchmark controls are copied consistently. Context availability is explicit. Historical baseline/proof/evidence trees and dependency caches remain on disk/in Git but are excluded from product delivery. The required Deno lock is an explicit exception to the verification-directory exclusion.

Required roots/inputs fail when absent. Selected symlinks and unexpected file kinds fail instead of following them. Relative paths and resolved parents remain confined. Existing destinations must be empty before any copy; source-nested destinations require an excluded proof/evidence segment and cannot enter managed dependency/Git paths or contain selected inputs. Sequential copy uses exclusive creation. Each file's source/destination bytes are rehashed, then the entire selection/context inventory is re-enumerated and files are revalidated/rehashed before returning. This detects observed drift and inventory additions/removals; it is not an OS-level atomic filesystem snapshot against an arbitrary concurrent writer. Subsequent gate/proof before/after hashes remain necessary.

Linux ownership labels, volume confinement, sourceCommit, launcher/helper/toolchain locks and failure/archive/interrupt cleanup remain. The same helper is checked against host and copied locks. One CPU/256 MiB/Cargo job remains explicit in workload launchers; no daemon VM is started or resized. No historical manifest is rewritten.

## Diagnostic versus current product

The completed host-copy baseline still has its immutable Darwin runtime/compiler archive and recorded stale-value observation. Its explicit diagnostic entry point remains. It is retired from routine cross-platform product gates: a Darwin binary is not a Linux compiler. The current fixed host-copy fixture and concrete Three tests stay in the consolidated gate.

Review also found unconditional old-baseline reads in the fixed numeric-owner fixture. Those reads/hash assertions now occur only in explicit baseline mode; fixed mode uses and binds the actual newly built native compiler, with baseline receipt fields null. All fixed behavior assertions remain. Collection/host-copy diagnostics already guard their archive reads; publication callback baseline strings describe expectations rather than unconditional archive access.

## Evidence boundary and installed consumer

The consolidated gate will run from a fresh canonical staged tree outside the checkout, with source lock and declared commit preserved, not merely from the original checkout where omitted files can hide. No baseline binary or dependency tree is transferred. The normal pinned toolchain builds/tests/packages within that tree with one Cargo job; source and raw artifact archives land in the new unit. This proves the transfer route on the executed host, not another ABI or independent hardware. The staged native package output can be hash-verified into the reconstructible live package cache for the subsequent fresh consumer without changing package manifests or historical evidence.

The installed consumer reuses the last verified ordinary DOM/Three scene, including typed mutable rotation and a retained React helper group. It binds the canonical staged sources, actual native compiler manifest and five tarballs. Actual React Hot memo output is required. Untimed Native/React production builds and ten-stage browser correctness precede authorization for one fresh-process Native-first build pair; transforms/assets/metadata must equal proof builds. Runtime timing is removed. Primary review moved the build end timestamp to child completion before asynchronous supervisor log writing, so the interval does not include writing those logs. Pipe draining and process setup remain inside the stated interval; caches may be warm. No general runtime/cold-memory/size/presentation/tail/device advantage follows.

## Installation state

Read-only commands find Apple API service stopped/unregistered, Depot root root:wheel mode 775, and `sudo -n true` requiring a password. The existing installer note calls for native administrator authorization to remove group-write from the volume root before startup; this review performs neither chmod/chown nor service/VM startup. Saved one-CPU 256 MiB/container and 512 MiB/build defaults remain, with effective VM limits unverified. No automatic approval review rejected an action; this is an operating-system privilege prerequisite.

The full-plan goal remains active. Current Linux/other-platform execution and authored realtime/async/cold/memory/lifecycle/performance/independent-device gates stay open; human participants remain zero and no maintenance advantage is claimed. Historic wins, dense FAIL, exhausted Recording A and physical HOLD retain scope. New selection/hash/copy I/O costs have no measured budget or speed claim. Source comments and modules remain bounded, with no runtime identity/version/publication changes.
