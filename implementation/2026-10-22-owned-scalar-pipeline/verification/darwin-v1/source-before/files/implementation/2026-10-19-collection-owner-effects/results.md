# Collection owner boundary outcome

Source basis: main `b2f13a10e0f06ab1cca07bb028deb011e9cc8bb5` plus these archived changes. Origin main/HEAD were checked at initial published `a694d72959970eca750d2fa09c91d0b64ae5494a`; no push or PR occurs. See the [contract](design.md), [source review](source-review.md), [protocol](README.md) and [authoring reference](../../docs/native-authoring-reference.md).

## Behavior and implementation

The [archived compiler diagnostic](../../.cache/compiled-collection-owner-baseline-71dc6480-5ea2-43ba-8d58-a9c8010b4095/receipt.json) reproduces stale opaque output A after a collection move, a suppressed throwing getter, and zero reads of an unchanged row's throwing mapper getter. It runs the immutable previous packaged compiler against the earlier runtime source bound in that receipt and Darwin-v1 archive. It is neither a frozen old-product comparison nor a diagnostic of the final incarnation runtime; no timing is inferred.

Rust/OXC now requires finite whole-owner and mapper proofs before skipping a collection owner. Stable module-local component tags and direct row forwarding qualify; opaque siblings/helpers/getters/captures, callback property reads and unsafe binding patterns retain generic evaluation. A TypeScript annotation does not prove getter absence. Functions and const arrows share the proof. Existing outside-collection read analysis remains. Compiler `closedCollectionSites` metadata, including an empty list on declined collection owners, selects pre-invocation runtime input admission. Undefined metadata preserves the separate explicit low-level capability contract.

Existing owner/cache/collection records capture admission before callbacks. Eligible private runtime-owned props are frozen before invocation; canonical unchanged collection APIs and own scalar noncollection props are required. Raw/Proxy/object inputs and late freezing do not upgrade eligibility. Direct and grouped/scoped paths preserve live code/cache/owner/writer checks, source history, exact acknowledgements and newer reentrant actions. Automatic insert/replace declines before arbitrary Row preparation; eligible move/remove stays local. No whole-tree snapshot copy or parallel version/identity registry is added.

Generic remove/reinsert now captures an opaque canonical Entry token before mapper callbacks and replaces the private owner when that incarnation changes, even after operation history expires or the parent mutates before its map. Moves and value replacements preserve incarnation. The existing host-key scope carries new incarnation identity while preserving subsequent authored key changes. Immutable descriptors hold stamps alone; full expansion builds the live row map from tagged authored nodes.

The new mounted-root GC regression exposed both descriptor-held row nodes and stale ancestor VNode child arrays. Sparse edits now retire those ancestor arrays through private clones along the parent chain, using mounted children as structural authority. Publication defers retirement until acceptance after all post-host checks; the temporary parent set clears on all terminal paths. External old snapshots and the accepted journal remain valid. The canonical keyed bucket owns its structural revision, replacing parent VNode identity as the scoped region generation marker. Exact bucket/revision/header checks allow independent nested edits while rejecting same-region changes and getter reentry. Whole-tree/replacement identities remain exact.

## Consolidated verification and preserved failures

[Darwin-v7](verification/darwin-v7/receipt.json) passes **50/50 steps**, **1037 runtime tests**, **80 Rust tests**, **33 actual compiled fixtures**, three retention checks, seven Three cases and **13 fresh-package checks**. All **1129 runner inputs** match; **1138 raw source/context files** are archived before commands. The [supervisor](verification/supervisor-darwin-v7/supervisor-receipt.json) records actual exit 0 and UTC times 23:51:30.155560–23:52:07.361248. The unchanged compiled GC test collects the removed row and payload while retaining live controls and a mounted root, then balances effect cleanup and releases readers/owners. This is not a retained-heap budget or proof of leak absence.

Every failed consolidated attempt remains:

