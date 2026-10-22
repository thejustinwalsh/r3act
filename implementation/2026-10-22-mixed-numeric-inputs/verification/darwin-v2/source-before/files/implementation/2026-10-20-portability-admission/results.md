# Portability admission and remaining acceptance

Basis: clean main `ecff7e400151ba0245558e95f4e010e1ca2498fb`, MIT. The previous goal turn made progress: it committed the installed process/lifecycle collector, completed correctness and startup/heap observations, and preserved an incomplete allocation pair. This continuation reviews the remaining real prerequisites rather than adding an optional feature or repeating a failed measurement.

Two Sol medium reviews examined the current finish line and Apple container source; Luna captured bounded read-only host evidence. No runtime/compiler/configuration change, service/VM start, administrator prompt, browser, benchmark or test ran in this unit. Existing correctness and performance records retain their own source identities.

## Actual installation state

[Readiness-v1](evidence/readiness-v1.json), SHA-256 `9f822cdb6cdcd98f222dc8c36dcae3229646add346f8d58b42dafdde283573e3`, records:

- Apple Container CLI 1.5.0, commit `d265d66`; wrapper, tooling, data and logs remain at their existing Depot locations.
- `/Volumes/Depot` is owned by root:wheel, mode `0775`.
- The GUI launchd query returns 113: `com.apple.container.apiserver` is not registered. Scoped process queries find no matching apiserver, Colima or QEMU process; these are bounded observations, not an inventory of every possible process name.
- Active user and service TOMLs retain identical hash `e70aa724745aea6808994e8ed31091894339b623543e51b4e57f453878586e7d`: one CPU, 256 MiB/container, 512 MiB/build, Rosetta disabled. Effective VM limits remain unverified.
- The existing migration record reports a prior launchd plist ownership/permission failure and unsuccessful administrator chmod. This unit does not reproduce startup or relabel that old failure as a new attempt.

The concrete pending local action is the previously prepared **nonrecursive** `sudo chmod g-w /Volumes/Depot`, performed by the user in Terminal. It removes group-write permission from the volume root; it does not recursively change contents. No tool approval reviewer rejected this action. The missing authority is macOS administrator execution, and a previous native authorization prompt did not complete. Another prompt is not launched here.

After the user reports completion, first reread the actual mode and service state. Then a bounded service start can verify the live daemon's app/install/log roots before any owned low-memory VM is admitted. Requested flags and a successful CLI exit alone cannot establish effective limits or the daemon's actual data root. Preserve an actual resource failure before increasing a workload cap. Do not start the old high-memory Colima profile.

## Why the HOME alternative was declined

The [pinned source manifest](evidence/apple-1.5.0/manifest.json), SHA-256 `72565aff9a3d4010f07e97139e08cba497d697cc8236fc504ba17afb357e6fe8`, preserves nine source files and the upstream LICENSE at Apple commit `d265d669ecae041bf338cb3b39c4118316d138f0` (tag 1.5.0). These archived upstream files retain their included upstream license.

