# Executable integrated slice: owned preparation and retained scalar publication

This implements report changes A–E as one coherent boundary. It changes runtime preparation, not authored syntax, compiler schemas, kernel order, rendering ownership or the consumer workload. It is ready for primary source review and Sol dispatch; this investigation has not implemented or executed it. All timings and pass counts in the report are prior evidence.

## Scope and order

Use the primary-selected implementation unit `implementation/2026-10-22-closed-store-contraction/`. Its design is already recorded by primary. Keep this investigation and the mixed-input evidence immutable after review. Primary records the selected contract below before dispatch; no further measurement is a prerequisite.

1. Freeze the cross-module contracts below. Three Sol agents may then work concurrently on disjoint files. All use `gpt-6-sol`, reasoning `medium`. Primary is the fourth slot. Luna remains idle.
2. Agent A implements immutable projection preparation, direct reader history and the linear canonical audit. Agent B implements cache-local output-shape receipts, owned output construction and deduplicated publication. Agent C implements owned scalar region preparation and the two callback-free VDOM scan contractions.
3. B consumes C's declared builder contract; it need not wait for C's implementation. A preserves `paths` and `readClosedProjections` signatures, so B has no new Store API dependency. B's ordinary immediate-admission change uses the existing Root receipt and C's existing `commitAdmitted` interface.
4. Primary reviews each diff, then the combined callback/acceptance chain. Primary integrates a real compiled fixture and gate registration. Do not run tests during implementation or source review.
5. After all source checkpoints pass, release one consolidated correctness gate to Luna. Repair correctness failures with preserved receipts; rerun the consolidated gate for changed source when justified. Do not run performance on failing source.
6. After correctness, run fresh installed untimed proof and exactly one three-arm timing boundary on the same workload. No per-helper benchmark, dense recording, layout experiment or favorable timing repeat.

## Disjoint ownership

| Role | Owned production files | Owned test files and notes |
|---|---|---|
| Sol A — Store preparation | `src/owned_store_record.ts`, `src/closed_store_host_program.ts`, `src/async_store_runtime.ts` | `src/async_store_runtime_test.ts`, `src/closed_store_host_program_test.ts`; new `src/owned_store_record_test.ts` if useful; unit `agent-a.md` |
| Sol B — Root output/publication | `src/component_state_runtime.ts`, `src/jsx_binding_runtime.ts` | `src/component_state_runtime_test.ts`; unit `agent-b.md` |
| Sol C — VDOM owned scalar path | `src/vdom_snapshot_runtime.ts`, `src/scoped_host_values.ts` | `src/vdom_snapshot_runtime_test.ts`, `src/vdom_snapshot_isolation_test.ts`; unit `agent-c.md` |
| Primary | Integration-only edits after an owner hands off; new compiled fixture and its runner registration; verification/consumer control copies; unit docs/checkpoint/guide | Cross-layer fixture, source review, final disposition |
| Luna after release | No production edits | Runs commands and writes new verification/proof receipts only |

Compiler Rust, Three host/property writers, World storage/layout and package public barrels are outside the first slice. Agents may read any source and tests. They must not edit another owner's files, generated caches, old evidence, lockfiles or shared guide/checkpoint. If a necessary change crosses ownership, describe it to primary instead of expanding scope. Primary must not edit an agent's files concurrently.

## Cross-module contract 1: owned projection paths, unchanged schema

The emitted/raw schema remains exactly its current fields. `ClosedStoreProjectionInput.paths` remains a readonly array of readonly string arrays. No authored `trusted`, `pure`, `plan`, revision flag or schema increment is added.

Agent A owns these proposed internal-module functions in `owned_store_record.ts` (names may be changed once by primary before dispatch, not independently by agents):

```ts
export function normalizeClosedProjectionPaths(
  raw: unknown,
): readonly (readonly string[])[] | null;

export function isOwnedClosedProjectionPaths(
  paths: readonly (readonly string[])[],
): boolean;

export function captureOwnedClosedProjectionValues(
  state: unknown,
  paths: readonly (readonly string[])[],
): readonly number[] | null;
```

These are module-internal infrastructure imports, not additions to package export barrels. The normalizer descriptor-copies, validates the existing limits and safe segments, rejects duplicates as current host normalization does, freezes outer/inner copies and registers the resulting outer array in a module-private WeakSet. That WeakSet proves construction of immutable data only; it carries no Store/version/owner/publication state. `captureOwned...` checks that ownership and returns null if absent. A type assertion or `Object.freeze` supplied by a caller grants no authority. Public `captureClosedProjectionValues` retains its current arbitrary-path behavior, including its existing treatment of duplicate paths; do not silently route its untrusted input through the stricter host normalizer.

