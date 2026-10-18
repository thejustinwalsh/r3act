# Native authoring reference

**Status:** private alpha, 18 October 2026. This page describes the implemented native TSX subset. The `@r3act/*` tarballs are local artifacts; the namespace is unpublished and unreserved. For installation, Vite configuration, and a fresh consumer check, use the [native package integration guide](../native-package-integration.md).

Native components use `@r3act/core` and the mandatory Rust/OXC transform in `@r3act/vite`. Configure TypeScript with `jsx: "react-jsx"` and `jsxImportSource: "@r3act/core"`. JSX helpers alone do not lower owner sites, hooks, collection maps, task dependencies, or Suspense sites. Calling an authored hook without compilation throws. `@r3act/host-dom` and `@r3act/host-three` re-export host APIs from the same core runtime graph; `@r3act/react-bridge` is an optional adapter for a native subtree inside a React tree, not a React-compatible hook mode.

## Components and imports

Declare hook-using components as named, capitalized, synchronous `function` declarations at module scope. Import native hooks, `Suspense`, `createKeyedCollection`, and `asyncTask` as direct, unaliased value imports from `@r3act/core`. The compiler assigns lexical owner and hook site identities. Conditional sites are supported; repeated loops and nested callbacks are not.

```tsx
import { useState, useEffect } from "@r3act/core";

export function Counter() {
  const [count, setCount] = useState(0);
  if (count > 0) useEffect(() => {
    document.title = "Counter active";
    return () => { document.title = ""; };
  });
  return <button onClick={() => setCount((n) => n + 1)}>{count}</button>;
}
```

The effect site activates when `count` becomes positive and cleans up when it becomes absent; further increments while the site remains active do not rerun its setup. The compiler diagnoses hook aliases, type-only imports used as values, hook calls in nested functions or loops, and hook-using arrow or async components. Ordinary non-hook JavaScript remains JavaScript; accepting an expression does not certify its callbacks or property getters as pure. Native JSX can render intrinsic elements and native components. Event handlers run as host callbacks; their captured values do not become proven closed numeric bindings.

## Authored hooks

| Form | Current contract |
| --- | --- |
| `useState(initial)` | Returns a value and setter; the setter accepts a value or updater function. The compiler supplies the owner and lexical site. Supported numeric intrinsic prop/style expressions may use retained bindings; other reads use owner rendering. |
| `use(store)` | Reads a native store or selector in the active owner and returns its value **unchanged**. `useStore(store)` is a temporary compatibility spelling; prefer `use(store)`. |
| `use(resource)` or `use(promise)` | Reads an `AsyncResource` or thenable in an owner-aware render; pending reads suspend to the nearest native `Suspense` boundary. A store containing a Promise returns that Promise, so use `use(use(store))` to unwrap it. |
| `useEffect(setup)` | Registers an activation effect at a compiler site. Setup runs after the committed owner activates; its returned cleanup runs on deactivation or removal. Dependency arrays are unsupported; this is not React's dependency-array contract. |

The runtime identifies a store source by a callable `read` method, after checking `AsyncResource`. Pass a supported store, selector, resource, or thenable rather than an unrelated object with a `read` method. Native `Suspense` must also be a direct named import. Its `fallback` renders while the primary is pending, and its optional `error` renderer receives a rejection reason. Qualified `Suspense` imports and authored `__nativeBoundarySite` are diagnostics. The compiler injects the boundary site. A narrow closed-resource reveal path is described below; other reveal forms retain conservative preparation.

## Keyed collections

`createKeyedCollection(initial, keyOf)` requires a nonempty string key for each item and rejects duplicates. Its payloads are retained by reference, so callers must treat them as immutable. The collection supports versioned `insert`, `remove`, `move`, and `replace` operations; stale or unavailable history can fall back to a generic snapshot.

The specialized TSX form is a direct `.map` on a collection binding with one inline, synchronous, one-parameter arrow returning JSX:

