# Architecture proposal for a compiler first JSX runtime

## Decision and implementation freeze

Implementation is paused. The next engineering decision must follow a classified problem, an explanatory cost model, an explicit semantic contract, and a whole-system review. Passing tests, fewer dictionary lookups, and a faster isolated kernel are insufficient reasons to change the runtime.

The recommended direction is a **compiled incremental computation engine with retained declarative structure, versioned root views, and explicit host publication**. Keep JSX and the VDOM. Separate the semantic model from its physical execution plans. Select sparse, clustered, or dense work over shared identities and state semantics. Make ownership and callback boundaries strong enough that the compiler's proofs remove repeated interpretation from the hot path.

This direction is a proposal. It has not demonstrated the product's performance target. The final review and evidence gates below must close before implementation resumes.

The last adjacent-token patch had already been applied before the freeze. Its completed runtime suite passed 723 tests; that patch has no timing qualification. The measured baseline below is the preceding archived source. No source edits, new implementation, or browser workload are authorized by this proposal.

## Evidence and the size of the problem

The latest qualified comparison uses a frozen production build, actual TSX, native three-slot compiled programs, and React Compiler output. Thirty pages comprise five pairs at each size, with 240 measured frames per page. Independent verification passes correctness, identity, lifecycle, teardown, source/build/served-asset locks, timer floors, and gate recomputation. Both speed gates fail.

| Rows | Native / React paired median geometric mean | Median paired p95 ratio | Native time reduction required for parity | Native reduction required for a 0.8 ratio |
| ---: | ---: | ---: | ---: | ---: |
| 128 | 1.0637 | 1.0223 | 6.0% | 24.8% |
| 1,024 | 1.3224 | 1.2437 | 24.4% | 39.5% |
| 10,000 | 1.4963 | 1.0890 | 33.2% | 46.5% |

Required reductions follow from the registered paired median ratio r: parity requires a fraction 1 − 1/r; a target ratio 0.8 requires 1 − 0.8/r. They are budget calculations, not forecasts or confidence intervals. The registered strong-win gate requires two sizes, and parity requires all three. Five pairs give limited tail precision.

The timed operation is setter dispatch plus synchronous commit. It excludes dirty selection, DOM inspection, RAF waiting, paint, and presentation. These numbers establish failure for one dense DOM workload and environment. They do not measure all hosts or establish the cause. [Analysis](results/current-owner-kernel-headless-v1/analysis.json), [verification](results/current-owner-kernel-headless-v1/verification.json), [receipt](results/current-owner-kernel-headless-v1/receipt.json).

Separate CPU diagnostics cover entire pages, including mount, inspection, layout, and teardown. The native prepared-row executor and style writer are sampled hotspots; style assignment is prominent in React too. Sampling cannot currently divide the executor's self time into validation, lookup, gathering, mirroring, or staging. It does not establish their individual causal costs. [Recorded profiles and verified script sources](.cache/current-kernel-cpu-diagnostic-stage/primary-verification.json).

Two apparent simplifications have already been falsified. A later input getter can revoke a lease checked earlier, so deleting the second check can violate the no-publication boundary. Current source values also advance before each root accepts them, so deleting the root's historical source cache loses required state. These are semantic constraints to design around, not overhead to remove blindly. [Lease audit](.cache/owner-row-changed-capture-stage/audit.md), [source history audit](.cache/root-source-cache-review/report.md).

## Problem classification

