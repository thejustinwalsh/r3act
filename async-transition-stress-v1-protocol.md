# Async transition stress fixture v1

**Status:** executable browser fixture exists; design target only. It has not
been typechecked, run in a browser, compared with React, or measured as evidence.

## Question

Can one shared action log keep optimistic input responsive while independent,
timer-backed transitions overlap on the same root and on forked roots, without
replacing already revealed UI with an ancestor fallback?

## Example

The fixture is a small activity feed with two mounted roots: a workspace and a
forked inspector. They share one `AsyncStore` but project and commit state per
root. Initial loading has one visible startup placeholder. After that first
commit, the visible roots stay mounted while background work is pending.

The controls drive three kinds of work:

- **Optimistic likes:** an urgent action appears immediately. A simulated server
  acknowledgement settles on a timer; every fifth action rolls back.
- **Overlapping transitions:** timer results append feed entries under distinct
  transition IDs. Delays vary so later work can finish before earlier work.
- **Fork-only work:** a transition initially targets only the inspector root;
  the workspace continues to show its own projection until the transition
  closes and becomes generally visible.

The timer loop starts a new transition every 520 ms, with each transition
resolving after a different delay. This makes overlap routine rather than a rare
race. Users can continue clicking optimistic actions while the timers are live.

## Target invariants

1. The startup placeholder appears only before the first useful render.
2. No root-level fallback appears after startup; pending state is local status
   text while the last committed content remains visible.
3. Every root render reads one pinned store snapshot and validates it before
   patching its retained VDOM.
4. Urgent optimistic actions remain visible while transition actions are
   pending. A rollback removes only its own optimistic action.
5. Overlapping actions preserve dispatch order in the shared log even when
   their timers resolve out of order.
6. Forked roots may temporarily show different valid projections. When a
   transition targets multiple roots, their commits happen in one synchronous
   task; no frame may show a half-committed group.
7. Input remains usable during pending work. Track input-to-next-frame latency,
   long tasks, committed root versions, retained node identity, pending count,
   fallback insertions, and optimistic rollbacks.

No latency threshold is preregistered yet. First run the fixture to validate
that it creates the intended overlap and state traces; then set a budget and
freeze the workload before collecting performance evidence.

## What this fixture currently exercises

`async-transition-stress-v1.html` uses the real action-log store and retained
DOM VDOM roots. Timer callbacks finish store transitions; root reads use
`beginRender`, `validate`, and commit-published selector history. Optimistic
updates go through urgent store dispatch. The page records interaction frame
latency and observes fallback insertions after startup.

This version intentionally renders each root synchronously from its store
projection. It is a stress fixture for action ordering, optimistic rebasing,
and root snapshots; it does not yet test the async task scheduler or an
implemented Suspense/error-boundary system.

## Blocking runtime gap

The current `TransitionCoordinator` supersedes a pending candidate when a new
candidate targets an overlapping root. `AsyncVDOMTransitionPlan` also accepts
only one transition ID per store/root candidate. Therefore the runtime cannot
yet prepare and commit multiple independent async candidates concurrently on
the same root. The fixture can expose store behavior during overlap, but it
does not prove concurrent candidate scheduling. The product implementation
needs a root work queue that can retain several pending DAGs, merge/rebase ready
actions against the latest pinned root snapshot, and commit a valid subset
without canceling unrelated work. Forked roots should share action identity and
dependency results while keeping independent reveal and commit state.

## Next evidence gate

Run the page in a visible browser, capture a fixed-duration trace with the timer
loop enabled, and verify the invariants before adding a React comparison. Then
add a React arm with equivalent timer schedule and optimistic rollback rules.
Report interaction latency and frame presentation separately from transition
completion latency. A passing screenshot or a low update-to-commit number alone
does not establish responsiveness or absence of fallback flashes.
