# Native authoring reference

**Status:** private alpha, 19 October 2026. This page describes the implemented native TSX subset. The `@r3act/*` tarballs are local artifacts; the namespace is unpublished and unreserved. For installation, Vite configuration, and a fresh consumer check, use the [native package integration guide](../native-package-integration.md).

Native components use `@r3act/core` and the mandatory Rust/OXC transform in `@r3act/vite`. Configure TypeScript with `jsx: "react-jsx"` and `jsxImportSource: "@r3act/core"`. JSX helpers alone do not lower owner sites, hooks, collection maps, task dependencies, or Suspense sites. Calling an authored hook without compilation throws. `@r3act/host-dom` and `@r3act/host-three` re-export host APIs from the same core runtime graph; `@r3act/react-bridge` supplies explicit DOM migration boundaries; hooks retain their owning runtime semantics. Both migration directions are described in the [bridge reference](react-bridge-reference.md), including independent React commits and DOM-only boundaries.

## Components and imports

Declare components as named, capitalized, synchronous `function` declarations or single-declarator `const` arrows at module scope. Const arrows support block and expression bodies, including named exports. Import native hooks, `Suspense`, `createKeyedCollection`, and `asyncTask` as direct, unaliased value imports from `@r3act/core`. The compiler assigns lexical owner and hook site identities. Conditional sites are supported; repeated loops and nested callbacks are not.

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

The effect site activates when `count` becomes positive and cleans up when it becomes absent; further increments while the site remains active do not rerun its setup. The compiler diagnoses hook aliases, type-only imports used as values, hook calls in nested functions, loops or arrow parameter defaults, and unsupported mutable, async, nested or multi-declarator hook arrows. Direct JSX references to unsupported arrow declarations are also diagnosed without hooks. Ordinary non-hook JavaScript remains JavaScript; accepting an expression does not certify its callbacks or property getters as pure. Native JSX can render intrinsic elements and native components. Event handlers run as host callbacks; their captured values do not become proven closed numeric bindings.

The same counter can be declared as `export const Counter = () => { /* body */ };`. The compiler wraps the original initializer without hoisting it or changing arrow lexical `this`/`arguments`, its inferred function name, const initialization order or exports. A temporary object preserves name inference once during module initialization. Arrow owners use the same keyed identity, hook sites, revision retirement and publication model as function declarations. The same finite closed Store/resource/forwarding proofs can apply to supported const arrows. Numeric specialization additionally proves the whole function or arrow body safe to skip. It admits supported state declarations, primitive derived locals, matched activation-effect registration and finite intrinsic output; unrelated render-time helpers, getters, assignments and opaque siblings force owner rendering. An individually proven prop expression may still use a binding without granting permission to skip its owner. Arrow syntax is not a purity declaration. The [verified arrow example](../examples/arrow-components/README.md) and [initial integration evidence](../implementation/2026-10-19-arrow-components/results.md) cover generic arrows. [Closed-arrow evidence](../implementation/2026-10-19-closed-arrow-authoring/results.md) covers the finite proof extension and its limits.

Numeric owner skipping may depend on required top-level primitive props. For these compiler-proven owners, the runtime freezes its own props copy and checks actual scalar fields before installing numeric layout and skip eligibility. Caller-owned input objects and Proxies are not frozen; unowned or unsupported inputs retain generic rendering. Nested mutable prop values do not gain purity from `readonly` types or `Object.freeze`. State values used by a skipped owner must also remain primitive; later object/function values return to generic owner rendering. Do not mutate component inputs captured by an effect.

A narrow DOM event form can retain an equivalent handler closing over only its exact stable owner setter: for example `onClick={() => setCount((value) => value + 1)}`. Captured current state, props, globals, member reads, unknown calls and arbitrary custom-host callbacks do not qualify. This does not make an activation effect body pure: its setup still runs through the native postpublication activation lifecycle. A direct module-local ref binding may also remain eligible when it cannot be reassigned and the module has no direct eval; the runtime already preserves an unchanged ref by identity. Inline, imported live, props-derived or mutable refs stay generic.

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