| Remaining problem | Computer science class | Suitable solution families | What determines the choice |
| --- | --- | --- | --- |
| Repeated prop evaluation and binding dispatch | Incremental computation and partial evaluation | Static dependency extraction, specialized kernels, demand-driven recomputation, equality at materialized outputs | Affected sinks, fanout, callback opacity, projection and host cost |
| Work selection as dirty density changes | Physical query planning and sparse versus dense computation | Source adjacency, dirty row queues, marked tiles, dense scans over the same logical relation | Reached output density and locality, not dirty-source percentage alone |
| Expensive keyed insert/remove/move | Dynamic ordered sequences and incremental index maintenance | Direct deltas, arrays with indexes, bounded buckets, measured trees with summaries | Full-list rediscovery, rank queries, index repair, host placement cost |
| Competing current, pending, and visible values | Multi-version state and optimistic concurrency control | Root snapshots, candidate overlays, read-set validation, explicit commit groups | Required isolation, conflict policy, reentrant callbacks, retained-history cost |
| Suspense waterfalls and delayed discovery | Dependency scheduling and speculative discovery | Ready frontiers, resource manifests, guarded prefetch, critical-path priorities, backpressure | Hard input dependencies versus optional discovery edges |
| Independent transitions and forked roots | Conflict detection and versioned publication | Operation identities, write-set overlap, explicit supersession, rebase of affected derivations | Whether outputs conflict, rather than whether roots merely overlap |
| Pure CPU work competing with input | Parallel DAG scheduling and scheduling overhead | Worker tasks on immutable snapshots, chunking, bounded queues, result freshness checks | Useful compute versus transfer/startup/coordination cost |
| Native hooks, callback semantics, and compiler hints | Effects, aliasing, escape analysis, identity, and ABI design | Site IDs, keyed repeated scopes, effect classifications, controlled capabilities, conservative boundaries | Observable semantics, dependency soundness, HMR revision compatibility |
| Custom DOM/Three hosts and ecosystem adoption | Interpretation boundaries and resource ownership | Small host operation contract, typed writer capabilities, generated JSX types, scoped React bridges | Actual lifetime/event/disposal obligations and renderer semantic coverage |
| Server state, resume, and hydration | Versioned replication and deterministic reconstruction | Snapshots, ordered deltas, replay, deduplication, schema negotiation, recovery | Ownership, code revision, ordering, side effects, and concurrent writers |
| Runtime complexity and redundant mechanisms | Modular invariants and representation ownership | One writer per invariant, explicit interfaces, derived indexes, feature-specific plans | Mutation authority, transition count, invariant fanout, maintenance tasks |

These classes interact, but they are not one algorithm. A source dependency graph, component ownership forest, ordered host topology, task prerequisite graph, and publication group answer different questions. Shared entity identities can connect them without pretending they are the same graph.

Incremental computation already provides the underlying framework. Adapton's demanded computation graph separates tracked computations and their observers; differential dataflow demonstrates another model for propagating changes through declarative computations, including iteration. They supply useful concepts, not browser performance constants or a ready-made UI runtime. [Adapton](https://adapton.org/), [Differential dataflow](https://www.microsoft.com/en-us/research/publication/differential-dataflow/).

## Cost model and feasibility

Let N be live entities, U dispatched writes, S unique dirty sources, D traversed dependency edges, A unique affected projections, W actual host writes, K structural edits, R roots, and C simultaneous candidates. The cost of a committed update is:

**dispatch + coalescing + dependency selection + input capture + validation + projection + equality + host application + publication/acknowledgement + allocation/GC.**

Cold preparation and memory must be accounted for separately and amortized over actual reuse. Structural cost includes sequence maintenance, owner/binding indexes, creation/disposal, and host placement. Scheduler cost includes task discovery, queueing, stale work, cancellation, and transfer.

For sparse propagation, the target work is proportional to S + D + A plus actual writes, with shared sinks evaluated once. Dense execution is proportional to the live rows/fields it scans. Marked tiles trade a bounded amount of extra scanning for less scattered gathering. A source with one change and ten thousand subscribers can require dense output work: low S/N does not imply a sparse output workload.

For truly dense changed output, at least W host mutations must happen. A B+ tree, dependency DAG, Wasm kernel, or worker cannot make that output requirement sublinear. If the host floor exceeds the target budget, the architecture must change the host operations, reduce outputs under documented semantics, or reject the target for that workload.

Amdahl's law makes prioritization explicit. If an improvable phase occupies fraction p of total cost and is sped up by factor s, total speedup is at most 1 / ((1 − p) + p/s). Removing a phase with p below the required reduction cannot close the gap, even at zero remaining phase cost. Whole-page samples must not be substituted for p in a commit-only measurement.

Storage labels are insufficient predictions. JavaScript object shapes, JIT tiering/deoptimization, element kinds, bounds checks, GC, and browser calls determine constants. Use typed numeric columns where the compiler proves homogeneous values and loops; retain reference storage for callbacks, host handles, resources, and heterogeneous values. Do not convert the entire VDOM to parallel arrays because numeric kernels can use them.

## Recommended semantic model

### Identities and relations

Use stable entity incarnations and compiler site identities. A handle denotes an entity plus its generation; a physical row position is not its identity. A keyed move changes order without changing the entity. Removal and reuse invalidate the old incarnation. Hook sites belong to that identity; repeated execution requires an explicit keyed scope.

Represent the following relations explicitly: ownership, source-to-computation dependencies, computation-to-host outputs, ordered children, task prerequisites, and root/view participation. Static compiler relations are templates; mounting instantiates them, and conditional/dynamic reads update a versioned dependency footprint. Unknown reads are an opaque computation boundary, not an empty read set.