| Gate | Preserved failure |
| --- | --- |
| v1, 46/49 | Type/value Row namespace proof rejection; missing final classic JSX pragma; nested pnpm SQLite store permission failure. A separate supervisor launch-path error occurred before product commands. |
| v2, 47/49 | Rest-pattern corpus wrongly expected lowering; actual generic same-batch remove/reinsert retained old host/state. Escalated package installation passes. |
| v3, 48/50 | New retired generic setter assertion wrongly expected false instead of the existing dead-owner throw; removed row/payload retained. |
| v4, 49/50 | Stamp-only descriptors insufficient: mounted ancestor VNodes still retain removed row callbacks. |
| v5, 49/50 | GC passes, but ancestor compaction stales an independent prepared outer move. |
| v6, 49/50 | Header equivalence alone wrongly admits same-region order changes and getter reentry; GC and all compiled/package checks pass. |

The legacy 1000-row compiled execution keeps its original state/draft, host identity, remove/reinsert, failure/recovery, fallback and cleanup assertions. Safe forwarding replaces an observable mapper key getter; runtime canonical keys are used. Unique artifacts preserve historical `.cache` evidence. Existing scoped freshness and nested placement assertions are unchanged. No timing runs during repairs.

## Installed proof and one structural observation

Fresh [proof-v1](proof-v1/build-proof.json) installs five current tarballs outside the checkout, typechecks/builds and passes the [untimed production pair](proof-v1/pair-proof.json) and [14-stage browser execution](proof-v1/browser-untimed.json). Seventeen unit sources, two external fixture sources, 1612 selected installed files, tarballs, compiler, package-report source hashes, transforms and exact assets are bound. Product/compiler/harness source is gate-v7-identical. Chrome 153.0.8010.12 runs headless/GPU-off with offline HTTPS interception and a 90-second deadline; no server starts.

Both arms retain keyed host identity/local state, refresh opaque A→B on stated invalidation, remove/insert/replace to c,d,b, allow independent pending scene work, reveal [4,0,0], and balance all row lifetimes on disposal. Native leaves no DOM/Three owners, handles, resources or pending work. Actual React Compiler emits Row/SafeCollection/SceneReveal/App `_c(7)/_c(5)/_c(3)/_c(5)`; only the impure opaque control explicitly opts out. Native metadata requires owner rendering for OpaqueCollection and permits the safe collection delta.

After primary review, the [hash-bound authorization](proof-v1/run-authorization.json) permits exactly one Native-first safe q-before-p button-click-to-MutationObserver pair. The [sole pair](proof-v1/browser-one-pair.json) observes **2 ms Native / 1.7000000029802322 ms React**, with Native slower in this observation. Both reach q,p while retaining opaque A and the independent pending scene; cleanup succeeds. There is no timing retry. Timer quantum is unmeasured, and this two-row prepaint scheduling/observer interval establishes no speed, CPU/tail/cold/setup/retained-memory/presentation or independent-device qualification. Unminified JS is **2627866/1052881 bytes**, with different implementation/host graphs and no equivalent-feature size claim.

Compiler analysis, private-prop freezing/admission, lost specialization, full-render stamp/map work, Entry tokens, bucket revision storage/mutation checks, ancestor clones and conservative fallback costs remain unqualified. No VM starts or memory increase occurs. Saved Apple limits remain one CPU, 256 MiB/container and 512 MiB/build on Depot; effective VM limits remain unverified behind service-startup permissions.

## Receipt identities and remaining scope

| Receipt | SHA-256 |
| --- | --- |
| Darwin-v7 | `1c32e6c66189d47b86801c985d68df969156f6a095b49088aca7622485c643db` |
| Debug compiler | `3bad3cdc12393b349266d0f483d1097b150cf0863cae55ad1a5735fe7ca7064d` |
| Packaged compiler | `6972c777a1183284680a209ec4196929573c4e7acf879e9e14a28cd085e87ed8` |
| Installed build | `fdf76fffb2af8c225bd3efb1e4ca49cc83e36b4aef99d98e29e5b573a0eacacd` |
| Untimed production pair | `9d9057be88fb2eb0d1a831e49a19aa0f41d991340b431065e3bd5b4393a3d3bb` |
| Untimed browser | `5ad63d8e2c113b91759710682081ea0d6971ff91c784f759034d01826e1e73a2` |
| Sole runtime pair | `11bca61b9f23016bd59333eccafa0ac27f20b9853b96bf6dacc066795751f908` |

The full-plan first pass stays active. Current other-platform execution, authored realtime/lifecycle/cold/memory/presentation and independent-device gates remain open. Human participants remain zero, with no maintenance advantage claim. Historic stable-binding wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain their original source and scope. This slice does not complete the product requirements.
