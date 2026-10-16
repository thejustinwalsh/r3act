# Async store: porting the real semantics

**Status:** action-log prototype has a root-pinned read snapshot and async VDOM
precommit validation; neither behavior nor integration has been tested yet.  
**Source designs:** `react-use-store` userland implementation and the local
React fork's `use-store-queue` branch.

## The correction

The store model is not a generic MVCC snapshot layer with speculative writes.
The relevant work already exists in two forms on this machine. The userland
store maintains chronological and currently visible folds and handles urgent
rebasing. The React fork keeps an action log and projects it for each root's
pending lanes, with reducer replay after skipped actions. The runtime should
port that update-ordering contract, not substitute a new conflict protocol.

This implementation is the basis for the next Gate C work. It is a small
host-independent action-log store, not yet wired into every async VDOM path and
not a performance claim. The source implementations remain the semantic
reference:

- `/Users/tjw/Developer/react-use-store/.claude/worktrees/remote-version-compare-deferred-ff9384/packages/use-store/src/createStore.ts`
- `/Users/tjw/Developer/react-use-store/.claude/worktrees/remote-version-compare-deferred-ff9384/packages/use-store/src/useStore.ts`
- `/Users/tjw/Developer/react/packages/react-reconciler/src/ReactFiberStore.js`
- `/Users/tjw/Developer/react/packages/react-reconciler/src/__tests__/ReactStoreTransition-test.js`

The React fork's local `use-store-queue` branch has two commits ahead of its
origin tracking branch at the time this was inspected. Preserve that work; this
runtime implementation is a separate adapter, not a change to the React PR.

## Runtime contract

`createAsyncStore(initial, reducer?)` has a chronological head and an action
log. A dispatch is either urgent or explicitly tagged with a transition ID.
Transition scopes name the roots that may keep showing their previous state.
`getState()` returns the chronological head; `getStateForRoot(root)` returns
what that root may currently show. A candidate may include its own transition
actions while it prepares.

An urgent action is applied to the chronological head and to every root's
visible projection. If an earlier transition action is still hidden from a
root, later visible actions are replayed with the reducer over that root's
projection. Thus a route transition followed by an urgent “like” shows the
like on the current route and retains it when the route catches up. This is
React's update ordering problem, not a merge of arbitrary concurrent objects.

Roots advance independently when their transition commit succeeds. When the
runtime explicitly coordinates several root host commits, it can call
`commitTransition` for each root in the same synchronous commit batch. Store
semantics do not require all roots in an application to commit atomically.
Abandoning a root candidate releases that root to catch up to the action log;
it does not erase already-dispatched actions.

Promise values remain ordinary store values. The store does not unwrap, adopt,
or suppress promise rejection. A host read can pass a promise to its Suspense
mechanism. Promise-valued state can be replaced inside a transition to retain
the old content; when urgent edits must remain visible while refetching, keep
resolved data as the state and represent pending work separately or fold edits
over the promise as in the userland fetching example.

Selections are derived read nodes. A root calls `beginRender(rootId)` once and
all of its readers use that `StoreRenderSnapshot`. They therefore select from
the same captured projection even if a dispatch occurs between component
reads. The renderer checks `validate()` immediately before host mutation and
discards/rebuilds a stale candidate; it publishes per-reader selector history
only after the host commit succeeds. Async VDOM candidates get one snapshot per
declared store and root, and the coordinator validates the complete set before
patching any participating root.

This is a per-root consistency guarantee. Roots can intentionally show
different committed versions while a transition is pending; the design does
not globally freeze every root whenever any store changes. Stores read by a
candidate must be declared in its read set so their snapshots are captured
before tree construction. The guarantee also depends on immutable state values
or reducers that do not mutate previously captured objects. A single derived
selection can currently chain within one store; a selector that composes sources
from multiple stores is not supported yet, even though a candidate can pin and
read multiple stores independently.

The initial implementation is in [`src/async_store_runtime.ts`](./src/async_store_runtime.ts).
An async VDOM plan can carry the same transition ID; its tree builder receives
those IDs so it can read the candidate projection, and the coordinator advances
the participating store roots in the same synchronous host commit:

```ts
const transitionId = "navigate:profile";
store.beginTransition(transitionId, ["app"]);
store.dispatch({ type: "navigate", to: "profile" }, {
  kind: "transition",
  transitionId,
});
// In buildTree, read all components through the same root snapshot:
const snapshot = context.storeSnapshots.get(store)!;
const route = snapshot.read(store, "router");
const title = snapshot.read(store.select((state) => state.title), "page-title");
```

Urgent events omit the transition option. They update the chronological head
and each root's current projection, replaying after any hidden transition
action. `AsyncVDOMTransitionRuntime` calls `finishTransition` and
`commitTransition` at the prepared host commit. If preparation is abandoned,
the runtime closes the transition and releases its roots so queued actions do
not remain hidden forever.

## Remaining implementation and validation gates

1. Exercise the integrated path and define automatic retry/rebase behavior when
   the coordinator rejects a stale store snapshot.
2. Port the userland/core cases into this runtime: urgent action during a held
   transition; two updates to the same state in dispatch order; a reader/root
   joining while work is pending; superseding work resolving late; and
   promise-valued state through a Suspense boundary.
3. Verify per-root subscriptions and that urgent listeners read the rebased
   visible projection while transition readers can opt into their candidate.
4. Check selector identity, previous-value chains, same-source no-op dispatch,
   cancellation/release, and log compaction.
5. Compare against the React fork using equivalent scheduling and assertions.
   Keep correctness runs separate from browser latency measurements.

The React fork and userland repo already have substantial tests for these
semantics. Use them as the behavioral inventory; do not claim that this smaller
runtime passes them until a differential harness actually runs. This
implementation does not yet provide Fiber lanes, hydration, server `use()`,
cross-store transactional snapshots outside a declared candidate read set, or
automatic retry after stale-snapshot rejection. The `useSyncExternalStore`
comparison target is its consistency check and synchronous rerender fallback
when the external snapshot changes during a concurrent render. In the inspected
React fork, this check happens before commit; the fallback renders synchronously
to block further interleaved mutations. This prototype's proposed contract is
to validate a pinned root snapshot before commit and discard/rebuild stale
candidates; it does not claim that React literally suspends on every mismatch.

## Product decision

The key primitive is action ordering over a root's visible state. It lets
transitions hold a candidate while urgent actions continue to land on what the
user sees. The store is also a read-time dependency source for selections and
the async task DAG. This is the useful connection to the runtime's ECS/DAG
model: action writes are shared input data, and compiled read sites can select
which derived regions become dirty. Worker execution and streamed state remain
separate questions.