Pure same-epoch data dependencies must be acyclic or have an explicitly defined fixed-point semantics. Ordinary event feedback is a delayed edge into a later update epoch. Diagnose unsupported cycles rather than adding unrestricted repeated evaluation to the scheduler.

### State ownership

Keep three distinct times:

1. Latest domain state and chronological actions.
2. A candidate's captured inputs and private output/owner overlay.
3. Each root's last accepted visible view.

A shared state identity does not require every fork to display the same version. A synchronized commit group must explicitly name the roots and version frontier that must agree. Independently forked views may intentionally differ; that distinction cannot be called an accidental tear.

Every mutable fact has one authority: entity lifetime and current fields in World; accepted view/version in the root projection; private preparation in the candidate; host node/resource lifecycle in the host adapter. A dependency index or compiled plan can be derived from those facts. It must not create a second independently mutable state/version universe.

The current per-root accepted scalar history is necessary. Replacing its physical Map is a possible later storage question; deleting the meaning it stores is not a simplification. A central version history could share values across roots but adds retention/compaction costs; local accepted values are simpler for a small number of roots. Neither choice is established by the existing profile.

### Compiler and execution plans

The semantic IR describes reads, identity, ordering, effects, and observable outputs. The physical plan describes how to gather inputs, evaluate, and publish them. Rust/OXC must do substantive work: symbol-aware dependency/effect analysis, archetype/slot assignment, expression specialization, structural delta proof, host writer selection, and plan explanations.

Static schema, immutable slot/sink mapping, and certified expression shape belong at build or registration. Live entity generation, captured input version, writer lifetime, and host base versions belong at preparation/admission. Any check whose evidence can change across a callback or an await remains live. TypeScript readonly types and a function-shaped property are not runtime ownership or purity proofs.

The key proposed improvement is an **owned input boundary**. Untrusted public descriptions and callback results enter through controlled reads. Internal execution consumes runtime-owned data with explicit versions, rather than arbitrary caller-owned arrays/accessors. This could allow a short callback-free capture/validation region and simpler compiled execution. It is an architectural proposal: normalization order, callback behavior, adapters, and invalidation must be specified before replacing the existing public path. Adding a trusted boolean to the current method does not establish this boundary.

## Physical execution choices

Use at most three traversal families over the same logical model:

| Plan | Mechanism | Intended use | Required evidence |
| --- | --- | --- | --- |
| Sparse | Walk compiled source fanout and deduplicate affected projections | Few reached outputs, bounded fanout | Selection/gather overhead remains below avoided work |
| Clustered | Mark existing owner/archetype tiles and scan touched tiles | Localized intermediate activity | Tile scans beat scattered gather after marking/selection cost |
| Dense | Traverse a homogeneous prepared range with generated kernels | High reached-output density or known full updates | Full dispatch-to-publication win, not only arithmetic kernel speed |

These are execution alternatives, not separate roots, VDOMs, state stores, or acknowledgement protocols. The compiler should eliminate impossible plans using known shape. Runtime selection, where necessary, uses already available batch facts. Its cost and switching stability are charged to the operation. No speculative density threshold is approved yet.

Specialization must cover data movement and publication as well as arithmetic: stable row/slot addressing, gathering, output types, equality policy, and writer capability. Existing kernel generation removed some projection interpretation while leaving several surrounding coordination passes. Whether those passes dominate still needs causal attribution.

Immutable primitives permit SameValue-style output suppression. Fresh tuples, borrowed buffers, mutable vectors, and host resources require separate value/ownership contracts. Reusing an array that a custom host retains can change semantics. A Three tuple-copy writer can potentially consume scalar coordinates without allocating a fresh tuple, but only under an explicit copying/non-retention contract. This is not permission to change generic prop semantics.

### Ordered structure

Keep the retained VDOM and a general keyed renderer as the semantic reference. Consume compiler-proven insert/remove/move deltas through the same identity and publication rules. Stable entity IDs keep state rows independent of child-order positions.

Start with the existing bounded bucket family or indexed arrays, based on the named operation. Use a B+ tree or measured rope only if recordings show sequence maintenance or rank queries dominate after full-list rediscovery is eliminated. A balanced tree does not eliminate binding-index maintenance or DOM placement.

Xi's rope work is relevant through composable summaries, localized invalidation, and revision-aware asynchronous results. The summary algebra matters: a summary must be composable and cheap to repair after edits. Arbitrary UI computations are not automatically associative summaries. CRDT merge addresses concurrent domain writers; it does not establish DOM identity, effect ownership, focus, or hydration correctness. [Metrics](https://xi-editor.io/docs/rope_science_02.html), [asynchronous work](https://xi-editor.io/docs/rope_science_06.html), [minimal invalidation](https://xi-editor.io/docs/rope_science_12.html).

