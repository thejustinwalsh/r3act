# One bounded owned-execution slice, if selected by primary

This is a proposed follow-on to [the source review](report.md), not active implementation authorization or a performance approval. Finish the separate R3F frame-baseline unit first. Preserve `04b7757` and its failed comparison. No production edits or verification were performed by this review.

## Fixed scope

Deliver a distinct data-execution arm over existing closed Store expressions, an all-eligible passive capture operation, and existing retained scalar publication. Initially support numeric leaf/wrapper forms plus the existing primitive schema-5 empty-child marker. Mixed local inputs use the existing exact World identity. Exclude resource inputs, aggregate/subtree/text expansion, earlier opaque transaction observations and unselected accepted-reader preservation from the batch. All retain the existing conservative route. Do not add a new interpreter, DAG format, JIT, adaptive traversal, host writer, registry or persistent audit cache.

Three implementation agents use **gpt-6-sol / medium**. Primary reviews and integrates; Luna remains idle during implementation and runs consolidated gates only after release. Source review must establish the passive call graph before any comparison. Agents author meaningful semantic tests but execute no tests/builds/benchmarks/browser/server/VM.

## Disjoint ownership

| Agent | Production ownership | Test ownership |
| --- | --- | --- |
| A — data executable and compiler | New `src/closed_store_execution.ts`; `src/closed_store_host_program.ts`; `compiler/oxc-spike/src/main.rs`, `store_numeric_kernel.rs`, `mixed_store_numeric_program.rs` only as needed | New `src/closed_store_execution_test.ts`; `src/closed_store_host_program_test.ts`; Rust tests in owned modules; new unit `agent-a.md` |
| B — passive Store/World capture | `src/async_store_runtime.ts`, `src/owner_state_world.ts`; `src/owned_store_record.ts` only if existing owned paths cannot be reused without an API change | Corresponding Store/World/owned-record tests; new unit `agent-b.md` |
| C — Root integration and legacy behavior | `src/component_state_runtime.ts`; `src/native_runtime_api.ts` only if needed for the existing metadata type surface | `src/component_state_runtime_test.ts`, `src/closed_store_numeric_kernel_test.ts`; new unit `agent-c.md` |
| Primary | Unit design/results/source review; actual compiled cross-layer fixture and runner registration; installed proof controls; final guide/checkpoint integration | Cross-layer fixture, source retirement review and gate release |
| Luna, after release | No production edits | New immutable verification/proof receipts |

No edits to VDOM/Three/host publication, package dependency locks, prior evidence or another owner's files. Primary owns any required ownership adjustment before work begins. Primary does not patch an active agent's files concurrently.

## Interfaces to freeze before dispatch

### A: explicit execution metadata

Proposed raw data marker:

```ts
type ClosedStoreDataExecution = Readonly<{
  schemaVersion: 1;
  kind: "owned-data";
  componentProgramId: string;
  moduleRevision: string;
}>;
```

`normalizeClosedStoreDataExecution(raw, normalizedHostProgram)` copies/validates exact data and rejects unsupported batch shape. It references the already normalized host program as expression authority; no new expression copy or callback field. C rejects simultaneous kernel-1/data declarations. A supplies one evaluator entry for normalized data plus candidate-owned numeric inputs, reusing `evaluateClosedHostValue`/existing tree evaluation. Supporting schema 7 means using the full flattened input count and the existing primitive result checks. Existing public evaluator behavior should not silently widen on raw caller-shaped programs; the new internal entry requires normalized ownership, or copies untrusted metadata before use.

Keep the legacy `ClosedStoreNumericKernel` type/normalizer/function identity unchanged. Compiler emission for selected data owners removes their callback kernel field and emits the data marker from the same proven program/revision. Do not change owner-body proof grammar, child purity, numeric expression grouping or source import authority. Retain compiler metadata/debug output that identifies which execution arm is emitted. Update only compiler expectations affected by this intentional route change; preserve manual kernel fixtures.

A must explicitly document loss of generated DAG CSE/inlining on data evaluation and the old-runtime behavior. Do not introduce another optimized evaluator to hide that cost within this unit.

### B: encapsulated capture, not an audit permit

Proposed internal module entry points (primary may settle exact names once):

```ts
captureOwnedClosedWorldInputs(world, orderedOwnerSites)
  // => copied exact handles/sources/versions/finite values, or decline

readOwnedClosedProjectionBatch(transaction, orderedRequests)
  // requests: { store, readerId, paths }[]
  // => numeric projection arrays aligned to requests, or decline
```

These signatures are descriptive; concrete types use existing owner/site/handle/Store types. Neither operation accepts a callback or returns an integrity capability. Neither is added as an application barrel API. A deep import still must not expose an unchecked route.

World capture verifies receiver private ownership, exact canonical prototype and relevant own/prototype method descriptors before replacing public capture methods. Its input container is normalized before this integrity boundary. Capture reads private cells and produces runtime-created frozen handles, exact sources/versions and finite scalar data. A subclass, proxy, shadow method, changed descriptor or noncanonical scalar declines; it does not silently ignore the override. Audit the call graph for public dispatch from inside the captured canonical methods.

Store batch normalizes the entire request container before auditing any Store. All paths must already carry existing owned-path provenance. Admit only a fresh transaction for this first slice, with captured own root/options data and no prior opaque snapshots. Verify transaction private brand and reject hostile receivers. Audit shared prototype once and each distinct Store once inside the operation, then invoke only private capture/staging subroutines. Refactor existing code into shared private helpers rather than maintaining a second log replay or reader-history implementation.