```tsx
import { createKeyedCollection } from "@r3act/core";

const rows = createKeyedCollection([{ id: "a", label: "Alpha" }], (row) => row.id);

export function Rows() {
  return <ul>{rows.map((row) => <li key={row.id}>{row.label}</li>)}</ul>;
}
```

An index parameter, `thisArg`, mapper alias, or non-JSX mapper is diagnosed for a native collection map. Ordinary array maps remain generic JavaScript. Recognition of a collection map does **not** prove the row renderer or child components pure. Existing-row move/remove work has a bounded scoped preparation path; authored insert/replace and opaque row/component callbacks retain generic owner rendering.

## Tasks, resources, and transitions

`asyncTask(id, callback)` needs compiler lowering to infer dependency edges from literal `input.get("task-id")` and `input.get("$external")` reads. Supported declarations are direct module-level variable initializers or direct entries in a module-level array initializer, with an inline callback and identifier input parameter. A literal dependency array in `asyncTask(id, ["dependency"], callback)` is the explicit-edge form. Aliased helpers or input reads, dynamic keys, undeclared reads, reserved IDs, and dependency cycles are diagnostics. The inferred graph describes dependencies; it does not prove callback purity or run arbitrary CPU work in parallel.

`AsyncResource` and `use(...)` provide owner-aware pending and rejection behavior. `NativeTaskTransitionQueue` can prewarm a task graph, restart affected live-input branches, reuse completed unaffected branches, and submit a grouped accepted result to native roots. Its [compiled execution fixture](../compiler/native_task_transition_execution_test.mjs) covers that bounded path; it is not a general promise that every async host update or reveal is scoped.

### Closed-resource host leaf

The compiler can emit an internal closed-resource host program for exactly this component shape: one `const value = use(props.resource)` (or a parameter destructuring exactly one prop), followed immediately by `return <div key="stable-key" data-kind="ready">{value}</div>`. The `div` needs a literal, nonempty key; any additional attributes must be unique literal `data-*` names with finite primitive values. The sole child is the resource value expression. The function has no other statements or hooks. Callbacks, component children, styles, events, refs, spreads, getters, extra props reads, JSX whitespace children, and entity-bearing string attributes do not qualify. Unsupported shapes still use the ordinary render path; authors do not assert purity through public function metadata.

Construct the resource once outside the component and pass the same direct handle as its prop:

```tsx
import { AsyncResource, Suspense, use } from "@r3act/core";

const resource = new AsyncResource(Promise.resolve("ready"));

export function Ready(props: { resource: AsyncResource<string> }) {
  const value = use(props.resource);
  return <div key="ready-host" data-kind="ready">{value}</div>;
}

export function App() {
  return <Suspense fallback={<div key="ready-host">loading</div>}>
    <Ready resource={resource} />
  </Suspense>;
}
```

The compiler also emits schema 2 for a finite keyed intrinsic subtree over that one direct resource read: DOM `div`/`span`/`output` with `data-*` props, or Three `group`/`mesh` with `name`, visibility and transform-axis props. Expressions use the captured primitive resource, literals and supported finite operators; calls, captures, arbitrary property reads, components, spread, events, refs and styles decline. Every host needs a unique literal key. Use expression containers for text; raw JSX text, including whitespace between children, is outside this closed subset. The program is bounded to depth 32 and 256 host/text nodes. Schema 1 retains its original single-`div` behavior.

Scoped reveal requires an already accepted initial fallback with one static keyed intrinsic root whose key matches the primary; its host tag may differ. Static fallback component owners may have state and activation effects. Acceptance retires those owners and pending local work, revokes their setters and then cleans up their effects. Fallback Store readers, nested boundaries/collections, prop bindings, refs, events and styles use generic reconciliation. New ready output must evaluate to permitted primitive props/text; nonfinite numbers, mutable objects, undefined results and `true` text decline.