## Store, Suspense, transitions, and workers

Use a snapshot/read-set contract shared by local state and stores, with specialized receipts sized to the work. A small numeric cut should not allocate a full generic candidate graph. Sharing semantics does not require identical scratch structures or heavy transaction machinery for every update.

Preparation captures a coherent frontier, evaluates pure work, stages structure/props, and discovers dynamic reads. Admission validates live identities, versions, and structural bases in a callback-free region. Host application is serialized and does not yield. Successful publication advances root views and exact acknowledgements, then releases deferred notifications and committed lifecycle work.

A host setter can throw or synchronously re-enter. Arbitrary DOM/Three/custom-host writes are not rollbackable transactions. The guarantee is coherent declared inputs and successful publication at a defined boundary. It is not that every custom setter can never observe intermediate host writes. Specify cancellation during disposal and terminal failure after partial application. Reentrant domain writes belong to a later pending cut; define whether runtime-managed reads during the outer commit see its captured view or the latest domain head.

Independent transitions are identified by operation and read/write sets. Root overlap alone is not a conflict. Explicit replacement handles search/navigation supersession; disjoint work can coexist. A stale candidate rebases/recomputes only affected pure work when possible; stale task outputs must be invalidated by their inputs, not merely relabeled with the newest root version.

Suspense needs a reveal state machine: first load may show fallback; a revealed boundary keeps its accepted view while preparing a new candidate; readiness leads to admission and coordinated reveal; cancellation/staleness/error has an explicit policy. Transitions animate committed identity changes and have interruption/disposal rules. Display policy does not decide store conflict resolution.

Discovery edges and hard value dependencies differ. Build-time resource manifests may start independent resources before component traversal reaches them. Data-dependent keys remain real prerequisites. Speculation needs provider rules, bounded concurrency, cancellation ownership, and cache identity; it cannot automatically execute arbitrary side-effectful loaders early. The existing async DAG evidence matches explicit React preloading and does not show CPU parallelism.

Workers run only suitable pure tasks on immutable/transferable inputs, with generation and input-version tags on results. Keep host commits on their owning thread. Compare compute saved with transfer, startup, queueing, and stale work. DOM binding arithmetic may be too cheap to justify a worker; physics or expensive derivations may qualify. Service workers add lifecycle constraints and are not the default durable CPU pool. Wasm/SIMD is downstream of a demonstrated numeric compute bottleneck.

