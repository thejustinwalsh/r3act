# A VDOM-First, Data-Oriented Runtime for Declarative UI

## Compiled numeric Store kernels — 21 October 2026

Rust now emits revision-associated numeric Store range kernels using the shared expression DAG. Root executes contiguous same-program rows over cut buffers and stages existing Store prop deltas; retained children, reader history, exact acknowledgement and generic fallback remain. Arithmetic/bitwise numeric leaf expressions qualify; logical/conditional, aggregate, subtree, resource and opaque forms keep their existing routes. No parallel identity/version registry or storage layout is added.

Darwin-v2 passes all 70 phases: 1133 runtime tests, 98 Rust tests, all 50 compiled fixtures and package/Three/retention checks, with 1581 input hashes matched. The first failed gate remains preserved. Fresh installed proof verifies emitted kernels, equal outputs, retained identity and cleanup. Both browser phases match 11460 hashes before and after, with all contexts closed and no errors.

The sole canvas comparison still loses: Native publication median/p95 4.90/6.00 ms versus React Compiler 0.55/0.90 ms, imperative 0.10/0.20 ms. The proof observes 256 kernel runs for 256 alternating-program rows: this workload does not amortize dispatch across multiple owners. There is no component rerender on the closed route, so absent memoization is not the demonstrated gap. The result does not isolate Store dispatch or attribute costs to validation, staging or host writes. No causal old/new saving, R3F/GPU/presentation, matched cold/memory or independent-device qualification follows.

The semantic slice is complete; the full-plan goal remains active. Mixed local-state + Store expressions still fall back to generic rendering because each existing proof excludes the other input kind. This is the next source-backed capability candidate, not an implemented or measured improvement. Realtime speed, broader computation fusion, HMR delivery and lifecycle/independent-device requirements remain open; historical wins, qualified dense FAIL and physical HOLD retain scope. [Results and failures](implementation/2026-10-21-store-numeric-kernels/results.md); [primary review](implementation/2026-10-21-store-numeric-kernels/source-review.md).

## Structural owner scope and shared-clock validation — 21 October 2026

Native component identity now includes structural host/container scope in the existing World tuple. Keyed host moves retain state; replacement retires descendants. Flattened VDOM sibling matching uses the same componentOwner identity, cached collection regions keep their subscriptions, and accepted snapshot serialization keeps the captured child representation. Closed Store coverage now makes one fresh reader pass per validation; no persistent owner/version registry or cached admission is added.

Darwin-v3 passes all 69 phases: 1129 runtime tests, 93 Rust tests, all 49 compiled fixtures and package/Three/retention checks, with 1560 input hashes matched. Both failed gates remain preserved. Fresh installed proof verifies schema 6, 256 retained groups, equal component keys under distinct keyed hosts, matching outputs and cleanup. The sole canvas timing still loses to React Compiler: Native publication median/p95 3.10/3.80 ms versus 0.20/0.20 ms, imperative 0.10/0.20 ms. Each browser phase matches 11449 hashes before and after. Prior timings are not a causal old/new control; there is no favorable repeat, R3F/GPU/presentation, matched cold/memory or independent-device qualification.

The semantic slice is complete; the full-plan goal remains active. Realtime speed, broader computation fusion, HMR delivery and lifecycle/independent-device requirements remain open. The next source-backed implementation candidate is compiled numeric Store kernels replacing recursive expression evaluation for proven shapes. Historical narrow wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain scope. [Results and failures](implementation/2026-10-21-structural-owner-scope/results.md); [primary review](implementation/2026-10-21-structural-owner-scope/source-review.md).

## Retained-child Store clock — 21 October 2026

Store schema 6 now supports closed numeric wrapper props around one direct retained child, reusing existing Store projections, owner identity, VDOM deltas and publication/history. Ordinary closed Store flushes can run without a resource subscription. The Three workbench uses one separate canonical frame Store and one RAF dispatch; child contents receive no purity claim. Repeated host keys resolve through existing owner identity without a persistent registry or recursive cache copy.

Darwin-v4 passes 68/68 phases, 1114 runtime tests, 93 Rust tests and all 48 compiled fixtures, with 1544 input hashes matched. Three failed gates and the initial environment failure remain preserved. The installed consumer type failure is preserved separately; the corrected consumer is independently locked. Fresh installed proof verifies values, retained children, no owner rerenders and cleanup. The sole shared-clock canvas comparison is much slower than React Compiler: Native publication median/p95 10.70/12.90 ms versus 0.60/0.90 ms, imperative 0.10/0.30 ms. Both browser phases match 11449 hashes and close cleanly. This differs from the preceding local-cell/polynomial workload and supplies no causal old/new saving, R3F/GPU/presentation or cold/memory qualification.

The full-plan goal remains active. Shared-clock performance, broader computation fusion, HMR delivery, lifecycle/independent-device gates and a separate native component-key scope gap remain open. Host parents do not currently create separate native component owner scopes; distinct component keys in the new fixture do not fix that gap. Historic narrow wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain scope. [Results and failures](implementation/2026-10-21-retained-store-clock/results.md); [primary review](implementation/2026-10-21-retained-store-clock/source-review.md).

## Ranged owner kernels — 21 October 2026

New compiler schemas 4/5 execute heterogeneous owner ranges over existing whole-cut buffers, retiring per-run arrays, subarray views and output remapping. Schemas 2/3 keep their legacy adapter. Original order, live validation, exact acknowledgement, accepted histories, resource lifetime and generic fallback remain; no identity/version registry or traversal layout changes.

Corrected Darwin-v2 passes 67/67 phases: 1108 runtime tests, 90 Rust tests, all 47 compiled fixtures and fresh package consumers; all 1525 runner input hashes match. The initial command-shape failure remains preserved. Fresh installed proof verifies emitted ranged ABI, shared arithmetic, values, retained identities and cleanup. The sole 256-object, three-prop canvas comparison remains slower than React Compiler: Native publication median/p95 1.50/3.00 ms versus 0.80/1.10 ms, with imperative floor 0.10/0.10 ms. Both phases match 11449 hashes and close cleanly. No favorable repeat or causal old/new saving is claimed. Broader main-thread fusion, realtime performance, HMR delivery, cold/memory and independent-device requirements remain open under the full-plan goal. Historic wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain scope. [Results and failures](implementation/2026-10-21-ranged-owner-kernels/results.md); [primary review](implementation/2026-10-21-ranged-owner-kernels/source-review.md).

## Shared numeric expression DAG — 21 October 2026

The compiler now preserves shared numeric subexpressions across affected props within each existing source-slot case. Deterministic structural interning and topologically ordered local constants retain floating-point grouping and consuming-sink guards. Runtime storage, dependency edges, sink order, validation, publication, accepted histories and exact acknowledgement are unchanged. This implements part of the human’s main-thread batching/shared-computation steer; broader DAG fusion remains open.

Corrected Darwin-v2 passes 65/65 phases, 1102 runtime tests, 90 Rust tests and 46 compiled fixtures, with 1501 input hashes matched. The first gate’s fixture-observer failure remains preserved. The installed untimed proof verifies actual Native DAG kernels, React Compiler transforms, three-prop values, retained identities and cleanup; its initial sandboxed browser-launch failure remains preserved separately.

The sole installed 256-object, three-prop canvas comparison remains slower than React Compiler: Native publication median/p95 1.60/3.00 ms versus 0.90/1.30 ms, with imperative floor 0.10/0.20 ms. Both proof and timing match 11449 hashes and close cleanly. This workload differs from the prior one-prop interaction, so it proves no causal old/new saving. There is no favorable repeat, presentation/R3F, matched cold/memory or independent-device claim. Historic narrow wins, qualified dense loss and physical HOLD retain scope. Realtime performance, broader batching/fusion, HMR delivery and remaining full-plan requirements stay open. [Exact results and failures](implementation/2026-10-21-numeric-expression-dag/results.md); [primary review](implementation/2026-10-21-numeric-expression-dag/source-review.md).

## Component output identity — 21 October 2026

Managed intrinsic and primitive outputs now carry the existing World owner incarnation through retained VDOM compatibility. Changing a component key/type remounts a constant-explicit-key host; same-owner updates and keyed text moves retain it. Initial content may explicitly adopt a matching bare Suspense fallback, then accepts the real content owner; component-authored fallbacks remount. Candidate permission is absent from accepted snapshots and retained output caches. No alternate identity/version registry or eager whole-tree copy is added.

Corrected Darwin-v3 passes 64/64 phases, 1102 runtime tests, 85 Rust tests and all 45 compiled fixtures, with 1483 input hashes matched. The restored original namespace failure, three new boundary cases, four VDOM identity cases and ten previously failing reveal tests pass. Both failed gates remain preserved.

The sole current-source installed 256-object canvas comparison is slower: Native update/publication median/p95 1.60/2.40 ms versus React Compiler 0.60/0.80 ms, with imperative floor 0.10/0.20 ms. All arms preserve outputs, identity and teardown; untimed and timing phases each match 11449 hashes and close cleanly. Twelve-file authoring is unchanged. This is stable-frame evidence, not replacement-latency or causal old/new Native evidence. Setup intervals have different construction exclusions and do not qualify matched cold mount. No favorable repeat occurs.

The semantic identity slice is complete; the full-plan goal remains active. General DAG-wide fusion, a realtime performance win, HMR delivery, cold/memory and independent-device requirements remain open. Historic narrow wins, qualified dense loss and physical HOLD retain their scope. No maintenance advantage is claimed; no VM or owned server is running. [Results, failures and exact receipts](implementation/2026-10-21-component-output-identity/results.md); [primary source review](implementation/2026-10-21-component-output-identity/source-review.md).


## OS compatibility smoke and compiler environment

The user explicitly scoped OS compatibility to a quick smoke, rather than an architecture matrix. The Linux ARM64 run at one CPU/2048-MiB VM RAM and an actual 1536-MiB container cap executed the native compiler and five installed packages successfully. Its 1093 runtime tests, 84 Rust tests, 44 compiled fixtures' assertions, Three/retention checks and thirteen package-consumer checks passed. The overall consolidated receipt remains **FAIL: 62/63**, because fixture 37 changed the debug compiler hash; that failure is preserved, not relabeled as a green gate. All 1448 runner inputs match; 1458 raw/context files and 244 fixture artifacts are archived.

The development Vite plugin unconditionally replaced the caller's Cargo cache directory. It now honors explicit `CARGO_HOME`, with the existing checkout-local fallback when unset. A bounded actual-spawn contract test passes 26 checks; the isolated old-source negative control fails on the explicit-cache assertion. The unchanged compiler-identity guard remains. No full OS rerun or portability benchmark follows the user's revised scope. The plugin fix has contract verification, not a new consolidated Linux pass.

All owned test containers and volumes were removed after evidence export, and the VM stopped successfully. Podman retains its 2-GiB configuration and Depot-backed image cache; no Depot permission change or administrator helper occurred. OS smoke evidence is sufficient for the requested first-pass compatibility scope. Product performance/cold/memory and independent-device evidence remain unproven; historic wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain their scope.

[Source, exact receipts and preserved failures](implementation/2026-10-20-podman/results.md).

## Fresh-process lifecycle costs — 20 October 2026

The complete installed 256-row/sixty-update application now has separate local Chromium process startup and forced-GC lifecycle observations. Runtime/compiler source is unchanged. Darwin-v1 passes 63/63 phases, 1093 runtime and 84 Rust tests; installed untimed proof passes 67 stages per arm. The sole Native-first launch-through-ready pair is 1437.831/865.384 ms, including unequal browser launch spans and driver work. Released-controller used-heap deltas from blank pages are 2871620/1856376 bytes, including modules and browser harness; neither result qualifies release, cold-cache, memory, CPU or presentation budgets.

The separate allocation attempt remains INCOMPLETE: one React sample references a node absent from its raw profile tree. Both profiles and the failure survive; no rerun or paired allocation claim occurs. Full-plan, current other-platform and independent-device requirements remain open. Historic wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain scope; no maintenance advantage is claimed. No VM/server, administrator prompt or memory increase occurs; saved Apple limits remain one CPU, 256 MiB/container and 512 MiB/build on Depot, runtime-unverified.

[Source, receipts, preserved allocation failure and limits](implementation/2026-10-20-process-lifecycle/results.md).

## Closed collection rows — 20 October 2026

Explicit scoped collection transactions now admit compiler-proven insert/replace rows beside pending resources, using the existing owner preparation, keyed VDOM delta, cache and publication authority. A direct map forwards its item to a preceding stable Row returning one unkeyed intrinsic leaf from numeric paths/literals. Existing storeRecord ownership provides passive data capture; ordinary/frozen/Proxy/accessor and opaque rows stay generic. Same-key owner/host identity, reincarnation, exact acknowledgements, newer actions, fork history and partial-failure quarantine remain. Whole-tree and compiled-graph guards stay; ordinary flush/preparePending still render insert/replace generically. No parallel registry, eager tree copy or physical redesign is added.

Darwin-v4 passes 63/63 phases: 1093 runtime tests, 84 Rust tests, 44 compiled fixtures, twenty Three cases, three retention checks and package validation. All 1413 runner inputs match, with 1423 source/context rows archived per gate. Three failed gates and a pre-run environment typo remain preserved. Corrections address the scoped staged-owner guard, actual compiler aliases and invalid fixture counter/insert assumptions; canonical lineage/cell acknowledgement and empty-ack omission preserve scoped acceptance without overridable World callbacks.

Five fresh installed packages pass the complete prior async application and a new 64-row DOM/Three episode with 24 replace/insert/remove operations and 25 checkpoints per arm. Output, pending UI, owner/host identity and exposed teardown pass. Async proof matches 9370 hashes before/after; new proof and timing each match 9382, with clean browser closure. Actual row revision is native-v1-fe99c8feb0287179; React Row/Waiting/App emit 2/2/14 memo slots.

The sole fixed Native-first comparison observes Native median/p95 1.45/1.80 ms versus React Compiler 0.70/1.20 ms; Native is slower. First intervals are 6.0/1.5 ms and sums 37.2/17.2 ms. Roughly 0.1 ms quantum, dependent samples, differing APIs and unequal JS graphs (2734978/874035 bytes) establish no population-tail, CPU, paint, cold/memory, independent-device or release qualification. No favourable retry occurs.

The full-plan first pass remains active. Historic wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain scope; human participants stay zero with no maintenance claim. Release performance/cold/memory, current other-platform and independent-device gates remain open. Apple tooling/data/logs stay on Depot with saved one CPU, 256 MiB/container and 512 MiB/build defaults; no VM/server, administrator prompt or memory increase occurs, with startup/effective caps unverified.

[Source, preserved failures, receipts and limits](implementation/2026-10-20-closed-collection-rows/results.md).

## Group host admission — 20 October 2026

Grouped publication now completes public preflight under all host claims, then checks every private prepared cut before the first writer. Existing receipts retain exact Store/cell/resource/collection/code/ownership guards, whole-tree bases and accepted histories. Admitted host calls pin callable targets; original application-phase copy/writer checks remain. Branded scalar data, owned binding provenance and actual canonical resource-read capture avoid caller getters in the final sweep. Bound resource proxies and repeatable generic manual bindings remain supported; opaque inputs without canonical freshness decline before writes. Arbitrary hidden wrapper reads and adapter effects gain no purity, rollback or visual-atomicity guarantee. No parallel version registry or physical redesign is added.

The corrected 328-source baseline reproduces an avoidable first-member placement after peer revocation. Baseline setup failure, three failed consolidated gates and both diagnostic command outcomes remain preserved. Final Darwin-v4 passes 62/62 phases: 1087 runtime tests, 83 Rust tests, 43 actual compiled fixtures, twenty Three cases, three retention checks and thirteen package checks. All 1377 runner inputs match; each gate archives 1387 source/context rows. The isolated diagnostic identifies an unnecessary source-array object-identity requirement; exact source identities and all live guards remain.

Fresh five-package proof passes twenty assertions, four public admission controls, four domain controls and six resource controls. All 9265 before/after hash checks match in complete untimed async/fork/urgent/cancel/disposal proof and the sole timing pair, with clean browser closure. The unchanged authored application observes Native urgent median/p95 0.9/1.5 ms versus React Compiler 0.3/0.5 ms; Native is slower in this fixed-order observation. About 0.1 ms quantum, small dependent samples and unequal graphs establish no CPU, paint, tail, cold/memory, admission-cost or release qualification.

The full-plan first pass remains active; release performance/cold/memory, current other-platform and independent-device requirements remain open. Historic wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain scope. Human participants remain zero with no maintenance advantage claimed. Apple tooling/data/logs remain on Depot with saved one CPU, 256 MiB/container and 512 MiB/build defaults; no VM/server, administrator prompt or memory increase occurs, and startup/effective caps remain unverified.

[Source, preserved failures, receipts and limits](implementation/2026-10-20-group-host-admission/results.md).

## Shared host publication domains — 20 October 2026

One WeakMap keyed by exact host identity closes cross-root and cross-queue application reentry. Groups claim domains all or none; contention defers unknown bodies and writes, while distinct hosts outside a failed group remain independent. Existing private receipts carry claims, exact acknowledgements and accepted histories remain, and no parallel identity/version registry or tree copying is introduced. Lazy waiters distinguish explicit flush from automatic scheduling. Safe unwind preserves synchronous same-root cleanup under its claim; foreign teardown waits. Partial writers/removals quarantine the domain. A private lifecycle/base recheck after public validation rejects disposal before application.

The immutable 325-source baseline reproduces nested publication before another root's writer throws. Two failed consolidated gates remain preserved. Pre-final-recheck Darwin-v3 passes 61/61; corrected Darwin-v4 passes 61/61 with 1077 runtime tests, 83 Rust tests, 42 compiled fixtures, twenty actual Three cases, three retention checks and thirteen package checks. All 1351 runner inputs match; 1361 source/context rows are archived per gate. Existing semantic assertions remain intact.

Corrected five-tarball installed proof passes nineteen assertions, four publication-domain controls and six resource controls. Complete async/fork/urgent/cancel/disposal episodes pass with 3168 selected installed files, 1361 staged rows, 9209 matching before/after hash checks and clean browser closure. The sole timing pair ran before the final recheck: Native median/p95 0.6/1.2 ms versus React 0.2/0.5 ms, with about 0.1 ms quantum. Those descriptive timings remain bound to archived pre-correction source; corrected source has no timing run or inherited timings, and no second pair is run.

The full-plan first pass remains active, including release performance/cold/memory, current other-platform and independent-device requirements. Historic wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain scope; human participants remain zero with no maintenance claim. Apple tooling/data/logs remain on Depot with saved one-CPU 256 MiB/container and 512 MiB/build defaults. No VM/server, administrator prompt or memory increase occurs; startup permissions and effective VM caps remain unverified.

[Source, failures, receipts and limits](implementation/2026-10-20-host-publication-domain/results.md).

## Three resource handle lifetimes — 20 October 2026

One host-local lifetime Map replaces the owned-resource Set. Shared geometry/material handles and primitive aliases retain host-owned resources until their final release; borrowed-only assets stay caller-owned. Cleanup attempts attachment restoration and resource release independently, preserves original/cleanup errors, prevents disposal reentry/readmission and rejects duplicate live Object3D handles. Factory/metadata reentry validates retirement after the last creation getter, with one in-flight count preserving known borrowed assets until cleanup. Cross-host and direct args/property borrows remain caller-managed; no global identity/version registry, compiler purity grant or traversal redesign is added.

An immutable old-source run reproduces early shared disposal and skipped cleanup, with 331 unchanged inputs. Two failed consolidated gates remain preserved. Darwin-v3 passes 60/60 phases: 1066 runtime tests, 83 Rust tests, 41 compiled fixtures, twenty actual Three tests, three retention checks and thirteen package checks. All 1324 runner inputs match, with 1334 source/context files archived. The compiled fixture verifies grouped DOM/Three updates, shared-host roots, keyed retirement, retained identity, failed-group old acceptance/quarantine and cleanup.

Fresh five-tarball proof passes eighteen assertions and six public installed lifetime checks. The unchanged async application passes complete fork/urgent/cancel/disposal episodes; 3163 selected installed files and 1334 staged rows are bound. Both browser phases match 9140 hashes before/after and close cleanly. The sole Native-first timing pair has higher Native median/p95: 1.0/1.8 ms versus React 0.3/0.5 ms, with C settlement 1.2/0.6 ms. About 0.1 ms observed quantum and descriptive observer delivery establish no speed, CPU, paint, population-tail, alias/disposal-cost, cold/memory or independent-device qualification.

The full-plan first pass remains active, including release performance/cold/memory, current other-platform and independent-device requirements. Human participants remain zero with no maintenance claim; historic wins, dense FAIL, exhausted Recording A and physical HOLD retain scope. No VM/server or memory increase occurs. Saved Apple limits remain one CPU, 256 MiB/container and 512 MiB/build on Depot, with startup permissions and effective limits unverified.

[Source, failures, receipts and limits](implementation/2026-10-20-three-resource-lifetime/results.md).

## Installed forked async interaction — 20 October 2026

The complete forked DOM/Three application now executes from five freshly installed packages with separate Native and React graphs. Native app/scene/controller bytes and the React comparator's statements remain unchanged; only its React JSX pragma is added. A real button listener delivers twenty urgent actions while B/C providers remain pending. The source inventory now includes valid dated units from 19 October onward, replacing its hard-coded single-day selection. Runtime/compiler/publication authority and physical layouts remain unchanged.

Darwin-v1 passes 55/55 steps: 1056 runtime tests, 83 Rust tests, 36 compiled fixtures, nine Three cases, three retention checks and thirteen package checks. All 1281 gate inputs match, with 1291 raw/context files archived. Fresh proof-v1 passes seventeen build assertions and binds 24 source rows, four frozen sources, five tarballs, 3163 selected installed files and the actual compiler/report/transforms/assets. Native owner IDs and module revisions agree; React Projection/Result/App emit actual _c(14)/_c(14)/_c(23).

Untimed proof completes main/cancel/immediate-disposal episodes with 27/4/3 stages per arm. Identity, text, retained A, fork convergence, one Native B execution, stale A/B rejection, catalog reuse and per-arm resource/effect cleanup pass. The sole Native-first timing pair is slower for Native: twenty urgent click-to-observer intervals have within-page median/p95 0.9/1.5 ms versus React 0.2/0.4 ms; final C settlement-to-observer is 1.1/0.5 ms. Both phases pass 9050 before/after hash checks, zero fallback additions and clean browser/context closure. About 0.1 ms timer quantum, small samples, fixed order, observer/harness work, unequal graphs and controlled deferred providers prevent CPU, network/frontier, population-tail, physical-input/presentation, cold/memory or independent-device qualification.