`closed_store_host_program.ts` uses the new normalizer where it currently builds `inputPaths`; serialized output is unchanged. `readClosedProjections(store, reader, paths)` keeps its current signature. It selects owned capture only for the branded normalized array; otherwise it uses current public validation. Cache only successful immutable results for owned paths inside the existing transaction, keyed by the pinned Store snapshot and exact path-array identity. Do not cache public arbitrary/proxy path captures. The schema 5 marker and schema 7 Position/Rotation each have their own path identity: at most three captures is the target for this frame, not a cross-program global interning requirement.

The transaction must still stage each reader observation, membership and accepted stamp. Memo state is scratch belonging to the pinned snapshot and must not outlive it. Clear it on discard/finalization; a rollback that removes/replaces a pinned snapshot must invalidate its memo too. A memo can survive rollback only if the same pinned snapshot remains authoritative. Do not add a second history or version registry.

Direct reads become a private discriminant in the existing pending/accepted history union. Keep selector Maps for selector reads; preserve direct, captured-held, retirement and absent distinctions. Accepted history object identity and root stamp remain per reader. Generic/public Map access may lazily materialize an empty map; never expose a mutable shared singleton. Root callers and public diagnostics retain observable meaning.

Canonical auditing retains the same semantic predicate. Remove the redundant key `includes` loop and second key-array construction. Shared audit reuse is optional only within an actually callback-free private interval. Do not change Root's callback/input order to manufacture such an interval. Any reuse proposal must list its exact beginning/end and every potentially public call. If no useful interval exists, the linear audit is sufficient for this slice. The baseline lower bound is 515, not 516: 256 kernel eligibility + 257 projection read + two first-snapshot audits. Do not claim one audit per frame.

## Cross-module contract 2: cache-local output shape

Agent B owns a private `ClosedStoreOutputShape` type on the existing `ComponentCache`; no other module imports it. It records exact normalized program, owner incarnation, cache props, authored result/props, expanded result/props, host key/tag and authored/expanded child references. A receipt is valid only when all those references/identities match the current cache. It certifies immutable data shape, not liveness or callback purity.

First admission uses the current full descriptor/key/symbol checks. A receipt transferred to newly created runtime-owned outputs may avoid re-reflecting their known shape. Generic cache construction or changed program/props/result/expanded refs cannot inherit stale proof. The next accepted cache owns the receipt, so normal removal releases it. Keep runtime owner provenance and both child representations; do not force authored and expanded children to be the same object.

An internal JSX helper may construct frozen owned props directly from validated prop pairs plus key/children/owner, avoiding `Object.fromEntries` followed by a spread. Its inputs are data proof from the Root path; if publicly importable, it must validate/copy any external input itself. It must not accept a cast-only trust flag. Do not change the existing general `copyRuntimeElement` contract.

During publication, install touched owner outputs/direct keyed-region updates, then invalidate each distinct ancestor once using a cut-local Set. Read current accepted ancestor caches at the actual publication point. Preserve overlap rejection, owner lineage, fresh direct outputs and sparse invalidation semantics. Do not retain this Set beyond the candidate or introduce an ancestor registry.

For ordinary immediate flush, B may use the existing `groupPublicationReceipts` private `commitAdmitted` path after one public validation. The receipt remains Root-private and synchronous; it cannot be exported to application callers or persisted for later commits. Retain its final private pre-host validation. Explicit/public `commitHost` still validates freshly. Group all-member final private validation and accepted swaps remain as currently required. This removes repeated public callback work; it does not remove all Root footprint scans.

## Cross-module contract 3: owned scalar regions, existing VDOM authority

Agent C provides a module export from `vdom_snapshot_runtime.ts`, without adding a package barrel export:

```ts
export function createOwnedScalarStorePropDelta(
  region: StorePropDelta,
): StorePropDelta | null;
```

The builder validates and copies the region's own data descriptors into a frozen plain data region and frozen prop pairs, and records that object in a private WeakSet. It accepts this slice's primitive values (finite numeric values and current allowed nonnumeric primitives needed by the marker); rejects aggregates, accessor-backed data, symbols outside existing contracts, malformed keys/tags/owner, duplicate prop names and nonempty child-description arrays. An explicit empty `children: []` is copied/frozen and preserved (the schema 5 marker uses it); do not silently change it to absence. `retainedChildren: true` is supported. It does not claim supplied callbacks, host writers or arbitrary objects are pure. Any Proxy interaction occurs during this one normalization step, before VDOM admission; checks after possible callbacks remain mandatory.