Native `.map` lowering uses the collection's snapshot contract. Replacing collection methods is not an extension API; changed canonical methods disable scoped admission. Automatic authored insert/replace uses generic preparation because a pure mapper does not establish that its row component is pure. Supported move/remove deltas retain keyed state and host identity.

The specialized TSX form is a direct `.map` on a collection binding with one inline, synchronous, one-parameter arrow returning JSX:

```tsx
import { createKeyedCollection } from "@r3act/core";

const rows = createKeyedCollection([{ id: "a", label: "Alpha" }], (row) => row.id);

export function Rows() {
  return <ul>{rows.map((row) => <Row row={row} />)}</ul>;
}

function Row({ row }) {
  return <li data-row={row.id}>{row.label}</li>;
}
```

The runtime supplies each mapped element's collection key. Forwarding the row into a stable component avoids reading a caller-owned key property in the mapper. An explicit `key={row.id}` remains legal, but `row.id` can invoke an arbitrary getter, so that mapper keeps generic owner rendering. Freezing a caller object or adding a TypeScript type does not prove those reads pure.

An index parameter, `thisArg`, mapper alias, or non-JSX mapper is diagnosed for a native collection map. Ordinary array maps remain generic JavaScript. Skipping a collection owner requires a finite proof of its whole body and mapper, plus runtime admission of its original owned inputs. Opaque sibling output, helpers, getters and unsupported captures keep the owner generic. Recognition of a map alone does not prove the row component pure. Existing-row move/remove work has a bounded scoped preparation path; authored insert/replace with opaque component callbacks retain generic preparation. Low-level `renderCollectionAt` is a caller-declared capability; supplying its metadata is not a compiler purity proof.

## Tasks, resources, and transitions

`asyncTask(id, callback)` needs compiler lowering to infer dependency edges from literal `input.get("task-id")` and `input.get("$external")` reads. Supported declarations are direct module-level variable initializers or direct entries in a module-level array initializer, with an inline callback and identifier input parameter. A literal dependency array in `asyncTask(id, ["dependency"], callback)` is the explicit-edge form. Aliased helpers or input reads, dynamic keys, undeclared reads, reserved IDs, and dependency cycles are diagnostics. The inferred graph describes dependencies; it does not prove callback purity or run arbitrary CPU work in parallel.

`AsyncResource` and `use(...)` provide owner-aware pending and rejection behavior. `NativeTaskTransitionQueue` can prewarm a task graph, restart affected live-input branches, reuse completed unaffected branches, and submit a grouped accepted result to native roots. Its [compiled execution fixture](../compiler/native_task_transition_execution_test.mjs) covers that bounded path; it is not a general promise that every async host update or reveal is scoped.

Resources settle once. Retry by constructing a new resource outside render and passing that identity in the next tree. A revealed successful primary remains visible while a replacement waits. An accepted rejection through `Suspense`'s `error` renderer becomes the retained view for a pending retry; an older success must not reappear. Discarded candidates do not change accepted retention.

Closed resource transactions do not execute arbitrary error renderers. A rejected selection can fail its scoped preparation and release its publication hold, allowing ordinary conservative rendering to display the error. Check a queue handle's resolution separately from the visible error. Cancellation and root/queue disposal release runtime interests; they do not cancel the provider or undo dispatched Store actions. A late provider result cannot publish through a cancelled operation; a resource still referenced by domain state can independently affect that state’s consumers.

The [compiled recovery fixture](../compiler/native_async_recovery_execution_test.mjs) checks DOM/Three output, urgent Store progress, rejected selection, cancelled rendering intent and cleanup. Its second DOM consumer does not separately prove divergent fork frontiers. [Verification and comparison limits](../implementation/2026-10-19-async-recovery/results.md) distinguish generic recovery from closed-program admission.