[SystemStart](https://github.com/apple/container/blob/1.5.0/Sources/ContainerCommands/System/SystemStart.swift) writes the API plist beneath appRoot. [ContainersService](https://github.com/apple/container/blob/1.5.0/Sources/Services/ContainerAPIService/Server/Containers/ContainersService.swift) places an ordinary container at `appRoot/containers/<id>` and supplies that same directory as the runtime plugin-state root. [PluginLoader](https://github.com/apple/container/blob/1.5.0/Sources/ContainerPlugin/PluginLoader.swift) writes its `service.plist` there. [RuntimeService](https://github.com/apple/container/blob/1.5.0/Sources/Services/RuntimeLinux/Server/RuntimeService.swift) creates the runtime bundle at that path, and [Bundle](https://github.com/apple/container/blob/1.5.0/Sources/ContainerResource/Container/Bundle.swift) clones ordinary `rootfs.ext4`, `initfs.ext4` and `kernel.bin` into it.

Consequently, moving only executables leaves the Depot plist path unchanged. A HOME appRoot would place ordinary VM disks in HOME; symlinking its entire `containers` directory back to Depot would also put runtime plists through Depot. The inspected public create path does not provide an ordinary rootfs-directory override. An internal override exists, but is not a supported public storage setup. A HOME-only service smoke could produce a narrower success without meeting the user's VM-storage requirement, so it is not performed. Original Depot data, wrapper, symlinks, permissions and saved memory settings remain untouched.

## Current master-plan acceptance audit

The source review found no further named mandatory source/ABI gap within the **documented private-alpha subset**. That subset and passing tests do not redefine the original release objective.

| Finish-line clause | Authoritative current evidence | Remaining limit |
| --- | --- | --- |
| (a) Native TSX subset, diagnostics, HMR | [Authoring reference](../../docs/native-authoring-reference.md), mandatory Rust/OXC/Vite sources, actual compiled and installed fixtures in the latest [63-phase gate](../2026-10-20-process-lifecycle/verification/darwin-v1/receipt.json). | Coverage is the documented native subset; uncertain revisions remount. No broad React compatibility claim. |
| (b) Retained VDOM, shared authority | `component_state_runtime`, `vdom_snapshot_runtime`, World/Store and publication-domain sources; 1093 Deno/84 Rust tests and actual compiled fixtures. | Tests provide bounded evidence, not a formal proof of arbitrary extension behavior. Whole-tree guards remain on replacements. |
| (c) DOM/Three accepted views and failure | Publication lifecycle/callback/cleanup tests, group-host admission, shared-host domain tests, Three resource/ownership conformance and installed episodes. | Arbitrary host rollback, raw setter observations and cross-renderer visual atomicity are excluded. |
| (d) Named realtime qualification | Complete installed lifecycle and async applications pass output, identity and exposed cleanup. Startup/heap observations are source-bound. | **Not achieved:** no frozen numeric cold/retained-memory acceptance budget for the named app, no current independent-device result, Native losses in bounded comparisons and qualified dense FAIL. The allocation pair remains INCOMPLETE. |
| (e) Local structure or honest fallback | [Closed-row evidence](../2026-10-20-closed-collection-rows/results.md) covers identity, lifetimes, forks, explicit scoped inserts/replacements and conservative generic fallback. | The measured pair is slower for Native; no integrated structural speed qualification. Ordinary flush insert/replace remains explicitly generic. |
| (f) Suspense/transitions | [Installed async proof](../2026-10-20-closed-collection-rows/proof-v1/proof-pair-one-shot.json) and [interaction report](../2026-10-20-installed-async-ux/results.md) cover equal preload, urgent button actions, retained UI, forks, stale rejection and cleanup. | Physical input-to-presentation and release latency remain unqualified. Waterfall avoidance is not a React completion or CPU-parallelism win. |
| (g) Host extension and packages | Public DOM/Three/custom-host APIs, generated types, actual compiler and five installed local tarballs; [package guide](../../native-package-integration.md). | Current-source Linux/other-runner execution is missing. The old Linux guest is the same Mac and different source; it is not current or independent-device proof. Hosted workflow source is not evidence of a completed run. Names are unpublished/unreserved; registry publication is not silently added as a prerequisite. |
| (h) Maintenance evidence or no claim | Zero human participants; no maintenance-advantage claim. | Human evidence is required if that advantage is claimed. AI extensions are not a human study. |

Workers, streams, CRDT, universal speed and broad React renderer compatibility remain separately gated extensions, not invented tasks to fill the qualification gap. Historic stable-binding wins, qualified dense FAIL, exhausted Recording A and physical HOLD remain intact. Current timing/profile observations do not authorize a speculative layout or selector change.

The full goal remains unachieved. The user has been asked for the manual Depot permission prerequisite and a second physical device. Those answers are pending; elapsed time is not approval. No machine, target device, new passing budget or performance success is invented. Product qualification and any decision changing the frozen speed thesis remain separate from completing source features.

[Final artifact review](evidence/final-integrity.json) verifies all ten upstream file hashes and 1286 non-Markdown inputs against the prior consolidated gate, with no product-source diff. This is an integrity review, not a new test, VM, timing or release-acceptance run.