Agent B calls the builder for eligible Root scalar regions, including the marker where eligible. If the builder returns null, keep the original region and use the existing generic route; do not drop output or invent a wider scalar capability. `prepareScopedKeyedRetainedAndStoreDeltas` and `prepareStorePropDelta` keep their external signatures. C detects internally owned regions and uses their copied immutable data; arbitrary caller-supplied arrays/regions keep the current checks. Ownership is data normalization only, not admission. Mounted keys, bucket membership, owner, VNode/handle/parent/child references, writer, publication state and code remain live authorities.

Build one final props object and one final next VNode per eligible target. Preserve nonenumerable scoped-source provenance where the current clone helper preserves it. Keep previous values and the accepted-mounted journal. It is not permissible to mutate accepted VNodes in place or replace the shallow journal with an eager whole-tree copy.

The two removed scans have narrowly different proofs:

* End-of-wrapper preparation: skip the repeated Store-token scan only for a Store-only owned-data path whose immediately preceding preparation already checked it and whose intervening operations cannot invoke callbacks. No retained, structural or replacement plan may be present.
* Commit-to-apply: a private method can validate a record and immediately apply that same record without a second full check. This is one synchronous call chain with no retained/structural/replacement application between. Preserve per-write reentry checks and post-host checks. Do not introduce a full-footprint rescan per write: retain the current bounded target checks, or report a remaining contract limit rather than adding O(N²) validation. Do not pass a public boolean that bypasses admission.

All mixed plans keep their existing validation sequence. `program.commitAdmitted` still performs required private freshness checking. No assumptions about the writer remaining pure after it is invoked. An earlier writer can invalidate a later target, so per-write checks and failure quarantine remain. The expected source trace is eight to six Store footprint scans in the fully eligible ordinary Store-only path; if a meaningful callback is discovered, keep that scan and report the narrower retirement.

## Source-review checkpoints and semantic gate cases

Primary first reviews the interfaces and each agent's retirement table; then reviews actual code, not just the handoff. Required review outcomes:

1. A's ownership brand cannot be forged by frozen/typed inputs; arbitrary paths still execute their public validation; successful captures are tied to the same pinned snapshot. Direct history is visibly distinct from held preservation/retirement and retains accepted identity/stamps. Prototype audit still rejects every descriptor/flag/symbol/shadow mutation. No public-kernel purity assumption appears.
2. B's proof lives only on ComponentCache and is invalidated by reference changes. Two child representations and owner tags survive. Ancestor dedup does not overwrite fresh output. Immediate commit uses existing receipt authority and retains final private validation after public callbacks.
3. C's owned path preserves exact region values/keys and mounted provenance. The two skipped scans have no callback between check and use. Public/mixed paths still validate. The writer, target identity and structural versions remain live after each host write.
4. Combined order is still capture → stage → public admission → private pre-host check → host application → public preparation → final private check → accepted history/cache/VDOM publication → exact captured acknowledgements → effects/released callbacks. For explicit groups, all public preparation finishes before final private all-member checks and acceptance. Arbitrary host writes remain nonrollbackable; partial failure quarantines rather than pretending to undo external effects.

Author meaningful boundary tests; do not test implementation counts merely to mirror loops. Use existing tests where already covered, and add the following missing cases in each owner's files:

* A: same pinned owned state/plan read by two readers; distinct fork snapshots; rollback removes staged reader membership; direct→selector→direct previous-value behavior; held direct history versus current history; unsafe/unowned nested records; public path Proxy/getter behavior; a kernel or allowed callback mutates prototype/instance before a later admission and is rejected.
* B: repeated scalar cuts retain children/resources/control identity; generic replacement/new props/program invalidates proof; authored versus expanded child representations remain distinct; overlapping ancestry and same-key different-owner replacement; no-op output still acknowledges exactly its captured input; newer local/Store reentry survives old-cut acknowledgement; explicit public candidate commit called later revalidates.
* C: owned scalar cut and arbitrary generic cut produce identical accepted snapshots/props; scalar plus structural/retained update uses mixed guard path; later target removal/reinsert by first writer; writer descriptor callback invalidates prior admission; second writer throws and accepted history/version does not advance; reading accepted view during application sees captured old values through the journal; scoped-source provenance persists.

