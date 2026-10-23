# Native-owned React islands: integrated boundary

The public reverse adapter now embeds React DOM inside a native owner. This closes the bounded opaque-island rung of master-plan Unit 9 for the tested DOM behaviors. It does not finish selected-library integration, general React compatibility or the full product plan. Source starts at main `fefd4a9c4527268af721e7a61f9be3a07a220fee`; [contract](design.md) and [review](source-review.md) identify invariant authority, replaced restriction, budget limits and falsifiers.

## Implemented behavior

`createNativeReactRootAdapter` captures shallow own props during native preparation and delivers them from accepted refs after group publication. Each owner holds one lifetime through native state/effect/ref authority. Ordinary props and keyed moves retain React state/root/container. Discarded/stale candidates and failed host application do not deliver candidate props. Removal/reinsert creates a new lifetime; disposal unmounts once. Reentrant creation/render/disposal cannot revive a retired lifetime; render and cleanup errors preserve their identities. Public DOM validation respects the container's own realm.

The internal renderer seam supports nine host-independent regressions, distinct from actual React DOM execution. No version/history/publication registry or reconciler is introduced. Whole-tree guards and generic fallback remain. React commits independently; asynchronous React errors use React boundaries. Native-only core keeps React and React DOM optional; the explicit bridge requires both. Fresh package consumption checks both directions, shared identity and valid/invalid props. Legacy builder metadata is updated in source without rebuilding its 176 frozen historical artifacts.

## Consolidated correctness and preserved failures

The accepted coverage is the raw Darwin v2 run plus a bounded environment supplement, on identical859 runner inputs. It is not a single 36/36 passing execution.

| Evidence | Observed result |
| --- | --- |
| [Darwin v1 receipt](verification/darwin-v1/receipt.json) | FAIL at noninteractive pnpm modules refresh; independent Rust 63 and Deno 1003 pass; dependent steps skipped. |
| [Darwin v2 receipt](verification/darwin-v2/receipt.json) | FAIL: 33/36 pass, two package-related commands fail, consumer skipped; temporary shim incorrectly forwards install-only store option to run. |
| [Package supplement](verification/darwin-package-supplement-v3/combined-coverage.md) | All three missing package steps pass: tooling, fresh build and consumer; nine consumer checks and five tarball hashes match. The initial launcher failure occurs before product commands and remains preserved. |
| [Proof v1 review](verification/workload-proof-v1-review.md) | REJECTED: Vite child exits 0 but actual ReactLeaf lacks memo/runtime output. Cause not diagnosed; separate outer exit was not captured. |
| [Proof v2 review](verification/workload-proof-v2-review.md) | Actual outer and Vite child exits 0; all native/compiler/opaque and React memo assertions pass. |
| [Browser review](verification/workload-pair-review.md) | Pair record and completion output PASS; enclosing zsh wrapper exits 1 afterward on read-only status assignment. Separate Node exit uncaptured. No retry. |

Combined coverage includes **1003 Deno runtime tests**, **63 Rust tests**, **24 artifact checks**, **23 actual compiled execution fixtures**, **seven Three cases**, both retention checks and fresh five-package consumption. The new compiler fixture is a separate **AST/source proof**, not a 24th runtime fixture or fake React DOM execution. The later browser build proves the repaired fixture through actual Rust/OXC output and real React DOM behavior. Production runtime/compiler/package implementation is unchanged across that fixture-only repair.

The repair replaces the mutable ledger prop with a stable frozen observer capability whose closures own the ledger. The same factory serves both arms; effects, events, state/props and every behavior assertion remain. No memo pragma, diagnostic suppression or weaker proof is used. React Compiler reports CompileSuccess for ReactApp and ReactLeaf; actual ReactLeaf imports react/compiler-runtime and uses `_c(20)`. NativeIslandApp's own body has lowered store:0/useAt and state:0/useStateAt, empty propOnlySites and no closed Store/resource/forward program. The opaque bridge is never promoted to purity.

## One bounded matched observation

Headless Chromium 153.0.8010.12, GPU off, fixed Native-first order, fresh contexts, 90-second total deadline. Exact local production assets fulfill synthetic HTTPS .localhost requests offline. No project server, Portless route, TLS/network connection, focus change or VM is involved. Primary binds the exact build proof in [one-shot authorization](workload/proof-v2/run-authorization.json); no favorable timing retry occurs.

