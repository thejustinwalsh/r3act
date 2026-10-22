# Three resource lifetime: source and results

Basis: local main a81bafbf3993fc8cbfee0b053efc4e7cf82fa98b, MIT. Origin remains https://github.com/thejustinwalsh/r3act.git. No push or PR occurs. See [design](design.md), [primary review](source-review.md), [public reference](../../docs/three-host-reference.md) and [installed protocol](protocol.md).

## Implemented ownership and cleanup

The existing owned-resource Set is replaced by one host-local resource lifetime Map. Multiple factory geometry/material handles and primitive aliases share a lifetime within that host. Host-owned resources release once after the final known handle, including a borrower admitted before ownership. Borrowed-only assets remain caller-owned. Diagnostics count distinct admitted owned resources; private shared fallbacks retain their previous host-teardown policy. There is no global resource registry, new World/version model, traversal change or compiler purity inference.

Handle retirement independently attempts attachment restoration and resource release. Attachment state unlinks despite a property read failure; disposal is marked before listener callbacks. Original creation/restoration and cleanup errors are preserved together. Duplicate live Object3D handles cannot overwrite event ownership; foreign handles cannot retire another host's ownership. Disposed resources cannot reenter this host.

Reentrant factories or metadata getters cannot admit a handle after host retirement. Args are read once before invoking a factory, then attach/primitive metadata is captured before final callback-free admission. A failed creation cleans a fresh owned result while preserving known borrowed assets. One in-flight creation count retains borrowed records until all factory frames return, then clears the lifetime Map. Direct mesh args/property references and different hosts retain caller-managed borrow lifetimes; arbitrary host writes and GPU cleanup callbacks have no general rollback guarantee.

The immutable [baseline](verification/baseline-v1/supervisor.json) executes old source once. It reproduces disposal while another handle remains live and skipped owned cleanup after restoration throws. All 331 manifest rows match afterward, including 325 archived source files. Its passing assertions characterize old defects, not acceptance of current semantics.

## Consolidated verification and preserved failures

[Darwin-v1](verification/darwin-v1/receipt.json) preserves 56/60 passing phases: definite-assignment TypeScript errors fail tooling/package build, and the new fixture expects camelCase revision metadata absent from generic component registration; package consumption skips. [Darwin-v2](verification/darwin-v2/receipt.json) preserves 59/60: the actual host-failure refusal occurs, but a test regex misses the word failure. Fixes use explicit never-returning cleanup control flow, inspect the actual semantic plan and match the documented refusal. No behavioral assertion is removed.

[Darwin-v3](verification/darwin-v3/receipt.json) passes **60/60 phases**, **1066 runtime tests**, **83 Rust tests**, **41 compiled fixtures**, **20 actual Three conformance tests**, three retention checks and thirteen package checks. All 1324 runner inputs match before/after, with 1334 source/context files archived. There are 229 current fixture artifacts and 530 fresh package files. Raw logs, numeric exits and UTC supervisors retain all three gates (41.332/46.982/47.041 seconds). The historical phase name three-host-7 now contains twenty tests; the raw log is authoritative.

The new Rust/OXC fixture checks actual schema/source/revision/owner IDs against registered and exported plans. One ThreeHost spans two scene roots plus a grouped DOM root: shared geometry/material remain live through keyed removal and first-root teardown; host identities survive coherent updates; final aliases dispose once; borrowed geometry survives. An injected second host writer failure leaves all managed accepted snapshots/frontiers old and prevents later publication, followed by explicit cleanup. Original/transformed/emitted/proof-or-failure artifacts remain archived.

## Fresh installed proof and one descriptive pair

[Build proof](proof-v1/build-proof.json) passes all eighteen assertions, including six public installed resource lifetime checks. Geometry/material aliases pass both release orders, a borrower pins later ownership, and borrowed-only host teardown performs zero disposals before the caller's one disposal. The export resolves to installed @r3act/host-three/dist/index.js. The Node control does not warm the browser.