The [forked transition example](../examples/forked-transitions/README.md) explicitly advances primary DOM/Three query projections while a DOM fork retains its older frontier. Catch-up goes through `NativeRootWorkQueue`; a task operation reuses an existing execution when converging roots have exactly matching captured inputs. A genuinely new input restarts dependent tasks, while completed independent tasks may be reused. Urgent Store actions can progress while detail work waits. Requested query and accepted detail remain visibly distinct.

Root work reports settlement through `onSettled` and its handle's `resolution`; task operations additionally expose `completion`. Grouped root work publishes accepted pointers before effects or Store subscribers. Its Store notification batch extends through candidate cleanup so another queue's subscriber can prepare after all root publication barriers release. Both effects and subscribers run before settlement; subscriber-before-effect ordering is not promised. Whole-tree guards, per-root accepted history and arbitrary-host failure rules remain. The [verified finite sequence](../implementation/2026-10-19-forked-transitions/results.md) establishes no cross-renderer visual atomicity or general speed advantage.

### Closed-resource host leaf

The compiler can emit an internal closed-resource host program for exactly this component shape: one `const value = use(props.resource)` (or a parameter destructuring exactly one prop), followed immediately by `return <div key="stable-key" data-kind="ready">{value}</div>`. The `div` needs a literal, nonempty key; any additional attributes must be unique literal `data-*` names with finite primitive values. The sole child is the resource value expression. The function or block arrow has no other statements or hooks. Callbacks, component children, styles, events, refs, spreads, getters, extra props reads, meaningful JSX text, and entity-bearing string attributes do not qualify. Empty JSX comments and ASCII indentation containing a line break produce no output and may be elided; single-line spaces/tabs, entities and non-ASCII whitespace remain significant. Unsupported shapes still use the ordinary render path; authors do not assert purity through public function metadata.

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

The compiler also emits schema 2 for a finite keyed intrinsic subtree over that one direct resource read: DOM `div`/`span`/`output` with `data-*` props, or Three `group`/`mesh` with `name`, visibility and transform-axis props. Expressions use the captured primitive resource, literals and supported finite operators; calls, captures, arbitrary property reads, components, spread, events, refs and styles decline. Every host needs a unique literal key. Use expression containers for text; meaningful raw JSX text is outside this closed subset. Empty JSX comments and ASCII indentation containing line breaks may be elided; single-line spaces/tabs, entities and non-ASCII whitespace are not dropped. The program is bounded to depth 32 and 256 host/text nodes. Schema 1 retains its original single-`div` behavior. Resource schema 3 additionally admits literal DOM style records and Three position/rotation/scale triples over the same canonical primitive resource input. Those candidate values own stable storage; mutable resource objects and opaque expressions still decline.

Scoped reveal requires an already accepted initial fallback with one static keyed intrinsic root whose key matches the primary; its host tag may differ. Static fallback component owners may have state and activation effects. Acceptance retires those owners and pending local work, revokes their setters and then cleans up their effects. Fallback Store readers, nested boundaries/collections, prop bindings, refs, events and styles use generic reconciliation. New ready output must evaluate to permitted primitive props/text; nonfinite numbers, mutable objects, undefined results and `true` text decline.

The resource prop must be the direct canonical `AsyncResource` observed at the boundary, fulfilled at admission. Subclasses and overridden read/status/version behavior decline without calling authored resource getters. Raw Promises and arbitrary thenables remain generic. Exact component revision, owner/slot identity, resource version and mounted writer/subtree footprint govern the scoped delta, which patches current accepted state; complete tree/cache replacements keep whole-root guards. An unrelated Store-pending branch may retain its accepted UI while this boundary reveals. Partial host failure preserves old managed accepted history and quarantines the domain; it cannot roll back arbitrary physical writes. Cleanup errors after successful publication do not undo acceptance.