Native uses two native roots and three independent React roots; React uses two direct React roots with the same leaf interaction. Native has extra private containers and renderer boundaries. Both prestart the shared pending promise. The workload exercises React/native local events, Store-derived props, keyed move, removal/reinsert, accepted pending view, grouped native callback, stale/discarded preparation and disposal.

| Measure | Native | React |
| --- | ---: | ---: |
| Setup return |5.9ms|3.3ms|
| Mount to first matching output observed |36.1ms|3.3ms|
| Final settlement to matching MutationObserver |2.1ms|0.5ms|
| Approximate timer quantum |0.1ms|0.1ms|

Native is slower in this single settlement observation. The interval includes async scheduling and observer delivery before paint; it does not isolate CPU or identify a cause. Mount output uses RAF polling after module load and is not cold CPU setup. No median/p95, presentation, physical input, retained heap, allocation, independent-device or general async-speed qualification follows. Disposal passes assertions but has no timing field. Combined JavaScript is 533,707 bytes, not equivalent-feature per-arm size.

Both arms produce identical defined output SHA `2a19ddf4425da99fa0a2a9c73a753139bb3d20886b0548270fb93a0c0e0b7493`. The serialized counts precede final disposal (a mounts2/cleanup1,b1/0,c1/0); subsequent assertions require cleanup a2,b1,c1 and empty hosts. Native records one group callback after both accepted versions advance and final owner/pending counts 0 in both roots. Both contexts and owned headless processes close. There are no page/console errors, failed or blocked requests.

## Source and artifact integrity

- [Source v2 manifest](verification/source-v2/manifest.json): pre-execution archive 870 files (859 runner inputs plus 11 context), SHA `2b61beb3580890de9c651122e5fa264f5f71f20b5317f32ed738839ff7533b25`. Same 859 inputs before/after v2 and supplement.
- [Browser source archive](verification/workload-source-v2/manifest.json): 763 files, SHA `8b82a8a0f3b04888967cba5dc97bab50a8b86314f342226bfa1798ba83dd7142`; seven approved fixture/workload executable differences from preceding source basis. Context documents are preserved at execution time.
- [Proof v2](workload/proof-v2/build-proof.json): SHA `a50840acc232e636863cb5ffc7f85e78fa71ae7abbbd41d7df1411e62db57294`; source-lock SHA `89653861d73388355b83766186308304a8734b71b43c3e3cb57c05afba4baf2c`.
- Compiler SHA `cee5598eaa612f76fe6b4717d3161333d30c5f4503430c3c448627e27b6d0fb0` stays fixed.
- [Pair](workload/proof-v2/pair-one-shot.json): SHA `501c6125278e1f85c7035a7553c3453036748d7646fa0cacf9c959ffd0c2fc24`; 768 rows before/after all match (761 source, compiler, three assets, three transforms).
- All 19,799 previously tracked cache entries and 176 legacy package artifacts remain unchanged. New compiler/package/source/evidence archives are additive. Final live documentation follows execution and does not rewrite those frozen captures.

Raw logs, assets, exact transforms, source locks, wrapper error/outer exit and process cleanup evidence remain under verification/ and workload/proof-v2/. No historical evidence is relabeled as timing current source.

## Remaining full-plan obligations

The full-plan first-pass goal remains active. General structural/resource admission and broader transition UX, selected per-library bridge, platform/host conformance, cold/setup/retained-memory/lifecycle budgets, urgent input-to-present and independent-device qualification remain open. Earlier GNU Linux execution predates this reverse adapter and cannot verify its current implementation. Human participants remain zero; no maintenance advantage is claimed. Historic stable-binding wins, qualified integrated dense FAIL and exhausted/unresolved Recording A retain their source/scope. Physical selection remains HOLD. This capability supplies no new removable dense-speed budget.

Apple Container tooling/data remain on Depot with saved one-CPU defaults 256 MiB/container and 512 MiB/builder. Depot launchd path permissions still block startup; effective running limits are unverified. This slice starts no VM and does not increase memory defaults.

Final bounded [audit](verification/final-audit.json) confirms no unexpected production drift, exact notebook205-cell prefix/root metadata,61 working document links and unchanged historical cache. Its documentation wording finding is corrected in the [primary disposition](verification/primary-final-review.md), preserving the original audit status. No product execution is repeated.
