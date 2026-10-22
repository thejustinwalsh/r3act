# Realtime speed gap: close the owned scalar path, then contract its ordinary execution

Review basis: `main` at `5fe544459e2842622064289fef8b1663ee62ca68`, with the owned-store-execution slice uncommitted and changing during inspection. [source-lock.json](source-lock.json) captures 34 file identities at **2026-10-22 02:43:54 UTC**, including excerpts of the publication defects below. It is a per-file review snapshot, not an atomic build lock. Later corrective edits need the primary's new source lock. No production changes, tests, builds, benchmarks, browser, server or VM were performed by this reviewer.

## Decision

Finish the active data-owned Store slice with its source defects corrected. It removes a real barrier: arbitrary supplied kernels no longer divide an otherwise passive capture into hundreds of independently audited calls. It does **not** yet implement broad computation fusion, remove publication requirements, or establish a speed improvement.

The next selected implementation, if the primary retains this capability at its boundary, should be **one ordinary retained-scalar execution contraction**: reuse the complete owner selection already assembled for capture, bypass structural-tree assembly machinery for a proven scalar-only cut, and let ordinary immediate flush use the same publication state machine without constructing its deferred public candidate adapter. These are exact existing mechanisms to retire, not a new renderer or container. The implementation assignments and prerequisite fixes are in [orchestration.md](orchestration.md).

I cannot honestly specify changes guaranteed to close the measured gap. Parity against the strongest observed declarative comparator requires about **80% less update-step time**. There is no resolved phase budget proving that any current proposal removes that much time. The selected plan is source-grounded, finite and falsifiable; it is not a prediction disguised as a roadmap.

## What is measured

The [verified four-arm episode](../2026-10-22-r3f-frame-baseline/results.md) uses unchanged Native/declarative React/imperative workloads, 256 motion owners, retained JSX-owned scene resources, common manual draw/readback, 12 warmup and 60 measured frames, and one Apple M4/WebGL2 session. The production runtime/compiler was unchanged from `04b7757` for that observation.

| Milliseconds, median / p95 | Native | React Compiler + declarative R3F | R3F useFrame | Imperative |
| --- | ---: | ---: | ---: | ---: |
| Update step | 4.10 / 4.90 | 0.80 / 1.00 | 3.10 / 3.40 | 0.10 / 0.20 |
| Update through draw/readback | 6.60 / 7.50 | 3.55 / 4.40 | 5.70 / 6.20 | 3.30 / 5.40 |
| State age | 4.10 / 5.00 | 0.80 / 1.10 | 3.10 / 3.40 | 0.10 / 0.40 |

Keeping those denominators fixed, update parity against declarative React requires reductions of **3.30 ms / 80.49% median** and **3.90 ms / 79.59% p95**. Through-draw parity requires **3.05 ms / 46.21% median** and **3.10 ms / 41.33% p95**. Against useFrame, the corresponding update gaps are 1.00 / 1.50 ms. These are arithmetic distances to targets, not attributable savings. Do not subtract interval medians to assign a draw cost, or interpret the imperative arm as an attainable lower bound under Native's stronger contracts.

The timing is descriptive: one fixed-order episode, dependent frames, limited timer resolution, no causal old/new control, no phase attribution, population-tail estimate, presentation timestamps, matched cold/memory or second-device qualification. Equal approximately 16.7-ms RAF intervals say little about spare CPU time. Historical fixed-topology wins remain real within their scope; the qualified dense DOM loss and exhausted Recording A remain failures/unresolved evidence within theirs. Neither changes this canvas result.

## Why avoiding React component work has not been sufficient

The archived Native transform already uses closed Store kernels and does not rerender the motion components on the measured closed route. The React transform computes three short scalar expressions, compares their values and produces a group update. Avoiding those component calls does not eliminate Native's owner selection, source capture, data-shape proof, retained-output copies, mounted-target matching, publication validation, reader-history staging and acknowledgements.