Closed reveal also requires element/prop objects created by JSX or runtime expansion. Freezing a manually constructed element, or wrapping an element or its props in a Proxy, does not grant that ownership. Such inputs retain generic rendering; proxied registered components and resources also retain their generic boundary, without a new freshness guarantee for hidden external state.

The [resource-subtree gate](../implementation/2026-10-18-resource-subtree/verification/gate-results.md) passes 904 runtime tests and actual compiled DOM/Three execution. See the [finite runtime contract](../src/closed_resource_host_program.ts), [compiled fixture](../compiler/fixtures/native-resource-subtree.tsx) and [source/evidence limits](../implementation/2026-10-18-resource-subtree/results.md).

## Explicit scoped transactions

The resource-transaction extension passes the [35-step consolidated boundary](../implementation/2026-10-19-resource-transactions/results.md), including actual compiled DOM/Three/fork execution. `prepareTransaction` also accepts optional `resources`; `NativeRootWorkQueue.enqueueResources({ id, roots: [{ root, resources }] })` selects a joint reveal without cells, collections or Stores. Select every resource whose supported consumers must advance together. To include other domains, pass `resources` beside `cells`, `collections` and optional `stores` in each `enqueueTransaction` root entry. See the [integration contract](../implementation/2026-10-19-resource-transactions/design.md) for current scope and verification status.

Queue submission holds the selected publication intent through resource waiting and retries. Cancellation releases it. Earlier overlapping intent serializes later work; supported independent consumers may publish while selected resources wait. Merely reading a common Store does not declare a transaction. Canonical resource and compiler closed-program restrictions still apply; arbitrary callbacks and thenables retain generic behavior. A later direct requested tree remains pending behind earlier intent and is retried afterward. Successful callbacks observe all accepted group records; custom host setters can observe intermediate physical writes.

`enqueueResources` and the other scoped operations require their closed admission proof; they do not automatically retry through full-tree reconciliation. For an unsupported input, submit a generic group with `queue.enqueue({ id, roots: [{ root, tree }] })`. That full-tree candidate keeps its whole-root guards and may wait for unrelated pending branches. Group publication finishes public validation before checking private live receipts and advancing any accepted member. See the [callback publication boundary](../implementation/2026-10-19-publication-callbacks/results.md) for the tested limits.

All scoped queue operations participate in that ordering, including Store, retained-cell and collection cuts without resources. Waiting work captures current inputs when it prepares; enqueueing does not pin a source version or own domain actions. For a state cell used in a closed prop cut, a functional event updater such as `onClick={() => setCount(current => current + 1)}` avoids a render-state read inside the callback. Captured render-state handlers retain ordinary generic rendering, including refreshed handlers after an update. The [compiled fixture](../compiler/compiled_resource_transaction_test.mjs) checks both authoring paths; its current verification status is recorded in the integration review.

`ComponentStateRoot.prepareTransaction({ cells, collections, stores })` prepares one candidate using the **complete joint input-cell set**, selected pending keyed collections and optional selected numeric Stores. Any nonempty supported subset is allowed; omitted `stores` defaults to an empty list. `NativeRootWorkQueue.enqueueTransaction` submits that shape across roots. The retained-cell, Store-prop and existing-row move/remove cuts share one publication and preserve selected ownership when their guards hold. Pure moves preserve Store-reading rows without replay; Store-reading or nested-row removal/replacement uses generic reconciliation for lifetime and reader retirement. A selected owner cannot be removed by that cut. Whole-tree and cache replacements retain whole-root version guards; if the scoped proof is unavailable, use generic preparation. The group coordinates managed accepted state, while custom host setters can still observe intermediate writes. Cross-host visual atomicity is not claimed.

Optional public host property descriptions report observed value and resource ownership policies. The base DOM host now describes style and known string/attribute branches as `copy`, function event listeners as `retain`, and generic property assignment as `unknown`; subclass and instance setter overrides remain `unknown`. DOM descriptions report no resource ownership because that host has no resource lifetime contract. Three descriptions can name owned, borrowed, or shared-owned targets and values. Every description permits throws and is descriptive only: it does not prove callback purity, admit a scoped cut, or enable a new writer. DOM parity conformance is included in that consolidated gate.

