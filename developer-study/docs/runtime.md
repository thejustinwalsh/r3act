# Compiled JSX runtime task reference

This guide describes the APIs available in the runtime study arm. The task
build uses the repository's OXC compiler and the JavaScript component-state and
retained-VDOM runtime. The harness owns the root and the action sequence.

## APIs in the starters

- `useState(initialValue)` and `useEffect(setup)` are recognized by the task
  compiler even though the starter uses familiar imports from `react`. The
  compiler lowers these call sites to the runtime's owner-aware state and
  effect sites; this arm does not render through React.
- A component's call sites have stable compiler identities. A state site's
  value belongs to its component owner. The owner's JSX `key` preserves that
  owner when sibling order changes.
- A compiled state call site may appear in conditional control flow. When a
  state site is absent for a render, its owner's stored value remains available
  if that site becomes active again. Each static call site must remain
  unambiguous in the source.
- `useEffect(setup)` registers an active effect site. Setup runs after commit;
  cleanup runs when that site becomes inactive or its owner is removed. It has
  no dependency-array argument and does not re-run merely because another
  owner site rendered.
- The compiler records which derived regions read each input. A changed input
  can update its dependent region while an unrelated region keeps its host
  identity. Keep calculations pure and express output with JSX.
- A JSX `key` gives a child stable identity among siblings. Use stable item IDs
  when filtering or reordering rows.

## Host output

The retained VDOM host creates and updates ordinary DOM elements for this task.
Intrinsic JSX tags, event handlers, `className`, and `data-*` props use the
starter's normal JSX/host path. Do not change the harness mount or mutate its
DOM directly.

## Build and check

Start with the unscored warm-up: run `deno task developer-study:warmup:build`
and open `/developer-study-warmup.html?arm=runtime&check=1`. For Task A, run
`deno task developer-study:task-a:build` and open
`/developer-study-task-a-check.html?arm=runtime&run=1`. For Task B, run
`deno task developer-study:task-b:build` and open
`/developer-study-task-b-check.html?arm=runtime&run=1`. Each task build runs
the OXC compile step before building the browser check. The facilitator
prepares the local HTTPS preview. After editing a starter, rebuild the matching
task before refreshing its check page. You may run a check as often as needed;
the harness records failed runs and time to the first passing run.