The earlier contraction removed repeated immutable-path normalization, empty selector Maps and two adjacent VDOM checks. Its recorded result still lost. The active slice attacks a different seam: effect boundaries. A public `executeRange` function is an arbitrary callback despite matching program IDs. The old 256 alternating motion owners meant 256 runs, so the runtime could not legitimately share canonical Store integrity across all calls. Explicit normalized data can execute without those callbacks.

This makes repeated coordination a plausible cause, supported by source multiplicities, but **not a measured attribution of 4.10 ms**. The current path has only one Root subscription per Store, not 257 Root dispatch callbacks. The same Store's selected consumers still number 257. Notification fanout, missing memoization, GPU cost, and kernel arithmetic should not be asserted as the cause without evidence.

## Critical findings in the active slice

### 1. Existing final acceptance still crosses public World callbacks

In the locked Root source, closed-input publication calls `stores.publishAccepted()` before `closed.publish()` and the World acknowledgement. The closed Store publication body updates a component cache, then calls `#refreshDirectKeyedRegionOutput`, which calls public `world.ownerLineage`; it then calls public lineage again for ancestor invalidation. `world.clearCellChangesThrough` also executes after Store history has advanced. See Root lines approximately 3500–3520, 3678–3688 and 7650–7665 in the lock's excerpts.

A throwing/reentrant World override at that point can observe or interrupt partially advanced accepted records. This contradicts the intended callback-free final swap. It predates the active slice and is a **source-confirmed call graph defect; an executable reproducer was not run here**. Quarantining afterward does not restore already advanced accepted history.

The related `finalGroupCurrent` invokes `#validateRetainedCells(writes, true)`, which uses public `versionForCell` and `scalarSourceForCell`. The purported final private sweep can therefore itself invalidate an earlier checked input. The analogous resource-retained candidate has the same problem.

The settled repair uses the existing canonical World authority for final operations, explicitly as an internal publication protocol. Preserve public capture and public validation, including the existing subclass-based group-revocation test. Add a canonical post-host validator that accepts a newer version while preserving the captured acknowledgement cutoff; simply substituting the exact-version pre-host validator is wrong. Final lineage and acknowledgement use captured canonical functions and owned handles. No acknowledgement runs early. No public/prototype getter traversal belongs inside final admission.

An initially proposed exact-prototype publication guard was **withdrawn** during this review: it would unnecessarily reject the existing `PublicCallbackWorld` regression. Exact canonical guards remain appropriate for the new passive capture operation, which bypasses public reads; they are not a reason to remove the public validation boundary from all candidates. This distinction must remain in implementation notes.

### 2. Resource retirement needs the same closure of effects

Resource stage publication calls `#retireOwnerAccepted`, which uses public lineage, scalar-source access and `destroyOwner`; `destroyOwner` recursively calls public `this.destroyOwner(child)`. Capturing that outer method is insufficient. Its lane cleanup also reads publicly reachable `NumericColumn.values`, so private recursion alone does not make lane-bearing retirement passive.

Reuse one World destruction body with a private recursive internal mode; keep public destruction's virtual recursion behavior. Stage Root source references before final acceptance and share Root's existing retirement bookkeeping. The initial private retirement capability is limited to a privately checked subtree with **no numeric lanes**; plain state and existing effect cleanup remain supported. Repeat that private eligibility check after host work, before accepting any history, because host reentry may change the subtree. Unsupported lane retirement must decline before host application, or quarantine if the host creates the unsupported state during application. Do not introduce a parallel lifetime engine or silently disable all fallback retirement. This repair is a correctness prerequisite, not a claimed performance optimization.

### 3. The new batch initially defeated existing projection reuse

The first delivered Store batch evaluated `captureOwnedClosedProjectionValues` once per reader, then populated the existing memo afterward. On the frame fixture this repeated work across 257 requests instead of reusing the approximately three normalized plan identities. The primary accepted this finding and B changed the batch to gather a per-Store/per-owned-path result once and seed the same transaction memo. Every reader still receives its own observation and history record. The source lock contains the corrected implementation. This is a source-level retirement, not measured allocation or time evidence.