Full-plan work remains active. These observations do not replace frozen release budgets or authorize a physical redesign. Current other-platform and independent-device execution, release speed and cold/memory qualification remain open. Human participants remain zero with no maintenance claim; historic wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain scope. Apple user/service defaults stay one CPU, 256 MiB/container and 512 MiB/build; no VM/server starts or memory increases, with effective VM caps still unverified behind Depot startup permissions.

[Source, receipts and limits](implementation/2026-10-20-installed-async-ux/results.md).

## Installed authored lifecycle — 19 October 2026

The complete 256-row, sixty-update authored episode now runs from five fresh installed packages with separate Native and React production graphs. Native and the shared contract retain their frozen bytes; React changes only two obsolete type-suppression comments and its JSX pragma. Runtime/compiler/publication authority and physical layouts are unchanged. Actual Native lowering and ReactRow `_c(13)` are verified.

Darwin-v2 passes 55/55 steps: 1056 runtime tests, 83 Rust tests, 36 compiled fixtures, nine Three cases, three retention checks and thirteen package checks. All 1261 gate inputs match before/after; 1271 raw/context files are archived. A later consumer TypeScript option and review note are separately bound by fresh installed proof-v3. The failed directory launch, proof-v1 typecheck and proof-v2 sandbox browser launch remain preserved. Proof-v3, timing and heap each pass 9006 before/after hash checks and both complete 67-stage arm episodes with balanced cleanup, empty hosts and no application Store interests.

The sole Native-first timing pair is slower for Native: update median/p95 3.1/4.6 ms versus React 0.5/0.7 ms; mount+60 updates+edit+disposal subtotal 222.1/44.3 ms at about 0.1 ms timer quantum. A separate untimed forced-GC pair observes released-controller used-heap deltas of 1940900/933536 bytes, DOM node deltas 0/0 and listener deltas 0/+1. Separate JavaScript graphs are 696195/578824 bytes. These are descriptive observations, not population-tail, cold setup, allocation attribution, leak-absence, memory-budget, presentation or independent-device qualification. Historical wins and losses retain their own source scope.

The full-plan first pass remains active; release performance, cold/memory, other-platform and independent-device requirements remain open. Human participants remain zero with no maintenance claim; exhausted Recording A and physical HOLD remain. Apple user and service configurations now both save one CPU, 256 MiB/container and 512 MiB/build, with original service-file permissions restored. No service/VM/server or memory increase occurs; effective VM limits and the Depot startup permission prerequisite remain unverified/unresolved.

[Source, failures, raw receipts and limits](implementation/2026-10-19-installed-lifecycle/results.md).

## Verified runtime import authority — 19 October 2026

Vite and Rust now share an exact per-request runtime-import authority. Real source/package export identity replaces filename/substring admission; an explicit verified list overrides public defaults, contributes to revision and is confirmed in every successful response. Vite rejects older executables that ignore it. Hook, collection and host proofs, JSX factory selection, React exclusions and HMR preflight follow that authority. Ordinary lookalike-wrapper calls remain authored JavaScript. Loader-qualified origins decline; mixed React composition diagnoses aliases unavailable to its static boundary. Legacy diagnostic runners explicitly declare their React translation input. No runtime identity/version/publication registry or physical layout changes.

The archived compiler reproduces successful Store output with zero custom-use calls. Baseline-v1's missing Node transform flag and Darwin-v1's six integration failures/source mismatches remain preserved. Corrected Darwin-v2 passes 55/55 steps: 1056 runtime tests, 83 Rust tests, 36 compiled fixtures, nine Three cases, three retention checks and thirteen package checks. All 1242 runner inputs match, with 1252 raw/context files archived; fresh package evidence contains 530 files. Product/compiler/fixed fixtures and installed controls remain source-bound through proof and measurement.

Fresh five-tarball proof-v1 passes four Native/React episodes and 28 stages, including both custom values, native state/host identity, accepted DOM/Three/fork output, A/B cancellation, C/urgent commitment and balanced cleanup. Eighteen plus seven source rows, 1252 staged files, 1622 installed files, compiler/report/transforms/assets are bound. React Result/Hot/App emit _c(6)/_c(3)/_c(2); the impure OriginProbe explicitly opts out. Custom calls differ: eight Native versus two React per wrapper/episode, so render frequency and exact effect-count equivalence are not established. The sole Native-first build pair observes 239.526625/336.111541 ms, with exact proof transform/asset/metadata equality. Unequal JS graphs (2704775/989222 bytes), potentially warm caches and fixed order give no runtime, CPU/tail, cold/memory, presentation, other-platform or independent-device qualification. Resolver/setup/fallback costs remain unqualified.

The full-plan first pass remains active, including authored realtime/async UX, lifecycle/cold/memory/performance and independent-device requirements. Human participants stay zero with no maintenance claim. Historic wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain scope. Apple tooling/data/logs stay on Depot; saved defaults remain one CPU, 256 MiB/container and 512 MiB/build. Its service is stopped/unregistered and no matching VM process was observed; effective VM caps remain unverified. No VM/server, authorization prompt or memory increase occurs.

[Source, failures, receipts and limits](implementation/2026-10-19-runtime-import-origin/results.md).

## Reentrant transition replacement — 19 October 2026

Explicit keyed replacement now claims the existing key before settling displaced work. A callback's newer nested enqueue wins; cancelled outer work does not capture or start providers. The task adapter reads the lower queue's existing exact committing record, preserving applying groups through callbacks. That record retires before final notification. Queue disposal rejects new work immediately and defers destructive cleanup during application. Local capture/setup reentry releases staged interests/executions; real caller and cleanup errors remain distinct from internal cancellation. No new identity/version/publication registry or physical layout is added.

An immutable old-module characterization reproduces both successors committing in both resolution orders. Darwin-v3 passes 53/53 steps: 1056 runtime tests, 80 Rust tests, 35 compiled fixtures, nine Three cases, three retention checks and thirteen package checks. All 1213 runner inputs match, with 1223 raw/context files archived. Two failed gates remain preserved (typed status narrowing, then missing declared test inputs). Runtime/compiler/fixed fixtures remain v3-identical; the separately locked installed consumer hoists task arrays after a preserved authoring rejection.

Fresh five-tarball proof-v2 passes four Native/React episodes and 28 stages: A/B cancelled, B never starts, C wins, urgent work progresses, primary DOM/Three/fork outputs agree, and cleanup balances. Sixteen plus five source rows, 1223 staged files, 1617 installed files, compiler/report/transforms/assets are bound. Actual React Result/Hot/App emit _c(6)/_c(2)/_c(2). The sole Native-first fresh-process build pair is 348.550791/377.210042 ms, with exact proof transform/asset/metadata equality. Potentially warm caches and unequal graphs give no runtime, CPU/tail, cold/memory, presentation, other-platform or independent-device qualification; new setup/lifetime costs are unqualified.

The full-plan first pass remains active. A separate concrete Vite/Rust runtime-import-origin finding is next: substring recognition may rewrite a similarly named module's overridden hook; it is source-grounded, unexecuted and unfixed. Broader authored realtime/async UX, lifecycle/performance/cold/memory and independent-device requirements remain. Historic wins, dense FAIL, exhausted Recording A, physical HOLD and zero human participants/no maintenance claim retain scope. Apple remains stopped, tooling/data/logs on Depot; saved one-CPU 256 MiB/container and 512 MiB/build defaults stay unchanged, with effective VM limits unverified. No server/VM or authorization prompt ran.

[Source, failures, receipts and limits](implementation/2026-10-19-reentrant-replacement/results.md).

## Portable verification source delivery — 19 October 2026

The platform runner and both Linux transfer stages now share one current-source selector and checked copier. Divergent lists are retired; required examples, current fixtures, Linux/benchmark controls and the frozen Deno lock transfer together. Historical baseline binaries/evidence remain preserved outside routine product delivery. Fixed numeric-owner verification reads its Darwin baseline only in explicit diagnostic mode; routine gates retain current compiled regressions. No runtime identity/version/publication authority or physical layout changes.

A fresh 1199-file tree outside the checkout passes Darwin-v2's 52/52 steps: 1043 runtime tests, 80 Rust tests, 34 compiled fixtures, nine Three cases, three retention checks and thirteen package checks. All 1189 product inputs match before/after, with ten context files archived. All 520 fresh package files match staged/archive/imported bytes; the prior reconstructible cache is preserved. Failed/interrupted gate-v1 and installed proof-v1 remain recorded. Five current tarballs install in proof-v2, which passes ten untimed DOM/Three behavior/lifetime/cleanup stages and actual Native/React Compiler transforms. Eighteen plus three source rows, 1199 staged files, 1617 installed files, compiler, report and assets are bound.

The sole Native-first fresh-process build pair observes 294.328917/392.539166 ms Native/React. Transforms/assets/metadata match untimed proof builds exactly. This potentially warm-cache build observation gives no runtime, cold/memory, CPU/tail, presentation, other-platform or independent-device qualification. Selection/copy/revalidation I/O has no measured savings claim. Human participants stay zero; no maintenance advantage is claimed. Historic wins, dense FAIL, exhausted Recording A and physical HOLD retain scope.

Apple tooling/data/logs remain on Depot with saved one-CPU 256 MiB/container and 512 MiB/build defaults. A bounded native administrator authorization attempt did not complete; Depot stays mode 775, the service remains stopped/unregistered and no VM/server starts or memory increases. Effective VM limits and current Linux execution stay unverified. The full-plan first pass remains active, including authored realtime/async UX, lifecycle/cold/memory/performance and independent-device requirements.

[Source, preserved failures, receipts and limits](implementation/2026-10-19-portable-source-delivery/results.md).

**Research position paper · Deno Jupyter project · 14 October 2026**


## Declarative host copy boundary — 19 October 2026

Ordinary invalidated JSX now updates supported reused mutable Three values through an optional public host copy-capture contract. Independent write inputs and primitive comparisons live in existing mounted/binding accepted history; retaining/custom writers keep reference semantics. Private history stays out of public snapshots. Callback-bearing capture validates its method and writer afterward, and bound capture checks live membership. Scoped replacement recognizes only the private copy wrapper while retaining exact actual mounted/version/publication checks. Whole-tree guards, exact acknowledgements, newer actions, fork history and resource authority remain. New capture/reflection/allocation/storage costs are unqualified.

Darwin-v4 passes 52/52 steps, 1043 runtime tests, 80 Rust tests, 34 actual compiled fixtures, nine Three cases, three retention checks and thirteen package checks. Its 1319 inputs match before/after; 1328 raw/context inputs are archived. The immutable committed-runtime diagnostic reproduces stale [1,2,3] position after input mutation. Three failed gates and two installed proofs remain preserved. Product/compiler/fixed fixture are unchanged after v4; separately locked consumer follow-ons correct tuple typing and React's retained Three reveal group.

Fresh five-tarball proof-v3 passes ten untimed DOM/Three stages, public custom-host capture, mutable position/rotation, DOM style removal, retained identity, keyed lifetimes, independent reveal and cleanup. Eighteen plus two source rows, 1617 selected installed files, compiler, package report, transforms and assets are bound. React Row/PendingScene/PendingDom/Hot/App have actual CompileSuccess events. The sole Native-first click-to-DOM-observer pair is 5.300000004470348/2.100000001490116 ms, Native slower in this observation. Timer quantum is unmeasured; no speed/CPU/tail/cold/memory/presentation/independent-device qualification follows. Unequal graph JS sizes are 2649710/1070577 bytes; React's Three graph uses explicit layout effects.

The full-plan first pass remains active, including other-platform and authored realtime/lifecycle/performance/independent-device requirements. Human participants stay zero with no maintenance claim. Historic wins, dense FAIL, exhausted Recording A and physical HOLD retain scope. No VM/server or memory increase occurs. Saved Apple defaults remain one CPU, 256 MiB/container and 512 MiB/build; no VM process was found, while effective limits remain unverified behind Depot startup permissions.

[Source, failures, receipts and limits](implementation/2026-10-19-host-value-diff/results.md).


## Declared resource transaction boundary — 19 October 2026

Explicit native transactions now select canonical resources alongside cells, Stores and keyed collections. One root preparation and VDOM composite stage selected boundaries together; exact per-root queue capabilities order overlapping intent. Selected A/B retain accepted fallback until both can publish, while supported independent health and urgent Store work progress. Existing source versions, live owner/code/writer checks, exact acknowledgements, newer actions, fork histories and partial-host failure rules remain authoritative. Whole-tree replacements remain conservatively guarded; opaque authoring stays generic.

Consolidated Darwin verification passes **35/35 steps**, **994 runtime tests**, **63 Rust tests**, **24 artifact checks**, **23 actual compiled fixtures**, **seven Three cases**, both retention checks and fresh five-package consumption. All **844 gate inputs** match before/after; the final pre-execution archive contains those inputs plus eight context files. The actual compiled DOM/Three/fork fixture covers mixed resource/Store/cell/keyed publication, independent progress, event paths and balanced cleanup. Failed v1–v3 gates remain preserved, including the first archive's documented late workflow supplement.

The sole fixed Native-first browser pair passes output, fallback, independent progress, retained identity and empty teardown checks. Final settlement to matching MutationObserver is **2.4/287.5 ms Native/React**, at about **0.1 ms** timer quantum. Mount is **4.3/5.8 ms**, disposal **0.4/0.1 ms**, shared JavaScript **535,146 bytes**. All **762 audit entries** (756 sources, compiler, two transforms, three assets) match before/after. Both arms preload all three promises; React uses a shared Promise.all for A/B. This single scheduling/observer interval ends before paint and does not isolate CPU or attribute the delay to a mechanism. It qualifies no population tails, cold/memory budgets, physical input, presentation or independent device; shared bytes are not equivalent-feature per-arm size.

The first untimed build proof correctly rejected an urgent button outside the finite closed host grammar. Both arms now use output for that noninteractive display; controllers and every behavior assertion remain unchanged. The repaired build proves actual Native A/B/Urgent Store schema 5, C resource schema 2 and actual React A/B memo output. Generic button authoring remains supported; no universal closed-tag claim follows. No timing retry ran.

The full-plan goal remains active. Broader structural/resource and transition UX, platform coverage, cold/memory/lifecycle budgets, presentation and independent-device requirements remain open. Human participants remain zero and no maintenance advantage is claimed. Historical stable-binding wins, qualified dense FAIL and exhausted Recording A retain their source and scope; physical selection stays HOLD. Apple Container's saved caps are 256 MiB/container and 512 MiB/builder with one CPU; service startup on Depot remains blocked by launchd path permissions, so effective VM limits are unverified.

See [source, failures and results](implementation/2026-10-19-resource-transactions/results.md).

## Linux native delivery boundary — 18 October 2026

Native GNU Linux ARM64 build and fresh installed-package consumption now pass in the existing Colima VM. A bounded Docker transfer route stages current source without changing shared VM mounts or waiting for Apple Container authorization. The consolidated v2 gate passes **34/34 steps**, **978 runtime tests**, **63 Rust tests**, **24 artifact checks**, **22 actual compiled fixtures**, **seven Three cases**, both retention checks and all five private-alpha packages. All 22 fixtures preserve the recorded debug compiler hash, with actual target `aarch64-unknown-linux-gnu`. The 829 gate inputs match before/after; all 838 staged host/archive inputs match. Package and fixture evidence contains 488 and 132 files respectively.

The first gate remains **FAIL**: an older fixture used default checkout Cargo startup and replaced the recorded compiler mid-run, despite its behavior command exiting 0. Five fixtures now select the already captured explicit debug binary. No assertion or integrity check was weakened. Both exact source archives and failed/successful receipts remain preserved. No runtime or Rust implementation changed in this continuation.

The sole approved installed Vite build pair observes **232.70/437.27 ms Native/React**, spawn to exit, with 146,935/72,007 main JavaScript bytes. All 772 before/after input rows match and timed transforms equal the reviewed output; actual React Counter uses `_c(3)`. Required untimed proof builds may prime caches. This fixed-order fresh-process observation is not cold-cache, runtime latency, equivalent-feature size, population-tail or independent-device qualification. No server/browser or timing retry ran.

Linux is a VM on the same physical Mac, not x64/Windows, hosted CI or a second device. Each package still contains only its build target's native executable. Apple Container 1.5.0 and its storage remain on Depot; service startup independently awaits the existing macOS administrator authorization. Historical stable-binding wins, integrated dense FAIL, physical HOLD and the prior incomplete authored-lifecycle extra audit retain their status. Full cold/memory, async UX, presentation and independent-device finish-line requirements remain open; human participants remain 0 and no maintenance advantage is claimed. The full-plan first-pass goal stays active.

See [source, failures, native artifacts and one-shot build evidence](implementation/2026-10-18-linux-delivery/results.md).

## Authored scene lifecycle — 18 October 2026

The repository now includes a shared authored lifecycle application: 256 stateful keyed rows, shared numeric/array Stores, declarative style/text props, local input, generic array edits and two independently settled resources. The same Native application is compiled by Rust/OXC for a complete MemoryVDOMHost fixture and for the browser. Normal runtime scheduling and existing identity/version/publication authority remain; no runtime optimization or new physical layout was introduced.

Consolidated correctness passes **34/34 steps**, including **978 runtime tests**, **63 Rust tests**, **24 artifact checks**, **22 actual compiled fixtures**, **seven Three cases**, two bounded retention checks and fresh five-package consumption. All **828 correctness inputs** match the refreshed pre-execution archive. The full-scene fixture checks every row after 60 updates, generic remove/insert/move, exact local state/host identity, independent detail reveal beside waiting health,257/257 row setups/cleanups, fallback retirement and empty disposal; its callback collector quiesces after 64 schedules.

The sole fixed Native-first browser timing pair passes output/order/state/lifetime checks but is **slower for Native**. Dispatch-through-synchronous-commit median/p95 are **2.6/3.9 ms Native** and **0.5/0.8 ms React** across 60 updates, at about 0.1 ms timer quantum. Mount is 11.3/6.5 ms, array edit 3.4/1.0 ms and disposal 1.5/0.7 ms. The measured mount+updates+edit+disposal subtotal is **183.3/43.3 ms**. That subtotal excludes local click, resource waiting/reveal work, RAF waits and inspection; it is not total episode CPU. Mount occurs after modules load, not cold browser/filesystem setup. Within-page quantiles from one fixed-order pair are not replicated population tails or frozen product-gate qualification.

A separate untimed fresh-page pair preserves five forced-GC heap/DOM observations. After controller release, used heap remains **1,459,444/933,636 bytes Native/React above baseline**; DOM node deltas return to 0/0 and event-listener deltas are 0/+1. These whole-page readings include engine, module and application costs. They neither isolate allocations nor establish leak absence, ownership of the listener delta, a retained-memory budget or independent-device behavior. Both arms report zero application Store listeners; Native also reports zero readers, owners and pending changes.

The full-plan first-pass goal remains active. Current evidence does not qualify a general realtime speed advantage, cold/memory budgets, physical input/presentation, broad async UX or independent-device behavior. General structural/resource admission and Linux/other-platform execution remain open. Human participants remain 0 and no maintenance advantage is claimed. Historic stable-binding wins, integrated dense FAIL and exhausted Recording A retain their original source/scope; physical selection stays HOLD. Apple container service startup still awaits the existing native macOS authorization.

See [raw source and results](implementation/2026-10-18-authored-lifecycle/results.md).

## Pure local component forwarding — 18 October 2026

Compiler-proven pure local component chains now forward props into existing closed resource/Store host programs while retaining each wrapper owner and cache. Runtime validates exact target function/site, code revision, complete inputs and writer lifetime through the existing publication transaction. Whole-tree guards, generic fallback, per-root history, exact acknowledgements and newer host-time actions remain; no parallel identity/version registry or physical layout was added.

Consolidated Darwin verification passes **978 runtime tests, zero failures, exit 0**, **63 Rust tests**, **24 artifact checks**, **21 actual compiled fixtures**, **seven Three cases**, two bounded retention checks and fresh five-package consumption (**488 archived files**). All **33 steps** pass and **816 correctness inputs** match their pre-execution archive. The new compiled fixture verifies three distinct wrapper/leaf owners and exact lineage, retained IDs through automatic/grouped Store updates and generic health retry, fork history, revoked setters and balanced resource cleanup.

The sole offline headless pair observed **3.4 / 277.7 ms Native/React** from final resource settlement to the matching MutationObserver, at about **0.1 ms** timer quantum. Both arms preserve row state and host/text identity, prevent premature joint reveal, retire fallback once, update the live Store beside pending health, reveal health later and tear down empty. All **758 source/compiler/transform/asset hashes** match before and after. Mount was **5.4 / 4.0 ms**, disposal **0.6 / 0.2 ms**, combined JavaScript **510,883 bytes**. This single fixed-order interval includes payload construction, scheduling and observer delivery before paint. It does not qualify CPU, physical input, tails, presentation, cold/retained-memory, independent-device or general async performance; combined size is not an equivalent-feature per-arm comparison.

The full-plan first-pass goal remains active. General structural/resource admission, Linux and other-platform execution, lifecycle costs, async UX and independent-device qualification remain open. Human participants remain zero, with no maintenance advantage claim. Historic stable-binding wins, integrated dense FAIL and exhausted Recording A retain their original source and scope; physical selection stays HOLD. Apple container tooling/data are on Depot, but service startup still awaits the existing macOS administrator authorization.

See [source and results](implementation/2026-10-18-component-forwarding/results.md).

## Abstract

This project asks whether compiler-known dependencies can reduce repeated UI
update work while retaining declarative JSX, a virtual DOM, explicit ownership,
and coherent asynchronous publication. A JavaScript prototype with OXC-generated
plans shows workload-specific wins on several historical fixed-topology
mechanisms. Those experiments do not establish a general React advantage:
keyed and mixed workloads have failed their separate preregistered gates.

The latest source-locked, 30-page production comparison of the current
compiler-generated owner kernel against React 19.3 with React Compiler fails
both registered dense-update speed gates at 128, 1,024, and 10,000 rows;
native/React paired median ratios are 1.0637, 1.3224, and 1.4963. A 24-page
diagnostic matrix maps actual batch phases and operation counts, but does not
isolate semantically removable cost. A further 18-page, counterbalanced native
control at 1,024 rows validates source and lifecycle behavior yet fails its
preregistered control-stability screen. Its marked dispatch interval is
descriptively stable; its causal savings budget remains unresolved, and the
conditional 10,000-row control was not run. The live adjacent-token cache is
outside these locked builds and has no speed qualification.

The proposed architecture keeps one versioned ownership/dependency/publication
model with multiple eligible physical traversals. It is a research design, not
an implemented or faster product. Necessary validation, accepted history,
host writes, failure ordering, cold cost, React compatibility, and display
presentation remain part of its proof burden. The historical evidence and
current counterevidence are kept distinct in the [empirical appendix](./empirical-appendix.md)
and [notebook](./research.ipynb).

