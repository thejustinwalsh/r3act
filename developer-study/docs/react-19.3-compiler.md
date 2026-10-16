# React 19.3 + React Compiler task reference

This guide describes the APIs available in the React study arm. The task build
uses React 19.3.0, React DOM, and React Compiler 1.0.0. JSX compiles to React
elements and renders into the supplied DOM mount. The harness owns the root and
the action sequence.

## APIs in the starters

- `useState(initialValue)` stores state for one mounted component instance. Use
  the setter with a value or an updater such as `value => value + 1`.
- `useEffect(setup, dependencies)` synchronizes with an external system after
  commit. A returned cleanup runs before the effect is re-synchronized and when
  its component unmounts. Dependencies control when it re-synchronizes.
- Hook calls must stay at the top level of a component or custom Hook. They
  cannot be called conditionally or from loops. Components may be conditionally
  included in JSX; each mounted component has its own Hook state.
- A JSX `key` identifies a child among its siblings and lets React preserve the
  matching component instance when list order changes. Use stable item IDs.
- The build includes React Compiler, which can memoize pure render work. The
  Task B starter already wraps each result region with `memo`; you may keep that
  structure while editing its filter and host props.

## Host output

The task checks inspect ordinary DOM output. Intrinsic JSX tags create HTML
elements; `className`, event handlers, and `data-*` attributes use normal React
DOM prop behavior. Do not change the harness mount or mutate its DOM directly.

## Build and check

Start with the unscored warm-up: run `deno task developer-study:warmup:build`
and open `/developer-study-warmup.html?arm=react&check=1`. For Task A, run
`deno task developer-study:task-a:build` and open
`/developer-study-task-a-check.html?arm=react&run=1`. For Task B, run
`deno task developer-study:task-b:build` and open
`/developer-study-task-b-check.html?arm=react&run=1`. The facilitator prepares
the local HTTPS preview. After editing a starter, rebuild the matching task
before refreshing its check page. You may run a check as often as needed; the
harness records failed runs and time to the first passing run.