### 4. Eligibility was coupled to a benchmark literal

A's first version admitted an empty-child schema-5 group only when its `name` was exactly `accepted-frame`. That name has no relevant semantic property. It made a harmless renamed group disable whole-selection batching. The primary accepted a semantics-based correction: existing empty-child group outputs with normalized primitive literals and supported numeric expressions; no aggregate/resource/child expansion. This amends the earlier design's special marker wording. Actual compiler fixtures must prove a differently named group qualifies and unsupported controls still decline. The correction is under active delivery; do not treat the old design prose as its final contract.

### 5. The data route has real new costs

`closed_store_execution.ts` uses `closedDataArray` on each row's numeric input array, then recursively evaluates each prop through the existing evaluator. Generated DAG CSE and arithmetic inlining are no longer used for these Store owners. Root now preflights a complete owner selection, allocates ordered requests and copied World rows, then walks the reader population again and reconstructs much of the same row information. Kernel input/output arrays are still declared at the start of the common function even when data execution never fills them; the handoff should say it avoids kernel buffer population/checking, not literally all buffer allocation.

The passive operation is genuinely stronger than a branded arbitrary function, but this implementation is still a capture batch followed by a general per-owner staging loop. It is not whole-DAG fusion or loop fusion across capture, evaluation and sink preparation. At present there is no evidence that removed audits outweigh all added costs. Keep that risk explicit at the boundary.

## Remaining repeated work and the exact next contraction

| Locked source seam | Source fact | Selected change; what remains |
| --- | --- | --- |
| Root `#stageClosedStoreOutputs`, approximately 2920–3000 then 3320–3490 | Preflight derives owner/cache/program/reader associations, then successful passive execution rediscovers them from `#liveStoreReaders`; it also joins aligned results through temporary Maps. | Retain one candidate-local ordered row list from preflight, with request ranges and captured local cells. Consume it directly after successful batch capture. Share the existing staging/current/publish routines with conservative execution. Remove successful-branch repeated discovery and parsing, not live validation or legacy ordering. |
| VDOM `prepareStorePropDelta`, approximately 4260–4280 | Even after every target is an owned scalar and no child tree is replaced, code constructs `byNode`, `textByNode`, `completed`, calls `nextVNode` and performs final completion loops. For such targets `nextVNode` returns `target.next` unchanged. | Branch after complete scalar eligibility: install the already constructed targets directly in the existing delta record. Keep the general tree-completion branch for structural/text work. Retire three transient Maps and their setup/traversal for the scalar-only case; retain target/bucket/writer/child validation and journal semantics. |
| Root `#createCandidateLifecycle`, approximately 3795–4160, immediate caller around 6000 | Ordinary synchronous flush constructs the full deferred candidate adapter, accessors, actions and WeakMap receipt association, then immediately drives it to completion and rewrites its methods on release. | Make the existing state machine the private core; expose the public candidate adapter only for delayed/public/group candidates. Ordinary immediate flush drives that same core. Do not build a second immediate commit algorithm. Preserve all callback barriers, claims, phase transitions, history and cleanup. |
| Root retained candidate assembly, approximately 3560–3680 | Empty resource/collection arrays/Sets and closure-specific footprint arrays are rebuilt despite a Store-only scalar cut. | Store absence explicitly in the same cut record and reuse its captured footprint within each phase. Build resource/collection work only when present. This is part of the Root contraction, not a separate optimization cycle. |

The maps retired in VDOM are general tree-assembly scratch. Its key buckets, mounted targets and accepted journal are still necessary. Root's authored element, expanded retained child and mounted VNode can encode different things; do not merge them by assumption. Stable references are not permission to mutate accepted props or retain reusable numeric scratch.