Five fresh tarballs, 25 authored input rows, four comparison sources, 3163 selected installed files and 1334 staged source/context rows are bound. The existing async app, scene, Native controller and React comparator retain their preceding bytes. Actual Native app/scene revisions remain native-v1-f202b4a94279cb6c / native-v1-7ef9e248f2166c23 with four/three lowered hooks and matching owners. Generic plans gain no purity. React Projection/Result/App emit actual CompileSuccess and _c(14)/_c(14)/_c(23). Darwin ARM64 packaged compiler SHA-256 remains 458498f59bca4904718114168142a187ca2e48f85e4124bb63e08aa4e498933c.

[Untimed proof](proof-v1/proof-pair-one-shot.json) passes 27 main, four cancellation and three immediate-disposal stages per arm. Retained A, divergent/convergent fork B, catalog reuse, one Native B execution, late A/B rejection, C acceptance across DOM/Three and twenty real urgent actions pass. All 26 main identity checks per arm hold and fallback additions are zero. Native activation cleanup balances 2/2 and React effects 4/4 under their own lifecycles; owned resources release once, borrowed assets survive and exposed host/listener/interest counts clean up.

The sole Native-first [timing pair](proof-v1/timing-pair-one-shot.json) records:

| Interval | Native ms | React ms |
| --- | ---: | ---: |
| First urgent dispatch to matching observer | 1.2 | 0.5 |
| Twenty-click median | 1.0 | 0.3 |
| Twenty-click p95 | 1.8 | 0.5 |
| Twenty interval sum | 22.6 | 6.3 |
| C settlement to matching observer | 1.2 | 0.6 |

Native median/p95 are higher. Observed timer quantum is about 0.1 ms; near-floor ratios are not decision-grade. Delivery, scheduling and earlier observer/harness work are included; timestamps precede match inspection, with paint excluded. Fixed order and twenty dependent observations give no population-tail or significance claim. Controlled providers and a Three object tree without WebGL establish no network-frontier, physical input/presentation, CPU, cold/setup/allocation/retained-memory, independent-device or release-budget qualification. The pair does not isolate alias reference-count or disposal cost. Unequal-feature JavaScript graphs are 2716087/1065024 bytes.

Both browser phases match all 9140 hash rows before/after, replay exact offline synthetic HTTPS assets, close contexts/Chromium and have empty error arrays. They are headless, GPU-disabled, interruptible and bounded. Installed preparation/proof/timing take 5.143/7.303/6.602 seconds, with numeric exit 0. There is no favorable timing retry or duplicate integrity audit.

Receipt SHA-256:

- Build: 75fe92afac66a1d26e21ffbcf41c695370e89fb6ed23f2c08eaaee620dd647bf.
- Input lock: 065ede0b9c640972e364466bbb384dbcf5a700195df5e192cbd7d11f95ec6e6f.
- Untimed proof: 27709f5c2f7c9050c9bc73cc170af8601e5accb2d3c478b7ce581dec20253ee2.
- Timing: da0e1a94e464bbf54add49335cd526c3201ebe1f24e56e55d3674ff7984866f9.

The timing authorization binds this exact chain. Final reports, guides, README and notebook are post-run documentation, not pre-execution inputs. Original failures, archived sources and historical manifests remain unchanged.

## Remaining scope

The full-plan first pass remains active. Frozen release performance, cold/setup/allocation/retained-memory budgets, current other-platform execution and independent-device qualification are still open. Human participants remain zero; no maintenance superiority is claimed. Historic stable-binding wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain scope. This ownership repair is not a speed result or a proof of universal resource/GPU leak absence.

No VM, project server, administrator prompt or memory increase occurs. Saved Apple defaults remain one CPU, 256 MiB/container and 512 MiB/build, with tooling/data/logs on Depot. The service's startup permission prerequisite and effective VM limits remain unverified; this slice does not resolve that external condition.