Preserve every reader's membership, observation, direct pending cut, mutation discovery, exact stamp and journal behavior. Preserve current transition/open/invisible-state decline. Return no statuses that remain authoritative after the call. On failure, existing candidate cleanup must remove uncommitted interests and staged readers; document whether the operation stages atomically or is consumed only by a disposable fresh transaction. Public per-reader reads, arbitrary paths, selectors, snapshots and receipt helpers retain their existing fresh checks/observable behavior.

### C: all-eligible Root route

Register the new arm in existing private metadata; allow schema 7 with one execution alternative. Select whole-batch eligibility using private registration and existing cache/reader identities before any callback execution. If any reader/program/World/input/transaction lies outside the finite passive contract, retain the existing owner order and public callback sequence. Data owners on that conservative route evaluate data one owner at a time; manual kernels still invoke their exact original function with original contiguous-run offsets, buffers, result checking, exceptions and fallback.

The passive branch first captures existing exact local cells and ordered Store requests, then calls B's encapsulated Store operation, evaluates each owner's normalized data in original logical order, and stages through existing `stageLeaf`/owned scalar regions. Reuse common stage/current/publication code; do not clone the entire closed-Store method into another engine. Kernel-only buffers and count/extent checks disappear only from the data branch. No callback-bearing helper may occur inside a claimed passive interval. Uncertain cache/props provenance is normalized before that interval or declines.

Keep complete selected-reader coverage, owner ancestry overlap rejection, effect-site/control identity, child representations, pending local checks, lease/hold admission, source versions and exact acknowledgment. Keep current cache replacement, ancestor dedup, per-root history and candidate release paths. No VDOM or host check is removed. Public candidates invoked later still validate fresh; group admission and post-host acceptance remain unchanged.

## Required source handoff

Each agent reports actual changed files, exact replaced functions/loops/buffers, new cost/lifetime, legacy/generic behavior, and test commands for Luna. B provides a line-by-line call graph from the last possible normalization callback through its final private operation. C supplies a trace for all-data, legacy-only, mixed data/legacy, noncanonical World, unselected-input and failure cases. A supplies emitted metadata examples and verifies by source review that no callback survives in the normalized data executable.

Primary rejects an implementation that only adds a marker while continuing `executeRange`, shares canonical facts across public calls, suppresses an override, reorders legacy callbacks, adds another accepted history, or implements only a scheduling wrapper. Primary also rejects duplicated capture/publication implementations whose drift risk outweighs the capability. No measured performance benefit is assumed.

## Semantic gate corpus

Use existing broad conformance and add focused regressions where coverage is absent:

1. Data-only registration, normalization copies and malformed/function-bearing marker rejection; ambiguous data-plus-kernel rejection; mixed schema-7 input order and finite/signed-zero behavior; actual compiler emission with retained child/control sites.
2. Legacy kernel exact identity, contiguous run order/offsets, counting effects, throws, nonfinite outputs, retained input/output buffers, Store dispatch/prototype mutation and local-cell mutation. Include data owners before/after a legacy owner and require conservative order/fresh rejection.
3. World instance/prototype overrides, subclass/Proxy receivers and Proxy handles. Each must either follow the established public route with its observable behavior or decline before bypassing it. Include a later override invalidating an earlier source.
4. Last request/metadata Proxy trap revokes the first Store; a frozen Proxy cannot gain ownership; plain frozen/nested unowned Store records decline. Verify audit happens after normalization and no reusable token is returned.
5. Two readers sharing a pinned Store projection still have distinct history/stamps; failed capture/discard/rollback removes staged membership; separate roots/forks and held/unselected inputs retain conservative history. A failed batch attempt cannot replay opaque work or leak registrations.
6. Existing publication adversaries: late second-root validation, earlier writer retiring later target, newer host-time actions, no-op output exact ack, thrown second writer, old accepted reads during applying, code revision retirement, same-key reincarnation and cleanup. Computation purity must not alter host failure semantics.

Primary authors one actual Rust/OXC fixture containing alternating motion owners, the primitive clock marker, local controls and retained resource children. Exercise repeated ordinary Store cuts, a mixed manual-kernel control, grouped/fork/held paths and failure/disposal using existing public APIs. The fixture must demonstrate that the data arm is selected and that legacy/generic controls remain observable; a metadata-shaped handwritten positive case is insufficient. Source-selected operation counters in an untimed proof may establish route selection, not milliseconds.

## One boundary and stop

After combined source review, Luna runs one consolidated native-platform correctness gate with `--frozen` Deno, fresh output directory, exact source lock and preserved real exits. Primary repairs correctness failures only with their evidence preserved. After correctness, use fresh installed packages and the completed four-arm canvas protocol, with unchanged authored workload/renderer/output/resource contract. Update proof assertions to identify data execution honestly; do not retain a false kernel-1 expectation or manufacture matching counters.

Primary reviews the installed untimed proof before releasing exactly one fixed-order comparison under the human cadence. No helper timings, old-source Native arm, favorable repeat, VM, server, new phase study or density sweep. All current comparative intervals remain distinct; R3F frame-hook execution is not equivalent Store/group publication. No prior timing is inherited.

Semantic acceptance requires actual data-only execution, enclosed passive capture, visible retirement and all conformance cases. Performance acceptance is separately judged from that one fresh comparison, with no predicted milliseconds. A loss closes this slice; primary records whether the semantic capability merits retention and its remaining cold/memory cost. Further executor variants or audit caches require a new decision and are not selected here. Historical dense failure, physical HOLD and original product finish-line requirements remain.