The resource prop must be the direct canonical `AsyncResource` observed at the boundary, fulfilled at admission. Subclasses and overridden read/status/version behavior decline without calling authored resource getters. Raw Promises and arbitrary thenables remain generic. Exact component revision, owner/slot identity, resource version and mounted writer/subtree footprint govern the scoped delta, which patches current accepted state; complete tree/cache replacements keep whole-root guards. An unrelated Store-pending branch may retain its accepted UI while this boundary reveals. Partial host failure preserves old managed accepted history and quarantines the domain; it cannot roll back arbitrary physical writes. Cleanup errors after successful publication do not undo acceptance.

The [resource-subtree gate](../implementation/2026-10-18-resource-subtree/verification/gate-results.md) passes 904 runtime tests and actual compiled DOM/Three execution. See the [finite runtime contract](../src/closed_resource_host_program.ts), [compiled fixture](../compiler/fixtures/native-resource-subtree.tsx) and [source/evidence limits](../implementation/2026-10-18-resource-subtree/results.md).

## Explicit scoped transactions

`ComponentStateRoot.prepareTransaction({ cells, collections, stores })` prepares one candidate using the **complete joint input-cell set**, selected pending keyed collections and optional selected numeric Stores. Any nonempty supported subset is allowed; omitted `stores` defaults to an empty list. `NativeRootWorkQueue.enqueueTransaction` submits that shape across roots. The retained-cell, Store-prop and existing-row move/remove cuts share one publication and preserve selected ownership when their guards hold. Pure moves preserve Store-reading rows without replay; Store-reading or nested-row removal/replacement uses generic reconciliation for lifetime and reader retirement. A selected owner cannot be removed by that cut. Whole-tree and cache replacements retain whole-root version guards; if the scoped proof is unavailable, use generic preparation. The group coordinates managed accepted state, while custom host setters can still observe intermediate writes. Cross-host visual atomicity is not claimed.

Optional public host property descriptions report observed value and resource ownership policies. The base DOM host now describes style and known string/attribute branches as `copy`, function event listeners as `retain`, and generic property assignment as `unknown`; subclass and instance setter overrides remain `unknown`. DOM descriptions report no resource ownership because that host has no resource lifetime contract. Three descriptions can name owned, borrowed, or shared-owned targets and values. Every description permits throws and is descriptive only: it does not prove callback purity, admit a scoped cut, or enable a new writer. DOM parity conformance is included in that consolidated gate.

`prepareStores(stores)` prepares all accepted consumers of selected direct numeric Stores when every consumer has a compiler-emitted closed host program. `enqueueStores({ id, roots: [{ root, stores }] })` declares the same cut across native roots. The source subset is one to eight unconditional `const value = use(props.store)` statements (or direct destructured props), followed by a keyed, childless `div`/`output` with primitive `data-*` expressions, or a Three `mesh`/`group` with transform-axis/visibility expressions. Schema 1 represents one input; schema 2 represents an ordered tuple of two to eight inputs. Expressions may use those numeric values, literals and finite primitive operators; calls, property reads, other hooks, effects, refs, events and styles decline. Use expression containers for attributes in this subset, including literal values. Selecting position also captures camera when a selected consumer reads both; a later camera change invalidates that candidate. Unrelated camera-only consumers do not join the position cut. Every accepted reader of each selected Store must qualify. Closed preparation invokes no authored component, selector or reducer. Custom Store behavior and projections requiring transition replay use generic preparation.

Ordinary `flush()` can publish changed eligible Store outputs beside an observed pending resource, then leaves unrelated notifications for conservative retry. An opaque additional consumer of the selected Store makes that cut ineligible. Selected roots retain separate accepted histories; disjoint leaf cuts merge against current caches, while overlapping leaves and stale code invalidate preparation. Whole-tree guards remain. The [Store-host consolidated gate](../implementation/2026-10-18-store-host/verification/gate-results.md) passes 870 runtime tests and actual compiled DOM/Three execution; the sole bounded Store comparison was slower for Native (1.7/0.5 ms).