Primary adds one actual compiled cross-layer fixture combining shared Store phase, local offsets, retained resource children and control effects. Exercise ordinary update, explicit/grouped held admission and failure/reentry branches using the same existing public APIs. At least one group case must let a later root's public callback invalidate an earlier root before final acceptance. Keep generated schema 7 and actual range-kernel evidence. Register the fixture in the consolidated runner; do not substitute handwritten metadata for the compiler route. Existing broad tests remain the regression gate.

## Copy-ready Sol prompts

### Agent A

> Implement the Store portion of the approved owned realtime preparation slice in `/Volumes/Depot/Developer/r3act`. Read AGENTS.md, current checkpoint, the applicable master contracts, and `implementation/2026-10-22-astra-realtime-gap/report.md` plus `orchestration.md`. Use gpt-6-sol medium. Own ONLY `src/owned_store_record.ts`, `src/closed_store_host_program.ts`, `src/async_store_runtime.ts`, their test files listed in the ownership table, and new unit `agent-a.md`. Implement contract 1: normalize and brand copied immutable paths without changing raw metadata schema; use transaction-local successful projection memo keyed by pinned snapshot and path identity; preserve all per-reader observations/history; represent direct history without empty selector Maps; make canonical audit linear with identical semantic predicate. Do not hoist checks across kernels/public callbacks or create a persistent canonical-status cache. No compiler, Root, VDOM, World, Three, package barrel or other agent edits. Author meaningful boundary tests but run no tests/builds/benchmarks/browser/server/VM. Preserve exact stamps, root histories, held/captured semantics, rollback and retirement. Hand primary the actual diff, old mechanism retired, exact helper signatures, callback boundary proof, edge cases, test commands for Luna, and remaining uncertainty in agent-a.md. Ask primary only for a necessary ownership/interface change, not routine implementation decisions.

### Agent B

> Implement the Root portion of the approved owned realtime preparation slice in `/Volumes/Depot/Developer/r3act`. Read AGENTS.md, current checkpoint, applicable master contracts, and the Astra report/orchestration. Use gpt-6-sol medium. Own ONLY `src/component_state_runtime.ts`, `src/jsx_binding_runtime.ts`, `src/component_state_runtime_test.ts`, and new unit `agent-b.md`. Implement contract 2: cache-local exact-reference immutable output-shape receipt, safe owned-output construction avoiding immediate duplicate props copies, and cut-local deduplication of ancestor invalidation using current accepted caches. Consume C's `createOwnedScalarStorePropDelta(region): StorePropDelta | null` builder with generic fallback on null; no new Store signature is needed. Use existing private groupPublicationReceipts admission for ordinary immediate flush only if final private pre-host validation and explicit/public fresh validation remain. Preserve two child representations, owner/code/cache checks, held inputs, exact captured acknowledgements, newer reentry, effects/resources and partial-failure quarantine. No function metadata purity assumption or kernel reordering. No edits to A/C files, compiler, World or Three. Author tests but execute no tests/builds/benchmarks/browser/server/VM. Hand primary diff, precise receipt invalidation/lifetime, retirement table, public/private callback trace, fallback cases and Luna commands in agent-b.md. Coordinate interface changes through primary.

### Agent C

> Implement the VDOM portion of the approved owned realtime preparation slice in `/Volumes/Depot/Developer/r3act`. Read AGENTS.md, current checkpoint, applicable master contracts, and the Astra report/orchestration. Use gpt-6-sol medium. Own ONLY `src/vdom_snapshot_runtime.ts`, `src/scoped_host_values.ts`, `src/vdom_snapshot_runtime_test.ts`, `src/vdom_snapshot_isolation_test.ts`, and new unit `agent-c.md`. Implement contract 3 and export the internal builder `createOwnedScalarStorePropDelta(region): StorePropDelta | null` without package barrel changes. Brand only copied frozen scalar data; this is not callback purity or host admission. Reuse existing StorePropDelta records, nodes, buckets and publication tokens. Construct final props/VNode once while retaining provenance/journal semantics. Retire the end-of-wrapper and commit-to-apply duplicate scans only in the exact callback-free Store-only path; retain all mixed/public, per-write, post-host and final private checks. No public trusted boolean, sink registry, in-place accepted mutation or whole-tree snapshot. No Root/A/compiler/World/Three edits. Author tests but run no tests/builds/benchmarks/browser/server/VM. Hand primary exact builder semantics, actual removed scans with intervening-call proof, failure/reentry tests, fallback behavior and Luna commands in agent-c.md. If a scan cannot safely be retired, keep it and report why.