Remaining current checks are not all duplicate. Public World/store/writer validation can revoke earlier inputs, so a subsequent canonical final check is needed. A host writer can dispatch, retire another target or throw, so per-write and post-host checks have distinct jobs. The new batch audits class integrity once inside capture; later `StoreRenderSnapshot.validate` and publication preparation still audit independently. In the simple one-Store, no-reentry path the source suggests one capture class sweep plus several later sweeps, not one audit per frame. Exact future counts belong to the untimed proof, never to a guessed phase-cost ledger.

## Is atomic root publication being over-applied to realtime work?

**The semantic guarantee is necessary; some of its generic delivery machinery is avoidable.** Ordinary Store scalar updates already use `scope: { kind: "retained" }`, with mounted target identity instead of requiring an unchanged whole-root version. They do not automatically enlist every DOM root, and host domains serialize only the participating host identity. There is no source basis for saying every RAF frame pays a global all-root transaction.

Each affected Native root still needs old accepted reads while writers run, a successful-host boundary before accepted history advances, exact old-cut acknowledgement, newer reentrant actions left pending, owner/writer liveness and quarantine after partial host failure. These are Native's promised semantics even when only one root publishes. Dropping them would change the product contract, not merely optimize it.

What ordinary flush need not construct is a public suspended/deferred candidate facade or structural-tree assembly for a scalar-only retained footprint. Factor those away while keeping one publication state machine. Explicit coherent DOM/Three groups continue to use group orchestration. Independent DOM updates can retain their own cadence; do not add DOM participants to a canvas frame by ancestry or common Store alone.

There is a separate source over-selection issue: any Store notification increments one root-wide generation, and `#tryFlushClosedStores` selects all unheld subscribed Stores. That can include unrelated readers and defeat an all-data batch in a larger application. It does **not explain the one-Store benchmark gap**. It is not selected for this next contraction because changing selection needs exact pending-source acknowledgement and held/joint-input rules; adding a second dirty/version registry to fix it is prohibited. Preserve it as an explicitly bounded later semantic selection obligation rather than claim it as the present speed solution.

## Fair comparison and the faster contract

Native's opportunity is a compiler-restricted, effect-aware contract: ordinary TSX for proven numeric props, captured versioned inputs, runtime-owned evaluation, retained child/resource identity and main-thread publication. Conditional/native hook identities and activation effects deliberately differ from React; opaque component behavior retains a conservative boundary. This restriction permits work to be avoided safely. It does not make arbitrary React programs pure.

The declarative React arm is the main matching authoring comparator: equivalent scene ownership and values reach a common draw boundary. Its application clock does not implement Native's full accepted Store history, fork/hold transactions or grouped publication; retain that semantic difference in reports. Revalidating immutable paths per reader, rebuilding inert structural Maps and constructing unused candidate adapters are avoidable implementation work, not the unavoidable cost of those extra guarantees.

R3F useFrame runs callbacks under its own scheduler and mutates refs without publishing an equivalent accepted Store cut. It is an important realtime baseline and a different authoring/consistency contract. The measured frame arm happens to be slower than the declarative arm in this episode; that does not establish that declarative React is generally faster than useFrame. Imperative performs still fewer bookkeeping obligations. None may replace the declarative arm to improve Native's narrative.

## Boundary and stopping rule

Complete the active slice and its correctness prerequisite first. Its primary-owned boundary remains one consolidated correctness gate, fresh installed untimed four-arm proof and one bounded four-arm comparison. No additional per-fix measurements, old-source Native arm or favorable retry. Preserve failures. The active implementation has no performance result yet.

The next contraction above is a separately source-reviewed integrated unit, not an automatic rescue of a failed timing. Select it only after the primary records whether the new semantic capability is retained and verifies that the named redundant work still exists. It gets one consolidated boundary of its own, not one benchmark per agent. If it still misses parity, report that speed remains unproved and stop this contraction; no JIT, expression cache, worker, container carousel or new recording is selected here.

Cold/memory, independent-device, HMR, structural/reveal scope and human-maintenance obligations remain open. No new zero-participant maintenance advantage or universal React superiority follows from this plan.
