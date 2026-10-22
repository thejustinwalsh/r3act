# Selected Radix Dialog bridge: integrated boundary

Exact `@radix-ui/react-dialog@1.3.1` now has a finite controlled native bridge through `@r3act/react-bridge/radix-dialog`. It uses the existing opaque React-island owner/ref boundary, with no new World, Store/version registry or reconciler. This completes the selected-library rung for the tested Dialog contract; it does not establish all Radix components, full React compatibility or the full product finish line. Source starts at local main `590376c1e696df5bef01426c26ecbb457f02b262`; origin/main remains the initial `a694d72959970eca750d2fa09c91d0b64ae5494a` at the read-only remote check. No push or publication occurs.

## Implemented contract

`RadixDialog` is the native wrapper; `ReactRadixDialog` is the same ordinary React view. The API controls `open` with `onOpenChange`, requires title/description/trigger text and permits React children, a caller-owned portal container and finite content/overlay styling. The actual library Root/Trigger/Portal/Overlay/Content/Title/Description/Close remain React-owned and modal. Native preparation captures props; accepted refs deliver them after native publication, while React schedules its own commit. Prop updates/moves retain the island; removal/reinsert creates a new lifetime. A portal outside the private container remains owned and cleaned up by React/Radix, preserving the caller container and unrelated content.

The selected library is optional and isolated from default entries. Core exposes the identical module at `@r3act/core/react/radix-dialog`. Fresh installed-consumer execution blocks React resolution during native core import and Radix resolution during default bridge import, then confirms that the selected subpath requires Radix. Public props accept actual React function-component children and reject native VNodes. The boundary-local exact-P return type removes the previous implicit native-children intersection; native RuntimeNode and general component types remain unchanged. No lifetime execution logic changes in that correction.

The initial createElement-based view did not produce required compiler memo output. Its equivalent React JSX replacement uses the ordinary React pipeline; native application TSX still requires Rust/OXC. No memo pragma, diagnostic suppression or weaker proof is introduced. Both source proofs now share exact-app-site checks and compiler cleanup, retiring the copied island proof body. The consolidated runner now archives raw inputs before product commands, retiring external per-slice source-copy wrappers. Neither evidence mechanism participates in runtime publication.

See [design and falsifiers](design.md), [source review/history](source-review.md) and the [public reference](../../docs/radix-dialog-reference.md).

## Consolidated correctness

The final repaired-source Darwin run passes **37/37 steps**, outer exit 0, with no receipt errors. It covers **1003 Deno runtime tests**, **63 Rust tests**, **24 compiler-artifact checks**, **23 actual compiled execution fixtures**, **two separate AST/source proofs**, **seven Three cases**, two retention checks and ten fresh five-package consumer checks. The source proofs do not count as additional runtime fixtures or execute React DOM.

All 874 before/after runner inputs match. The automatic pre-command archive contains those inputs plus eight available context files (882 files total), with no unavailable context. Primary independently hashes archive bytes and current source, with zero mismatch. Package and declaration/source maps, optional entry isolation, positive/negative prop typing, installed compiler identity and real installed native execution pass. Current native package execution is Darwin ARM64; older Linux evidence predates this change.

The actual native fixture registers NativeRadixApp/PendingGate, lowers two own Store sites and local state, and keeps empty propOnlySites/no closed Store/resource/forward program. Actual browser build output proves ReactRadixDialog `_c(26)`, ReactApp `_c(22)` and DialogBody `_c(17)` with CompileSuccess events. One compiler hash remains `cee5598eaa612f76fe6b4717d3161333d30c5f4503430c3c448627e27b6d0fb0`; the packaged Darwin compiler has its separate release hash, recorded in the gate review.

| Preserved stage | Outcome and scope |
| --- | --- |
| [Dependency setup](verification/dependency-setup.json) | First restricted add exits 1 on Depot SQLite access; authorized existing-store install completes. Current root package/lock changes only. |
| [Darwin v1](verification/gate-review-v1.md) | PASS 37/37 for original createElement-wrapper source. This remains tied to that archive. |
| [Untimed proof v1](verification/workload-proof-v1-review.md) | REJECTED, outer 1/Vite 0: wrapper lacks compiler-runtime/_c; other 12 assertions pass. Cause beyond that observed authoring form is not diagnosed. No browser/timing. |
| [Darwin v2](verification/gate-review-v2.md) | PASS 37/37 for equivalent React JSX and boundary-local children typing repair, with new positive React function-component child coverage. |
| [Untimed proof v2](verification/workload-proof-v2-review.md) | Outer 0/Vite 0, all 13 assertions pass; actual memo/native output reviewed before pair authorization. |
| [Sole browser pair](verification/workload-pair-review.md) | Outer 0 and both arms PASS, exact output and cleanup/integrity checks pass. No repeat. |

## One matched interaction

Headless Chromium 153.0.8010.12, GPU off, Native-first, fresh contexts, 90-second total deadline, exact production-asset replay at a synthetic HTTPS localhost origin. No project server, Portless route, network/TLS connection, focus change or VM is used. Real keyboard input stays in the headless page.

The compiled native arm uses a native root plus one independent React island; the direct React arm uses one React root with the same ReactRadixDialog. Both use normal external-Store publication for controlled changes. Explicit mount/tree-control/teardown may use React flushSync; the measured external open does not. Both prestart the pending resource promise. The extra native root/container and its scheduling cost are part of the native arm.

Both arms pass:

- External controlled open; real Shift+Tab from first input to last Close, Tab back to first input, Escape close and trigger focus return.
- Controlled Trigger/Close callbacks, actual aria Title/Description links and modal hiding/scroll/focus guards.
- Store/local-state prop changes and keyed row move retaining dialog/input/local-state identity, uncontrolled form value and selection.
- Discarded/stale candidate rejection and retained accepted modal through pending resource/reveal.
- Removing an open dialog without implicitly changing controlled state; explicit external close while absent; reinsertion with fresh form/local state.
- Open disposal restoring exact body styles/scroll-lock, unrelated aria and focus guards, preserving caller portal sentinel/container/parent and unrelated node/focus, balanced React body cleanup and zero native owners/pending changes.

Defined output hashes match: `bdea6f638c1309191fbd31673687e2a237fc5a783cc9930c78fa6c083d8c7624`. Both report five controlled callbacks, four body mounts and three cleanups before final disposal. Post-disposal assertions balance all four mounts/cleanups. Both arms dispose; no blocked/failed request, page error, console error or stop reason occurs. Read-only process inspection confirms the owned headless browser closes.

| Measure | Native | React |
| --- | ---: | ---: |
| Setup return |11.5ms|10.9ms|
| Mount to first matching trigger observed |38.4ms|11.1ms|
| External controlled open to matching portal MutationObserver |10.1ms|13.7ms|
| Approximate timer quantum |0.1ms|0.1ms|

Native's open endpoint is 3.6 ms earlier in this one fixed-order pair. This is a scheduling/observer observation before paint, not CPU isolation, full modal/focus readiness, a median/p95 distribution, physical input-to-present or general performance qualification. Mount follows module load and uses RAF polling; it is not cold setup. Disposal is checked but untimed. Shared JavaScript 579,238 bytes is not equivalent-feature per-arm size. No allocation/retained-heap/independent-device result is collected here. Complete document-listener and injected-stylesheet inventories are not independently measured.

The browser workload aliases public package routes to checkout source and explicitly applies React Compiler to the wrapper. The package builder emits JavaScript through tsgo without precompiling that library with React Compiler. The installed consumer checks imports, identities, types and native execution; it does not render the installed Radix package in a browser. These browser timings therefore describe the source workload with its compiled wrapper, and do not qualify installed-package rendering or performance. Installed-browser package conformance remains open.

See the [final bounded audit](verification/final-audit.md) and [primary disposition](verification/primary-final-review.md).

## Exact evidence basis

| Artifact | SHA-256 |
| --- | --- |
| [Correctness source archive v1](verification/darwin-v1/source-archive.json) | `c40d9b2dc39043a9b90de7fc5e061b9a0a36ddd1c0cc024a6ad3a251332bc6b8` |
| [Correctness source archive v2](verification/darwin-v2/source-archive.json) | `e259e47a5741165040f0b19d2da6c92134a07987d39991c741f44acf2edfa9e5` |
| [Rejected build proof](workload/proof-v1/build-proof.json) | `884f5640941669e54300e26a5bb26e82b13bea38e82af5a4d6cbd1c8eabac8a1` |
| [Accepted build proof](workload/proof-v2/build-proof.json) | `f9cebe0ce17d76a5f94d50e196a9183a217f8a9a2fa932e939b5be35325f174b` |
| [Accepted source/dependency lock](workload/proof-v2/source-lock.json) | `db352dcc4b8e03b76d16ca6e908206e39be9e0f30b466680599f9514cdf3caf3` |
| [One-shot pair](workload/proof-v2/pair-one-shot.json) | `4f4e5bda84d9c77d3c5c75d83d61b66600cf23eb6e57d6ca93fd0a695c881abc` |

The browser lock preserves 1289 inputs including 28 resolved runtime packages and their license files; actual Radix 1.3.1 and React/React DOM 19.3.0 are pinned. Raw bytes are copied before Vite, including the selected dependency graph rather than all node_modules. All 2588 integrity rows match before/after: 1289 current + 1289 archive + compiler + 9 captured transforms/events/assets. The JavaScript SHA is `132d8a537533b793602a824940a25af71504271c2dc3a99282cd9a9309df736c`. Primary's exact proof-bound [authorization](workload/proof-v2/run-authorization.json) precedes the pair.

All 19,940 preexisting tracked cache files and 176 historical legacy-package artifacts remain unchanged. Fresh package caches are separately captured before/after, with expected generated changes. New evidence is additive. Frozen proof-v1 retains its original .ts source; proof-v2 retains .tsx, without rewriting historical records. Final live documentation follows execution; source-review/context text may differ from its frozen capture, while product source remains exact.

## Full finish line remains open

This finite selected-library contract is supported on the tested environment. It does not qualify other Radix components/versions, force-mounted animation, SSR/hydration, broad React renderer compatibility, accessibility across assistive technology or OS IME/focus. React props retain React's immutability rules; the bridge's shallow capture does not turn nested caller-owned data into versioned immutable state. No cross-renderer visual atomicity is established.

The active full-plan first-pass goal still includes general structural/resource admission, broader async UX, platform/host conformance, cold/setup/retained-memory/lifecycle budgets, presentation and independent-device qualification. Human participants remain zero; no maintenance advantage is claimed. Historic stable-binding wins, qualified integrated dense FAIL and exhausted/unresolved Recording A retain their source/scope. Physical selection stays HOLD. No old timing qualifies current source.

Apple Container remains configured for one CPU, 256 MiB/container and 512 MiB/builder on Depot; startup still fails local launchd path permissions, so running limits are unverified. This unit starts no VM and raises no memory cap.