`prepareStores(stores)` prepares all accepted consumers of selected direct numeric Stores when every consumer has a compiler-emitted closed host program. `enqueueStores({ id, roots: [{ root, stores }] })` declares the same cut across native roots. The source subset starts with one to eight unconditional `const value = use(props.store)` statements (or direct destructured props), followed immediately by supported intrinsic JSX. Schema 1 represents one input and schema 2 represents two to eight inputs into a childless `div`/`output` or Three `mesh`/`group`; schema 3 additionally supports literal DOM style records and Three position/rotation/scale triples, including `span` style output. Tuple literals are stabilized by the compiler before their first host write. Generic mutable old tuples remain conservative.

Expressions may use captured numeric values, literals and finite primitive operators. Calls, arbitrary property reads, other hooks, effects, refs, events, spreads and mutable captures do not qualify. Leaf attributes use expression containers, including literal values. Selecting position also captures camera when a selected consumer reads both; a later camera change invalidates that candidate. Unrelated camera-only consumers do not join the position cut. Every accepted reader of each selected Store must qualify. Closed preparation invokes no authored component, selector or reducer. Custom Store behavior and projections requiring transition replay use generic preparation.

### Fixed Store host subtrees

Schema 4 supports a fixed keyed tree of DOM `div`/`span`/`output` or Three `group`/`mesh` nodes, including zero-prop containers. Every host needs a unique literal key, and mounted keys must resolve unambiguously within the root. Props use the same primitive, style-record and tuple forms; Three trees also permit closed `name` expressions. Text children use expression containers and must evaluate to string or finite number values. Use `{value}` or `{"label"}`; raw JSX text and whitespace children remain generic. The tree is bounded to depth 32 and 256 total host/text nodes, with at most 32 props or style fields per host/value.

```tsx
import { createStore, use } from "@r3act/core";

const position = createStore(1);
const camera = createStore(2);

export function Scene(props: { position: typeof position; camera: typeof camera }) {
  const x = use(props.position);
  const y = use(props.camera);
  return <group key="scene"><mesh key="mesh" position={[x, 0, 0]} /><mesh key="outline" position={[x, y, 0]} /></group>;
}
```

Scoped updates retain existing containers, hosts and text nodes. They validate exact child order, owner/code/read versions and prop/text writer identity; topology changes, component children and absent boolean/null text use generic preparation. Independent accepted cuts may intervene when those footprints remain valid. Selected caches merge into the current view; full replacements retain whole-root guards. A partial host failure preserves old managed accepted history and quarantines the domain, while physical writes may already have occurred. Resource ownership and declared transaction groups keep their existing contracts. See the [finite Store program](../src/closed_store_host_program.ts) and [actual compiled subtree fixture](../compiler/compiled_store_host_subtree_test.mjs).

### Structured Store projections

Schema 5 supports static numeric field paths from direct Store reads in the same fixed host trees. Construct every record traversed by a closed path with `storeRecord`:

```tsx
import { createStore, storeRecord, use } from "@r3act/core";

const scene = createStore(storeRecord({
  position: storeRecord({ x: 1, y: 2 }),
  camera: storeRecord({ x: 3 }),
}));

function Scene(props: { scene: typeof scene }) {
  const value = use(props.scene);
  return <group key="scene"><mesh key="mesh" position={[value.position.x, value.position.y, 0]} /><group key="outline" position={[value.position.x + value.camera.x, 0, 0]} /></group>;
}
```

