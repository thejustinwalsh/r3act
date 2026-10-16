# Async DAG frontier study: no-wait branch discovery

**Status:** protocol draft; no new data collected  
**Purpose:** test whether compiler/runtime graph planning removes branch waterfalls and makes async dependencies inspectable, while matching a React implementation with equal preload knowledge.

## Why this is the next gate

Experiment AG already compared the OXC task DAG with React `startTransition` + Suspense when React's profile and feed requests were prewarmed together. It verified old-view retention, keyed identity, and output parity across 20 pairs, but completion latency was nearly equal: 118.7 ms React vs 118.0 ms runtime at the median. That is the correct result when both sides already know how to launch independent work together. It does not test a mixed branch graph, request start order, readiness propagation, or whether the runtime can find independent work without hand-written preload orchestration.

This study asks two narrower questions:

1. Does the compiled graph start every currently-ready async branch without awaiting a sibling, while never starting a task before its required input is ready?
2. Can that graph-planned arm approach a React implementation with explicit equivalent preloading, while outperforming a sequential-loader control?

The expected product benefit is automatic dependency planning and a shared, inspectable schedule. A win over the waterfall control alone is not evidence that the runtime is faster than idiomatic, prewarmed React.

## Fixture DAG

Use a versioned route candidate with these inputs and tasks:

```text
known route/user inputs
   ├── profile request ──┬── profile summary ──────────┐
   │                     └── profile-dependent labels ─┤
   ├── feed request ──────── feed annotations ─────────┤── reveal group
   └── recommendations request ────────────────────────┘
```

`profile`, `feed`, and `recommendations` have known request keys and can start from the initial snapshot. `profile summary` and profile-dependent labels require profile output. `feed annotations` requires both profile and feed. Each task returns a value to a candidate-local result map; none mutates the host. A reveal group publishes the prepared route model together, keeping the previous committed view mounted while tasks are pending.

Use deterministic server endpoints with controlled completion delays and per-request IDs so browser request-start and response-complete times are recorded. The DAG contains both parallel work and a genuine dependency chain. Thus the feed and recommendation branches must proceed while profile is pending, but profile-dependent tasks must wait. Do not use a timer-only mock as the primary evidence; retain it only as a unit-level diagnostic.

## Arms

1. **React, sequential loader control:** a route loader explicitly awaits one request before starting the next. This is a deliberately serial control, not the performance ceiling; it represents a waterfall failure mode the graph is intended to remove, not a claim about all React code.
2. **React, explicit preload:** an event/route action starts every request whose key is known, caches its promise, and passes the same promises to the transition. It explicitly schedules profile, feed, and recommendations concurrently, then starts profile-dependent tasks when profile resolves. This is the optimized equal-knowledge ceiling.
3. **Compiled DAG:** the OXC-emitted plan identifies task dependencies; the runtime launches the ready frontier with a preregistered concurrency cap, records readiness and task events, and commits the reveal group after all required results are ready.

All arms use the same route inputs, endpoint data, delay schedule, visible prior UI, output structure, keys, and reveal policy. React uses React Compiler and a Suspense boundary inside a transition. The task DAG and preload plan are declared once in study fixtures and checked against the same expected dependency graph.

## Required event trace and metrics

Capture monotonic timestamps for transition start, each request start/finish, each derived task start/finish, candidate-ready time, and host commit. Also record request count/bytes, task count, cancellation, cache hits, visibility, key identity, stale-result rejection, and output parity.

Report at the page-pair level, not treating individual tasks as independent replications:

- start gap among initially independent requests;
- whether every initially-ready task started before any unrelated request completed;
- dependent-task start lag from the final prerequisite completion;
- completion-to-commit critical-path latency;
- urgent input-to-visible latency while the candidate is pending;
- work started, reused, cancelled, and wasted after supersession;
- correctness of the dependency and publication trace.

Do not call request overlap “parallel JavaScript.” The requests are concurrently in flight; CPU callbacks remain serial unless a separately measured worker arm is added. Do not treat request start time or commit time as presented-frame smoothness.

## Preregistered decision rules for the first run

Before collection, freeze the fixture, build, endpoint delays, order schedule, and source hashes. Use 30 fresh page blocks; each block runs all three arms once, and each of the six possible arm orders appears five times. The page block is the replication unit. Run in a visible production browser build and preserve every scheduled page, including outliers.

Correctness requires all arms to produce identical final output; retain the old view and keyed nodes while pending; never start a hard-dependent task before all inputs settle; start independent tasks without waiting on each other; commit one consistent target version; and reject results from a superseded candidate.

The scheduler mechanism passes if the DAG arm starts its three initial independent requests within one animation-frame interval in at least 95% of page blocks, starts each dependent task within 16.7 ms after its last prerequisite settles in at least 95% of page blocks, and never violates a hard edge. The useful-latency criterion is a paired median DAG completion time at least 20% below the sequential-loader control. The fair-baseline criterion is DAG p95 completion no more than 10% above explicit-preload React. If it only passes the mechanism and sequential-control comparisons, report improved orchestration and waterfall avoidance, not React speed superiority.

If task costs approach timer resolution or endpoint timings fail calibration, report the mechanism trace and mark latency inconclusive. A second physical device is needed before generalizing beyond the tested browser profile.

## Explicit speculation is a separate follow-up

This first study starts only requests whose keys are known from the current snapshot. It does not fetch guesses. A later study may let a task declare predicted inputs for speculative work. That experiment must compare the latency gain with extra requests/bytes, cancel-on-supersession, cache pollution, and stale-result rejection. A dependency whose required value is genuinely unknown cannot be made ready by the scheduler; prediction is an explicit product policy with a measurable cost.

## Scope and interpretation

This does not test workers, CPU work stealing, partial/progressive reveal, server streaming, hydration, or arbitrary async reads hidden in imperative code. It tests a compiler-visible task DAG and a single coherent reveal group. If this gate passes, the next study should vary reveal policy and cancellation under urgent input. Worker execution remains a separate question about pure CPU nodes, immutable snapshots, transfer costs, and host-thread commits.
