# React bridge reference

The optional `@r3act/react-bridge` package supplies explicit DOM migration boundaries. Native application modules still use `@r3act/core` and the mandatory `@r3act/vite` compiler. Install compatible React and React DOM peers when using the bridge. Native-only applications do not require either peer.

Both directions pass the current Darwin package boundary. Real React DOM execution covers the reverse adapter’s finite state, event, prop, keyed identity and lifetime behavior; see [results and limits](../implementation/2026-10-19-react-island/results.md).

## React inside native

```ts
import { createNativeReactRootAdapter } from "@r3act/react-bridge";
import { ExistingReactPanel } from "./existing-react-panel.js";

export const ReactPanel = createNativeReactRootAdapter(ExistingReactPanel);
```

Create the adapter once outside component rendering. Use `ReactPanel` in compiled native TSX with the React component's ordinary props. Keep the React component in a React module so its hooks and JSX use the React pipeline. The adapter returns one native-owned private `div`; React owns its contents. It requires an HTML DOM host and cannot mount into Three or a memory host.

Props are captured shallowly during native preparation and delivered after native acceptance, in the ref phase. A discarded, stale or failed host candidate does not deliver its props. Native groups finish accepted publication before an island receives new props. Nested objects retain caller ownership; passing them does not make them immutable or versioned. Native VNodes cannot be used as React children. Construct any React children using React's own element APIs.

An ordinary prop update or keyed move retains the React root, local React state and private container. Removing or replacing the native owner unmounts its React root; reinsertion creates a new lifetime. Each native root or fork owns its own island. The adapter uses native owner state and activation cleanup internally; applications need no manual root or ref bookkeeping.

React schedules its render independently. Native acceptance does not wait for the React commit, effects or paint. React hooks, contexts, portals and error boundaries remain React-owned; native context and hooks do not cross the boundary. Handle asynchronous React render failures with React error boundaries. Synchronous attachment/render failures are postpublication errors; cleanup preserves the original exception, including an unmount error. Recovery may require removing and recreating the island owner.

## Native inside React

```ts
import { createReactNativeRootAdapter } from "@r3act/react-bridge";
import { NativePanel } from "./native-panel.js";

export const EmbeddedNativePanel = createReactNativeRootAdapter(NativePanel);
```

The returned React component owns a private `div` with one native DOM root. React's committed props update the native component while retaining its root and local native owner state. React StrictMode setup/cleanup replay creates a fresh native lifetime. Optional native root configuration is fixed when the adapter is created.

React owns the outer commit and native owns the container's contents. React contexts, refs, portals and lifecycle contracts do not become native hook semantics. Native activation `useEffect` remains distinct from React dependency-array effects. Native HMR currently invalidates compiled revisions and reloads the page; neither adapter promises state-preserving edits.

## Distribution and limits

Both factories are re-exported from one `@r3act/core/react` module graph. They do not install another native World, reconciler or accepted-state registry. The private-alpha packages are unpublished and their namespace is unreserved. See [package installation](../native-package-integration.md) and the [native authoring reference](native-authoring-reference.md).

These boundaries support explicit migration. They do not establish cross-renderer visual atomicity, full React renderer compatibility, SSR/hydration, or a selected third-party library's complete behavior. Keep library providers and their consumers inside the same React island unless that library supplies a supported external integration.