`storeRecord` shallow-copies own data properties into a fresh frozen ordinary record. It rejects accessors, symbols, arrays, custom prototypes and unsafe prototype field names. It preserves property enumerability and does not freeze or copy descendants; selected nested records need their own construction. Construct records in ordinary application/domain code. Reflection on a constructor argument can invoke Proxy traps there; the resulting owned copy has ordinary data reads. A Proxy wrapped around that copy does not inherit ownership. Ordinary frozen objects, mutable objects and opaque selectors retain generic rendering, preserving their authored read behavior.

The compiler permits one to eight lexical Store reads and at most 32 numeric paths in total, each at most eight static identifier segments. A direct numeric Store can join a projected input. Optional/computed access, callbacks and unused inputs do not qualify. Paths must end in finite numbers; expression, style, tuple and tree limits remain. `use(store)` still returns the whole state unchanged. Whole-state observations and existing Store versions govern conflicts: paths are not independent field versions, and selecting a Store still requires complete accepted-reader coverage. Explicit transactions select the outputs that must publish together; arbitrary selector functions are not inferred as pure. See the [compiled fixture](../compiler/compiled_store_projection_test.mjs) and [source contract](../implementation/2026-10-18-store-projections/design.md).

Ordinary `flush()` can publish changed eligible Store outputs beside an observed pending resource, then leaves unrelated notifications for conservative retry. An opaque additional consumer of the selected Store makes that cut ineligible. Selected roots retain separate accepted histories; disjoint supported cuts merge against current caches, while overlapping targets and stale code invalidate preparation. Whole-tree guards remain. The [Store-host consolidated gate](../implementation/2026-10-18-store-host/verification/gate-results.md) passes 870 runtime tests and actual compiled DOM/Three execution; the sole bounded Store comparison was slower for Native (1.7/0.5 ms).

Multiple ready supported boundaries drain through fresh independent receipts in one flush, including across roots sharing resource handles. Declined targets retain generic invalidation without an immediate retry loop; unrelated pending cell/collection changes can conservatively defer the drain. Each receipt has its own acceptance and partial-failure outcome; a later failed receipt cannot undo an earlier accepted sibling. The finite subtree subset above governs each reveal; raw thenables and unsupported boundaries retain generic rendering.

Ordinary `flush()` can also publish pending closed numeric prop inputs while an unrelated observed resource is waiting. Every pending local cell must be covered by the existing closed programs; opaque, incomplete or collection-bearing batches use the conservative route. No explicit retained candidate is needed for this bounded case. Actual authored DOM `data-level`/opacity and Three `position-x` fixtures pass in the [838-test boundary](../implementation/2026-10-18-urgent-retained/verification/gate-results.md). This does not infer arbitrary transaction groups or relax full-tree replacement checks. Direct `update(newTree)` retains the latest desired tree and observed Store leases if its full candidate blocks; accepted UI stays separate. Resource, Store and new World actions wake retries. An older prepared full replacement becomes stale when a newer request appears; a later accepted full replacement supersedes its captured request. Scoped deltas decline while this whole-tree intent is pending. Three stale attempts without an actual resource wake report an error instead of silently waiting forever. HMR, disposal and terminal failure cancel the request; postpublication effect errors do not undo acceptance. Calls during host/publication callbacks still obey the existing barrier. The [direct-intent gate](../implementation/2026-10-18-direct-intent/verification/gate-results.md) includes actual compiled Root execution, not a new React DOM bridge run.

### Joint Store and resource inputs

The fixed host-tree program also accepts a mixture of direct canonical `AsyncResource` and Store props in the same one-to-eight lexical `use(...)` sequence. Runtime capture determines the input kind. A resource can supply a finite number directly or numeric fields through `storeRecord` values, with the same total path, expression and tree limits as structured Stores. Construct resource payload records in provider/domain code, before resolving the resource. Raw Promises, arbitrary thenables, subclasses, overridden resource behavior and unowned object projections retain generic rendering.