## Joint live and async inputs — 18 October 2026

Joint compiler-proven resource and Store inputs now reveal fixed DOM/Three trees through the existing publication transaction. Canonical capture and the sole `storeRecord` provenance govern numeric payload paths. All required resources must be ready; exact suspended reader history transfers at acceptance, and newly discovered Stores retain newer host-time actions. Legacy string-valued resource programs retain priority. Whole-tree guards, generic fallback, per-root histories and partial-failure quarantine remain.

Automatic Store cuts now acknowledge the captured root notification generation only after complete subscribed-Store coverage publishes. Partial cuts preserve unrelated/opaque notifications and newer actions, while finite style/tuple comparisons prevent fresh object allocation from causing endless retries. No parallel dirty/version registry was added. Consolidated correctness passes **968 runtime tests, zero failures, exit 0**, **61 Rust tests**, **24 artifact checks**, **twenty actual compiled fixtures**, **seven Three cases**, two bounded retention checks and fresh five-package consumption (**478 archived files**). All **809 correctness inputs** match. Bounded queued-callback tests cover same-value styles, partial closed/opaque progress and host-time newer actions.

The sole matched browser attempt on the pre-repair source timed out at **90 seconds before either arm completed**. It supplies no timing, paired output, timer-quantum or lifecycle conclusion. The preserved untimed diagnostic sampled Store publication after the later value was visible. That finding and source review prompted the scheduling repair. The repaired build passes one separate **untimed Native correctness replay**: reverse resource settlement, no premature joint reveal, exact fallback cleanup, retained row state/identity, later Store update, pending health, later health reveal and empty teardown. All **753 source/compiler/artifact hashes** match before and after that replay. The current combined JavaScript is **504,883 bytes**; this is the shared comparison artifact, not an equivalent-feature per-arm size result. No matched timing was repeated and current source has no performance comparison.

V1's environment invocation failure and three test-contract failures, the rejected optional-metadata proof, and the timed-out comparison remain preserved. Historical stable-binding wins, integrated dense FAIL and exhausted Recording A retain their original source and scope. The full-plan goal stays active: broader resource/structural admission, platform execution, lifecycle-cost, async UX and independent-device qualification remain open. Human participants remain zero, with no maintenance advantage claim. Apple container tooling/data are on Depot, but service startup still awaits the existing native authorization to enable volume ownership.

[Source and preserved results](implementation/2026-10-18-joint-async-inputs/results.md).

## Structured Store projections — 18 October 2026

Compiler-proven static Store fields now feed fixed DOM/Three trees through the existing scoped publication path. Schema 5 supports one to eight lexical reads and up to 32 finite numeric paths, preserving schemas 1–4. Selected records require explicit `storeRecord` construction: a shallow immutable owned copy. Frozen object shape alone cannot exclude Proxy behavior; ordinary objects and Proxy wrappers remain generic. Whole-state observations, Store versions, complete reader coverage, owner/code/writer lifetime, exact acknowledgements, newer actions and per-root history remain the authority. No field-version registry or weaker whole-tree guard was introduced.

Consolidated correctness passes **949 runtime tests, zero failures, exit 0**, **59 Rust tests**, **24 artifact checks**, **nineteen actual compiled fixtures**, **seven Three cases**, two bounded retention checks and fresh five-package consumption (**468 archived files**). All **803 correctness inputs** match. The installed consumer verifies schema-5 execution and shared ownership provenance. The first Rust lifetime failures remain preserved with their exact source; the correction and the Proxy soundness case are covered by the final gate.

The sole offline headless transaction-to-MutationObserver pair observed **5.1 / 0.8 ms Native/React**, at about **0.1 ms** timer quantum. Native was slower. Matching output, retained host/text/row identity and local state, pending health, later reveal and empty teardown pass; all **749 source/compiler/artifact hashes** match before/after. Mount was **8.8 / 4.6 ms**, disposal **1.2 / 0.5 ms**, combined JavaScript **530,452 bytes**. The interval includes owned Native record construction versus React freezing, native capture/queue versus flushSync and observer delivery before paint. One fixed-order observation does not qualify CPU, input, tails, presentation, cold/retained-memory, independent-device or general speed. The proof build succeeded once; its outer shell capture failed afterward on zsh's reserved `status` variable, and that failure remains preserved. No build or timing was repeated for a favorable result.

The full-plan first-pass goal remains active. General selectors/resource/structural admission, platform execution, lifecycle-cost and independent-device qualification remain open. Apple container startup still awaits the existing native authorization to enable Depot ownership. Human participants remain zero, with no maintenance advantage claim. Historic stable-binding wins, integrated dense FAIL and exhausted Recording A keep their original source and scope; no new physical layout is selected.

See [source-locked results](implementation/2026-10-18-store-projections/results.md).

## Fixed Store host subtrees — 18 October 2026

Compiler-proven fixed Store subtrees now update nested DOM/Three props and text through the existing scoped publication path. Schema 4 supports one to eight direct numeric inputs, stable tuple/style values and bounded keyed intrinsic trees, retaining schemas 1/2/3. Store and resource programs share one tree normalizer/evaluator. Exact mounted topology, handles and prop/text writers govern admission; next VNodes share their child pointers. Whole-tree guards, complete reader coverage, exact acknowledgements, newer actions, accepted snapshots and fork histories remain. Raw JSX text, ambiguous mounted keys, topology changes, opaque consumers and mutable generic tuples retain conservative fallback.

Consolidated correctness passes **938 runtime tests, zero failures, exit 0**, **57 Rust tests**, **24 artifact checks**, **eighteen actual compiled fixtures**, **seven Three cases**, two bounded retention checks and fresh five-package consumption (**468 archived files**). All **798 correctness inputs** match. New cases verify stale joint inputs, an intervening unrelated accepted cut, host-time newer actions, ordinary flush beside pending health, owner/code revocation, accessor decline, partial text failure and grouped DOM/Three/fork execution with balanced resources. V1's TypeScript and Rust test assertion failures remain preserved; the repairs change a descriptor-record type annotation and test expectations, with exact pre-repair source hashes retained.

The sole offline headless transaction-to-MutationObserver pair observed **5.0 / 0.6 ms Native/React**, with about **0.1 ms** timer quantum. Native was slower. Both arms retain container/host/text/row identity and row state, produce identical structured/text output, keep health pending during timing, reveal it later and tear down empty. All **746 source/compiler/artifact hashes** match before and after. Mount was **9.7 / 5.4 ms**, disposal **1.0 / 0.4 ms**, combined JavaScript **527,988 bytes**. One fixed-order observation includes native capture/queue work versus React flushSync and observer delivery before paint; it does not qualify CPU, physical input, tails, presentation, cold/memory, independent-device or general speed. No timing repeat or project server ran.

The full-plan first-pass goal remains active. General selectors/resource/structural admission, Linux/other-platform execution, cold/retained-memory and independent-device product gates remain open. Apple container tooling/storage are on Depot, but startup still awaits the existing native administrator dialog to enable volume ownership. Human participants remain zero, with no maintenance advantage claim. Historic stable-binding wins, integrated dense FAIL and exhausted Recording A retain their source and scope; no new physical layout is selected.

See [source-locked results and preserved failures](implementation/2026-10-18-store-subtrees/results.md).

## Structured Store host values — 18 October 2026

Store schema 3 now supports compiler-proven DOM style records and stable Three position/rotation/scale tuples over one to eight direct numeric Store inputs. Schemas 1/2 remain supported. Store and resource metadata share one aggregate normalizer/evaluator; the compiler freezes eligible fresh tuple literals before their first host write. Selected leaf/cache deltas retain existing publication, complete reader coverage, exact acknowledgements, newer actions, fork histories and whole-tree guards. Unsupported consumers and mutable generic old tuples remain conservative.

Consolidated correctness passes **929 runtime tests, zero failures, exit 0**, **54 Rust tests**, **24 artifact checks**, **seventeen actual compiled fixtures**, **seven Three cases**, two bounded retention checks and fresh five-package consumption (**458 archived files**). All **792 correctness inputs** match. Actual compiled DOM/Three execution verifies structured outputs, joint Store transactions beside pending work, fork histories and balanced resources. The preflight environment error, Rust assertion type error and stale primitive-only test expectation remain preserved; product source was unchanged by the two Rust test repairs.

The sole offline headless transaction-to-MutationObserver pair observed **4.2 / 0.8 ms Native/React**, with about **0.1 ms** timer quantum. Native was slower. Matching structured outputs, retained host/row identity and local state, pending health fallback, later reveal and empty teardown pass; all **742 source/compiler/artifact hashes** match before and after. Mount was **8.4 / 5.7 ms**, disposal **0.8 / 0.4 ms**, combined JavaScript **520,110 bytes**. This includes native handle capture/queue work versus React flushSync and observer delivery before paint; one fixed-order observation does not qualify CPU, physical input, tails, presentation, cold/memory, independent-device or general speed. No timing retry or project server ran.

The full-plan first-pass goal remains active. General selectors/resource/structural admission, Linux/other-platform execution, cold/retained-memory and independent-device product gates remain open. Apple container 1.5.0 and storage are on Depot, but startup still awaits the existing native administrator dialog to enable volume ownership. Human participants remain zero, with no maintenance advantage claim. Historic stable-binding wins, integrated dense FAIL and exhausted Recording A retain their original scope; no new physical layout is selected.

See [source-locked results and preserved failures](implementation/2026-10-18-store-values/results.md).

## Direct intent and ordinary prop continuation — 18 October 2026

After the earlier scoped-publication checkpoint, `85b34ee` drains multiple supported ready boundaries through independent receipts, and `154cdc7` integrates ordinary closed numeric prop updates beside unrelated pending resources. The subsequent source-locked direct-intent slice preserves latest requested trees and observed Store leases across suspension, handles newer World/Store/resource wakes, and releases cancelled/removed tree payloads held by closed candidates. Whole-tree bases and conservative scoped admission remain. Resource-version getter callbacks now run before accepted publication. The compiled Root fixture covers the public update contract used by the migration bridge; it is not a new React DOM bridge test.

The latest consolidated boundary passes 852 runtime tests with exit 0, native tooling, eleven actual compiled execution fixtures, seven Three host cases, two bounded forced-GC retention checks and a fresh five-package installed consumer. Rust43/debug compiler are reused against exact unchanged hashes. The GC checks cover two payload/closed-handle cases, not retained heap or lifecycle-cost qualification. The original nullable-capture typecheck failure, wrong test expectation and unnecessary numeric-layout proof assertion are preserved in the [direct-intent receipt](implementation/2026-10-18-direct-intent/verification/gate-results.md). The authored Native/React transforms were not simplified to satisfy the corrected generic-state proof.

The sole [synthetic-click pair](implementation/2026-10-18-urgent-retained/benchmark/proof-v1/pair-one-shot.json) observed 1.6/0.8 ms Native/React; the sole [latest-request settlement pair](implementation/2026-10-18-direct-intent/benchmark/proof-v2/pair-one-shot.json) observed 0.6/0.2 ms at about 0.1 ms timer resolution. Native was slower in both observations. The latter preserves host identity, local state and visibility through obsolete settlement, publishes latest props without another update, and disposes cleanly. It times final resource plus control settlement to the first matching MutationObserver; Native uses a versioned Store control, React a Promise prop and transitioned root render. Mount observations were 3.2/3.2 ms, disposal 0.4/0.1 ms, shared JavaScript 453,797 bytes. All 714 measured source/artifact entries matched before and after.

These are different single observations, including scheduling and observer delivery before paint. They cannot qualify CPU, physical input, median/p95, smoothness, network or general async UX, or be pooled with earlier fallback-reveal observations into one framework comparison. No timing was retried; offline replay used no server or TLS/trust change. Historic stable-binding wins, the qualified dense FAIL and exhausted causal attribution retain their source scope. General async/structural admission, portable compiler binaries, cold/retained-memory and independent-device gates remain open. Human participants remain zero and no maintenance advantage is claimed.

## Scoped publication continuation — 18 October 2026

The latest verified source is local commit `ffd0af9`, after mixed scoped transactions and private-alpha packaging in `1689595`. Explicit complete closed-cell inputs plus collection move/remove edits publish as one declared cut; one compiler-proven host leaf can reveal from an accepted initial fallback beside an unrelated Store-pending sibling. The latter requires a direct canonical `AsyncResource`, strict owner/code/resource/host validation and the existing publication receipt. Opaque callbacks, mutable thenables and broader structural/resource shapes retain generic preparation. Whole-tree/cache replacements still require whole-root bases. Descriptive Three value/resource contracts add no scratch pooling or metadata-based purity proof.

Consolidated evidence passes 820 runtime tests, seven actual Three conformance cases, 43 exact-source Rust tests, seven actual compiled execution fixtures and a fresh installed consumer of five private-alpha packages on Darwin ARM64 with Cargo blocked. Failures, source locks and the package console-capture limitation remain in the [verification record](implementation/2026-10-18-host-reveal/verification/gate-results.md). The namespace is unpublished and unreserved. Current native authoring, effect activation, bridge and HMR limits are in the [reference](docs/native-authoring-reference.md).

The mixed slice's sole N=1,024 descriptive pair was slower than React Compiler: Native/React medians 0.85/0.50 ms, maxima 2.30/0.70 ms. The later manual resource-settlement pair observed 1.9/256.6 ms to the first matching MutationObserver callback; both retained A's actual node and revealed B with identical output, then disposed cleanly. Its mount observations were 3.3/3.7 ms and disposal 0.5/0.1 ms. These are separate source-locked interactions, with no favorable retries. The settlement interval includes scheduling and observer delivery and ends before paint; one observation per arm establishes no CPU attribution, median/p95, network/preload, urgent-input or async UX qualification. See the [mixed](implementation/2026-10-18-first-pass/benchmark/proof-v1/pair-one-shot.json) and [reveal](implementation/2026-10-18-host-reveal/benchmark/proof-v1/pair-one-shot.json) raw receipts. Offline exact-asset replay used no server or TLS trust change.

Historic stable-binding wins, the qualified dense FAIL and exhausted causal attribution remain unchanged. Multiple simultaneously ready boundaries, broader async/host integration, cold/retained-memory costs, independent-device replication, portable compiler binaries and human maintainability evidence remain open. Subsequent working-tree changes are unverified until their own consolidated boundary. The dated continuations and prior notebook results retain their original source/evidence scope.

## Source continuation — 16 October 2026

The publication continuation repairs accepted VNode isolation, numeric storage ordering and fallback, exact collection acceptance, cleanup error preservation, host-callback action forwarding and conservative compiler revision/HMR invalidation. The current source passes 749 runtime tests with a documented isolated frozen lock, 40 Rust tests and a fresh Rust/OXC plus React Compiler production build. Earlier failed gates and toolchain failures are retained in the [verification record](implementation/2026-10-16-publication/verification/gate-results.md). The original workspace lock remains unchanged and fails its own frozen check.

No current-source browser timing comparison has run; the required Portless skill is missing. These are semantic/build results, with no new speed, presentation, cold/memory or maintainability claim. Dependency-scoped coherent admission is specified but remains unimplemented; full-tree candidates still require whole-root bases. Historical timing results below refer to their original locked sources.

## Current dense qualification and diagnostic method

The frozen [30-page original qualification](./results/current-owner-kernel-headless-v1/analysis.json)
contains five native/React page pairs at each of 128, 1,024, and 10,000 rows.
Its paired median ratios are **1.0637 / 1.3224 / 1.4963** and paired p95
ratios are **1.0223 / 1.2437 / 1.0890**; all registered parity checks fail.
[Independent verification](./results/current-owner-kernel-headless-v1/verification.json)
and [source/build locks](./results/current-owner-kernel-headless-v1/source-build-locks.json)
pass. Earlier fixed-topology wins remain historical, workload-specific results;
they are not pooled with this candidate or the unqualified live cache.

The [24-page Recording A review](./.cache/dense-causal-ledger-v1/aggregate-review/report.md)
uses fresh original, diagnostic-off, diagnostic-on, and separate count pages
for native and React at all three sizes. The same archived source and compiler
identities are locked; on-page nonoverlapping marks, a residual, and separate
operation counts identify gross work. Original-versus-off and off-versus-on
page differences include build shape, JIT, and environment drift. They are not
guaranteed overhead corrections. The [source proof map](./.cache/dense-causal-ledger-v1/candidate-proof-map/report.md)
shows why live lease checks, `ScalarSource.value` visibility, exact accepted
history, and partial host failure cannot be deleted from a proposed fast path
without a replacement proof. The generated arithmetic kernel alone is not
shown sufficient for the strong-win target.

The [preregistered six-block, 18-page native control report](./.cache/dense-causal-control-v1/gates/recording-1024/report.md)
and [immutable analysis](./.cache/dense-causal-control-v1/gates/recording-1024/analysis-1024.json)
use each original/off/on order once at 1,024 rows. All pages pass source,
output, identity, lifecycle, and cleanup checks. The dispatch interval's median
of six `on` page medians is **0.4975 ms**, above the timer floor. Yet median
control range width/magnitude are **0.3425 / 0.2725 ms** against a **0.179875 ms**
screen tolerance; p95 width/magnitude are **0.240 / 0.250 ms** against **0.20375 ms**.
The preregistered screen fails, so the conditional 10,000-row recording and
favorable retries stop. These are descriptive page/block statistics, not a
confidence interval, causal removable share, or new-cost bound. Physical
selection remains on hold. The [independent final disposition](./.cache/dense-causal-control-v1/final-disposition-review.md)
closes this targeted dispatch rerun as **unresolved**, without claiming a faster
algorithm impossible. Its next independent product gate is Recording B on
structural locality; the semantic publication contract can advance separately.
Neither substitutes for a passed dense speed qualification.

## 1. The question and the decision we need

React combines a familiar component model with a mature renderer, compiler work,
scheduling, hydration, and a large ecosystem. The research question is not
whether a typed array can beat a tree walk. It is whether declarative JSX can
compile into a smaller, inspectable update plan that does less repeated work on
important UI workloads while keeping practical lifecycle, host, and async
semantics.

The architectural idea is to keep the VDOM and avoid forcing one representation
to serve every job:

- The **VDOM/ownership tree** represents the declarative snapshot, nesting,
  order, keys, identity, lifecycle, and host-neutral output. It remains
  inspectable and can be reconciled by different host adapters.
- The **typed dependency DAG** represents which state or trait changes affect
  derived values, VDOM regions, and async resource/task nodes. Nodes declare
  execution domains (main-thread synchronous, worker-safe, I/O-bound, or host
  commit), priority, read versions, and write sets.
- The **scheduler** plans graph work across root versions, applies cancellation
  and freshness rules, and decides when a candidate VDOM is ready to commit. It
  does not replace the ownership tree or make JavaScript parallel by itself.

The VDOM is not the dependency DAG. The former describes what the UI is; the
latter answers what a change can affect. A DAG does not itself make JavaScript
parallel, and a compiler cannot remove the costs of dynamic structure or host
commits. The suspected waste is repeated discovery and broad invalidation, not
the existence of a virtual tree. Keep the tree as the shared semantic contract;
use stable IDs, compiled region boundaries, and update indexes so the runtime
need not rebuild or revisit unrelated parts on every change.

Xi Editor’s Rope Science series informs the use of explicit deltas, incremental
summaries, snapshot-relative work, and visible-first priorities; it does not
prove that those techniques improve a UI runtime. React Nylon’s public
description calls it a reconciler implemented in under 4 KB, which aligns with
the goal of keeping renderer machinery small. It explores a different
slice—compact reconciliation and custom rendering—not our compiler-emitted
dependency bindings or async task graph. That size claim does not establish
whole-framework size, comparative performance, or maintainability.

## 2. Current design direction

### 2.1 Keep JSX and VDOM; compile the repeated work

JSX remains the user-facing description, and its element values remain the VDOM
input to the runtime. The VDOM gives the runtime a complete declarative
snapshot: it can be inspected, tested, transformed, diffed, serialized, and sent
to different host adapters. A build-time front end should resolve static
structure and dynamic reads, then emit stable VDOM-region IDs, hook-site IDs,
lifecycle operations, and source-to-region/host dependencies.

When sources change, the graph marks only dependent regions dirty. The runtime
evaluates those regions and produces the next VDOM values. A compiled diff plan
can patch known stable structure directly; a general keyed reconciler handles
inserts, removals, moves, branches, and dynamic cases. Both routes consume the
same VDOM and produce host-neutral commit records. This preserves the VDOM’s
compositional and renderer-independent value while reducing broad rerender,
diff, and host-dispatch work where the compiler can prove a narrower path.
Authors continue to describe props declaratively.

OXC is the current compiler-front-end direction for parsing, semantic analysis,
and custom lowering; TypeScript remains responsible for type diagnostics until
evidence justifies another route. This is a toolchain choice, not a runtime
performance result. The current OXC work is a narrow TSX-to-plan spike: it
supports a static root and repeated intrinsic host pattern with scalar
local/shared bindings. It is not a general JSX compiler and does not yet emit a
full ownership, lifecycle, or scheduling plan.

### 2.2 Keep JavaScript as the baseline; investigate an optional Wasm tier

Our measured hot paths show that specialization changes the amount of work,
but no project result yet shows that Wasm or SIMD improves an end-to-end UI
update. WATaBoy makes generated Wasm blocks a credible technique to test: it
reports a workload-specific win over a native interpreter, not a native AOT
emulator, and does not isolate SIMD's contribution. Keep the runtime API,
fallback, VDOM, ECS, scheduler, and host adapters in JavaScript. Once the OXC
DAG and SoA columns are stable, test build-time scalar Wasm on a pure batched
kernel; add runtime JIT and SIMD only if complete browser workloads repay
compile/warm-up, ABI, and host costs.

### 2.3 Give hooks stable identities instead of positional identities

The ECS world can own hook state as traits associated with a component instance
and a compiler-generated hook-site ID. A hook no longer means “the next cell in
this render’s call sequence.” Its identity is the owning component/entity plus
its lexical site; a keyed repeated region adds the item key to that owner path.
`useState`, memo cells, refs, context subscriptions, and effect records can
therefore be stored and queried as ordinary entity data.

This allows hooks behind conditions and early returns without shifting the state
of later hooks. A clear first contract is: state at a skipped call site persists
while its owner remains mounted; an effect whose site is skipped in a completed
update is cleaned up, and it is set up again if that site becomes active later.
Removing the keyed owner disposes all its hook traits. Repeated hook calls in a
plain JavaScript loop remain ambiguous; require a compiler-visible keyed region
or a child component so each item has its own entity scope. Custom hooks compose
because the compiler can attribute their call sites to the invoking owner.

