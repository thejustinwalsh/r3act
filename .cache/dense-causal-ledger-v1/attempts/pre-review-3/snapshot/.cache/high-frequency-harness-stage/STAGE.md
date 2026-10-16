# High-frequency harness stage

Unintegrated harness draft only. It uses ordinary TSX components and public
`useState`/`useEffect` calls. The staged Vite config points the native arm at the
mandatory Rust/OXC plugin and runs the React arm through the React Compiler.
There is no server, build, collector, or preregistration in this stage.

The harness configures candidate rows, dirty shape, placement, and program mix
through query parameters. These are workload controls, not user-facing runtime
modes or performance claims. The shared harness computes the identical
`dirtyIds` for both arms before starting the `step` timer; `step` includes
per-ID setter dispatch and synchronous commit. DOM inspection, output checking,
identity checking, and lifecycle diagnostics run after the timer.

Each arm now owns its lifecycle counters and setter-map mutations behind
session registration callbacks. Row effects call those callbacks, keeping the
props read-only for React Compiler analysis without changing the state hooks or
rendered workload.

The harness keeps `lastFrameById` so untouched rows are compared against their
last committed values. It captures initial host nodes and checks every frame
for exact order, identity, and `x/y/rotation` output. Failed initial row-count
or ID checks stop before the frame loop. Mount timing is named
`mountAndFrameZeroInitializationMs`: it includes arm creation, mount, and the
initial state commit. It is not a separate first-update measurement.

The harness latches any transition to hidden visibility, publishes structured
PASS/FAIL/ERROR results to `window.__highFrequencyResult`, and disposes a
created controller in `finally` even when mounting, stepping, or inspection
fails. Saved setters are probed after disposal; thrown calls are counted, while
the correctness requirement is that they do not restore host rows or writers.
No direct DOM or Three-object mutation is used.

Primary review should check Rust compiler support for the staged native file's
relative import of the existing public runtime API and verify that the config's
React plugin match includes only the staged React arm. No output from this
harness is qualification evidence until a reviewed build, locked harness and
comparator, and preregistered collection exist.