```tsx
import { AsyncResource, createStore, storeRecord, Suspense, use } from "@r3act/core";

const position = createStore(storeRecord({ x: 1 }));
const sample = new AsyncResource(Promise.resolve(storeRecord({ x: 3 })));

function Joint(props: { sample: typeof sample; position: typeof position }) {
  const a = use(props.sample);
  const b = use(props.position);
  return <output key="joint" data-value={a.x + b.x}>{a.x + b.x}</output>;
}

function App() {
  return <Suspense fallback={<output key="joint">loading</output>}><Joint sample={sample} position={position} /></Suspense>;
}
```

Scoped initial reveal requires a closed component, directly or through the proven forwarding subset below, as the boundary's primary child and an eligible accepted fallback with the same logical root key. Every resource needed by that output must be fulfilled; an unrelated boundary may remain pending. Accepted ancestor Store readers must be canonical and current; pending ancestor local changes decline the scoped reveal. These controls can select a different child or resource, so generic reevaluation owns that case. A separate pending whole-tree request may retain and reveal the accepted old group's output until its replacement is ready; latest-request and whole-root validation still govern replacement. An opaque wrapper around the primary uses generic preparation. Legacy single-resource programs retain their primitive/string behavior.

A Store read before suspension transfers its exact accepted reader history to the revealed owner in the same publication. A Store first discovered after suspension is captured before host work; a newer host-time action survives even before its first subscription attaches. Later selected Store updates retain the fixed host/text tree while validating all joint Store/resource inputs. Dependencies select affected consumers; explicit transaction APIs declare which outputs must agree. Field paths do not infer transaction groups. Whole-tree candidates retain their existing guards, and arbitrary host writes cannot be rolled back.

The [source contract](../implementation/2026-10-18-joint-async-inputs/design.md) and [actual compiled fixture](../compiler/compiled_joint_async_inputs_test.mjs) identify this finite subset. The [consolidated gate](../implementation/2026-10-18-joint-async-inputs/verification/results.md) passes 968 runtime tests, 61 Rust tests and actual compiled DOM/Three/fork execution. Automatic queued-scheduling regressions and an untimed repaired-build browser replay cover later live updates and teardown; the sole matched comparison timed out and supplies no performance result.

### Pure local component forwarding

The compiler may follow up to eight module-local wrapper components into a closed resource/Store host program. Each wrapper is a synchronous named function with one direct JSX return of another local named component. Its props forward direct own fields or destructured parameter names, or finite primitive literals. A literal nonempty string key is optional; an absent key follows ordinary native slot/key identity. Each wrapper retains its own owner and accepted cache, and leaf hook readers belong to the leaf owner.

```tsx
type JointInputs = { sample: typeof sample; position: typeof position };
function Forward({ sample, position }: JointInputs) {
  return <Joint sample={sample} position={position} />;
}
```

The example assumes Joint and the domain handles from the preceding section. Up to 32 unique forwarded props are supported. Spread, refs, children, callbacks, hooks, effects, branches, defaults, imported/qualified/shadowed/reassigned targets and cycles decline this proof. Direct eval conservatively disables forwarding. Raw JSX attribute strings with entities or line/tab whitespace decline; expression string literals retain JavaScript decoding. Unproven wrappers still render through generic reconciliation.

The emitted target function/site and module revision must match at admission. Stale code, removed owners, changed source inputs or revoked writers invalidate the scoped candidate. No authored wrapper is invoked during closed preparation. The [source contract](../implementation/2026-10-18-component-forwarding/design.md) and [actual compiled DOM/Three/fork fixture](../compiler/compiled_component_forwarding_test.mjs) define this subset. Consolidated Darwin verification passes 978 runtime tests, 63 Rust tests and all 21 compiled fixtures, including exact wrapper owner lineage, grouped updates, generic retry and cleanup. These correctness results do not establish a performance advantage.

## Diagnostics, fallback, and bridge boundary