This is close to Octane’s public hook model: stable slots assigned by call site,
preserved state for skipped hooks, effect cleanup when a reached site
disappears, and keyed `@for` regions for repeated state. Octane also explicitly
removes the VDOM and compiles templates to cloned DOM nodes with direct updates.
We should adopt the hook-identity lesson while keeping the VDOM as a first-class
runtime value.
[Octane’s hook semantics](https://github.com/octanejs/octane/blob/main/docs/differences-from-react.md#no-rules-of-hooks-except-plain-js-loops)
and [overview](https://octanejs.dev/) are prior art, not evidence for our
ECS/VDOM design.

The word “compatibility” needs care: familiar call shapes do not make this model
behaviorally interchangeable with React. Stable-site hooks permit patterns React
rejects. Keep an explicit React interop boundary for libraries that depend on
React’s dispatcher and exact lifecycle semantics. For the native API, document
state lifetime and effects as owner/site semantics rather than promising full
drop-in compatibility.

### 2.4 Treat propagation as a policy choice

The experiments reject the idea that a dependency graph is always the fastest
update structure. Use compiled dependency information as the source of truth,
but allow the execution plan to choose among affected-edge traversal,
dirty-region scans, and dense passes when there is a cheap, trustworthy basis
for that choice. Do not add a runtime selector until its bookkeeping and
decision costs are measured in the same integrated benchmark. Cluster locality
and dirty coverage both mattered in the Deno studies; global update density
alone is not enough.

### 2.5 Treat suspension as a versioned transition

The current React comparison needs precision. Suspense does not generally
discard all state when already-mounted content suspends: a new tree that
suspends before its first mount is retried from scratch, while hiding previously
revealed content cleans up its layout effects. A non-urgent React Transition can
keep already-revealed content visible instead of showing a fallback, and React
19.3 now ships stable `<ViewTransition>`. The opportunity is to make state
preservation, pending/reveal policy, and visual transition explicit parts of the
scheduler and ECS model, then show a concrete advantage over these current
APIs—not to claim React has no transitions.

Treat a state update as a candidate version of one or more roots. The committed
VDOM remains visible while the scheduler evaluates the candidate. If a resource
node is pending, its dependent VDOM region reports
`Pending(resourceId, version)` to the nearest declared boundary. The boundary
policy can keep the prior region, show an inline pending treatment, reveal a
fallback, or reveal ready siblings progressively. A pending candidate does not
dispose the committed entity tree or run its unmount effects. Once the candidate
is ready (or its boundary policy permits partial reveal), commit a diff; only
then do removed entities dispose and their effects clean up. On cancellation,
discard the candidate and its uncommitted effects.

This separates three decisions that are often conflated: whether work is ready,
which version remains visible, and how the committed visual change animates. The
same transition record carries its root set, base/target versions, urgency,
reveal policy, and animation intent. An urgent input may commit immediately; a
navigation or expensive filter can keep the previous snapshot visible while work
proceeds; a newly inserted region can still show its own fallback. Multiple
roots can share resource/derive nodes while retaining independent commit
boundaries, or participate in one coordinated commit when the interaction
requires consistency.

The dependency DAG lets the scheduler discover declared prerequisites for a
candidate version, launch its independent I/O frontier before waiting on any
one result, and identify which regions each resource blocks. It can then
advance newly unblocked tasks and prepare ready regions while preserving one
explicit reveal/commit policy. This avoids serial waterfalls only where the
dependency edges show that work is independent; a true dependent chain still
has a serial critical path. React can also avoid request waterfalls when
application code, a route loader, or a framework starts and caches promises
before render. React's `use` documentation explicitly warns that starting
requests lazily during render can create waterfalls and demonstrates preloading
on hover. So the claim is not that React cannot prewarm or coordinate
Suspense—it does not infer the complete candidate dependency DAG from ordinary
component reads and expose that plan as the scheduler's shared execution and
inspection model. Our existing Experiment AG intentionally prewarms both React
promises together and finds nearly equal completion latency; it shows no speed
win for the current graph prototype.

“Do not wait at each branch” means the scheduler explores all currently
reachable branches and starts their ready work without awaiting a sibling.
For example, if `profile`, `feed`, and `recommendations` are independent from
the candidate's current inputs, launch all three requests; if recommendations
need the profile result, only that edge stays blocked while the feed proceeds.
If a downstream request's inputs are already known or can be safely predicted,
the plan may opt to prefetch it too. Such speculation must be explicit,
budgeted, deduplicated by resource key, and cancellable when its candidate
becomes stale. The scheduler cannot invent values that a genuinely dependent
request has not received.

The graph should distinguish **value dependencies** (a consumer needs a
producer's result), **ordering/scheduling constraints** (work may be reordered
or run concurrently unless a declared constraint applies), and **publication
groups** (independent results that must become visible together). Ready nodes
with no conflicting writes can execute independently; worker execution is one
option for pure CPU nodes, while launching independent async requests already
removes the need to suspend traversal at every branch. A join or reveal group
controls when prepared results become visible; it does not force unrelated
branches to wait before starting. This is the part to measure against an
equally prewarmed React/framework baseline: request start gaps, critical-path
completion, useful-ready time, and urgent-input latency, with speculative work
and cancellation accounted for.

The planned runtime should make that graph a contract: nodes declare input
versions, output ownership, execution domain, priority, cancellation, and
whether they are safe to start speculatively. The scheduler starts independent
I/O concurrently, and it may run pure CPU nodes in workers only when their
inputs are immutable and their writes are isolated. Ordinary JavaScript CPU
callbacks still execute serially on one event loop; DAG traversal does not make
them thread-parallel. Results join by version and are published through a
serialized host commit, atomically at the requested boundary or progressively
only where the reveal policy permits it. Stale work cannot publish. Dynamic
dependencies discovered only after a result arrives extend the graph at
runtime; they cannot be prewarmed before they are known. These are target
semantics, not yet proven product behavior. See the [React `use` reference](https://react.dev/reference/react/use)
and [Suspense reference](https://react.dev/reference/react/Suspense).

Transitions also need to coordinate ECS state and effects. For shared stores,
the selected model is a chronological action log projected at each root's
visible transition boundary. An urgent action is replayed over the state that
root still shows; when the transition lands, the actions appear in dispatch
order. Effects observe committed state only. A newer generation can supersede
older async preparation, and stale worker/resource results cannot commit.
Stable hook-site entities keep their state across candidate retries; only an
actual committed removal disposes them.
For DOM, the host adapter can opt into the browser View Transitions API; Three
or another host can animate between committed snapshots through the same
transition intent and its own adapter. Animation never blocks urgent input or
makes stale state visible.

The `TransitionCoordinator` and async VDOM path have executable contracts for
candidate root versions, cancellation/supersession, stale-result rejection,
urgent rebasing, keyed identity, and coordinated commits. Browser studies now
compare keep-previous transitions, urgent input during pending work, and
selective retry with React. They verify those specific behaviors, but show no
meaningful completion-latency advantage; work uses prewarmed or synthetic
requests on one Chrome/device profile. Progressive reveal, presentation-level
responsiveness, worker CPU parallelism, and broad React-equivalent Suspense
semantics remain open. See the browser evidence in
[Gate C](#gate-c--can-transitions-preserve-state-and-stay-responsive-under-suspense).
The next async gate is a branch-frontier study with three arms: a sequential
loader control, React with explicit equivalent preloading, and the compiled
DAG scheduler. It checks request-start overlap, hard dependency order, commit
consistency, and critical-path completion. The protocol is in
[async-dag-frontier-protocol.md](./async-dag-frontier-protocol.md). Passing only
the waterfall control is evidence of better orchestration, not a React speed
win; the fair baseline is the equally prewarmed React arm.

## 3. Evidence and what it means

The detailed protocols, historical runs, raw-data paths, and
experiment-by-experiment notes are preserved in the
[experiment log](./experiment-log.md). The Deno Jupyter notebook is the
executable analysis; its charts use inline SVG.

### 3.1 Mechanism evidence

Matched-input Deno studies compare a dependency graph, dirty-bucket scans, and
full scans on scalar typed-array outputs. Across three fresh processes, graph
traversal generally leads for sparse, spread changes and loses to full scans as
changed coverage grows. In the integrated 50,000-entity study, 64-entity buckets
lead for clustered changes through 50%, graph dispatch leads for spread changes
through 25%, and full scans lead for dense spread changes. These results support
workload-sensitive propagation. They do not include component execution, dynamic
topology, real DOM/Three host behavior, or selection-policy overhead.

### 3.2 Browser prototype evidence

The current browser experiments cover repeated hosts, local and shared inputs,
multiple bound props, and a JSX-authored React arm with React Compiler. In the
1k/5k/10k multi-trait sweep, the compiled dense path won all 864 measured pairs
across two page loads and had zero sampled or final full-host parity failures.
At full update density its median advantage narrowed, as expected. In a separate
14-run comparison, OXC-generated direct writers beat the dense plan interpreter
in all 14 run medians, reducing condition-summary medians by 15.2–34.4%.

Those are real signals for specialization on this fixture. They do not show that
the runtime has equivalent framework behavior or wins a fair React bake-off. The
earlier generated-path comparison includes different work: its React arm
evaluates components and subscriptions, while generated writers dispatch to
known bindings. Experiments U and V compare equivalent final DOM styles through
a retained-VDOM scalar-binding path, but still do not exercise component
execution or reconciliation in the VDOM arm. All browser timing excludes
paint/presented frames and comes from one Chrome/MacIntel profile and device.
Large ratios at very sparse densities approach the browser timer floor. See the
experiment log for the earlier browser protocols and raw JSON paths.

### 3.3 Transition scheduling and coordinator evidence

The runtime now has a compiled async task plan, bounded ready-queue execution,
candidate-local results, and a coordinator for root versions, cancellation,
supersession, and commits. OXC can emit literal task dependencies, and the
retained-VDOM path prepares keyed candidates before publishing host updates.
In-memory contracts cover task ordering, freshness, cancellation, identity,
urgent rebase, and multi-root commit. A Deno fan-in benchmark shows the root
index beats a full scan at larger fan-in, with fixed bookkeeping overhead at
small root counts; this measures coordinator bookkeeping only.

Browser comparisons now test keep-previous transitions, urgent input during a
two-root transition, and task reuse after a query change. In the
prewarmed-dashboard study, React and the graph runtime had nearly equal
task-to-commit medians (118.7 and 118.0 ms). In the urgent-input study, both
preserved the pending view and showed the urgent value before resource
completion; dispatch-to-visible medians were 2.1 ms for React and 0.4 ms for the
runtime, while transition completion medians were 215.9 and 213.7 ms. A separate
40-pair retry study found no update-to-commit advantage for selective
completed-task reuse over React. These are single-device, programmatic studies
with synthetic waits; they establish narrow behavior contracts, not general
async performance or smoother presentation. Independent in-flight work,
progressive reveal, and CPU parallelism remain untested. Detailed protocols and
raw data appear in
[Gate C](#gate-c--can-transitions-preserve-state-and-stay-responsive-under-suspense)
and the [experiment log](./experiment-log.md).

### 3.4 Browser evidence synthesis

The browser studies ask whether compiler-known dependencies can reduce
declarative update work after preserving output and identity. Their results
cluster into three cases: stable scalar updates favor direct dependency-selected
writes; owner-local updates favor avoiding clean owners; structural edits remain
an unresolved cost. These are mechanism results from named fixtures, not a
general ranking of frameworks. Full protocols, per-page records, seeds, and
analysis are in the [experiment log](./experiment-log.md) and the linked
machine-readable results.

#### Scalar props and compiled bindings

Experiment U compares 10,000 keyed leaves with matching React 19.3 + React
Compiler and retained-VDOM output. At 1%, 10%, and 100% changed leaves, median
update times were 5.237/7.983/38.800 ms for React and 0.167/1.867/18.900 ms for
the VDOM binding path; all 324 pairs passed full style parity. The React arm
uses per-leaf `useSyncExternalStore` snapshots, while the VDOM update skips
component execution and diffing. The sparse case approaches the timer floor; the
dense case is a stronger signal, but still excludes structure, lifecycle, paint,
and a second device. This supports direct source-to-prop bindings for stable
trees, not a general compiler speedup. See the
[page replications](./results/retained-vdom-react-page-replications-v1.json).

Experiment V isolates the update representation on the same 10,000-leaf shape.
Median update time was 1.900 ms for materialized style-object updates, 0.883 ms
for runtime-discovered direct fields, and 0.967 ms for OXC CSR edges resolved at
mount. Setup medians were 33.8, 36.2, and 47.2 ms, respectively. Field-level
writes explain most of the improvement in this fixture; the compiled edge table
did not beat runtime discovery and cost more to set up. The decision is to
compile dependency truth, resolve it to compact writers once, and count setup
cost in any integrated claim. Mode blocks were sequential, so small timing
differences are provisional. See the
[dispatch comparison](./results/browser-vdom-dispatch-comparison-v1-2026-10-09.json).

#### Region and owner-local selection

Gate A compares whole-tree VDOM derivation, OXC-selected regions, and React with
memoized regions. Across 27 page loads, all 648 timed pairs passed output and
keyed-identity checks, and graph dispatch beat whole-tree VDOM in every
size/session cell. The React comparison was surface-dependent: graph/React
median ratios were 0.19–0.23 in two Chrome 155 collections and 1.00–1.05 in the
Chrome 154 in-app collection. The Chrome repeat shares the original profile and
device. This supports selective region dispatch over whole-tree derivation; the
React result requires same-surface, independent-device replication. See the
[validated summary](./results/browser-keyed-regions-gate-a-summary-v1.json).

Experiment AA measures one local state update in flat keyed trees from 100 to
10,000 sibling components. Three page loads per size passed output, identity,
render-count, and partial-commit checks. At 10,000 siblings, React's median was
14.121 ms/update and the runtime's was 0.012 ms/update; mount medians were
similar at 61.0 and 63.9 ms. The ratio is large because this prototype path
targets one owner and commits only its stable keyed host region. All pages use
one Chrome profile/device and programmatic events; layout and paint are
excluded. The result supports owner selection plus indexed partial commit on
this shape, not general React superiority. See the
[browser summary](./results/browser-component-state-react-summary-v1.json).

Experiment AO batches 1–256 independent dirty owners in a fixed 10,000-row tree
and commits the runtime batch once. Its median rises from 0.10 to 1.70 ms/event
as owners rise from 1 to 256; React stays near 22 ms/event in the
workload-specific per-row store baseline. Three pages pass output, identity,
render-count, and single-commit contracts. This verifies the batch mechanism and
its cost trend; near-floor small batches, one device, and the specialized
baseline limit the performance claim. See the
[multi-owner summary](./results/browser-multi-owner-batch-summary-v1.json).

#### Structural updates remain the counterexample

Experiment AP tests keyed reorder, edge replacement, and half-list filtering
while rows own local state. The v2 incremental owner-subtree path beat React in
its Chrome 155 block, but filter p95 varied widely (85.6–314.6 ms). The later
Chrome 154 comparisons are the relevant within-block results: the linear v4
planner's runtime/React medians were 14.0/9.7 ms for rotation, 13.6/9.5 ms for
edge replacement, and 32.0/13.2 ms for filtering. All 216 samples passed output,
keyed-identity, and child-state checks, yet runtime p95 was higher for every
operation. The v3 LIS planner was slower still. These runs are sequential, and
the v2-to-v3 browser change prevents a causal algorithm comparison. Also, the v4
operations retain relative order except for moving one row in the rotation case;
this workload does not test an LIS-adversarial reorder, so the timing gap is not
evidence that move count is the cause. A one-page Chrome 154 phase trace now
preserves 24 paired updates and records the runtime path: the keyed
structural-owner branch ran 23/24 times per operation, with one full-reconcile
fallback each. The full-fallback updates measured 67.2 ms for rotate, 55.5 ms
for edge replacement, and 37.1 ms for filter; phase counters attribute
substantial portions to full owner expansion and VDOM commit. On the common
path, median owner expansion/cache was 6.8/5.8/9.8 ms and host reconciliation
was 2.1/1.9/8.5 ms for the three operations. These diagnostic timings are not
additive or comparable to uninstrumented AP results; the full-path observation
is one sample per operation and does not establish the cause of aggregate
performance. Allocation and host-placement counters remain absent. The next
experiment should explain why the stable keyed update falls back, measure
fallback frequency without phase instrumentation, and count
visited/created/reused owners plus host inserts, removals, moves, and key-index
work before testing a new structural algorithm. See the
[v4 aggregate](./results/browser-component-state-structural-summary-v4.json),
the
[browser phase trace](./results/browser-component-state-structural-profile-v5-83001046.json),
and the
[exploratory memory-host profile](./results/component-state-structural-memory-profile-v1.json).

#### Frame behavior and payload size

The two frame-cadence studies do not establish smoothness. rAF intervals and
long-animation-frame overlap contain extreme tails, vary between runs, and do
not measure compositor presentation. In the attribution runs both retained-VDOM
arms had fewer LoAF-overlapping windows than React, but the graph arm showed no
clear additional advantage over whole-tree VDOM. The fixed-topology generated
Snake writer result is reported separately in
[§8.2](#82-oxc-generated-per-frame-bindings-v4); it bypasses component execution
and VDOM reconciliation. See the
[LoAF records](./results/keyed-region-frame-pacing-attribution-v1-1791669251661.json)
and
[second run](./results/keyed-region-frame-pacing-attribution-v1-1791669535757.json).

The minimum counter bundle is 8,892 gzip bytes for the prototype and 75,584 for
React + React DOM, but the prototype implements far fewer features. This
establishes a small-kernel possibility, not equal-capability framework size. See
the [bundle result](./results/runtime-size-v1.json).

### 3.5 Maintainability and ecosystem evidence

Neither code size nor benchmark speed measures how easy a system is to change.
The hypothesis that ownership, data dependencies, and task dependencies are
easier to inspect as explicit structures remains untested. A new pure-JavaScript
task-graph kernel now has contract evidence for source-to-task fan-out, shared
fan-in deduplication, topological execution, unchanged-output pruning, cycle
rejection, and parity with full recomputation. The plan builder emits packed CSR
adjacency plus task order; the runtime does not infer dependencies during each
update. A paired synthetic workload study now compares its update path with full
recomputation across 1k, 10k, and 50k independent source/task pairs and nine
change densities. Three fresh processes and 24 randomized pairs per cell
reproduce a sparse advantage through roughly 2% changes on the larger fixtures,
then a scan advantage from 5% upward. The allocation-free flat-buffer callback
improves the median over the earlier array-input callback by about 5% at 50k/1%
(31.3 µs vs 32.9 µs) and about 1% at 50k/100% (4.96 ms vs 5.03 ms). The 50k/1%
result is 31.3 µs graph vs 78.2 µs scan; at 100%, it is 4.96 ms vs 305 µs. These
are kernel measurements only: the plan is not OXC-generated, and the benchmark
excludes JSX, VDOM, DOM, React, and paint. The result argues for a measured
hybrid and against making the heap-based graph path unconditional. This
task-kernel benchmark remains separate from component-state invalidation;
end-to-end integration cost and the effect of graph bookkeeping on dynamic UI
updates remain open. The bounded
[developer feature-authoring/comprehension protocol](./developer-study-protocol.md)
defines two matched tasks on conditional state/lifecycle and shared-source
derived regions, with scoring and decision rules, but no participant data have
been collected. It does not test host-adapter or compiler extension. A full correctness suite against representative React
patterns and a real React library compatibility trial also remain open. Nylon is
evidence that a small reconciler experiment is possible; it does not settle
whether the whole runtime can stay small and maintainable while supporting keys,
effects, errors, async state, hydration, and host adapters.

Relay is strong precedent for making dependency declarations part of ordinary
component authoring. Its fragments let components own their data requirements;
the compiler composes them into fetch operations, and subscriptions let only
components reading changed data update. This demonstrates that explicit,
composable dependency metadata can be useful in a production React ecosystem.
Relay’s graph models normalized data records and component reads, however; it
does not replace React’s VDOM/reconciler or prove the optimal internal
representation for UI invalidation. The opportunity here is to generalize that
useful discipline: compile dependencies from UI state and props as well as
remote data, then use them to choose which VDOM regions need evaluation and
reconciliation. See
[Relay fragments](https://relay.dev/docs/tutorial/fragments-1/),
[runtime architecture](https://relay.dev/docs/principles-and-architecture/runtime-architecture/),
and
[Thinking in Relay](https://relay.dev/docs/principles-and-architecture/thinking-in-relay/).
React provides useful current comparison points: Suspense boundaries,
transitions, and stable `<ViewTransition>` support. React 19.3 made
`<ViewTransition>` stable; the gap to investigate is the semantics and scheduler
integration we choose, not the claim that React has no such API. See the
[Suspense reference](https://react.dev/reference/react/Suspense),
[ViewTransition reference](https://react.dev/reference/react/ViewTransition),
and [React 19.3 release](https://react.dev/blog/2026/09/09/react-19-3).

### 3.6 Mixed real-time workload evidence

The preregistered 30-page production comparison combines three declarative prop
updates per entity on every frame with eight keyed removal/insertion/rotation
events per page. All 7,200 frame records pass output parity, stable keyed-node
identity, and complete commit coverage. The current runtime is effectively tied
at 128 entities (paired median ratio 0.998), then loses at 512 (1.117) and 1,024
(1.195). Its median paired p95 ratio is 1.145 and 1.148 at those larger sizes,
above the 1.10 guard. None of the sizes meets the preregistered 0.80 median
target; the overall performance gate fails. Structural-frame p95 is also
higher for the runtime at all three sizes. These results prevent treating
stable-scene wins as a general scale result.

The next work should attribute source notification, dependency selection,
scalar binding dispatch, keyed update, and host commit before changing the data
structure. This does not justify dropping JSX/VDOM or asking users to write
imperative refs. The current benchmark uses retained scalar source bindings
rather than a complete OXC-emitted plan, one device/browser profile, and RAF
callback timing; it does not measure a Three host or displayed smoothness. Full
methods are in the [study report](./mixed-realtime-study.md); hash checks and
inline SVG analyses are in the notebook.

## 4. Provisional conclusion

The project has not proved a generally better or faster React. It has
demonstrated useful primitives and identified where the current design succeeds
and fails.

The strongest support is for dependency-selected work on stable structures. In
named browser fixtures, direct scalar bindings, compiler-selected regions, and
indexed owner-local commits pass output and identity checks while avoiding clean
work. Deno mechanism studies explain why this cannot be a graph-only runtime:
graph traversal helps sparse or spread changes, buckets help clustered changes,
and dense scans win when enough outputs change. OXC-emitted dependency tables
are a credible way to describe the work, but Experiment V found no steady-state
timing win over runtime-discovered direct fields and measured higher setup cost.

The completed sparse per-frame browser follow-up adds direct UI-host evidence to
the dispatch question. On this single-device, fixed-topology workload, compiled
VDOM modes were nominally faster than React + Compiler on all 48 paired page
loads; in the exploratory 4,096-entity, 10–100%-dirty slice where both page
medians exceeded 0.1 ms, each mode remained faster in all 18 pairs, with median
ratios from 0.42× to 0.49×. The primary all-workload ratios include many 0/0.1
ms values and therefore overstate precision. More decisively for architecture,
4,096-row scattered updates at 50% dirty favored dense VDOM (1.5 ms) over exact
dirty rows (2.6 ms), while 128-row buckets measured 1.6 ms; at 100% scattered,
dense VDOM measured 2.6 ms and exact rows 4.1 ms. This supports a
workload-sensitive dispatch policy inside the retained VDOM, not a universal
dirty-list path. RAF interval p95 did not improve, and the test excludes paint,
dynamic topology, setup, and teardown.

The counterevidence sets the scope. The latest keyed structural benchmark
remains slower than React on rotation, edge replacement, and filtering, even
after a linear move planner. Async transition comparisons validate
keep-previous, urgent-input, and retry behavior but show no reliable
completion-latency gain. Frame-cadence data are noisy and do not measure
presentation. Minimum bundle size is promising only for an intentionally smaller
feature set. Maintainability and host-adapter simplicity have not been measured.

The preregistered V2 keyed-owner study sharpens the structural result. Its token
path passed both rotation gates on all five pages: median 5.05 ms versus 7.50 ms
for React + Compiler, 11.50 ms for generic owner expansion, and 6.50 ms for
checked V1 reuse. It also passed the 1.10× runtime fallback ceiling for filter
shrink (1.081×) and restore (1.021×), but edge replacement was 1.143× generic on
the page-level paired-ratio median and failed the guardrail. The overall
preregistered result is therefore **FAIL**. A one-device browser result
justifies keeping the token optimization behind correctness and shape checks for
further study; it does not justify promoting it as the default structural path.
The child-state cache invalidation and archive permutation validator both
required amendments, preserved alongside the source lock and immutable input
snapshot.

The architecture worth testing next is therefore specific:

1. Keep JSX and a retained VDOM as the complete, inspectable output and identity
   model.
2. Compile state/trait reads into typed dependencies for derived work, owners,
   regions, and host props.
3. Resolve stable dependencies at mount into compact writer indexes; select
   graph, dirty-bucket, or dense-scan execution from measured update shape.
4. Keep the general keyed reconciler for structural changes. Treat opaque
   version-token reuse as an optional same-key specialization, retain generic
   fallback, and do not promote it until edge replacement meets its guardrail
   and the result replicates independently.
5. Stage async work as versioned candidates and publish only fresh results
   through coordinated host commits. Do not imply that this makes main-thread
   JavaScript parallel.
6. Keep the first runtime in JavaScript and treat adapter, lifecycle, and React
   interop behavior as explicit public contracts.

The next decisions are bounded. The V5 production-build replication closed the
build-mode gap, V6 tested dense column writers, the Deno dispatch sweep mapped
density/locality, and the completed sparse browser study included worklist
construction and DOM host writes against React. V6's post-hoc mount-only
estimate suggests the columnar path offsets its mount difference after a median
of 3 updates at 512 segments and 4 at 1,024; teardown-inclusive lifecycle cost
remains unmeasured. Replicate the sparse/V6 browser effects on a second physical
device and calibrate sub-0.1 ms timing before treating small-workload ratios as
precise. Then test dynamic growth/key changes and teardown-inclusive
amortization. For structural work, profile the known AP v4 losses before testing
graph-selected intervals. To test “simpler,” pilot, freeze, and run the bounded
[developer feature-authoring/comprehension protocol](./developer-study-protocol.md)
on conditional state and derived-region tasks against React. It does not test
host-adapter or compiler extension. If these studies do not show repeatable
end-to-end value after setup and lifecycle costs, narrow the product claim to
the mechanisms that did work.

Until those gates pass, describe the result as a pure-JavaScript runtime
prototype with evidence for specialized update paths—not a React replacement, a
general speedup, or a proven maintainability improvement.

## 5. Product brief: pains, design response, and proof obligations

The product goal is a declarative JSX runtime that keeps the VDOM, is easy to
extend to new hosts, and uses explicit data dependencies to make common updates
cheaper and async work easier to plan. Its central promise is that the runtime
knows what changed, what the change can affect, and when the resulting state is
safe to show. This ties the user concerns together as one product thesis rather
than a list of unrelated feature gaps.

The first product is intentionally narrower than the long-term vision: a
pure-JavaScript kernel, OXC TSX path, retained keyed VDOM, compiler-emitted
dependency plan, native events, versioned commits, DOM and Three adapters, and
an incremental React island/selected-library bridge. Workers and work stealing,
server streams and resumable hydration, CRDTs, runtime Wasm JIT/SIMD, and a
drop-in React renderer remain later options. A bounded build-time scalar-Wasm
backend experiment can follow once the JavaScript DAG and SoA layout stabilize;
it does not change the pure-JavaScript first-product contract. These options
enter the product only when a named workload or compatibility need justifies
their complexity. The separate
[product thesis](./product-thesis.md) defines these priorities, the user
contract, and success gates.

The table below maps user-stated pain hypotheses to current React behavior, a
design response, and evidence needed. These are not claims that every React user
agrees or that React lacks all related features. A React adapter is part of the
product plan, but JSX syntax alone cannot make React libraries compatible: the
adapter must specify which renderer, lifecycle, context, and hook behaviors it
supports.

| User-stated pain or desired outcome                           | Current React baseline / qualification                                                                                                                                                                                                                                                          | Runtime response to test                                                                                                                                                                                                          | Evidence gate                                                                                                                                                                          |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| View transitions are missing or disconnected from updates     | React 19.3 ships stable `<ViewTransition>`. The research opportunity is broader coordination with async readiness, roots, and non-DOM hosts.                                                                                                                                                    | A transition record carries source/target versions, affected roots, reveal policy, and host animation intent.                                                                                                                     | Compare DOM navigation and Three-host transitions against React 19.3, including interruption and reduced-motion behavior.                                                              |
| Async external-store updates feel fragile                     | `useSyncExternalStore` guarantees a consistent snapshot; if a store changes during a non-blocking Transition, React can restart it as blocking. Suspense from an external-store snapshot is discouraged.                                                                                        | Keep chronological actions and project the store log for each root's pending transition work; replay urgent actions over the state that root still shows.                                                                                      | Stress urgent dispatch during a held transition, root-specific reads, action order, promise-valued state, cancellation, and stale completion; compare with the userland store and React fork.                                             |
| Call-order Hooks make conditional logic awkward               | React explicitly requires Hooks at the top level.                                                                                                                                                                                                                                               | Compiler-assigned hook-site IDs stored as ECS traits under stable component/key ownership.                                                                                                                                        | Test conditional activation, skipped-state retention, effect cleanup/restart, loops with keyed ownership, and source-level comprehension.                                              |
| Effects are too often used for work tied to changing values   | React Effects synchronize with external systems after commits and rerun when dependencies change; this is useful but easy to overuse for derived work.                                                                                                                                          | Reserve native lifecycle effects for owner activation/deactivation; model value-dependent derivations and subscriptions as graph tasks. Decide whether the mount-only API is named `useEffect` or a distinct lifecycle primitive. | Test cleanup, skipped-site reactivation, changed dependencies, Strict Mode-like diagnostics, and migration of common effect patterns.                                                  |
| Rendering and memoization are costly                          | React Compiler can reduce some repeated render work; cost depends on the app and compiler coverage. Experiments U and V measure bound props; AA measures one component-local state update, AO measures batches of independent dirty owners, and AN varies component grouping at fixed DOM size. | Compile read dependencies to dirty VDOM regions and specialized prop/structure updates, with general keyed reconciliation for dynamic cases.                                                                                      | Extend equivalent mount/update benchmarks to derived state and dynamic structure against React Compiler plus localized subscriptions; include allocations, memory, and browser frames. |
| Context updates fan out too broadly                           | React re-renders consumers of a changed context value; it does not re-render every component in the app. Fine-grained subscriptions are available through external stores and libraries.                                                                                                        | Treat context as a named source/trait and compile each consumer's selected reads into graph edges.                                                                                                                                | Vary consumer count and selected fields; compare update fan-out and end-to-end latency against context and selector-store baselines.                                                   |
| Render counts are unpredictable                               | React does not promise a specific component invocation count; Strict Mode and concurrent retries can add calls.                                                                                                                                                                                 | Promise observable state and commit semantics, not exact function invocation counts. Offer counters and graph inspection for debugging.                                                                                           | Specify which execution/commit counts are contractual; test under cancellation, retries, and dev diagnostics.                                                                          |
| Ref mutation is needed to avoid renders for hot props         | Refs are a supported imperative escape hatch, especially for animation loops; they are not a requirement for every fast update.                                                                                                                                                                 | Keep props declarative while source-to-prop edges patch only affected host properties, without executing the owning component.                                                                                                    | Compare declarative animated props with React state/Compiler and the idiomatic ref/useFrame approach, including visual smoothness.                                                     |
| Suspense can waterfall and reveal awkwardly                   | Suspense coordinates supported suspending work; it does not itself discover or fetch every resource in a tree. Frameworks and data libraries can preload. React supports transitions, nested boundaries, and retaining stale content in some updates.                                           | Compiler metadata plans known dependencies, launches independent loads early, stages ready results, and commits by explicit boundary policy.                                                                                      | Demonstrate reduced request start gaps and useful reveal time on dependency fixtures; compare equal preload knowledge and verify no fallback flashes/state loss.                       |
| True parallel CPU work and work stealing would help           | React can yield/interleave work on the main thread; this is not parallel execution of arbitrary component JavaScript.                                                                                                                                                                           | Mark pure tasks as worker-safe; execute from immutable snapshots in a pool, allow task stealing, cancel stale tasks, and serialize DOM commits.                                                                                   | Measure end-to-end wall time, input latency, transfer/clone cost, and worker saturation at varied CPU workloads.                                                                       |
| Multiple roots and mixed renderers are clunky                 | React supports multiple roots and custom renderers, but each root/renderer has explicit boundaries and its own lifecycle contract.                                                                                                                                                              | Shared ECS world and dependency DAG, with independently mounted roots that can be grafted and coordinated in one transition.                                                                                                      | Exercise cross-root state, ownership, disposal, context-like scopes, and atomic coordinated commits across DOM and Three adapters.                                                     |
| Cold start and server/client handoff are expensive or fragile | React has streaming server rendering, selective hydration, and `useSyncExternalStore` server snapshots. Hydration still requires a matching initial tree/snapshot.                                                                                                                              | Cache or stream versioned state snapshots and patches with stable IDs; attach behavior incrementally as matching regions arrive.                                                                                                  | Test delayed, reordered, duplicated, and stale chunks; verify deterministic convergence and interaction before full hydration.                                                         |
| RSC is the wrong abstraction for this product                 | This is a product position, not a general technical conclusion. RSC is one framework/runtime model for server component rendering.                                                                                                                                                              | Keep the core client runtime host-neutral; expose explicit server-to-client state/resource streams without requiring server components.                                                                                           | Compare payload, latency, cacheability, invalidation, and developer model on a representative route against an RSC baseline.                                                           |
| CRDTs might improve hydration                                 | CRDTs solve concurrent merge of replicated data with defined merge semantics; they do not automatically solve DOM identity or server/client render mismatches.                                                                                                                                  | Use versioned snapshots/deltas by default; use CRDTs only for domain state with concurrent writers and a suitable merge algebra.                                                                                                  | Demonstrate a real concurrent-edit case where CRDT merge improves correctness; separately test stream identity and hydration recovery.                                                 |

This matrix changes the intended claim from “React is slow and lacks these
features” to a testable one: **can a VDOM-preserving, compiler-planned runtime
offer simpler update semantics and better measured cost on selected workloads
while providing an explicit adapter path into the React ecosystem?** A feature
counts as a win only when its semantics, costs, and compatibility boundary are
demonstrated.

## 6. Product boundary and build order

The product is a **declarative UI runtime for JSX**: authors describe elements,
props, state, and events; a compiler emits dependency and ownership metadata; a
small JavaScript kernel updates retained VDOM and commits changes through a host
adapter. The user should not need refs to make ordinary prop updates efficient.
ECS traits and the dependency graph are internal data structures with
inspectable extension points, not a requirement that application authors write
an ECS manually.

The user-stated pain hypotheses, current React qualifications, proposed
responses, and proof obligations are mapped in the product brief in Section 5.
For example, React `<ViewTransition>` is now stable in React 19.3. The
opportunity is broader transition coordination across pending data, roots,
lifecycle, and non-DOM hosts, not the claim that React has no view-transition
API. [React 19.3 release](https://react.dev/blog/2026/09/09/react-19-3) and
[ViewTransition reference](https://react.dev/reference/react/ViewTransition).

The first release candidate stays pure JavaScript at runtime: a small ECS
kernel; stable entity, trait, and hook-site identity; retained VDOM;
compiler-generated dependency/task plan; source-to-region invalidation; general
keyed reconciliation; native host events; and a public host adapter. Start with
a cooperative, versioned scheduler that can overlap I/O and coordinate candidate
commits. A React adapter should mount a runtime island inside React and provide
explicit bridges for selected React libraries; JSX syntax alone is not a
compatibility promise.

Validation follows contract-first TDD. React's upstream tests are a case catalog
and differential reference for overlapping observable behavior, not the new
runtime's spec: private renderer assertions and React's hook/scheduler
implementation are not portable across the deliberate semantic differences. The
[testing strategy](./testing-strategy.md) defines public behavior tests, a
full-scan oracle for incremental graph correctness, deterministic async
state-machine tests, and separate performance protocols.

Build order follows risk and dependency. First close the derived-state and
keyed-structure comparison already in progress (Gate A), then dynamic topology
and lifecycle (Gate B), then async readiness, transitions, and cross-root
commits (Gate C). After those pass, implement a real worker scheduler and
measure work stealing only if queues show imbalance; then add the streaming
state protocol and hydration recovery (Gate D). Build the React and Three
adapters against the same host contract as soon as the kernel stabilizes, and
keep their compatibility limits visible. OXC remains the TSX frontend direction
while JavaScript remains the runtime baseline. Keep the internal kernel
interface backend-neutral so a later, measured Wasm specialization can consume
the same typed DAG and SoA columns without changing JSX or host contracts.

The intended deliverable is not another research log: it is a small usable
runtime, compiler plugin, browser host, React island adapter, and Three host
adapter, with reproducible benchmarks and a compatibility matrix. Each gate ends
in a written decision. If a gate fails, revise or narrow the product rather than
accumulating experiments indefinitely.

The intended first public guarantee is not “renders exactly once.” It is: given
a committed version and an update batch, the runtime preserves declared entity
identity, evaluates only graph-reachable work permitted by the plan, publishes a
coherent host commit, and prevents stale candidates from becoming visible.
Component invocation counts remain an optimization detail unless the API
explicitly opts into a stronger contract.

## 7. Close the unknowns with four decision gates

Freeze broad architecture experiments while completing these four studies. Add
other benchmark rows only when a result could change one of the decisions below.

### Gate A — Does the retained keyed VDOM handle derived structural updates efficiently?

Experiments U and V close the static scalar-leaf and narrow compiler-integration
subcases: equivalent DOM output, a React Compiler baseline, an update-density
sweep, OXC-emitted binding IDs, and three dispatch variants have been measured.
The keyed-filter fixture exercises a state-derived filter with inserts/removals
and seven intermediate output checks, but uses a handwritten query-to-list
dependency. It is a retained-VDOM structural comparison, not compiler-DAG
evidence. Its first balanced sweep exposed a page-load/order confound because it
ran 1k, 5k, and 10k rows in ascending order within each browser page; those
results are exploratory and excluded from the paper's performance conclusion.

The preregistered protocol is complete: six page loads per size, split between
Chrome 155 and the Codex in-app browser using Chrome 154, with balanced size
order and one size per page. A supplemental Chrome 155 repeat added three page
loads per size in the same browser profile. Across all 27 pages, every
intermediate output and keyed-identity check passed; the 648 timed pairs remain
nested within page loads. Graph beat whole-tree VDOM in all nine size/collection
cells. The large React advantage reproduced across the two Chrome 155 blocks but
not in Chrome 154 in-app. The summary preserves session-separated page medians,
p95s, mount measurements, and ratios; same-profile repeats are not independent
browser-profile replications.

The OXC-to-runtime path represents two query sources, a shared rows source, two
derived collections, stable item keys, and independently addressable regions.
Next reproduce on a second physical device using the same Chrome version and
surface. The ready-to-run protocol and source-lock-aware URL generator are in
[second-device-replication.md](./second-device-replication.md). Then add dynamic
topology, allocations, and retained memory before making a general
compiler-generated-DAG performance claim.

### Gate B — Does the plan survive changing structure?

The first Gate B TDD slice checks keyed reorder identity, removal and fresh
reinsertion, host-type replacement, root disposal, and duplicate-key rejection
before the affected child list changes. Five focused VDOM contracts pass. A
non-timed browser differential trace matches React DOM 19.3.0 through prop
update, reorder, removal, and reinsertion. It also runs 128 seeded
insert/update/reorder/remove operations over 0–12 keyed items; every serialized
DOM and host-identity check passed. A second non-timed trace dispatched three
native clicks through a `ScalarSource` binding and matched React 19.3.0
`useSyncExternalStore` output after every event; a removed button click was
inert in both renderers. The four standalone `OwnerStateWorld` tests are joined
by four VDOM-backed component-state contracts. OXC now transforms a narrow TSX
fixture: component declarations are wrapped with `defineComponent`, imported
`useState` calls become explicit lexical `useStateAt` sites, and the generated
module is imported directly by runtime tests and the notebook. Tests show
conditional site skip/resume, native-event updates, keyed state and host
identity through reorder/removal/reinsertion, and preservation of committed
output when a candidate component throws. State writes coalesce into one
microtask commit, but the scheduler re-executes the full component tree. This is
executable compiler/runtime integration evidence, not graph-selected
invalidation or a complete compiled runtime. The notebook checks an in-memory
host and makes no browser timing or performance claim. The transform supports
named synchronous function declarations with one exclusive declaration of named,
unaliased `useState`/`useEffect` imports; `useEffect` accepts one callback only.
The checker confirms aliases, arrow components, and dependency-array effects
fail with explicit diagnostics. A manual owner/site `useEffectAt` primitive now
runs setup after successful commits, skips reruns on prop/state updates, and
cleans up on deactivation, owner removal, or root disposal; failed candidates
leave active effects unchanged. Its 4 lifecycle contracts pass in Deno and the
notebook on an in-memory host. OXC now lowers one-callback `useEffect` sites to
explicit effect IDs. Deno and notebook contracts pass, and one Chrome 155 run
matches React `useEffect(..., [])` setup/cleanup through activation,
reactivation, and root teardown. Dependency-array semantics, broader effect
behavior, custom hooks, listener replacement, and graph-edge mutation remain
open. A first Chrome 155 differential now matches three generated-counter clicks
and keyed-row state/host identity through reorder, removal, reinsertion, and
detached clicks against React 19.3.0; all seven saved checks pass. This is one
correctness run with no timings. Value-dependent task graphs and browser async
comparisons now exist, but compiler read inference remains limited to declared
or literal dependencies, and the tests show no reliable latency advantage. The
remaining structural gate is to measure lifecycle churn, allocation, and
retained memory during stateful list edits against optimized React. Include two
bounded extension tasks—add a host property/event to an adapter and implement a
conditional stateful region—and record completion time, concepts and files
touched, correctness, and comprehension answers. Treat source-line counts as
descriptive only; they cannot establish that a model is easier to maintain.

### Gate C — Can transitions preserve state and stay responsive under Suspense?

Experiments T, AD, AE, and AF now connect the JavaScript task scheduler to
retained VDOM commits. The checked-in OXC plan emits explicit task IDs, edges,
and topological order, binds those edges to authored async callbacks, and
commits a prepared keyed dashboard while preserving host identity. The browser
study in Experiment AG compares that path with React 19 `startTransition` plus
one Suspense boundary and promises prewarmed together. Across 20 paired
transitions, both arms retained the old UI and keyed nodes while pending and
produced equivalent final output. Median task-to-commit latency was 118.7 ms for
React and 118.0 ms for the graph runtime; p95 was 180.5 and 179.2 ms. These
near-equal measurements are dominated by synthetic asynchronous waits in one
Chrome 155 MacIntel session, so they show no meaningful performance advantage.
They do verify a keep-previous transition contract for one root and one
boundary.

Experiment AH extends Gate C to urgent input during a two-root transition.
Across 20 browser pairs, both React and the runtime retained the pending view,
displayed the urgent value before resource completion, committed both transition
roots, preserved keyed nodes, and matched output. React Compiler is enabled for
the React arm. The runtime keeps the urgent input in a separate native-event
root, outside the async batch. Median dispatch-to-visible time was 2.1 ms for
React and 0.4 ms for the runtime; p95 was 10.7 and 3.1 ms. Transition completion
medians were 215.9 and 213.7 ms; p95 was 289.9 and 273.6 ms. This is one Chrome
155 MacIntel session; programmatic input and synthetic timer waits make these
descriptive only, with no frame-presentation or speed conclusion. This does not
test rebasing an urgent update that targets one of the pending roots. The
compiler-enabled data is
[`urgent-multiroot-transition-browser-v2-2026-10-09.json`](./results/urgent-multiroot-transition-browser-v2-2026-10-09.json).

Experiment AI adds first-party same-root rebase, invalidation, and restart
contracts. While a task is pending, `commitUrgent` publishes an urgent input
change immediately. Independent work can rebase its candidate over that commit.
OXC infers task-to-task edges and external input edges from literal
`values.get("key")` reads in the callback's first parameter; keys matching task
IDs become DAG edges and other keys become inputs. The two-argument
`asyncTask(id, callback)` form therefore needs no duplicated dependency array,
and dynamic `.get()` keys are rejected. `$query` remains available for explicit
external sources. When a watched state input changes, the runtime aborts the
stale candidate. Plans may opt into a bounded restart by providing
`maxInputRestarts` and `refreshInputs`; the old UI stays mounted, the new
attempt starts from the latest root version, and late results from the prior
attempt cannot publish. The deterministic in-memory fixtures pass five rebase
contracts, seven invalidation contracts, and nine restart contracts; they record
no timings. The initial restart prototype reran the entire task DAG; the
follow-up prototype reuses completed outputs outside the changed-input
descendant closure while rerunning affected tasks. This does not preserve
independent in-flight work. Automatic owner-scoped state snapshots and broader
static read analysis remain open; browser/React retry comparison is covered
separately by Experiment AK.

Experiment AJ measures retry execution after a controlled invalidation point. A
query-dependent chain and independent leaves finish while an unrelated async
gate holds the initial candidate; the query then changes, and the retry is
timed. The matrix uses 32 or 128 tasks, 10%, 50%, or 90% changed-input
descendant share, and zero or 2,000 deterministic integer iterations per task.
Each of two fresh Deno processes ran 31 alternating-order pairs; all 24
process/case combinations passed output parity. At 10% invalidation,
completed-result reuse reduced median retry time by 49–89% in the costly cases.
At 90%, it reused only 3/32 or 13/128 tasks: zero-work retries were 15–21%
slower, while costly retries were 6–9% faster. This supports a
workload-dependent break-even hypothesis: graph analysis is worthwhile when
enough independent completed work is expensive enough to dominate the
closure-discovery overhead. The result is narrow to this synthetic scheduler
fixture on one Apple Silicon/Deno setup; it excludes plan preparation,
candidate/host commit, React, workers, and browser presentation. See the
[primary raw trials](./results/async-task-reuse-cost-v1.json) and
[fresh-process replication](./results/async-task-reuse-cost-replication-v1.json).

Experiment AK moves the retry comparison into Chrome and measures
urgent-query-to-fresh-DOM-commit time across 20 pairs at each of two
catalog-work levels. All 40 pairs pass pending-view retention, keyed identity,
final output parity, stale-result suppression, abort/restart, and task-count
contracts. With zero catalog work, medians are 7.9 ms for React 19 with React
Compiler, 8.4 ms for graph full restart, and 8.5 ms for completed-output reuse.
With 250,000 deterministic integer iterations, medians are 6.2, 7.7, and 8.6 ms.
Median paired differences versus React are +0.6/+1.2 ms at zero work and
+0.3/+1.1 ms with catalog work; completed reuse is faster in 9/20 and 6/20
pairs, respectively. Thus the browser study verifies the selective-reuse
contract but shows no timing advantage in this fixture. The scheduler-only
crossover does not transfer directly to browser commit latency: saved catalog
execution is small relative to runtime dispatch, retry, and host-commit costs
here. The experiment is one Chrome 155 MacIntel session; it uses programmatic
state changes and synthetic requests, measures through host commit only, and
excludes layout, paint, and frame presentation. React keeps the stale request in
flight but transitions only to the latest query; the graph runtime aborts its
stale task on the state write. This is not a general Suspense or
whole-application comparison. Raw samples are in
[`async-task-reuse-browser-v1-2026-10-10.json`](./results/async-task-reuse-browser-v1-2026-10-10.json).

The next Gate C study is the [async store action-log
protocol](./async-store-transition-protocol.md). Existing tests cover
candidate-local results and an urgent write outside the pending roots, but do
not validate shared-store action ordering through async VDOM commits. The new
runtime store keeps a chronological action log, projects it per root, and
replays urgent actions when earlier transition actions are hidden. Explicit
transition IDs reach candidate tree construction. A root-pinned read snapshot
now gives every read site in that candidate one projected value; per-root
versions reject stale candidates before coordinated host mutation. Selector
history publishes after commit. This is a consistency invariant within each
root, not a promise that every root displays one global version. Automatic
retry after stale rejection and the behavior are unvalidated. Next, port the
userland and React-fork cases: urgent dispatch during a held transition, a root
joining pending work, supersession, promise-valued state, selector
previous-value chains, and stale completion. Compare with both source
implementations before making a product claim.

The proposed target interaction is now captured in the
[async transition stress fixture](./async-transition-stress-v1-protocol.md):
optimistic actions stay urgent while timer-backed transitions overlap on one
root and forked roots share the store. Startup may use one placeholder; after
the first reveal, pending work should preserve the mounted view and show only
local pending state. The current browser fixture exercises overlapping store
actions, but not concurrent scheduler candidates on one root. The coordinator
currently supersedes those, so that remains a required runtime capability and
an explicit falsification point, not a demonstrated win.

The browser result argues against treating saved task counts or scheduler-only
speedups as user-visible wins. Preserve completed outputs only when their
declared task inputs still match; otherwise invalidate the affected dependency
closure.
Assert that pending work never disposes visible state or repeats mount effects;
measure input-to-present, first useful reveal, total completion, fallback
flashes, effect/lifecycle counts, allocations, and missed frames with browser
frame instrumentation. Keep the protocol unvalidated until this gate passes.
Only after these host-level costs are measured should we compare main-thread
scheduling with worker placement for independent pure CPU nodes, including
transfer, cancellation, and serialized host commit. Multiple roots are not
evidence of parallel execution; measure the wall-time intervals that actually
overlap.

**Decision rule:** before each gate, write down the workload, equivalence
contract, primary latency metric, setup/memory budgets, and what result would
change the design. Retain the graph-specialized direction if it produces a
repeatable, meaningful improvement on the target interaction after setup and
lifecycle costs, without unacceptable correctness or complexity costs. If it
does not, keep the useful compiler/host ideas and revise the update model. No
cross-workload “React is slower” claim follows from passing a narrow gate.

### Gate D — Can streamed state hydrate without a fragile all-at-once match?

Define a small protocol of versioned entity snapshots, region patches, resource
readiness, and event replay. Prove ordering, duplication, interruption,
stale-version rejection, and recovery from a missing or incompatible patch
before optimizing throughput. Compare first useful interaction and recovery
behavior with the current React streaming SSR plus hydration baseline. This gate
tests the alternative to component-payload streaming: the server sends data and
declarative state changes; the client runtime owns rendering and commit. A CRDT
is not assumed. Use one only where independent concurrent writers must merge,
because ordinary server-to-client snapshot and patch ordering can use versions
and deterministic conflict rules.

The implementation sequence is therefore **JS kernel and host contract →
OXC-generated dependency plans → keyed/lifecycle correctness → async transition
scheduler → workers → streamed snapshots and hydration → ecosystem adapters and
release polish**. The exact adapter prototypes can proceed alongside the kernel,
but a release claim depends on Gates A–D and a documented React compatibility
boundary.

## 8. Supplementary study records

The central findings and limits are synthesized in §§3–4; the decision gates are
in §7. The complete per-study protocols, results, caveats, and artifact links are
preserved in the [supplementary report](./empirical-appendix.md) and the dated
[experiment log](./experiment-log.md). The subsection anchors below remain stable
for links from the README and study summaries.

The immediate evidence gates are independent-device replication of the
fixed-topology and callback-cadence results, a dynamic-topology study that
includes allocation and teardown costs, and the pre-data developer
feature-authoring study. These are the work that can still change the current
product decision. A real Three/R3F adapter, broader React-library compatibility,
Xi-style incremental summaries, streamed server/worker state, and compiler
maintenance are downstream questions. WATaBoy justifies a bounded Wasm
specialization experiment after the typed DAG and SoA columns stabilize; it
does not yet justify moving the runtime kernel to Wasm. See [related
work](./related-work.md#webassembly-code-generation-as-an-optional-execution-tier)
and the [product thesis](./product-thesis.md) for the ordered implementation
sequence.

### 8.1 Snake frame updates: fixed-topology study

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#81-snake-frame-updates-fixed-topology-study).

### 8.2 OXC-generated per-frame bindings: V4

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#82-oxc-generated-per-frame-bindings-v4).

### 8.3 Preregistered integration study: Snake V5

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#83-preregistered-integration-study-snake-v5).

### 8.4 Confirmatory production-build replication

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#84-confirmatory-production-build-replication).

### 8.5 Preregistered production columnar-binding experiment: Snake V6

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#85-preregistered-production-columnar-binding-experiment-snake-v6).

### 8.6 Dirty-row density and locality: columnar dispatch V1

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#86-dirty-row-density-and-locality-columnar-dispatch-v1).

### 8.7 Sparse per-frame browser study: Snake workload V1

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#87-sparse-per-frame-browser-study-snake-workload-v1).

### 8.8 Browser structural phase profile: Experiment AP diagnostic

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#88-browser-structural-phase-profile-experiment-ap-diagnostic).

### 8.9 Key-index maintenance mechanism study

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#89-key-index-maintenance-mechanism-study).

### 8.10 Stateful keyed structure with index rebuild versus delta maintenance

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#810-stateful-keyed-structure-with-index-rebuild-versus-delta-maintenance).

### 8.11 Exploratory owner-expansion and reconciliation profile

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#811-exploratory-owner-expansion-and-reconciliation-profile).

### 8.12 Preregistered keyed-owner reuse study

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#812-preregistered-keyed-owner-reuse-study).

### 8.13 Preregistered keyed-region version-token follow-up

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#813-preregistered-keyed-region-version-token-follow-up).

### 8.14 Lifecycle-inclusive per-frame browser study: Snake V1

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#814-lifecycle-inclusive-per-frame-browser-study-snake-v1).

### 8.15 Callback cadence under load: Snake V1

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#815-callback-cadence-under-load-snake-v1).

### 8.16 Long Animation Frames phase attribution: Snake Frame Phase V1

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#816-long-animation-frames-phase-attribution-snake-frame-phase-v1).

### 8.17 Keyed region buckets: bounded ordered edits

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#817-keyed-region-buckets-bounded-ordered-edits).

### 8.18 Bucketed regions versus an indexed flat array

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#818-bucketed-regions-versus-an-indexed-flat-array).

### 8.19 Mixed per-frame and keyed structural workload

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#819-mixed-per-frame-and-keyed-structural-workload).

### 8.20 Async DAG frontier and equal-knowledge Suspense comparison

Full study report: [methods, results, limitations, and artifacts](./empirical-appendix.md#820-preregistered-async-dag-frontier-study-v2).

## 9. Related work and references

- [React render and commit](https://react.dev/learn/render-and-commit) and
  [React Compiler](https://react.dev/learn/react-compiler)
- [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks),
  [`useContext`](https://react.dev/reference/react/useContext), and
  [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore)
- [Suspense](https://react.dev/reference/react/Suspense),
  [`<ViewTransition>`](https://react.dev/reference/react/ViewTransition), and
  the [React 19.3 release](https://react.dev/blog/2026/09/09/react-19-3)
- [Streaming server rendering](https://react.dev/reference/react-dom/server/renderToPipeableStream)
  and [`hydrateRoot`](https://react.dev/reference/react-dom/client/hydrateRoot)
- [React work loop](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberWorkLoop.js),
  [React child reconciliation](https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactChildFiber.js),
  and
  [custom renderer guide](https://github.com/facebook/react/blob/main/packages/react-reconciler/README.md)
- [Preact core](https://github.com/preactjs/preact/blob/main/src/index.js) and
  [child diff](https://github.com/preactjs/preact/blob/main/src/diff/children.js)
- [Cody Bennett’s React Nylon](https://github.com/CodyJasonBennett/react-nylon)
- [Xi Rope Science](https://xi-editor.io/docs/rope_science_00.html), including
  [parallel/async word wrapping](https://xi-editor.io/docs/rope_science_06.html),
  [CRDTs for async plugins](https://xi-editor.io/docs/rope_science_09.html), and
  [minimal invalidation](https://xi-editor.io/docs/rope_science_12.html); see
  the project’s [Xi mapping](./related-work.md)
- [OXC overview](https://oxc.rs/docs/guide/what-is-oxc) and
  [Deno Jupyter kernel](https://docs.deno.com/runtime/reference/cli/jupyter/)

## Reproduction

From this directory, follow the pinned environment setup and commands in
[README.md](./README.md). The notebook recomputes summaries from raw results
under `results/`; charts are inline SVG. The full historical result inventory
and prior experiment narrative are in [experiment-log.md](./experiment-log.md).


## Closed Store host boundary — 18 October 2026

The compiler-proven direct numeric Store subset now reaches DOM and Three host props without rerunning an authored component, selector or reducer during closed preparation. Explicit `prepareStores` / `enqueueStores` cuts include every accepted reader of each selected Store. Ordinary flush also admits changed closed outputs beside an observed pending resource. Mounted VNode/writer identity and existing Store root version/epoch govern conflicts; selected leaf/cache deltas merge against current state, while whole-tree candidates keep whole-root guards. Newer host-time actions, unrelated histories and resource ownership survive. Opaque readers, invisible transitions and unsupported shapes remain generic.

Consolidated correctness passes **870 runtime tests, zero failures, exit 0**, **44 Rust tests**, native tooling, **twelve actual compiled execution fixtures**, **seven Three conformance cases**, both existing bounded retention checks and a fresh installed consumer of all five private-alpha packages. The actual new compiler fixture runs DOM and Three outputs beside an unrelated retained pending resource and proves per-root progress and balanced owned resource lifetime. The two-root partial-host-failure regression uses memory hosts; it does not establish physical cross-renderer visual atomicity. V1's three missing-Suspense fixture failures remain preserved. The v2 change only wraps the fixture health reader in Suspense. All **725 correctness inputs** match their v2 lock. The debug compiler was rebuilt by a default-plugin fixture with a different Cargo home; source identity is preserved, but an exact executable hash was not captured for every fixture. The [gate receipt](implementation/2026-10-18-store-host/verification/gate-results.md) records the provenance limit.

The single offline headless comparison passed matching output, both output identities, the visible pending health fallback, later untimed health reveal, and empty teardown. All **721 source/compiler/artifact entries** matched before and after. One ordinary Store dispatch to the first matching MutationObserver callback observed **1.7 / 0.5 ms Native/React**, with approximately 0.1 ms timer resolution. Native was slower. Mount was **5.0 / 4.0 ms**, disposal **0.7 / 0.2 ms**; the shared JavaScript asset was **466,761 bytes**. This includes scheduling and observer delivery, excludes paint, and gives no CPU, physical-input, tail, independent-device or general async UX qualification. No timing was repeated and no project server, external network, TLS connection or trust change occurred. See the [immutable protocol](implementation/2026-10-18-store-host/benchmark/README.md) and [raw one-shot receipt](implementation/2026-10-18-store-host/benchmark/proof-v1/pair-one-shot.json).

The full-plan first-pass goal remains active. Multi-input Store/selector admission, joint Store/World/collection cuts, general resource/structural ownership, portable compiler binaries, cold/retained-memory budgets and independent-device qualification remain open. Human participants remain zero; no maintenance advantage is claimed. No new physical layout is selected. Historical stable-binding wins and the integrated dense FAIL remain unchanged.


## Joint-input publication continuation — 18 October 2026

The compiler now proves ordered two-to-eight-input numeric Store expressions into one keyed primitive DOM/Three leaf. One declared transaction combines supported Store, World-cell and keyed collection deltas while unrelated resources wait. Exact joint reads, current owner/writer/code identities, per-root accepted history and acknowledgements remain authoritative; whole-tree replacements retain whole-root guards. Pure moves preserve Store readers, and generic removal/replacement owns reader retirement. Verification exposed and fixed a direct-path stale-reader bug.

The [source-locked boundary](implementation/2026-10-18-joint-inputs/results.md) passes 888 runtime tests, 45 Rust tests, fourteen compiled fixtures, seven Three cases, bounded retention checks and fresh private packages. Failed runs and a detected test-name source-freeze race remain preserved. The sole [offline headless comparison](implementation/2026-10-18-joint-inputs/benchmark/proof-v1/pair-one-shot.json) observed 6.7/0.6 ms Native/React from first transaction action to matching MutationObserver; Native was slower. Both retain outputs, identity, row state and pending fallback, later reveal health and dispose cleanly. All 726 measured source/artifact hashes match. Native captures a World handle and uses an edit-log/queue; React batches external Store, local state and order replacement in flushSync. Mount was 10.4/4.4 ms, disposal 1.1/0.4 ms; combined JavaScript 502,770 bytes.

This single observation includes scheduling/delivery before paint, with approximately 0.1 ms timer quantum; it supplies no CPU attribution, physical-input, tail, independent-device or general async UX qualification. No timing was repeated or project server/network/TLS/trust action taken. Historical wins and dense FAIL remain unchanged. General selectors/resource/structural ownership, portability and cold/memory qualification remain open. Human participants remain zero, with no maintenance advantage claim.


## Compiled resource-subtree continuation — 18 October 2026

The compiler now emits finite keyed DOM/Three resource subtrees, preserving the original single-leaf schema. Scoped replacement validates the mounted footprint and merges against current state; full-tree replacements retain whole-root guards. Accepted static fallbacks may contain stateful component owners and activation effects. Reveal retires those owners, revokes their setters and pending local work, and runs cleanup after acceptance. Canonical resource capture invokes no authored resource getters. Store-reading, bound/ref/event/style, nested-boundary/collection and mutable-object cases remain generic. Partial host failure keeps accepted history old and quarantines the domain; returned new host handles are cleaned up without masking the original error.

Consolidated correctness passes **904 runtime tests, zero failures, exit 0**, **46 Rust tests**, native tooling, **fifteen actual compiled fixtures**, **seven Three cases**, two bounded retention checks and a fresh five-package installed consumer with **426 artifacts**. All **736 correctness inputs** match. Actual compiled DOM/Three execution verifies independent reveal, fallback owner retirement and exact-once owned Three resource disposal. V1's typecheck error and leaked fixture compiler process, and v2's incorrect construction-order assumption, remain archived. The final production source did not change during these test-harness repairs. See [results](implementation/2026-10-18-resource-subtree/results.md).

The sole offline headless settlement-to-matching-MutationObserver pair observed **4.7 / 238.5 ms Native/React**, with approximately **0.1 ms** timer quantum. Both outputs match; A and the independent row retain host identity/state, B retires its fallback exactly once, A later reveals, and teardown is empty. All **731 source/compiler/artifact hashes** match before and after. Mount was **8.6 / 5.9 ms**, disposal **0.3 / 0.2 ms**; combined JavaScript **486,236 bytes**. This includes scheduling and observer delivery before paint, uses native activation effects versus React layout effects, and gives no CPU, physical-input, tail, independent-device or general async UX qualification. The first proof build was rejected before any browser run for a stale runner assertion name; the corrected source lock has identical transforms/assets. No timing retry or project server/network/TLS/trust operation occurred.

The full-plan first-pass goal remains active. General selectors and resource/structural ownership, portable compiler artifacts, cold/retained-memory and independent-device qualification remain open. Human participants remain zero; no maintenance advantage or new physical layout is claimed. Historical stable-binding wins and dense FAIL retain their original source and scope.


## Compiler artifact provenance continuation — 18 October 2026

Packaged compiler discovery now uses one target/protocol/hash manifest rather than an OS/CPU filename guess. Rust `--compiler-info` reports Cargo's actual target triple, Node-compatible OS/architecture, crate version and protocol. Both package builders share target selection, explicit Cargo output paths, Rust/Cargo source capture, bounded identity queries, executable hashing/chmod and manifest emission. Vite validates path confinement, size/hash, compatible target and executable info before service startup. Missing/malformed installed manifests fail; checkout Cargo and caller-owned explicit binary overrides retain their contracts. No runtime identity/version/publication authority changes.

Consolidated correctness passes **904 runtime tests**, **47 Rust tests**, native tooling, **fifteen actual compiled fixtures**, **24 artifact/lifecycle checks**, **seven Three cases** and two bounded retention checks. Fresh installed consumers pass for all five private-alpha packages (**437 archived files**) and the legacy private package (**207 files**), with Cargo blocked. The final **740-input** lock matches. V1's lifecycle fixture failed because its minimal Vite context did not resolve the public import; the reviewed test-only fix passes and preserves early errors. The original failed source/log remains archived. All fifteen fixture compiler hashes agree; the binary reports `aarch64-apple-darwin`, protocol 1. See [results](implementation/2026-10-18-compiler-artifacts/results.md).

The sole native-first fresh-process Vite build pair observed **213.18 / 313.64 ms Native/React**, spawn to exit. JavaScript outputs were **135,717 / 72,007 bytes**, with matching reviewed transforms and **748 before/after integrity rows**. Timing includes Node/plugin/compiler validation/startup and bundling. Required untimed proof builds and hash reads may prime OS/filesystem caches; this is neither cold-cache/compiler nor runtime-latency qualification. One fixed-order observation supplies no median/p95, independent-device, equivalent-feature bundle-size or general performance claim. No timed retry, server or browser ran.

The legacy package gate necessarily regenerated tracked historical cache paths. After verifying the new 207-file archive and preserving its tarball and raw consumer result, 178 tracked cache files were restored byte-for-byte from c6a1af9; 32 new staging files were removed only after archive hash checks. The new evidence is under this slice, and old historical paths are unchanged. See [restoration receipt](implementation/2026-10-18-compiler-artifacts/verification/historical-cache-restoration.json).

Actual native build/consumer verification remains **Darwin ARM64 only**. Linux ABI choices and other target labels have synthetic/source tests, not native runner evidence; default Linux selection requires positive glibc proof and declines unknown/musl environments. Other-platform binaries, cold/retained-memory budgets, broader async UX and independent-device product qualification remain open. Human participants remain zero, with no maintenance advantage claim. Historic wins and dense FAIL retain their source and scope; the full-plan first-pass goal stays active.

## Resource host-value continuation — 18 October 2026

The compiler now emits schema-3 literal DOM style records and Three position/rotation/scale tuples over one canonical resource input, retaining schemas 1/2 and generic fallback. Evaluation owns stable per-candidate values. Eligible unbound styles retain accepted materialized data separately from authored read descriptions; bound styles keep the existing binding metadata and last-value authority. Ordinary getter/Proxy order and private parent clones preserve their contracts. Mutable generic old tuples remain conservative. Scoped changed-subtree capture keeps existing owner/resource/code/writer validation and the shared publication lifecycle; full replacements retain whole-root guards.

Consolidated correctness passes **917 runtime tests, zero failures, exit 0**, **49 Rust tests**, native tooling, **24 compiler artifact checks**, **sixteen actual compiled execution fixtures**, **seven Three cases**, two bounded retention checks and a fresh five-package installed consumer (**448 archived files**). All **786 correctness inputs** match. The actual compiled fixture verifies DOM styles and Three tuples beside unrelated pending work, fallback owner retirement and balanced owned resource disposal. Earlier TypeScript errors, binding regressions and a preflight-directory startup error remain preserved; no checks ran in the preflight-directory failure.

The sole workload pair observed **2.6 / 241.7 ms Native/React** from controlled B settlement to the matching MutationObserver callback, at approximately **0.1 ms** timer quantum. Both outputs match, A and the independent row retain identity/state, B retires its fallback once, A later reveals and teardown is empty. All **738 source/compiler/artifact hashes** match before and after. Mount was **5.8 / 3.5 ms**, disposal **0.6 / 0.1 ms**; combined JavaScript was **491,393 bytes**. The first sandboxed browser startup failed before either arm; its receipt is immutable. The corrected launch used the identical approved build outside the command sandbox, headless/GPU-disabled/offline, with no rebuild or repeated timing. No project server, network/TLS connection, route or trust change occurred.

This is one fixed-order prepaint scheduling/observer observation, using native activation effects versus React layout effects. It gives no CPU, physical-input, tail, presentation, cold-memory, independent-device or general async UX qualification. Three tuples have correctness evidence here, not a renderer timing comparison. Tracked historical cache evidence and existing symlink metadata remain unchanged. Historic stable-binding wins, integrated dense FAIL and exhausted Recording A retain their scope; no physical redesign or maintenance advantage is claimed. Human participants remain zero. The full-plan first-pass goal stays active, including broader selectors/resource/structural admission, Linux/other-platform execution, cold/retained-memory and independent-device finish-line requirements. Apple container tooling/data are on Depot, but service startup still awaits native macOS authorization.

See [source-locked results and preserved failures](implementation/2026-10-18-resource-values/results.md).

## Native-owned React island boundary — 19 October 2026

`createNativeReactRootAdapter` now embeds an independent React DOM root in each native island owner. Accepted refs deliver shallow captured props after native group publication; preparation, discarded/stale candidates and host failures do not deliver them. Prop updates and keyed moves retain the root/state/container; removal and disposal retire it once. The existing owner/ref/publication authority remains, with no new version registry or closed-purity claim. React commits independently. Both bridge directions are exposed through the private-alpha public package graph; native-only applications keep React/React DOM optional.

Consolidated Darwin coverage passes **1003 runtime tests**, **63 Rust tests**, **24 artifact checks**, **23 actual compiled execution fixtures**, a separate React-island AST/source proof, **seven Three cases**, both retention checks and fresh five-package consumption. The raw v2 run remains FAIL (33/36 steps passed); its temporary pnpm shim broke package commands. A bounded three-command supplement passes on identical **859 source inputs**. The v1 install failure, supplement launcher failure and rejected first browser build proof remain preserved. This is consolidated coverage with an environment supplement, not a 36/36 single run.

The sole Native-first browser pair passes real React DOM state/events/props, keyed identity, pending accepted views, discarded/stale candidates and exact retirement/empty teardown. Settlement to matching MutationObserver is **2.1/0.5 ms Native/React**, slower for the native bridge, at about **0.1 ms** timer quantum. Setup return is **5.9/3.3 ms** and first matching mount output is **36.1/3.3 ms**; the latter polls with RAF and includes scheduling. Shared JavaScript is **533,707 bytes**. All **768 before/after integrity rows** match. Native uses two native roots plus three React island roots; React uses two direct roots. These are one prepaint scheduling/observer pair, not CPU, cold, tail, equivalent-feature size or visual-atomicity qualification. Disposal passes assertions but is not timed.

The pair record and completion output are PASS. Its enclosing zsh wrapper exits1 afterward when assigning read-only `status`; that error is preserved, and a separate Node exit was not captured. No timing retry ran. Owned headless browser processes are closed. Historic wins, dense FAIL, exhausted Recording A and physical HOLD retain their scope. Full async/structural, selected-library, platform, cold/memory, presentation and independent-device requirements remain open; human participants remain zero. The full-plan goal stays active. Apple caps remain 256 MiB/container and 512 MiB/builder with one CPU; Depot launch permissions still block service startup, so effective VM caps are unverified.

See [source, preserved failures and results](implementation/2026-10-19-react-island/results.md).

## Selected Radix Dialog boundary — 19 October 2026

The optional `@r3act/react-bridge/radix-dialog` entry now supplies a controlled modal backed by exact Radix Dialog 1.3.1, with the same React view available to ordinary React roots. Compiled native Store/state props enter an opaque persistent island through existing owner/ref/publication authority. React owns portals, contexts, focus and its separate commit. The finite API requires accessible title/description, controls open state through a callback and accepts React children and a caller-owned portal container. Default core/bridge imports remain Radix-free; native core imports without React. A boundary-local type correction permits React function-component children without widening native RuntimeNode or changing generic native component types.

The final consolidated Darwin gate passes **37/37 steps**, **1003 runtime tests**, **63 Rust tests**, **24 artifact checks**, **23 actual compiled execution fixtures**, **two separate AST/source proofs**, **seven Three cases**, both retention checks and all ten fresh five-package consumer checks. All **874 runner inputs** match before/after; the automatic pre-command raw archive preserves those inputs plus eight context files (**882 files**). The first gate's source remains preserved separately. The first untimed proof is rejected for missing memo output in the createElement-based wrapper. Equivalent React JSX plus the type correction pass the fresh consolidated boundary; no assertion is weakened. Actual ReactRadixDialog/ReactApp/DialogBody memo output is `_c(26)`/`_c(22)`/`_c(17)` with CompileSuccess events.

The sole fixed Native-first browser pair passes real keyboard boundary wrapping, Escape and Close controlled callbacks, aria naming, retained form value/selection/state through prop updates and keyed moves, stale/discard rejection, pending accepted views, removal/reinsert and disposal while open. Caller portal sentinel/parent, unrelated node/focus, body styles/scroll-lock/aria and focus guards restore. Both arms report five callbacks and four body mounts; the serialized output precedes final cleanup, and post-disposal assertions balance all four lifetimes. Native owner/pending counts return to zero. Both direct outer command and pair record pass; owned headless processes close with no request/page/console errors.

Controlled external open to the first matching portal MutationObserver is **10.1/13.7 ms Native/React**, at about **0.1 ms** timer quantum. Setup return is **11.5/10.9 ms**; first matching mount output is **38.4/11.1 ms** using RAF polling. Shared JavaScript is **579,238 bytes**. All **2588 before/after rows** match: 1289 current inputs, 1289 archived copies, compiler and nine transforms/events/assets. The lock pins 28 runtime packages including Radix 1.3.1 and React/React DOM 19.3.0. Native adds a native root/private container around the React dialog. Normal Store scheduling is retained in both arms. This one prepaint scheduling/observer pair does not establish CPU, full focus/presentation readiness, population tails, cold/memory, equivalent-feature size, independent-device or general library/performance qualification. Disposal passes assertions but is not timed.

The full-plan goal remains active. General structural/resource admission, broader async UX, platform/host coverage, cold/setup/retained-memory/lifecycle budgets, presentation and independent-device requirements remain open. This is one finite selected-library bridge, not all Radix components, accessibility certification, SSR/hydration or full React compatibility. Earlier Linux evidence predates these changes. Human participants remain zero and no maintenance advantage is claimed. Historic stable-binding wins, integrated dense FAIL, exhausted Recording A and physical HOLD retain their scope. No VM is used; saved one-CPU 256 MiB/container and 512 MiB/builder defaults remain unchanged, with Apple startup/effective limits still blocked/unverified by Depot launch permissions.

See [source, preserved failures and results](implementation/2026-10-19-radix-dialog/results.md).

## Installed multi-host application boundary — 19 October 2026

The installed multi-host example now executes native DOM/Three roots sharing one World, Stores and declared reveal/position groups, plus an independent health boundary and controlled Radix portal. It uses fresh installed tarballs and the copied public Vite configuration, without checkout aliases. Actual output exposed a named Three Store leaf missing its program; the compiler now reuses the strict schema-4 subtree proof on literal-name legacy decline while preserving earlier successful schemas. The finite modal bridge explicitly emits aria-modal=true.

Current Darwin correctness passes 37/37 steps, 1003 runtime tests, 64 Rust tests, 23 actual compiled executions plus two separate source proofs, seven Three cases, both retention checks and ten fresh consumer checks. All 893 inputs match; 901 raw source/context files are preserved before commands. Final installed type/build/browser proofs pass. Eight browser stages verify independent progress, joint reveal 3:5, native grouped position 3:3 beside pending health, keyboard/form/keyed retention and disposal. React body lifetimes balance 3/3, Three owned resources 2/2, borrowed resources survive host cleanup then retire once, and DOM owners/pending work return to zero. Installed wrapper bytes remain uncompiled by React Compiler; ordinary React comparator Dialog has _c(2).

The sole Native-first fresh-process installed build pair observes 307.044041/536.435875 ms Native/React, with 1,297,092/808,605 unminified JavaScript bytes. Timed transforms/assets equal the proof; exact input checks pass. Common harness startup and potentially warm caches are included. These are not runtime, cold-cache, median/p95, equivalent-feature-size, physical presentation or independent-device results. Native use-client build warnings remain preserved; browser errors are zero.

Startup/PATH/store failures, the exact-source consumer supplement, type/proof/program gaps, Chromium launch failure, modal annotation and verifier-field failures remain preserved. Fresh-install region comments and seven generated .bin shims explain the rejected cross-install byte screen; strict within-proof hashes remain. Final harness-only corrections follow the full product gate and are separately source-bound. Earlier Linux receipts predate this source. Full async/structural, installed HMR/platform, cold/memory/lifecycle, presentation and independent-device obligations remain open; human participants remain zero, with no maintenance advantage. Historic wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain scope. No VM or memory increase occurs; saved 256/512 MiB Apple defaults remain runtime-unverified while Depot launch permissions block startup.

See [source, receipts, failures and limits](implementation/2026-10-19-installed-scene/results.md).

## Accepted error recovery — 19 October 2026

Native Suspense now retains accepted error output through the existing boundary history/journal, preventing older successful content from resurfacing during pending retry. Discard, nested rollback and manual pending-candidate publication retain their contracts. Cancellation retires render intent without undoing dispatched Store actions or cancelling providers; the authored fixture uses explicit resource props and an independent urgent Store.

Darwin-v3 passes 38/38 steps, 1007 runtime tests, 64 Rust tests and 24 actual compiled executions, plus two source proofs, seven Three cases, retention checks and fresh packages. All 905 runner inputs match; 913 raw source/context files are archived before commands. Actual DOM/Three plus a second DOM consumer share one World and balance cleanup. Divergent fork frontiers and installed-browser example cancellation are not separately qualified. Both failed gates remain preserved, including the primary's rejected fallback-policy interpretation.

The rejected first build proof lacked actual React App memo output. A comparator-only controller handoff through layout effect after v3 yields Ready _c(4), App _c(12). Final proof binds this comparator separately while Native/runtime/compiler/example remain v3-identical. Untimed browser behavior and the sole Native-first pair pass equal output, urgent progress, retained error, cancelled late results and early disposal, with 492 matching before/after integrity rows and no browser errors.

The sole final-settlement-to-MutationObserver observation is 0.9/0.9 ms Native/React, at about 0.1 ms timer quantum. It is generic prepaint scheduling/observer evidence, not CPU, replicated median/p95, cold/setup/retained-memory, physical presentation, equivalent-feature size or independent-device qualification. Shared JavaScript is 534,638 bytes. No speed or maintenance advantage follows.

Full-plan first-pass remains active. Broader async/structural authoring, installed HMR/platform, lifecycle/cold/memory, presentation and independent-device requirements remain; human participants remain zero. Historical stable-binding wins, qualified integrated dense FAIL, exhausted Recording A and physical HOLD retain their source/scope. No VM or memory increase occurs; saved one-CPU Apple defaults remain 256 MiB/container and 512 MiB/builder, with startup/effective caps unverified behind Depot launch permissions.

[Source, receipts, failures and limits](implementation/2026-10-19-async-recovery/results.md).

## Forked transition integration — 19 October 2026

Same-operation task groups now reuse an exactly matching pending execution when fork inputs converge. Optional unfinished tasks retire with their last live owning root. Grouped Store notifications drain after all candidate effect/cleanup steps release root publication barriers, allowing another queue's task observer to prepare safely. The runtime retains its existing identity/version/publication authority, per-root accepted history, exact acknowledgements, generic fallback and whole-tree guards.

The public-import example uses primary DOM, forked DOM and Three roots sharing one World. Actual Rust/OXC execution covers divergent accepted query frontiers, explicit fork catch-up without duplicate B work, independent urgent progress, changed C input, late A/B rejection and balanced cancellation/disposal. Final Darwin-v4 passes 41/41 steps, 1017 runtime tests, 64 Rust tests, 25 actual compiled executions and eleven fresh package checks including the actual app/scene/controller/Vite configuration. All 949 runner inputs match; 957 raw source/context files are archived. Failed v1/v2 gates, one bounded correctness context replay and the rejected first build proof remain preserved. The controller's plain TypeScript filename correction does not change its bytes or compiler/component behavior.

Final build proof establishes four generic Native component definitions and actual React Projection/Result/App memo output _c(14)/_c(14)/_c(23). Untimed browser behavior and the sole Native-first comparison pass seven identical visible stages, retained DOM nodes/component activation/Three resource identities, no fallback reappearance, urgent progress, stale discard and early/immediate/final teardown. Native effects balance 2/2; React effects balance 4/4. Owned resources retire once, borrowed resources survive host cleanup then retire once at caller disposal, and root/Store/host interests return to zero. All 507 source/compiler/artifact rows match before and after each browser phase; errors are zero.

The sole final-C-settlement-to-complete-MutationObserver observation is **0.90/1.10 ms Native/React**, at approximately **0.10 ms** timer quantum. It includes scheduling and observer delivery before paint. One fixed-order pair supplies no speed, CPU, population-tail, cold/setup/retained-memory, physical-presentation, equivalent-feature-size or independent-device qualification. Shared minified JavaScript is 1,315,970 bytes for both arms. Three is an object tree without a WebGL renderer. Browser source aliases and installed-package typechecks are distinct evidence; installed-browser rendering for this example is not established.

The full-plan first-pass goal remains active. The separate installed-HMR browser/Portless gate, current platform coverage, lifecycle/cold/memory, presentation and independent-device requirements remain open. Human participants remain zero and no maintenance advantage is claimed. Historical stable-binding wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain scope. No VM or memory increase occurs; Apple defaults remain one CPU, 256 MiB/container and 512 MiB/build. Its API service is not running or registered with launchd; effective workload limits remain runtime-unverified behind Depot startup permissions.

[Source, receipts, failures and limits](implementation/2026-10-19-forked-transitions/results.md).

## Independent installed Canvas host — 19 October 2026

A consumer-owned retained Canvas command host now implements the public VDOMHost interface without private imports or another reconciler. Actual compiled TSX drives DOM, Three and Canvas roots through one World/Store and the existing publication authority. The host copies tuples and brush-binding wrappers, retains payload identity, preserves keyed state/refs, revokes retired events and reference-counts shared owned brushes. Borrowed brushes remain caller-owned. Arbitrary host writes remain non-rollbackable; the compiled failure case preserves original setter/disposer identities, old managed history, quarantine and remaining cleanup. No core identity/version/publication registry or traversal layout changes.

Consolidated Darwin-v2 passes 42/42 steps, 1017 runtime tests, 64 Rust tests, 26 actual compiled executions, two source proofs, seven Three cases, both retention checks and twelve fresh-package checks. All 972 runner inputs match; 980 raw source/context files are archived before commands. The startup error and Darwin-v1's fresh-consumer type failure remain preserved. Source review also corrected a tuple-accessor lifetime check and a browser deadline/PASS race. Final installed proof copies the actual example/config into a fresh five-tarball consumer, typechecks and builds without checkout aliases, then executes its production assets offline in a headless browser.

Eight installed-browser stages pass local click/keyed retention, shared lease removal, owned replacement, stale event rejection, three-root B publication and empty teardown. A Store subscriber observes DOM B, Three stage-B and Canvas command stage-B together, with distinct root versions 2/2/7. Canvas drawing happens afterward; this is no cross-renderer paint-atomicity claim. Four row activations balance four cleanups; all host handles/resources/bindings/listeners and all root owners return to zero. Shared, replaced owned, replacement and borrowed brushes each dispose once, with borrowed disposal zero at host teardown. Three is an object scene, without a WebGL renderer.

The separate matched counter/Canvas control proves equal initial/clicked DOM and sampled pixels before timing. Actual React Counter emits _c(10) and CompileSuccess; Native has generic semantic coverage with one owner/source, two sinks and no closed operations. The sole Native-first fresh-process installed build pair observes **262.331292/262.891041 ms Native/React**; transforms/assets/metadata match the untimed proof. Unminified JavaScript is 648,303/569,817 bytes; the full native three-host example is separately 2,618,034 bytes. Different drawing backends and feature graphs prevent equivalent-feature-size claims. These are process spawn-to-exit build observations with potentially warm caches, not runtime speed, CPU, cold/memory, tails, physical presentation or independent-device qualification. All seventeen source rows match before/after each proof phase; the lock separately binds fourteen consumer copies, five tarballs, 1488 selected installed files and the packaged compiler, all rehashed by the harness.

The full-plan first-pass goal remains active. Installed browser HMR/Portless, current platform coverage, authored realtime/lifecycle/cold/memory budgets, presentation and independent-device requirements remain open. Human participants remain zero; this AI-authored independent host demonstrates extension feasibility, not maintenance superiority. Historic stable-binding wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain scope. No project server or VM ran. Apple defaults remain one CPU, 256 MiB/container and 512 MiB/build, with service startup and effective caps still unverified behind Depot permissions.

[Source, receipts, failures and limits](implementation/2026-10-19-custom-host/results.md).

## Native const-arrow components — 19 October 2026

Module-level capitalized synchronous const arrows now use the existing compiler owner/hook/revision model, including block and expression bodies and named exports. Lowering wraps the original initializer at its declaration point, preserving lexical this/arguments, const initialization order and inferred function names. A temporary named-property object adds one module-initialization allocation per component. Mutable, async, nested and multi-declarator hook arrows remain diagnostics; unsupported arrows referenced directly as JSX tags are diagnosed even without hooks. Existing function-only closed numeric/Store/resource/forwarding proofs conservatively decline arrows, preserving generic rendering. There is no new runtime identity/version/publication registry or traversal layout.

Consolidated Darwin-v1 passes 43/43 steps, 1017 runtime tests, 68 Rust tests, 27 actual compiled executions, two source proofs, seven Three cases, both retention checks and thirteen fresh-package checks. All 991 runner inputs match; 1000 raw source/context files are archived before commands. The actual compiled six-arrow example verifies function names and lexical semantics, keyed state/ref identity, conditional effects, resource error/retry, urgent progress, coherent DOM/Three publication and automatic pending-work cancellation on exact module revision retirement. Row lifetimes balance 3/3, conditional effects 2/2 and resource-result activations 2/2.

The first untimed comparison proof remains FAIL: actual React Compiler output has Counter _c(4) and one CompileSuccess event with fnName null, while the verifier incorrectly expected a named event. Only the pair verifier and README change after the consolidated gate. The corrected proof requires memo use inside the Counter arrow body and the exact single anonymous event from that file. Product/compiler/example/comparison authoring remain gate-identical. Fresh proof-v2 and its installed browser pass thirteen stages, including retained pending output, accepted rejection, stale discard, retry, keyed state and cleanup. Three creates/disposes four resources; all live hosts/owners/listeners/readers and Store interests return to zero. The browser is headless/GPU-off with offline hashed HTTPS assets; no project server or VM starts. This is managed accepted-state coherence, not cross-renderer visual atomicity or installed browser HMR.

The sole Native-first fresh-process installed Vite build pair observes **135.824208/257.419542 ms Native/React**, with exact transform/asset/metadata equality to the untimed proof. Unminified JavaScript is 635,597/568,780 bytes. Native remains generic with one owner/source/sink and zero closed operations; React Counter has actual _c(4). All sixteen source/report rows match before/after each phase; the lock separately binds 48 package sources, twelve copied inputs, five tarballs, 1488 selected installed files and compiler bytes. This one process spawn-to-exit observation may use warm caches and establishes no runtime, cold/memory, tail, equivalent-feature-size, presentation or independent-device result. The initializer allocation's lifecycle cost is not measured here.

The full-plan first-pass goal remains active. Installed browser HMR/Portless, current platforms, authored realtime and lifecycle/cold/memory budgets, physical presentation and independent-device requirements remain open. Human participants remain zero and no maintenance advantage is claimed. Historical stable-binding wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain source scope. No VM or memory increase occurs; Apple defaults remain one CPU, 256 MiB/container and 512 MiB/build, runtime-unverified while Depot permissions block service startup.

[Source, receipts, preserved failure and limits](implementation/2026-10-19-arrow-components/results.md).

## Callback-free grouped publication — 19 October 2026

An isolated actual-compiled baseline reproduces the audited late Proxy callback: accepted versions change from [1,1] to [2,1], B retains old managed history despite physical ready output, the original Error survives and a newer action remains 7. Cleanup completes. Group publication now finishes public validation/preparation, validates all private live receipts and accepts members without caller callbacks. Standalone publication retains a final private check. Existing source, owner, writer, code and acknowledgement authorities remain, with whole-tree guards and generic fallback. Safe runtime copying preserves node ownership through nested expansion. Closed-only operations decline unowned inputs; explicit generic groups and proxied components/resources remain supported. Opaque external freshness and arbitrary physical rollback are not promised.

Darwin-v4 passes 44/44 steps, 1021 runtime tests, 68 Rust tests, 28 actual compiled executions and thirteen fresh-package checks. All 1006 runner inputs match; 1015 raw source/context files are archived. Failed baseline-v1 and gate v1–v3 remain preserved. Existing nested-fallback assertions are unchanged; two later runtime child copies needed ownership correction. The corrected compiled case verifies decline before acceptance, explicit generic group publication, normal factory reveal and cleanup.

Fresh source-locked untimed browser and the sole Native-first pair pass seven equal DOM/Three/fork stages and complete teardown. Actual React Projection/Result/App emit _c(14)/_c(14)/_c(23); all four Native plans remain generic. The pair observes 0.9/1.1 ms settlement-to-MutationObserver at about 0.1 ms timer quantum, including scheduling and excluding paint. All 514 integrity rows match before/after, with no browser errors. Shared minified JavaScript is 1,321,060 bytes. This establishes no speed, CPU, tails, cold/memory, equivalent-feature size, presentation or independent-device qualification. Added ownership, shallow copy/freeze and private-validation costs remain unqualified. Browser source aliases and installed-package checks are separate evidence.

The full-plan goal remains active with installed HMR/Portless, current platforms and authored realtime/lifecycle/cold/memory/presentation/independent-device requirements open. Human participants remain zero and no maintenance advantage is claimed. Historic wins, dense FAIL, exhausted Recording A and physical HOLD retain scope. No server or VM ran; saved Apple defaults remain one CPU, 256 MiB/container and 512 MiB/build, runtime-unverified behind Depot startup permissions.

[Source, failures, receipts and limits](implementation/2026-10-19-publication-callbacks/results.md).

## Installed mixed HMR and independent generic progress — 19 October 2026

Tracked native edits now pass OXC parsing and Rust semantic preflight before the exact prior revision/instance is retired. Rejected or superseded edits send no retirement/reload. Valid edits conservatively reload; uncertain native state is not preserved. Root revision checks now inspect accepted cache results and children to identify a pending module hidden inside another module's output, without another module registry. Imported dependency syntax, runtime execution and later third-party transforms remain outside preflight's guarantee.

Independent generic Store/local/direct updates can progress while a resource-only transaction waits, by retaining unchanged accepted pending Suspense subtrees. Existing resource identities, owner/cache/code lifetimes and private final validation remain authoritative. Changed held descriptors or dirty held owners, mixed cell/Store/collection holds and held Store-reader ambiguity decline. Whole-tree candidates retain whole-root and VDOM bases; this is not general mergeable structural locality. Six new runtime cases cover Store/local progress, island removal/reinsertion, resource replacement, partial failure, newer reentrant actions, settlement during a host write and nested module retirement. Generic traversal and retention costs remain unqualified.

Final Darwin-v6 passes 44/44 steps, 1027 frozen runtime tests, 68 Rust tests, 28 compiled executions and thirteen fresh-package checks. All 1030 runner inputs match; 1039 raw source/context files are archived. Failed gates and browser/typing/provenance proofs remain preserved. Review found production React JSX using the native factory despite React Compiler output; corrected configuration selects React explicitly and the verifier now executes exact hashed production counter assets. Public nativeReactPlugins option inference now follows the actual factory, with valid/invalid type fixtures and unchanged exclusion behavior.

Fresh proof-v5 installs five current private tarballs outside the checkout, typechecks/builds the mixed DOM/Three/React/Radix consumer, and binds twenty source rows, 1621 selected installed rows and compiler bytes. Its sole headless/GPU-off Portless HTTPS browser run passes nine stages. React Refresh retains local count 2 and native identity without navigation. Independent island opening/removal/reinsertion progresses while the same resource group waits. A native syntax overlay preserves accepted roots and pending work; repair and a valid revision reload/remount, cancel old pending groups and release owners/effects/resources. Final owners, pending changes, scene, portal, Three resources/handles and events are empty. Borrowed resources remain undisposed at host teardown and the caller disposes each once. These are managed lifecycle observations, not cross-renderer visual atomicity.

The sole Native-first fresh-process installed Vite build pair observes **134.659041/286.913875 ms Native/React**, with exact transform/asset/metadata equality to the untimed proof and twenty matching integrity rows before/after. The actual production counter pages match initial/clicked output. Native stays generic with one tracked state site, two opaque sinks and zero numeric operations/edges; React Readout/Counter emit _c(2)/_c(8) using react/jsx-runtime. Unminified JavaScript is 654529/568801 bytes, with different feature graphs; the separate mixed app is 3301438 bytes. This one potentially warm-cache process observation establishes no runtime, HMR-latency, CPU, tails, cold/memory, equivalent-feature-size, presentation or independent-device advantage.

The temporary route/server close and the shared HTTPS proxy survives. No Apple/Colima VM starts for this slice; saved Apple defaults are one CPU, 256 MiB/container and 512 MiB/build. Both future Linux workload launchers now explicitly request one CPU, 256 MiB and one Cargo job instead of overriding defaults with six GiB; syntax checks pass, but compilation and effective limits remain unverified. A Docker container cap does not shrink its daemon VM. Any increase requires an observed resource need. Depot service-startup permissions remain unresolved.

The full-plan first-pass goal remains active. Current other-platform execution, authored realtime/lifecycle/cold/memory qualification, physical presentation and independent-device requirements remain open. Human participants remain zero and no maintenance advantage is claimed. Historic stable-binding wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain their original scope. No release or universal speed claim follows.

[Source, receipts, preserved failures and limits](implementation/2026-10-19-hmr-completion/results.md).

## Held Store readers and dependency-scoped progress — 19 October 2026

Canonical Store-A-before-resource readers now retain their accepted cut while independent generic Store B/local/direct work progresses, even if A's domain projection has advanced. Captured version/root epoch belongs to the existing accepted reader-history entry; suspended cut-only dependencies accept no selector values. Real selector Maps keep identity. Exact membership, owner/code/resource/hold lifetime and epoch checks remain, with whole-root/VDOM guards for full candidates. Opaque held Stores decline. Scoped initial reveal checks ancestor Store cuts and pending local controls; a changed controlling resource choice falls back to generic reevaluation. Separate replacement-tree requests retain the accepted-old-group reveal policy. Newer host-time A/B work survives, and partial host failures preserve old managed history/quarantine without claiming physical rollback.

Final Darwin-v3 passes **45/45 steps**, **1031 runtime tests**, **68 Rust tests**, **29 actual compiled fixtures** and **13 fresh-package checks**, with 1054 unchanged runner inputs and 1063 archived raw source/context files. Actual Rust/OXC schema-5 DOM/Three execution reads Store A first, tests independent progress and latest-A reveal, an explicitly unflushed fork, stale Store/local controls, unchanged-control admission and cleanup. Failed v1/v2 gates and the compiled supplement's incomplete supervisor receipt remain preserved; v3 supplies a complete numeric exit 0. Existing tests are unchanged.

Fresh installed proof-v2 typechecks/builds five tarballs and executes exact production assets offline in a headless/GPU-off browser. The failed first browser proof preserves a boolean-data-attribute mismatch. Only the Native consumer attribute expression and verifier checkpoint capture change after v3; proof-v2 separately binds them. Both arms pass independent dialog/local progress during the hold, changed A, partial resource settlement, final DOM 11/A=7/Three [7,2,11] and empty teardown. Each React body balances one mount/cleanup. Native retains one shared publication authority across DOM/Three, while the React island commits separately. React App/JointReveal/DialogSlot emit _c(14)/_c(12)/_c(16) with CompileSuccess and the correct React JSX runtime; ReactPanel remains uncompiled in both arms. Eighteen source rows, five tarballs, 1621 selected installed files, package-report source hashes, compiler, transforms and assets are checked in every phase.

The sole Native-first click-to-dialog-MutationObserver pair observes **12 ms Native / 7.799999997019768 ms React**: Native is slower in this observation. Resources/group stay pending and fallback remains accepted in both arms; disposal balances React lifetimes and leaves Native owners/handles empty. This scheduling/observer interval ends before paint; physical input, full focus readiness and timer quantum are unmeasured. It establishes no speed, CPU, tails, cold/setup/retained-memory, physical presentation or independent-device qualification. Unminified JavaScript is 3299512/1149334 bytes; different implementation/host graphs prevent an equivalent-feature-size claim. Added history/stamp allocation, canonical inspection and traversal costs remain unqualified.

The full-plan first-pass goal stays active. Current other-platform execution, authored realtime/lifecycle/cold/memory/presentation and independent-device requirements remain open. Human participants remain zero with no maintenance advantage claim. Historic stable-binding wins, qualified dense FAIL, exhausted Recording A and physical HOLD keep their original scope. No project server or VM runs; saved Apple defaults stay one CPU, 256 MiB/container and 512 MiB/build, effective limits unverified behind Depot service-startup permissions.

[Source, receipts, preserved failures and limits](implementation/2026-10-19-held-reader-progress/results.md).

## Closed const-arrow proof coverage — 19 October 2026

Supported module const arrows now share existing finite Store/resource/forwarding proofs; numeric arrows require an output-only state-declaration body. Extra callbacks, setters and hidden reads remain generic. Original arrow initializers and runtime authorities remain; the separate host-leaf hint stays false. Closed JSX grammars elide only empty comments and ASCII indentation with line breaks, preserving meaningful spaces/entities/non-ASCII text. Compiler/metadata/initializer/retained-plan costs remain unqualified.

Darwin-v2 passes 46/46 steps, 1031 runtime tests, 71 Rust tests, 30 actual compiled fixtures and thirteen fresh-package checks; 1077 runner inputs match with 1086 raw source/context files archived. V1's absolute-path versus emitted source_file retirement harness failure remains preserved; the exact emitted key fixes it without a product repair. Actual compiled execution covers schema-5 DOM/Three arrows, concise forwarding, generic lexical/text behavior, held independent updates, control invalidation, fork output, exact revision retirement and cleanup.

Fresh five-tarball proof-v1 passes untimed production execution and cleanup. React NumericCounter/JointReveal/DialogSlot/App emit _c(2)/_c(12)/_c(16)/_c(15) with correct JSX; ReactPanel remains uncompiled in both arms. Twenty source rows, 1621 selected installed files, compiler, package report, transforms and assets are bound. The sole Native-first generic local-state click-to-MutationObserver pair observes 3.5/1.800000000745058 ms Native/React, with Native slower in this observation. Timer quantum is unmeasured; this is no speed, numeric-update, CPU/tail/cold/memory/presentation or independent-device qualification. Unminified JS is 3308583/1150070 bytes with different feature graphs.

The full-plan first pass remains active. Current other-platform and authored realtime/lifecycle/cold/memory/presentation/independent-device gates remain open; human participants are zero with no maintenance claim. Historic wins, dense FAIL, Recording A unresolved and physical HOLD retain scope. No VM or server starts; saved Apple defaults remain one CPU, 256 MiB/container and 512 MiB/build, effective limits unverified behind Depot startup permissions.

[Source, preserved failure, receipts and limits](implementation/2026-10-19-closed-arrow-authoring/results.md).

## Numeric owner effect boundary — 19 October 2026

The archived old compiler/current-runtime diagnostic reproduces stale opaque sibling output and a suppressed getter exception on local invalidation. Functions/arrows now share a finite whole-owner proof; individual pure bindings remain available without granting owner skipping. Existing cache/prepared records capture actual primitive state reads, current World checks and immutable owned primitive props; keyed copies preserve existing JSX ownership. Unknown inputs/effects keep generic rendering, with VDOM token preflight, exact acknowledgements, root history and lifetime authorities retained. Added analysis/admission/copy/retention and lost-specialization costs remain unqualified.

Darwin-v5 passes 47/47 steps, 1031 runtime tests, 79 Rust tests, 31 actual compiled fixtures and thirteen package checks. All 1102 inputs match at the gate, with 1111 raw/context files archived. V1–v4 failures remain preserved; older supervisor wall-clock times are unavailable, while numeric tool exits and original runner step times survive. Migrated fixtures retain exact manual execution, keyed/ref/index/generation, private-candidate, reentry and cleanup assertions.

Fresh five-tarball proof-v4 passes independent DOM/Three updates, opaque refresh, cleared fallback name, [4,0,0] reveal and empty cleanup. Seventeen plus two source rows, 1612 selected installed files, compiler, package report, transforms and assets are bound. Harness/diagnostic follow-ons are separately captured; product/compiler/fixed fixture remain v5-identical. React's impure opaque control explicitly opts out after a preserved cached-getter failure; measured HotCounter/App remain compiled (_c(4)/_c(8)). The sole Native-first click-to-observer pair is 3.5/1.5 ms, Native slower in this observation; timer quantum is unmeasured and no speed/CPU/tail/cold/memory/presentation/independent-device qualification follows. Unminified JS is 2609439/1051820 bytes with unequal graphs.

The full-plan first pass remains active. Current platform/product/independent-device and lifecycle/performance gates remain open; human participants stay zero with no maintenance claim. Historic wins, dense FAIL, Recording A unresolved and physical HOLD retain scope. No VM/server or memory increase occurs; saved Apple limits stay one CPU, 256 MiB/container and 512 MiB/build, effective limits unverified behind Depot startup permissions.

[Source, preserved failures, receipts and limits](implementation/2026-10-19-numeric-owner-effects/results.md).

## Collection owner effect and lifetime boundary — 19 October 2026

Whole-owner and mapper proofs now gate automatic collection skipping. Opaque helpers/getters/captures and unsafe inputs retain generic evaluation; runtime-owned scalar inputs and unchanged canonical collection APIs are admitted before callbacks. Automatic insert/replace stays generic. Captured Entry stamps and private owner replacement preserve remove/reinsert lifetimes even after history expiry. Immutable descriptors retain stamps only; mounted ancestor child arrays retire after acceptance. Canonical keyed-bucket revision replaces VNode identity as the scoped region generation marker, preserving independent nested moves and rejecting same-region/getter reentry. Exact acknowledgements, newer actions, fork history, live ownership, journal snapshots and whole-tree guards remain. New allocation/admission/revision/fallback costs are unqualified.

Darwin-v7 passes 50/50 steps, 1037 runtime tests, 80 Rust tests, 33 actual compiled fixtures, three retention checks and thirteen package checks, with 1129 unchanged inputs and 1138 archived raw/context files. Six failed gates and the supervisor launch error remain preserved. The unchanged compiled GC check collects removed row/payload with a mounted root, live controls and balanced cleanup; this is not a retained-heap budget.

Fresh five-tarball proof-v1 passes fourteen untimed DOM/Three stages, keyed state/identity, opaque refresh, independent [4,0,0] reveal and empty cleanup. Seventeen plus two source rows, 1612 selected installed files, compiler, package report, transforms and assets are bound. Actual React Row/SafeCollection/SceneReveal/App emit _c(7)/_c(5)/_c(3)/_c(5); only the impure opaque control opts out. The sole Native-first two-row move click-to-observer pair is 2/1.7000000029802322 ms, Native slower in this observation. Timer quantum is unmeasured; no speed/CPU/tail/cold/memory/presentation/independent-device qualification follows. Unequal graph JS sizes are 2627866/1052881 bytes.

The full-plan first pass remains active. Other-platform and authored realtime/lifecycle/performance/independent-device gates remain open; human participants stay zero with no maintenance claim. Historic wins, dense FAIL, exhausted Recording A and physical HOLD retain scope. No VM/server or memory increase occurs; saved Apple limits remain one CPU, 256 MiB/container and 512 MiB/build, effective limits unverified behind Depot startup permissions.

[Source, preserved failures, receipts and limits](implementation/2026-10-19-collection-owner-effects/results.md).

## Realtime composition and main-thread batching — 21 October 2026

The human prioritizes RAF/canvas applications, accepts independent DOM cadence outside declared transactions, and means computation-DAG batching/fusion/specialization on the main thread rather than async wait overlap or workers. Ordinary updates now reuse compiler-proven closed collection rows. Heterogeneous certified numeric programs execute original-order runs with all staged outputs checked before writes. Narrow direct retained-child forwarding lets numeric motion compose with structural meshes/resources/events, guarded by frozen runtime-owned data and fail-closed owner program schema 3. Existing identity/version/publication authority, exact acknowledgement, accepted histories, whole-root guards and generic fallback remain.

Darwin-v6 passes 64/64 phases: 1095 runtime tests, 85 Rust tests, 45 actual compiled fixtures, Three/retention and fresh package consumers. All 1463 input hashes match. The namespace fixture was missing from earlier 44-fixture runners and is now executed as fixture 45. Earlier gate, browser, environment and fixture failures remain preserved.

The sole installed 256-object RAF/canvas comparison observes Native publication median/p95 1.20/2.30 ms versus React Compiler 0.90/1.00 ms, with an imperative floor of 0.00/0.10 ms. All arms pass values, identity and teardown. Timing predates retained-child changes and is not inherited by them. It establishes no CPU/presentation, cold/memory, population-tail, independent-device or release advantage. No favorable timing repeat occurs.

Actual WebGL checks pass animation without owner rerenders, controls, keyed edits and owned-resource disposal, but HMR delivery remains unresolved. Both a reversible content edit and the final documented polling-watcher adaptation time out, with a connected WebSocket and no invalidation/reload messages. Exact app restoration and owned-service cleanup pass. No further browser diagnostics occur. A separate preserved failure shows ordinary component replacement can reuse a host with a constant explicit host key; that generic identity gap remains open. The corrected changing-host-key fixture does not fix it.

The full-plan first pass remains active. Next source work is the generic component-output identity gap using the existing owner incarnation, with all candidate/snapshot clone paths and text-root semantics accounted for; no new registry or key renaming is assumed. HMR, release performance/cold/memory and independent-device requirements remain open. Historical narrow wins, qualified dense loss, exhausted Recording A and physical HOLD retain scope. No maintenance advantage is claimed. No VM or owned project server remains running.

[Results, preserved failures and exact receipts](implementation/2026-10-21-realtime-direction/results.md); [primary source review](implementation/2026-10-21-realtime-direction/source-review.md).


## Mixed local-state and Store inputs — 22 October 2026

Compiler schema 7 and existing range kernels now combine Store projections with local state in one retained host output. Activation controls and children survive updates; existing World handles, Store reader history, exact acknowledgement, hold admission and live validation remain authoritative. No second identity/version registry is added.

Corrected Darwin-v2 passes all 71 phases: 1137 runtime tests, 99 Rust tests, all 51 compiler fixtures and 1614 matching runner hashes. The first failed gate and installed-build guard failure remain preserved. Fresh installed proof verifies actual kernels and React Compiler transforms, equivalent declarative object ownership, matching real WebGL output and exactly-once disposal. Both browser phases match 12340 hashes and close cleanly.

The sole declarative Native versus React Compiler + R3F comparison still loses: publication median/p95 4.10/5.30 versus 0.60/0.80 ms; update-through-draw 6.45/8.00 versus 2.80/3.20 ms. The fixed-order 12-warmup/60-frame observation uses real WebGL2 on Apple M4. Older layout-effect adapter timings remain preserved with corrected scope and do not establish a declarative R3F loss. There is no causal old/new, presentation, useFrame, phase attribution, matched cold/memory or independent-device claim.

The semantic slice is complete; the full-plan goal remains active. Realtime speed, broader computation fusion, HMR delivery and lifecycle/independent-device requirements remain open. Historical narrow wins, qualified dense DOM loss and physical HOLD retain scope. [Results and failures](implementation/2026-10-22-mixed-numeric-inputs/results.md); [primary review](implementation/2026-10-22-mixed-numeric-inputs/source-review.md).

## Astra-directed closed Store contraction — 22 October 2026

Astra high supplied a source-locked deep dive and [precise Sol orchestration](implementation/2026-10-22-astra-realtime-gap/orchestration.md). Three Sol-medium agents implemented one integrated slice: owned immutable projection paths and transaction-local result reuse; linear canonical audits and direct-reader history without empty selector Maps; cache-local output-shape proof and deduplicated ancestor patches; owned scalar VDOM construction and two adjacent callback-free duplicate checks retired. Existing World/Store/publication authority, exact acknowledgement, reentry, held/fork histories, live checks, resource lifetime and generic fallback remain. Public callback boundaries still require fresh audits; the source-derived 515 audits were not reduced to one. Kernel order, compiler schema, host writer and the 12 authored consumer files are unchanged.

Darwin-v3 passes all 72 phases: 1147 runtime tests, 99 Rust tests and all 52 compiled fixtures, with 1655 runner hashes matched. Both earlier failed gates remain preserved. Fresh installed proof verifies Native schema 7/kernel 1, React Compiler + declarative R3F transforms, matching nonempty WebGL output and retained identities. All three arms dispose 512 resources exactly once; Native leaves zero owners, pending actions and registered setters. Both browser phases match 12340 hashes before/after and close all contexts without errors.

The sole fixed-order Native/React/imperative comparison still loses: publication median/p95 **3.90/4.70 ms** versus **0.90/1.00 ms**; update-through-draw **6.50/7.40 ms** versus **3.75/4.60 ms**. Imperative observes 0.00/0.10 and 3.20/4.00 ms respectively. Twelve warmup and 60 measured frames use real WebGL2 on ANGLE Metal Apple M4. This is one descriptive episode, with no causal old/new saving, phase attribution, presentation, useFrame, matched cold/memory or independent-device qualification. No favorable repeat or rescue cache follows.

Primary retains the reviewed source contractions because they retire named duplicate work using existing authorities and pass semantic conformance; this is not acceptance of a speed or memory budget. New immutable shape receipts, normalization and transaction scratch have unmeasured costs. This optimization slice is closed with performance parity **FAIL**. The full-plan goal remains active: broader computation fusion, HMR delivery, lifecycle/cold/memory evidence, idiomatic useFrame comparison and independent-device qualification remain open. Human maintenance participants remain zero. Historic narrow wins, qualified dense DOM loss, exhausted Recording A and physical HOLD retain scope. [Results and failures](implementation/2026-10-22-closed-store-contraction/results.md); [primary review](implementation/2026-10-22-closed-store-contraction/source-review.md); [Astra report](implementation/2026-10-22-astra-realtime-gap/report.md).

## Idiomatic R3F frame comparison — 22 October 2026

The installed comparison now includes an actual R3F v10 useFrame arm beside Native declarative state, React Compiler plus declarative R3F state, and imperative reference. Native/React/imperative/shared-scene/package bytes and all production runtime/compiler sources remain unchanged from 04b7757. R3F owns the frame arm's JSX graph/resources; public root advance executes 256 motion callbacks, one marker and a render-phase takeover. Proof observes zero draws during scheduler advance and exactly 72 common draws. This is a different ref-mutation contract, not native Store accepted-state publication or evidence that React schedules every frame-hook invocation.

Darwin-v1 passes 72/72 phases, 1147 runtime tests, 99 Rust tests and 52 compiled fixtures, with 1693 matching input hashes. The initial installed guard failure and v2 observer-induced Compiler declines are preserved. Moving only global counter bookkeeping into module helpers gives v3 actual CompileSuccess for all five frame components; no fallback approval is used. Fresh installed typecheck/build covers the post-gate consumer corrections. Untimed proof verifies every frame's actual scheduler calls, equal values/pixels/retained identities and 512 exactly-once resource disposals per arm. Both browser phases match all 12367 hashes and close cleanly. The offset-effect counter is not an all-render counter.

The sole four-arm fixed-order observation still loses for Native. Update-step median/p95 is **4.10/4.90 ms Native**, **0.80/1.00 ms declarative React/R3F**, **3.10/3.40 ms R3F useFrame**, and **0.10/0.20 ms imperative**. Update-through-draw is **6.60/7.50**, **3.55/4.40**, **5.70/6.20**, and **3.30/5.40 ms** respectively. The frame arm's update step includes scheduler advance and direct writes, not Store publication. Twelve warmup/sixty measured frames on one Apple M4/WebGL2 session give descriptive evidence only: no causal before/after saving, phase attribution, population-tail, automatic-frameloop/presentation, cold/memory or independent-device claim. No favorable repeat occurs.

The required frame-hook comparator is implemented and verified; realtime performance parity remains FAIL. Full-plan scope, physical HOLD, exhausted Recording A and zero-participant maintenance limits remain. Current workbench HMR has no source-backed fix and no further server run. Astra separately supplied a [data-owned execution review](implementation/2026-10-22-owned-execution-review/report.md) and [Sol orchestration](implementation/2026-10-22-owned-execution-review/orchestration.md): a possible next semantic capability using existing data evaluators and passive canonical capture, not an implemented optimization or speed approval. Broader computation fusion, HMR, matched cold/memory and independent-device requirements remain open. [Exact results and failures](implementation/2026-10-22-r3f-frame-baseline/results.md); [primary review](implementation/2026-10-22-r3f-frame-baseline/source-review.md).