## One consolidated correctness and one performance boundary

Primary creates the new unit, reviews all source, registers any new tests/compiled fixture, then releases Luna. The existing native-platform runner is the consolidated authority; use the pinned executable and a fresh output directory:

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node scripts/verify_native_platform.mjs --output-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-closed-store-contraction/verification/darwin-v1 --expected-platform darwin --expected-arch arm64 --execution-kind native-host
```

Retain `--frozen` in the runner's Deno commands. Archive exact source/compiler/runner hashes and real exits. Use the existing bounded supervisor pattern (prior consolidated gate took about 112 seconds; a 1,200-second overall cap is sufficient). Failure means preserve artifacts, stop dependent stages and return to primary. Do not run separate per-helper timing. Existing success totals are minimum prior context, not hardcoded expected totals after adding tests.

For installed proof, primary copies the existing `implementation/2026-10-22-mixed-numeric-inputs/consumer/` controls into the new unit and changes only unit/output path assumptions needed by the harness. Native/React/scene/imperative workload bytes, pinned package versions, ownership, renderer/camera settings and 256 alternating rows stay byte-identical. Compare all twelve consumer inputs and explicitly enumerate permitted control-path differences. Source packages and rebuilt assets necessarily change with runtime source; archive and hash them freshly. Never overwrite old proof-canvas-v2, its installed packages, transforms, assets or failed receipts.

The existing scripts' commands, after that path-only copy, are:

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node implementation/2026-10-22-closed-store-contraction/consumer/prepare.mjs --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-closed-store-contraction/proof-canvas-v1
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node implementation/2026-10-22-closed-store-contraction/consumer/verify.mjs --phase proof --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-closed-store-contraction/proof-canvas-v1
```

Primary reviews the installed untimed result and its actual compiled transforms, exact retained identities/pixels/cleanup and hashes, then issues the runner's existing hash-bound timing authorization receipt. This is the primary's source/proof gate under the authorized slice, not a fresh human permission request. Then Luna runs exactly once:

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node implementation/2026-10-22-closed-store-contraction/consumer/verify.mjs --phase timing --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-22-closed-store-contraction/proof-canvas-v1
```

The verifier uses bounded headless Chromium with intercepted archived assets; it does not need a project server. Retain its 120-second bound and interruptibility, zero focus stealing, before/after hashes, null timed counters, real WebGL, idle disposal wait and owned browser cleanup. If a real server becomes necessary, stop and have primary apply the required Portless skill workflow; do not silently start one.

The timing boundary is exactly **Native → React Compiler/R3F → imperative**, 12 warmups + 60 measured frames each, conventional median and nearest-rank p95, same actual draw/readPixels and external renderer. No fresh old-Native arm. The prior result stays historical; no causal old/new savings may be claimed. Any capability-driven workload change requires a newly labeled comparison and cannot inherit old timings. This slice requires no such capability change.

## Stop and disposition

Semantic acceptance requires the full gate and installed proof, plus source-visible retirement of the named mechanisms. A performance success is separately assessed on fresh Native versus fresh R3F median and p95 publication/update-through-draw, state age and unchanged output/cleanup. Report each metric, including a continuing loss. One fixed-order page remains descriptive, not population, presentation, cold/memory or independent-device qualification.

If correctness fails, preserve the failure and repair source before timing. If the timing still loses, close this slice with that result; do not start another cache, syntax feature, density sweep or helper measurement within it. Primary may retain source-justified simplifications even without a speed win, but must say so. Nothing in this report predicts parity: the prior publication gap requires about 85% reduction. No phase attribution is currently measured.

No new discriminator is necessary to select this slice. Only if a subsequent physical choice truly needs residual phase attribution may primary propose one bounded coarse-span episode on this same current canvas workload, with one stated branch decision and an unresolved-result stop. Recording A stays exhausted and dense physical choices stay HOLD.

Broad realtime superiority still requires the separate idiomatic R3F `useFrame` baseline, where updates bypass React reconciliation, and the remaining master-plan evidence. Do not replace the fair declarative comparator with that baseline or conflate them. Broader fusion, HMR delivery, lifecycle/cold/memory and independent-device work remain open after this integrated slice.
