# React islands in native applications

Source basis: local main `fefd4a9c`, continuing master-plan Units 3/5/8/9. The existing `createReactNativeRootAdapter` embeds native content in React. This unit supplies the other migration direction: an opaque React component inside a native-owned private DOM container. It does not replace native execution with React or add a reconciler.

## Contract and retirement

`createNativeReactRootAdapter(ReactComponent)` returns a native component. The native author still uses the mandatory compiler and ordinary props, `use(store)`, state and events. Each accepted island owner holds one React root; prop updates retain its React state and private container. Native keyed moves preserve that owner and root. Removal, replacement, failed attachment and native disposal release the root exactly once; reinserted owners get new React state. Separate native roots and forks own separate React roots.

Props reach React only from the native postpublication ref phase, after every member of a declared native group accepts. Preparing, discarding, staling or partially failing a native host candidate must not send candidate props to React. A shallow own-data prop capture belongs to that candidate; nested payload references retain ordinary caller ownership. React independently schedules its commit. React contexts, hooks, refs and lifecycle remain inside the island, and native state does not become React state. No atomic paint, rollback of custom setters, or shared React/native commit is promised.

The invariant authorities remain native owner incarnation/state, retained VDOM/ref lifetime, native publication phases and React's own root lifetime. There is no external version/history registry or publication subscriber cache. The replaced restriction is one-way migration; the adapter replaces hand-written imperative root mounting in native application components. It remains an opaque generic component and grants no compiler purity to React render callbacks.

The island has a single owner-local lifecycle object. It may be created lazily during preparation but cannot create or mutate a React root until accepted attachment. The existing activation cleanup owns final unmount, with a preactivation detach path covering disposal during initial ref delivery. Creation/render errors preserve their original error alongside cleanup errors; a synchronous callback cannot revive a disposed root. An internal injected renderer seam supports host-independent lifecycle regressions without importing React into core runtime tests. The public wrapper accepts only an HTML private container and uses the actual React DOM renderer.

## Integrated acceptance

Sol medium agents own the adapter/lifecycle tests and actual compiler fixture/browser workload separately. Primary owns package peers/consumer checks, runner integration, review and documentation. Luna remains idle until source review closes the slice, then runs consolidated frozen correctness/compiler/host/package checks. The actual compiler fixture's AST/source proof is distinct from real React DOM behavior in the bounded offline HTTPS browser workload. Public packages must expose both bridge directions from the same core graph; React and React DOM remain optional for native-only consumers.

The one matched interaction compares native Store-to-island committed props with an equivalent React interaction, preserving React local state, events, keyed identity, async retained views, removal and cleanup. React Compiler output in actual React components must be reviewed before timing. The endpoint ends at a matching MutationObserver before paint; React scheduling belongs to the observation. No project server or VM is required. Any server would require Portless first.

No removable speed budget is established; this is migration capability. Root setup/prop delivery/retention/unmount costs remain in the workload. One fixed-order pair does not establish tails, cold allocation/memory, presentation, independent-device or maintenance advantage. Falsifiers include delivery before native acceptance, state loss on a move/update, root duplication, stale prop publication, resource retention after retirement, cleanup masking the original error, or a second identity/publication authority. Historical stable-binding wins, dense FAIL, physical HOLD and zero human participants retain their scope. Full product requirements remain active.

## Environment adaptation

The current dependency graph adds the actual React DOM type package. The first pnpm add failed before modification because its default store differed from the installed Depot store; rerunning with the existing `/Volumes/Depot/.pnpm-store` completed. No historical lock/manifests were rewritten. Apple Container's saved caps remain 256 MiB/container and 512 MiB/builder, one CPU; Depot service startup is independently blocked. This slice requires no VM.
