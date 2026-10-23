# React timing and mechanism research

User direction, 22 October 2026: freeze r3act implementation until the timing and mechanisms behind React's advantage are understood; research first, then give the evidence to Astra for a solution. This supersedes automatic implementation successors. Production runtime/compiler/hosts, frozen consumer sources/assets and historical evidence remain unchanged. Research drivers, source inventories, diagnostic records and reports are permitted work for this task.

The latest completed product slice is9759a0b; documentation audit is30c39ffa8. Current source audits cover capabilities, not the cause of the speed gap. The latest sole descriptive result loses all four parity metrics and has disclosed concurrent Git activity; no favorable rerun or new qualification verdict replaces it. Exhausted Recording A concerns the different archived dense DOM workload and stays exhausted. This research concerns the existing installed 256-object Three comparison.

## Questions to resolve

1. What exactly does the pinned React Compiler cache, and which computations/components/host writes still execute per frame?
2. Where do external-store notifications, synchronous lane scheduling, Fiber traversal and R3F diff/apply work occur inside the timed call? Does any required work escape the interval?
3. Which r3act public-frame path actually executes? Distinguish `prepareStores`/explicit group publication from the internal immediate `flush` path and its terminal proof counters.
4. What costs are observed inside matched update intervals, rather than navigation, inspection, rendering/readback or teardown? Separate sampled CPU evidence, source work counts and causal wall-time attribution.
5. Which architectural work is avoidable while retaining exact acknowledgement, newer actions, root histories, live checks and resource lifetime? Astra must receive evidence and explicit unknowns before selecting a solve.

Sol medium owns disjoint React and Native source traces. Luna inventories timing evidence and, only after primary protocol review, may run a bounded headless diagnostic over frozen built assets. Primary reviews bindings and timing scope, gathers official upstream sources, and dispatches Astra high after evidence integration. No product implementation is authorized by a research recommendation.

## Official documentation context

[React Compiler introduction](https://react.dev/learn/react-compiler/introduction) describes caching calculations and JSX to skip repeated work, including cascading child renders. Its memoization is local to a component/hook invocation, not shared across different instances. Actual emitted pinned code is the authority for this scene.

[useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore) requires immutable/cached snapshots and compares with Object.is. External-store mutation can force a blocking update; it does not automatically acquire transition semantics. The pinned benchmark's flushSync path and runtime code determine its actual schedule.

[R3F v10 scheduler](https://r3f.docs.pmnd.rs/next/frame-loop) and [migration guide](https://r3f.docs.pmnd.rs/next/migration/v10) distinguish its frame-loop scheduler from React component reconciliation. Current web documentation may postdate10.0.0-alpha.6, so it provides context only; the installed alpha source is authoritative. No docs page can explain our measured milliseconds by itself.