React documents the external-store transition restart and fallback behavior that motivated this work. Our improvement must come from explicit snapshots and candidate admission, not from ignoring changes. React also has documented ViewTransition support in its current release channels; the product argument must compare the actual supported channel rather than relying on an old absence claim. [External stores](https://react.dev/reference/react/useSyncExternalStore), [ViewTransition](https://react.dev/reference/react/ViewTransition).

## Host and ecosystem contracts

The same semantic host operations should cover DOM and Three: create, update property/text, connect/place, register events, detach, and dispose. Writer capabilities resolve at registration/mount. The compiler can generate JSX declarations and select approved writer forms. Namespace constructor lookup is a convenience; resource ownership, ordering, events, and disposal remain explicit obligations.

Native event listeners feed entity-addressed actions. Browser default handling and synchronous cancellation remain at the input boundary; workers receive copied event data, not live DOM events. Coalescing is policy-specific: pointer/animation samples may permit latest-value rendering, while discrete domain actions retain order.

Native conditional hook identity and activation-only effects are deliberate semantics. Escaped callbacks that capture state cannot be silently made live without a stated rule. Preserve snapshot closures or explicitly define live read capabilities; otherwise a fast prop path can leave event/effect callbacks stale. Reactive synchronization tasks must have a separate dependency/lifecycle contract. Arbitrary React useEffect semantics do not become compatible because the function has the same name.

Compatibility has levels: JSX syntax, native React-shaped APIs, React islands, selected library bridges, and full React dispatcher/renderer behavior. The current scope supports a bounded bridge story. A React island is an opaque commit domain; do not promise atomic synchronization with arbitrary native host groups without a compatible acknowledgement protocol.

HMR requires a revision-to-revision site compatibility map. Lexical ordinals and source offsets alone do not prove edit-stable meaning. Preserve compatible state sites; remount the smallest uncertain owner scope; revoke obsolete plans, subscriptions, tasks, and handles.

## Systems interaction review requirements

| Interaction | Shared contract | Failure the final review must exclude |
| --- | --- | --- |
| Numeric plans and keyed edits | Entity generation, binding membership, captured structure base | Updating a retired/reused row or applying props to the old host |
| Store snapshots and async task reuse | Complete input identity/version read set | Fresh root version attached to stale fetched/computed output |
| Urgent input and pending transitions | Accepted view, explicit rebase/conflict policy | Old candidate overwriting urgent state or replacing revealed UI with startup fallback |
| Multiple hosts and roots | Commit group, serialized host application, publication receipt | Promising rollback/visual atomicity that adapters cannot supply |
| User callbacks and specialization | Effect classification, owned inputs, invalidation boundary | Treating readonly/provided metadata as immutable trusted data |
| Conditional hooks and HMR | Owner/site incarnation and compatibility mapping | State sliding into another site or resurrecting disposed state |
| Mutable props and direct writers | Value semantics, borrowing/copying/retention rules | Skipping a changed vector because its object identity is stable |
| Dataflow and task scheduling | Hard edges, demand/reveal groups, delayed feedback | Starting a task before its required value exists or repeatedly evaluating an unsupported cycle |
| Workers and host publication | Transferable input snapshot, fresh result stamps | Applying results from old entities, stores, or code revisions |
| Streaming and local actions | Snapshot/code revision, causal delta ordering, replay policy | Stale server chunks overwriting local accepted state or duplicated lifecycle effects |

## Required recordings and decision process

Record only what resolves a stated unknown. Use archived qualified builds; keep diagnostic recordings separate from latency qualification. Automated runs remain headless, bounded, interruptible, and behind Portless. No implementation change is permitted merely to make a diagnostic look better.

| Question | Required recording or analysis | Decision it unlocks |
| --- | --- | --- |
| Which numeric phases account for the gap? | Phase-aligned CPU/trace intervals for dispatch/coalescing, capture, validation, projection/equality, host application, acknowledgement; operation counts and allocation samples | Select the largest improvable phase and determine if its budget can reach the target |
| Is a dense scan cheaper than the current gather? | Same input/output batches with counted source/edge/sink visits, bytes moved, duplicate work and selector overhead | Physical plan choice and crossover surface |
| Is current validation repeated interpretation or necessary freshness? | Callback map, ownership/immutability audit, per-phase check counts and reentrant schedules | Move static checks earlier; retain or redesign live checks |
| Where do structural edits lose their locality? | One edit's owner/sequence/binding/host visits and index writes, plus phase allocation/layout trace | Delta integration versus sequence representation change |
| Do async policies meet the intended product semantics? | Candidate/task event timeline with input revisions, ready/start/reveal gaps, rebase/cancel reasons, urgent input latency and retained identity | Operation conflict policy, scheduling priority, reuse protocol |
| Does setup or retained history erase the update win? | Matched cold build/load/mount, allocation and retained heap before/after churn/disposal, multiple-root history pressure | Preparation amortization, storage and compaction policy |
| Is the extension surface simpler? | Invariant ownership/change-impact analysis plus matched host-extension/debugging tasks | Actual maintainability decision; LOC and passing tests are not substitutes |

Phase totals must reconcile with end-to-end time within quantified instrumentation overhead. Where the existing sampled profile cannot distinguish operations inside a monolithic function, obtain an appropriately phase-aligned recording or reviewed diagnostic instrumentation; do not assign milliseconds to Map.get from a broad method sample. Profile-guided hypotheses need a matched counterfactual before being called causes.

The finite sequence is: freeze contracts and baseline; complete the decisive cost ledger; compare the viable solution families on the same workload; choose one architecture; reconcile interactions; perform independent final review; only then authorize a bounded implementation. Each unknown must end as supported, falsified, or explicitly unresolved with its consequence. Do not expand to workers, CRDTs, Wasm, or new storage variants to avoid a failed first decision.

## Review and implementation gate

Three specialist classification memos accompany this proposal: [algorithms](.cache/architecture-classification-review/algorithms.md), [transactions](.cache/architecture-classification-review/transactions.md), and [compiler/host contracts](.cache/architecture-classification-review/compiler-host-contracts.md). Their agreement is input to the whole-system review, not independent proof that the recommendation wins.

The final reviewer must read the actual notebook, raw evidence, current sources, and these contracts. Review the cost model, solution ranking, unresolved decisions, migration/deletion strategy, and every interaction above. Approve, revise, or reject the proposal with actionable reasons. Review completion does not manufacture missing causal measurements.

Implementation remains blocked by design until there is a reviewed contract, a reconciled causal cost ledger for the intended change, and a proposal whose attainable savings can meet the target. Any later implementation must name the replaced mechanism, the invariant owner, the expected cost reduction, its falsifier, and the fixed acceptance workload. The user decides when the freeze ends.