Multiple ready supported boundaries drain through fresh independent receipts in one flush, including across roots sharing resource handles. Declined targets retain generic invalidation without an immediate retry loop; unrelated pending cell/collection changes can conservatively defer the drain. Each receipt has its own acceptance and partial-failure outcome; a later failed receipt cannot undo an earlier accepted sibling. The finite subtree subset above governs each reveal; raw thenables and unsupported boundaries retain generic rendering.

Ordinary `flush()` can also publish pending closed numeric prop inputs while an unrelated observed resource is waiting. Every pending local cell must be covered by the existing closed programs; opaque, incomplete or collection-bearing batches use the conservative route. No explicit retained candidate is needed for this bounded case. Actual authored DOM `data-level`/opacity and Three `position-x` fixtures pass in the [838-test boundary](../implementation/2026-10-18-urgent-retained/verification/gate-results.md). This does not infer arbitrary transaction groups or relax full-tree replacement checks. Direct `update(newTree)` retains the latest desired tree and observed Store leases if its full candidate blocks; accepted UI stays separate. Resource, Store and new World actions wake retries. An older prepared full replacement becomes stale when a newer request appears; a later accepted full replacement supersedes its captured request. Scoped deltas decline while this whole-tree intent is pending. Three stale attempts without an actual resource wake report an error instead of silently waiting forever. HMR, disposal and terminal failure cancel the request; postpublication effect errors do not undo acceptance. Calls during host/publication callbacks still obey the existing barrier. The [direct-intent gate](../implementation/2026-10-18-direct-intent/verification/gate-results.md) includes actual compiled Root execution, not a new React DOM bridge run.

## Diagnostics, fallback, and bridge boundary

| Outcome | Examples |
| --- | --- |
| Compiler diagnostic | Unsupported hook declaration/position, malformed native collection map, dynamic inferred task read, qualified native `Suspense`. Correct the authored form. |
| Generic native path | Ordinary arrays, expressions not proven as retained numeric bindings, opaque row/component callbacks, authored collection insert/replace, closed-resource forms or values outside the finite subset, and a scoped candidate whose guard cannot hold. Correctness does not depend on selecting the fast path. |
| React bridge | `createReactNativeRootAdapter` renders a React-owned `div` containing one native DOM root. React's committed props update the native component without resetting that root. React owns the outer commit; context, refs, portals, and React lifecycle semantics do not cross into the native subtree. A compatible React peer is required. |

An edit to a compiled native module invalidates its revision and currently triggers a full-page reload. State-preserving HMR is not provided. The `@r3act/vite` tarball bundles a compiler executable for its build machine's OS and CPU. On another platform supply a compatible binary through `nativeModulePlugin({ compilerBinary: "/path/to/compiler" })`; the JavaScript package itself has no platform install restriction. See the [integration guide](../native-package-integration.md) for the exact local tarball setup.

The executable contract is implemented in [native runtime API](../src/native_runtime_api.ts), [owner runtime](../src/component_state_runtime.ts), [collection](../src/keyed_collection.ts), [Rust lowering](../compiler/oxc-spike/src/main.rs), and [Vite integration](../compiler/vite_native_module.ts). The [compiled state](../compiler/fixtures/native-state-positive.tsx), [collection](../compiler/native_collection_execution_test.mjs), [store](../compiler/native_store_execution_test.mjs), and [resource](../compiler/native_resource_execution_test.mjs) fixtures exercise representative forms.


The [joint-input boundary](../implementation/2026-10-18-joint-inputs/results.md) verifies actual Rust/OXC output and grouped DOM/Three execution, including mixed Store/local/keyed cuts, stale joint reads, newer actions, owner reuse and reader retirement. It establishes the supported semantic subset; its one browser observation was slower than React Compiler and supplies no speed or presentation qualification.