| Outcome | Examples |
| --- | --- |
| Compiler diagnostic | Unsupported hook declaration/position, malformed native collection map, dynamic inferred task read, qualified native `Suspense`. Correct the authored form. |
| Generic native path | Ordinary arrays, expressions not proven as retained numeric bindings, opaque row/component callbacks, authored collection insert/replace, closed-resource forms or values outside the finite subset, and a scoped candidate whose guard cannot hold. Correctness does not depend on selecting the fast path. |
| React bridge | `createReactNativeRootAdapter` embeds native content in React; `createNativeReactRootAdapter` embeds an independent React DOM root in a native owner. Accepted props and keyed moves preserve the inner lifetime; removal retires it. Context and hook semantics stay with their runtime. Compatible React and React DOM peers are required. See the [bridge reference](react-bridge-reference.md). |

An edit to a tracked native module passes OXC parsing and Rust semantic preflight before invalidating its accepted revision and triggering a full-page reload. Rejected or superseded edits preserve the accepted app. Preflight does not cover arbitrary imported dependency syntax, runtime execution or later third-party transforms. State-preserving native HMR is not provided. The `@r3act/vite` tarball bundles a compiler executable for its build machine's OS and CPU. On another platform supply a compatible binary through `nativeModulePlugin({ compilerBinary: "/path/to/compiler" })`; the JavaScript package itself has no platform install restriction. See the [integration guide](../native-package-integration.md) for the exact local tarball setup.

Mixed applications can use `nativeReactPlugins` to derive React exclusions from native source membership. Set `reactOptions.jsxImportSource: "react"` when the project TypeScript defaults select the native JSX runtime; native modules lower their factory locally. Native revision changes retire affected pending tasks, subscriptions and effects after active host work finishes; callers still dispose accepted host trees. Unrelated known roots remain live. This uses the existing semantic-plan revision authority and does not preserve uncertain hook state across edits. The [installed HMR boundary](../implementation/2026-10-19-hmr-completion/results.md) verifies React Refresh, rejected native syntax, valid remount and cleanup against fresh packages. The [integration guide](../native-package-integration.md) describes source roots and restart policy.

Independent generic Store, local state and direct-tree work can progress during a resource-only group when the held pending Suspense subtrees remain unchanged. A canonical Store read before suspension keeps its accepted reader history even if that Store advances while unrelated work publishes. Retaining the branch does not run its selectors or acknowledge its newer values. Store root projections may already contain urgent actions while accepted reader output stays old. Opaque held readers, changed held descriptors or mixed cell/Store/collection holds conservatively defer this path. Whole-tree candidates retain whole-root validation. See the [held-reader contract](../implementation/2026-10-19-held-reader-progress/design.md); this does not establish general structural locality or visual atomicity.

The executable contract is implemented in [native runtime API](../src/native_runtime_api.ts), [owner runtime](../src/component_state_runtime.ts), [collection](../src/keyed_collection.ts), [Rust lowering](../compiler/oxc-spike/src/main.rs), and [Vite integration](../compiler/vite_native_module.ts). The [compiled state](../compiler/fixtures/native-state-positive.tsx), [collection](../compiler/native_collection_execution_test.mjs), [store](../compiler/native_store_execution_test.mjs), and [resource](../compiler/native_resource_execution_test.mjs) fixtures exercise representative forms.


The [joint-input boundary](../implementation/2026-10-18-joint-inputs/results.md) verifies actual Rust/OXC output and grouped DOM/Three execution, including mixed Store/local/keyed cuts, stale joint reads, newer actions, owner reuse and reader retirement. It establishes the supported semantic subset; its one browser observation was slower than React Compiler and supplies no speed or presentation qualification.

A named self-closing Three Store leaf such as a keyed mesh with literal name and a closed position tuple can reuse the schema-4 subtree proof when the legacy leaf grammar declines it. Successful legacy schemas retain their earlier output. Dynamic names, calls, spreads and untracked prop reads remain generic. The [installed multi-host example](../examples/installed-scene/README.md) verifies the resulting post-reveal grouped Store cut beside pending health; this is finite compiler coverage, not a general syntax or speed claim.
