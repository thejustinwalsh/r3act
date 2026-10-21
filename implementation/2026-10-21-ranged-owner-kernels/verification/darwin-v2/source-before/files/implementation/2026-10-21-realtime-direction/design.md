# Realtime direction and ordinary closed-row integration

Source basis: `449205a1c9e16df9f00fe073e4d74f102e9fc8e9`, local main, MIT. Source changes below are in progress and unverified.

## Human priority

The human clarified that the primary product is RAF-driven realtime applications, including canvas scenes. General DOM rendering superiority is not the objective. DOM and canvas may consume state on different schedules; agreement is required only for a declared transaction. Preserve the existing explicit coherent-publication capability without making every root wait for every other host.

The performance question is whether normal compiled declarative state can reach retained scene properties in time for the intended draw, with enough remaining CPU for simulation and rendering. A shorter commit interval alone does not establish this. Measure frame state age, missed update deadlines, update/publication CPU, frame intervals and lifecycle costs separately. No runtime can promise a deadline when application or host work exceeds the frame budget.

## What the research supports

`paper.md` section 3.4 and its linked immutable results support stable direct field bindings, affected-region selection and owner-local publication on their tested shapes. Experiment V found field writes responsible for most savings; compiled CSR did not beat runtime discovery and had higher setup cost. Dependency truth and mounted writer resolution are useful; another edge representation is not an established win.

The later integrated dense result remains FAIL. Recording A is exhausted and its phase shares unresolved. That result describes its DOM output workload and does not settle a RAF/Three claim. Historical Snake lifecycle CPU wins also did not establish smooth presentation; long RAF intervals persisted at large sizes. DAG resource scheduling avoids waterfalls but matched equivalent React preloading. None of these results licenses a new physical layout or an inherited current-source speed claim.

The human's computation-DAG question concerns main-thread batching, loop fusion/unrolling and compiler specialization, not asynchronous waits or workers. Review homogeneous owner batches, shared derivation deduplication, invariant hoisting and elimination of repeated interpretation around the existing generated kernel. Linear output work does not prevent a lower constant or sparse work reduction. Current source already batches generated numeric programs; an additional graph or unrolled loop is not automatically a saving. Preserve required post-callback live validation, root accepted history and exact acknowledgement while naming any old pass actually retired.

## R3F comparison

The current upstream v10 documentation describes a frame scheduler with a shared RAF, named phases, explicit ordering and manual stepping. R3F still uses React reconciliation for component updates. Its own performance guidance recommends direct object mutation inside `useFrame` for rapidly changing properties, avoiding React state/component scheduling on that path.

Sources inspected 21 October 2026:

- [v10 frame scheduler](https://r3f.docs.pmnd.rs/next/frame-loop)
- [v10 performance guidance](https://r3f.docs.pmnd.rs/next/advanced/pitfalls)
- [v10 renderer source](https://github.com/pmndrs/react-three-fiber/blob/v10/packages/fiber/src/core/renderer.tsx)
- [v10 reconciler source](https://github.com/pmndrs/react-three-fiber/blob/v10/packages/fiber/src/core/reconciler.tsx)

These are moving upstream references, not frozen benchmark dependencies. Pin exact source/package identities before executing a comparison. Compare ordinary React/R3F declarative state and idiomatic R3F frame mutations as separate arms. The latter is a strong imperative baseline; no scheduler advantage over that arm has been established. Equal scene output, simulation steps, object/resource lifetime and draw ordering are required.

## Current scheduling seam

`ComponentStateRoot` defaults to microtask batching and accepts `scheduleCommit`. Its public `flush()` can publish synchronously, but `false` means either no publication or deferral; barriers, host-domain contention and reentry can prevent publication. `ThreeHost` owns scene objects, not a renderer or RAF. The current Three workbench uses separate per-actor state RAFs and a draw RAF. It does not prove that the state set during a callback is included in that callback's draw.

The frame example now uses one application-owned update/publication/draw order and independent DOM cadence. A declarative empty Group carries a numeric epoch through the existing primitive `position-x` binding. The application draws only after the host epoch matches its requested epoch; a deferred publication skips that draw. Disposal cancels the owned callback and releases actor registrations. Motion uses clamped elapsed time. This is unverified source, not a runtime completion API or a guarantee for arbitrary resource/host work.

## Active integration: reuse closed-row proof on ordinary updates

The replaced mechanism is generic mapper/row execution for ordinary collection insert/replace even when existing compiler metadata already proves a passive closed row. Explicit transactions already use that proof. Reuse the same row program in ordinary mixed preparation and route eligible collection-only batches to it. Keep move/remove-only batches on their existing delta route.

Invariant authorities remain World owner incarnation, compiler module revision, collection operation/reader history, root accepted caches and the existing publication receipt. Whole-root guards remain for ordinary whole-cache candidates. This does not turn automatic dependency selection into an inferred cross-host transaction. Opaque callbacks, unowned/accessor/Proxy records and unsupported rows retain generic fallback.

No measured savings budget exists for this coverage change. Its concrete work-removal claim is avoiding mapper/row interpretation on eligible ordinary edits, not a dense or frame-speed claim. Falsifiers are wrong output/key/identity, omitted mixed pending work, early acknowledgement or lost reentry, stale source/code/writer admission, private owner leaks, accepted history after partial failure, and loss of generic fallback. Sol owns disjoint runtime and compiled-fixture files; Luna remains idle until primary source review releases consolidated verification. One bounded matched comparison follows the slice boundary; its interval must be labeled honestly and cannot stand in for physical presentation.

## Active integration: heterogeneous numeric specialization

Current VDOM numeric execution selects one generated program only when every reached row shares its exact program object. A different already-certified program disables specialization for the whole cut. This is a common composition case, including the frame marker beside animated actors. Extend coverage over the existing row representation and program ABI rather than choose another storage layout or graph registry.

The replacement retires per-group generic projection for cuts whose rows all have complete mounted program proofs. Uniform batches keep their existing path. Heterogeneous execution follows original changed-input runs, preserves per-row sink deduplication across runs, and maps local staged indices back to original input indices. Capture and validate all rows first; run and validate every staged output before any host write. Mount-time correspondence already checks each slot's sink order against generated order. If a row lacks proof, preserve whole-cut generic fallback. Existing host ordering, cancellation, copy semantics, accepted history and exact acknowledgement remain authority; do not apply partitions as independent publications.

There is no decision-grade measured removable share for this coverage extension. New run remapping/scratch has a real cost, especially for alternating programs; the comparison must include it. This does not reopen exhausted dense attribution or claim that unrolling beats a host-output floor. Falsifiers additionally include reordered writes, a shared sink evaluated twice across interleaved runs, late malformed output allowing earlier host writes, changed fallback/error behavior, and retained scratch references after cancellation/disposal. Source review and independent actual-compiler fixtures precede consolidated execution.

## Correctness correction: retained scene composition

The actual workbench browser check fails before HMR: its scene body executes on each animation update. Source review finds that the marker name was not closed and the animated owner also contains structural branches, a render counter, resource objects and pointer handlers. The compiler correctly does not certify that owner. This does not establish when the old demonstration began using generic fallback.

The replaced mechanism is generic owner execution for a numeric motion component whose only opaque value is a retained child supplied by its parent. Keep `KineticForm` as the structural/resource/event owner. `SharedMotion` and `OwnedMotion` take primitive position/name props, own numeric local state, return one intrinsic Group with literal-rate numeric sinks and forward `props.children` directly. The shared mesh keeps its constant Z rotation inside the motion group's XY rotation; owned motion uses the original YZ rotation. Resource and mesh identity remain retained under the existing owner hierarchy.

Compiler proof permits identifier-form `props.children` only directly in a JSX child position, separate from primitive numeric inputs. It cannot be read, called, inspected, computed from or placed in a host attribute. The emitted `numericRetainedProps` metadata records this finite capability. Runtime admission requires runtime-owned frozen parent props and an own data descriptor containing a single frozen runtime-owned element. It never traverses or probes arbitrary child content; other shapes use generic fallback. Parent/descendant changes still use existing dirty sources, owner/cache identity, revision, structural guards and host publication authority. No additional dependency or version registry is introduced.

Retained-child owners require owner-update program schema 3, with the existing execution signature. Other owners keep schema 2. Older cores reject schema 3 during program association rather than silently ignore the new metadata and omit its guard. The current core validates the metadata/version pairing and retains support for schema-2 owners. Binding descriptors and state-layout schemas do not change.

This is authoring coverage and correctness work, with no measured speed budget. Falsifiers are hidden reads certified as empty dependencies, changed child/descendant output lost behind the retained reference, stale code/owner/writer admission, reordered or early host writes, lost reentry/acknowledgement, altered transforms, early resource disposal, or weakening the existing browser no-rerender assertion. A new consolidated correctness gate and a bounded actual workbench/HMR check follow source review. The earlier single timing remains bound to its archived runtime; do not rerun it for favorable numbers.
