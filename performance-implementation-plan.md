# Compiler-led performance recovery

## Browser workload policy

The user stopped focus-stealing browser workloads on 13 October 2026. Automated
browser verification and benchmarks must use headless browsers. Do not open,
focus or maximize browser windows without explicit authorization for that run.
Keep runs bounded and interruptible. Headless measurements are a separate
qualification environment from the preserved headed results.

## Current headless qualification

13 October 2026. Fresh production build 04 links the current compiler/World
checkpoint to both native three-slot/six-argument row programs and React
Compiler success with eleven memo slots for both comparator rows. Three staged
TypeScript configs and the 9,000-case selection contract pass. Build inputs are
unchanged before and after.

A fixed headless study is registered in
`.cache/current-owner-kernel-headless-20261013-v1`. It uses five pairs at 128,
1,024 and 10,000 rows, 60 warmup/240 measured frames per page, the unchanged
all-dirty homogeneous production TSX arms and one commit per RAF. Each explicit
collector invocation handles one pair with a 90-second deadline. The timer floor
is five times the maximum of the frozen 0.005 ms minimum and four page-adjacent
calibrations; unresolved observations remain included. No retries or replacements
are allowed. Conventional median and nearest-rank p95 rules are frozen.

Tooling review repaired path disagreements, verifier scope, interrupted-context
cleanup and a collector log reference. Synthetic 30-page datasets verify resolved
and unresolved outcomes; altered raw data and missing/incomplete pairs are
rejected. A primary warmup dirty-count assertion initially rejected the valid
schema, which records that field only for measured frames; the failed attempt is
preserved and validation now matches the authored contract.

All 15 pairs (30 pages, 7,200 measured frames) pass independent data,
source/build/served-asset, correctness and lifecycle verification. The registered
parity and stronger-win gates both fail. Native/React paired median geometric
means are 1.0637 at 128 rows, 1.3224 at 1,024 and 1.4963 at 10,000; paired p95
median ratios are 1.0223, 1.2437 and 1.0890. All denominators clear the frozen
clock floor. This is synchronous commit timing in one headless environment,
not a paint/presentation claim or all-workload conclusion.

Canonical data and receipts are in `results/current-owner-kernel-headless-v1`.
Earlier first-pair evidence remains frozen. Every collector browser and both
owned previews are stopped; no observation was retried or replaced. This is the
latest qualified performance result and it does not meet the product target.

Separate one-page native/React CPU diagnostics at 1,024 rows retain exact
minified script sources and raw profiles. Style assignment is prominent in both
arms; the native prepared-row executor is a sampled hotspot. These whole-page
samples include mount, DOM inspection, layout and teardown, and do not isolate
commit phases or quantify the cause of the measured gap. Profiled timings are
excluded from the study. A proposed deletion of repeated lease checks is
withheld: later input getters can revoke earlier leases; three isolated
regressions prove the existing second-pass check preserves the no-publication
boundary. The next review investigates committed source-cache lifetime against
existing mirrored values before proposing an implementation change.

## Derived scalar values in Three array props

13 October 2026. JSX sink eligibility now accepts the existing array expression
policy, so `const parity = x % 2` can feed `position={[x, y + parity, z]}` through
the generic owner-row projector. Derived initializers and compiled primitive
kernels retain their primitive-only policy. There is no new runtime ABI, layout,
registry or tuple kernel; unsupported aliases retain the rerender fallback.

The live compiler passes 40 Rust tests, native tooling checks and composed Vite
source-map smoke checks. The authored Three TSX fixture verifies 240 batches,
exact properties, one component render, stable object/resource identities and
exact disposal. A separate live-compiler proof verifies a newer state update
published during a host write remains pending until the next flush. These are
Node correctness checks, with no browser, GPU or comparative timing claim.
Primary receipts are in `.cache/derived-array-primary-integration`.

The fresh Darwin arm64 package passes its eight installed-consumer checks and
68 source/declaration-map audits. Installed authored Three TSX verifies a
parity-changing update from 0 to 3, position `[3, 4, 6]`, rotation `[1, 0, 0]`,
roughness 0.3, one accepted prepared-row cut, no rerender, an inert equal-state
update and disposal. Cargo is blocked in the consumer. Earlier tests that
incorrectly expected a tuple kernel remain preserved. Runtime/compiler/package
input hashes match before and after. Receipts are in
`.cache/derived-array-package-qualification`; no timing claim follows.

## Current implementation: ordinal owner-update kernel

13 October 2026. The compiler, static metadata association and VDOM kernel are
integrated. The complete runtime suite passes 716 tests and the live Rust suite
passes 40 tests. The earlier private-comment cleanup preserved every non-comment
line; the latest suite includes the derived-array eligibility regressions.

The compiler emits a schema-version-2 owner program with six arguments. It reads
the existing per-change record buffer and each prepared row's captured inputs.
The unique-row list remains append-ordered. There is no second input matrix,
token-index field, ordinal-copy buffer or new state/version registry. Generic
fallback retains its existing representation and stable projector vectors.

An actual authored TSX Root proof verifies one kernel batch for a homogeneous
cut, equal-output acceptance with no host writes, exact acknowledgement, newer
reentrant work surviving until the next flush, terminal host failure without
acknowledgement, and disposal. Two row instances stay at one render. This is a
Node memory-host proof, not DOM/Three timing or a general no-tearing proof.

The current-kernel production build (`high-frequency-build-proof-20261013-03`)
verifies both native rows have matching component/program identities, three-slot
layouts and schema-2 six-argument owner kernels. Both React comparator rows have
React Compiler success events and eleven-slot memo caches. Focused typechecks
and 9,000 dirty-selection checks pass. Build 01's React Compiler eligibility
failure remains preserved; the same session callback repair is used in both arms.

The six-page production DOM pilot passes at 128, 1,024 and 10,000 rows in both
arms: all-dirty homogeneous updates, stable node identity, exact output and
lifecycle, and dead-setter teardown. Primary verification checks the same saved
raw records and loaded asset hashes. The fresh Darwin arm64 package passes its
installed consumer checks; its installed compiler emits and executes the six-
argument kernel through Root in a memory host. Sixty-eight source/declaration
maps resolve to the packaged authored sources. Earlier failed proof attempts
remain preserved. These qualify correctness, not comparative speed.

The receipts are frozen in `implementation/2026-10-13-owner-kernel-product-qualification`.
The previous fusion speed failure is preserved as an earlier performance
checkpoint. Sparse/bucket/heterogeneous browser coverage, current Three/HMR,
performance, device and comparative maintenance gates remain open. The user
stopped focus-stealing runs; the pilot browser and owned preview are closed.
Further browser runs must use the policy above.

The shared Root acceptance tail is now integrated and the full runtime suite
passes 710 tests. One helper owns source-cache refresh and exact-version World
and pending acknowledgements; row/lane validation, retries and cleanup remain
separate. It adds no state, maps, scratch buffers or per-cut closures. This
refactor is unit verified; the archived production browser/package proofs use
the preceding Root. The VDOM also checks whole-cut kernel compatibility during its existing
dependency preflight, deleting a separate row scan and count. All 710 tests
pass, including program mismatch followed by a stale untouched dependency.
Compiler support for derived locals is now integrated. For example:

```tsx
const [value, setValue] = useState(1);
const parity = value % 2;
const doubled = parity * 2;
const label = `parity=${parity}; doubled=${doubled}`;
return <output data-parity={parity} data-label={label} />;
```

The compiler expands direct-body immutable primitive chains into the existing
binding descriptors and owner kernel. Symbol resolution, dominance, escapes,
unsupported syntax and deterministic expansion budgets govern eligibility.
Calls/member access, mutation, unsafe captures and excessive expansion retain
the rerender fallback. Static outputs do not consume the state-derived budget.
One AST syntax policy now serves generic projector and primitive-kernel checking;
arrays stay eligible for generic projectors and excluded from primitive kernels.
The old textual purity scanner is removed. No runtime registry or API is added.

All 38 live Rust tests pass, and an actual authored TSX proof with the live
compiler reaches Root and the kernel without rerendering, preserving equality,
exact acknowledgement, reentry and host-failure behavior. The permanent Vite
regression checks Unicode source locations for hooks, rewritten bindings, tags
and untouched code. Both compiler smoke tests pass. Five private comment blocks
in the Vite tooling were shortened with every non-comment line unchanged.

A refreshed Darwin arm64 package and installed consumer also pass. Its actual
installed compiler executes derived-local TSX through Root without requiring
Cargo on the consumer machine. Source/declaration map checks pass. These are
correctness and distribution proofs; current browser/Three/HMR, performance,
device and comparative maintenance qualification remain open. The original
unsupported-derived-local attempt remains preserved as historical evidence.

The duplicate committed-cell identity registry is now removed. Legacy source
and version lookup use the existing revocable capability, preserving address
fallback and accessor order, including synchronous revocation during lookup.
This deletes one per-World WeakMap and one first-dirty record per cell. Six new
strict accessor regressions and the complete 716-test runtime suite pass; a
narrow Node retention check passes. The earlier installed package proof predates
this World cleanup; the current derived-array package qualification includes it. No warm-path speedup is inferred from the deletion.

The complete frozen headless study above now supersedes the earlier unrun
tooling draft. Browser workloads are stopped.

## Active implementation direction: shared layouts and simpler modules

13 October 2026. The new goal couples performance recovery with removal of
runtime complexity. Earlier fusion timing was 25–39% slower than React
Compiler on the measured mixed workload. Earlier fixed-topology wins are
separate evidence. Neither result establishes current product superiority.

### Representation and execution

- Keep one authoritative owner/state layout and binding identity model. Sparse,
  bucketed and dense execution may select different traversal algorithms over
  that representation; they must not introduce independent versions, lifetime
  registries, source mirrors or acknowledgment protocols.
- Prefer compiler-selected strategies at preparation time. Any runtime selection
  must have a small, measured cost and preserve global ordering and coherent
  publication. No strategy-specific copy of the semantic VDOM.
- First review the compiler-emitted whole-cut primitive kernel. It should remove
  generic fanout discovery, per-sink input copying and projector dispatch while
  keeping the existing validation and publication contract.
- Separately remove full-list/owner rediscovery from mixed structural updates by
  consuming existing collection deltas through the same commit lifecycle.
- Retire superseded production paths after parity is proved. Historical sources,
  notebook cells and frozen evidence stay intact. Extraction alone is not a
  reduction in complexity.

### Module and naming rules

Use Jane Street-inspired explicit module interfaces, local ownership of
invariants, narrow dependencies and concrete types. Adapt names to the language:
TypeScript camelCase values and PascalCase types; Rust snake_case values/modules
and PascalCase types. Names should identify the represented state or operation,
especially capture, validation, projection, host application and publication.

Move a module boundary only when it owns a coherent invariant and reduces what a
caller must understand. Avoid forwarding facades, blanket renames and new
abstractions that merely hide duplicate state. Internal comments are at most two
lines; TSDoc carries public-facing contracts. Explain longer design rationale in
the established research documents, not in source comment walls.

### Review and acceptance

1. Inventory representations and invariants before refactoring. Each patch lists
   authoritative state, caches, metadata added/removed and fallback behavior.
2. Stage bounded changes, review them, then execute focused semantic checks before
   integration. Preserve generation/version, ordering, reentry, cancellation,
   lifetime and all-projections-before-host-writes guarantees.
3. Count work added as well as removed: scans, input copies, dispatches, scratch
   writes, cleanup and cold preparation. Correctness and lower operation counts
   do not establish latency.
4. Freeze the workload matrix before comparative qualification: mount/teardown,
   fixed-topology high-frequency updates, sparse/dense updates, keyed structure,
   mixed state/structure and async transitions. Record unresolved timer results
   rather than treating them as wins.
5. Target native/React Compiler median and p95 ratios at most 1.00 in every
   declared comparison, plus a substantial high-frequency advantage. Existing
   stronger preregistered gates remain unchanged; new targets do not reclassify
   historical failures. Independent-device confirmation remains required.
6. Assess maintenance through invariant/dependency reduction and matched changes
   on supported scope. Test counts, shorter files and AI extension fixtures do
   not replace comparative developer evidence. Sol's full review remains held
   under the existing prerequisite.

The direct pending-key patch stays unintegrated: its Node diagnostic favored
large dense accepted queues but penalized sparse, cold and fallback cases. The
new goal does not justify adding that bookkeeping to every update.

## Earlier evidence checkpoint: 13 October

The independently verified prepared-cell product comparison passes all 30
correctness pages and 7,200 measured frames but fails every speed target.
Paired median ratios are 1.534, 1.624 and 1.762; paired p95 ratios are 1.491,
1.547 and 1.902. Both ordinary and structural commit work remain too costly.
See `prepared-cell-program-timing-findings.md` for the frozen result and
documented verifier repair on the same raw records.

Actual Chromium inspection identified a representation problem: activating
numeric cells changed their own value data property into an accessor and
normalized them into dictionary property storage. The bounded replacement
creates those cells with shared prototype accessors from birth. Primary
verification passes 653 runtime and 32 compiler tests, authored TSX execution
and lifecycle proofs, and actual-cell fast-property/cleanup inspection.
See `stable-numeric-cell-publication.md`. This candidate has no new timing or
allocation verdict. Next: production pilots and the unchanged matched gate.

The entries below preserve earlier findings and intermediate cuts. They do
not supersede this current assessment or prove the full product is complete.

12 October 2026. This track extends the library implementation plan. It preserves
the product scope and existing gates; it does not claim the performance goal is met.

## Evidence and target

13 October update: the independently verified native cell-cut confirmation
passes all 30 correctness pages but fails the unchanged speed gate at every
size. Paired median native/React ratios are 1.713, 1.836 and 1.879; paired p95
ratios are 1.519, 2.344 and 2.449. All ratios resolve under the registered clock
rule. Separate sampled allocation and matched application artifact sizes are
lower; these do not establish speed. See native-cell-cut-timing-findings.md.

The next bounded allocation-cost candidate is integrated and reviewed: reusable
World dirty membership preserves owner-major ordering and version/lifetime
contracts, with 582 runtime tests, 29 Rust tests, nine primary verification
commands and six production correctness pilots. See
world-dirty-journal-publication.md. It has no new speed verdict. Current CPU and
allocation attribution remain the next evidence step; one journal is not a
prediction of the roughly 57% work reduction illustrated by the current target.

Latest bounded cut: [stable native cells](./native-cells-publication.md), motivated
by [the independently checked allocation ledger](./state-resolution-allocation-findings.md).
Native per-write notification records and pending Map churn are removed from
roots. Captured snapshots and source normalization remain; a new speed verdict
requires the unchanged confirmation protocol.

[Executable numeric programs](./numeric-programs-publication.md) extend that cut
with actual Rust/OXC descriptor emission, packed source fanout, epoch selection
and coherent reusable capture/output buffers. The real TSX proof traps generic
normalization and verifies sparse/dense compound/CSS updates. Mixed delta
publication, snapshot-free native capture, automatic columns and the full
performance/maintenance gates remain required.

The authored-TSX identity-V3 workload passes 30/30 pages and 7,200 frames, but fails
the speed gate. At 512/1,024 rows, paired native/React median ratios are
2.49999999/2.61792571 and paired p95 ratios are 2.25000000/3.23076922. Separate
sampled allocation-tree estimates are 2.66–2.88 times React. The React arm has
React Compiler memo-cache emission; this is not an unoptimized baseline.

At 1,024 rows the arm page-median summary is 2.90 ms native versus 1.10 ms React.
An illustrative 0.80 target would be 0.88 ms at that React time: roughly 70% less
native work is needed. The actual decision uses paired ratios, not this rounded
budget or historical absolute times. Existing targets remain median ratio at
most 0.80 at two sizes and p95 ratio at most 1.10 at every size, with complete
correctness and five-clock-tick denominator resolution. Unresolved results stay
unresolved. Independent-device and human maintenance gates remain required.

## Bets that did not hold

1. **Avoiding component execution would dominate the whole update cost.** It
   removes one category of work. Our state notifications, eligibility checks,
   source batching, projections, indexing, host writes and publication still cost
   more than the tested React path. Render counts cannot establish superiority.
2. **An ECS/DAG representation would automatically be cheaper.** The product
   still uses object cells, maps/sets and generic callbacks in its hot path.
   Static dependency knowledge must remove repeated work, not add another index.
3. **A fast dense kernel would transfer directly to normal authored JSX.** The
   column path and ordinary owner-state path are separate. Kernel evidence does
   not establish that public `useState`/JSX gets the same execution strategy.
4. **Sparse structure and fast numeric writes would compose automatically.**
   Collection deltas are attempted only when no state/store changes are pending.
   Mixed frames use the general candidate path. A hybrid requires a shared
   prepare/validate/host/publish lifecycle, not two commits glued together.

## Work planning and equality contract

Separate three questions: which computations might be affected, which projected
values actually changed, and which host writes are needed. A dirty source marks
its dependents as candidates; it does not force every dependent prop to write.
Evaluate each affected pure projection once per coherent input cut, compare with
its committed value, and enqueue only changed outputs. Equality belongs between
projection and host application, with dependency invalidation ahead of it.

Unchanged primitive results use `Object.is`, including null and NaN. Mutable
tuple/vector/object projections require a mutation-aware policy: stable identity
alone can hide a changed value. Preserve the conservative write contract until
the compiler/host proves a field comparison or immutable output contract. Do not
deep-compare arbitrary objects on every frame. Skipping unchanged projections is
valuable for quantized/derived outputs; it will not remove the three writes per
row in the current dense workload, where all three outputs change each frame.

## Ordered implementation milestones

### M1 — Connect existing direct writers

Select direct binding writers from native root preparation. Split bound style
fields only when the host exposes `setStyleProp`; other hosts receive the full
style value. Extend incremental keyed writer maintenance to ordinary direct
groups, retaining CSR/column fallback and metadata validation. Suppress unchanged
derived primitives while preserving mutable object writes.

Acceptance: real Rust/OXC-compiled TSX reaches field writers without an author
flag or hand binding; retained rows avoid re-execution; static styles survive;
compound bindings write coherent results; source switches/removals release old
writers; stale/reentrant/throwing writers retain their existing failure policy;
numeric values are visible before new refs/effects; both host capabilities work.
An initially empty collection may perform one schema-discovery fallback until
static row provenance is emitted. Subsequent eligible edits must use deltas.

Status: 458 runtime tests, 25 Rust tests and 47 integration checks pass, including
six separate production pilot pages. See direct-writers-publication.md for the
tested checkpoint. Performance remains unmeasured for this candidate. This is a
wiring correction, not a predicted threefold speedup.

### M2 — Attribute the real compiled pipeline

On the tested M1 build, measure source dispatch, flush planning, affected-sink
selection, projection, equality, host application and structural preparation.
Keep instrumentation optional and absent from latency collection. Record counts
for unique dirty sites/owners/sinks, projection executions, equality skips,
actual host writes and unrelated owner/index visits. Use production source maps
or verified emitted offsets to locate costs; bundled function names alone are
insufficient. Separate allocation sampling from latency, startup from steady
updates, and DOM commit CPU from layout/paint/GPU presentation.

Deliverable: one ranked cost/allocation ledger and the next justified change.
Use one separately registered confirmation of the resulting integrated candidate;
keep the existing workload/targets and preserve failures. Do not repeatedly tune
against selected page subsets or add a storage family without attribution.

Status: the tested M1 production build now has two separately registered CPU
profiles with 32/32 independent verification checks. See
direct-writers-cpu-findings.md for ranked emitted-source attribution and preserved
collector failures. Unary projection arrays are a bounded first compiler change;
source normalization, eligibility and acknowledgement cost more. Current
allocation sampling and phase/count instrumentation remain open. CPU profiles
do not establish the integrated latency verdict.

### M3 — Execute compiler facts directly

Lower supported numeric JSX expressions to an executable update program, rather
than only a site-string list and a generic projection closure. At owner activation,
resolve stable source/sink slots, fanout, projection kind and host capabilities.
Reuse these identities until source membership or owner lifetime changes.

First remove repeated site eligibility interpretation and unary input-array
construction where profiles identify cost. Then replace redundant dirty-map,
dedup-map and tuple-array construction with a reusable dirty-slot queue and epoch
stamps where the producer proves uniqueness. Preserve the general public batch
API's duplicate/last-write semantics. Reentrant/nested batches need distinct
epochs or scratch ownership; an overwritten shared stamp cannot lose work.

The emitted program stages projected outputs against a versioned source cut,
validates it, applies changed host values, publishes committed sink/source
history, then releases effects. It must not bypass the VDOM's ownership, refs,
errors or adapter interfaces. Unknown expressions retain the general component
path with an inspectable reason. No runtime eval/JIT or author-written mutation
loop is required. A warmed eligible update should avoid transient framework
records per field; app math, CSS strings and host allocations are measured
separately rather than labelled “zero allocation.”

Acceptance: authored TSX—not a manually bound kernel—uses this program; sparse,
dense and compound updates match full recomputation; source switches, teardown,
conditional site lifetimes, stale inputs and host errors pass; attribution shows
the removed cost before another product confirmation. Keep a small public IR/
capability contract that hosts can extend without private reconciler internals.

Status: unary compiler emission is archived with 465 runtime/28 Rust tests and
47 integration commands plus six pilots. A subsequent stable notification identity
cache and captured-projection cut checkpoint passes 482 runtime/28 Rust tests and
48 integration commands plus six pilots; see cell-identity-cut-publication.md.
Root review reproduced a mixed-version host-reentry bug and fixed scalar/column
projection staging before further specialization. Staging adds batch scratch
allocations; old kernel speed/allocation results do not qualify the new code.
Root-local eligibility, world acknowledgement and executable slot programs are
still outstanding. These partial M3 cuts have no measured speed verdict.

Canonical identity resolution and root-local eligibility reuse now pass 495
runtime tests, 28 Rust tests, 49 integration commands and six production pilots.
The authored compiled TSX counter fixture shows metadata interpretation once,
then zero on the reused cache. See state-resolution-publication.md. World dirty
maps, dispatch records, owner planning and source normalization remain. Current
allocation diagnostics will identify the next executable-program storage cut;
these counters are not a latency verdict.

Native captured cell cuts now bypass `StateChange` record construction on
eligible numeric-only frames and acknowledge both native journals through stable
handles and captured versions. The duplicate private snapshot-backed program
route was removed; unproved work keeps the coherent generic path. This checkpoint
passes 573 runtime tests, 29 Rust tests, 55 full-suite commands, two final checks
and six production pilots. See native-cell-cut-publication.md. World dirty
containers and object state storage remain; the next fresh allocation diagnostic
will attribute current costs before additional storage specialization. No speed
or allocation-rate verdict follows from the capture trap.

### M4 — Make numeric and structural updates one candidate

Prepare collection overlays, new/reused owner caches, keyed host operations and
captured numeric source/version writes together. Include participating stores
and all read/collection versions in validation. In the host phase, apply topology
and numeric writers before publication. Publish owner/store/cache/index state,
acknowledge the captured versions, install refs and run effects through the
common candidate lifecycle.

Do not acknowledge a collection delta and append numeric work afterward: a
throw or reentrant update would expose an inconsistent publication. Pre-host
stale candidates discard; post-host failure retains terminal failure/disposal
semantics. Newer state changes survive acknowledgements. Removed sinks receive
no numeric writes; inserted sinks receive the same candidate's values before
refs/effects. Whole-region fallback remains for unproved footprints.

Acceptance: optimistic updates, timers, cancelled/out-of-order transitions,
store readers and forked roots compose with numeric/structural changes without
post-load fallback flashes or tearing. On bounded edits, unrelated owner/index
visits stay bounded; dense frame work scales with affected sinks. Preserve the
existing oracle, randomized parity, input/caret and retention contracts.

Status: the coherent mixed candidate checkpoint passes 556 runtime tests, 29 Rust
tests, 54 full-suite commands, three final checks and six production pilot pages.
Ordinary Rust/OXC TSX composes keyed/numeric/store work with a full-tree commit
trap. A real shared-store transition exercises coordinated publication across two
roots. See mixed-candidates-publication.md. This new test does not establish
competing transition arbitration; mixed numeric work still uses general source
batching, and the performance gate remains unmeasured for this candidate.

### M5 — Integrate sparse/dense storage where evidence requires it

13 October update: the prepared-style candidate's registered 30-page confirmation
passes correctness and frozen-input checks but fails the unchanged speed gate
at all sizes. Paired page-median native/React ratios are 1.599, 1.770, and 1.767;
paired p95 ratios are 1.623, 2.248, and 2.364. See
prepared-style-timing-findings.md for raw-evidence provenance and preserved
analyzer repairs. These results justify evaluating M5; they do not establish
the cause of the remaining overhead.

The first bounded M5 implementation now adds stable NumericColumn capacity
growth, reusable dirty-row VDOM staging, and conservative Rust/OXC state-layout
metadata with authored-order slots. The runtime validates and freezes that
metadata. All 606 runtime tests, 32 Rust tests, TypeScript tooling, product TSX
metadata proof and existing compiled style/numeric execution proofs pass.
World lane storage and Root routing are still pending: this foundation does
not yet put authored state in numeric columns or establish a speed gain.
See compiled-state-layout-foundation.md for the exact next integration scope.

The subsequent integrated unary lane candidate now passes 629 runtime tests,
32 Rust tests, twelve final primary checks and six production correctness pilots.
World stores logical numeric values in columns, Root captures exact lane
addresses/versions, and VDOM stages the explicit cell cut through existing host
writers. Actual OXC TSX proves sparse/dense lane cuts without generic snapshots
or scalar-program traversal, plus promotion/reentry/lifecycle behavior. See
numeric-state-lanes-publication.md. Compound and mixed work retains the existing
coherent fallback; this candidate's speed and allocation gates remain unmeasured.

If M2–M4 still show object-cell/dispatch overhead dominating dense numeric work,
connect compiler-certified owner/site layouts to the existing numeric column
machinery. Component setters still use ordinary `useState`; the internal storage
and dirty iteration are specialized by the compiler. Numeric and general state
retain one identity/version/lifecycle contract, with defined promotion/fallback
for unsupported values. Frame writers must join normal candidate publication.

Use dirty slots for sparse writes and short contiguous runs for dense writes.
Begin with compile-time choices and known batch facts. A runtime density switch
is justified only when its accounting, switching cost and worst-case tails are
included. Test varying density and structural activity diagnostically, then use
the original integrated product gate for the release claim. Avoid an expanding
list of caller-visible performance modes.

## Where rope science fits

Rope-style trees store local summaries and recompute summaries along changed
paths. Xi demonstrates this for incremental text metrics; see
[Rope science, part 1](https://xi-editor.io/docs/rope_science_01.html). For this
runtime, analogous summaries could represent dirty descendants, ordered region
lengths or dependency-frontier counts. That is a useful design hypothesis.

A rope cannot eliminate projection/host work when every row changes. Change
ordered-tree layout only if traces show bounded edits still scanning total
owners/siblings/indexes, and a prototype reduces structural tails without
regressing dense updates, startup, allocations or lifecycle guarantees. Compare
against the existing bucketed ordered storage first. CRDTs address replicated
state convergence and need separate semantics; they are not a local dispatch
speed fix. Workers, streaming, hydration and Wasm remain behind their original
prerequisites.

## Decision discipline

Every milestone produces source/build locks, correctness evidence, an attributed
cost result where applicable, and a specific pass/fail decision. Keep the full
product objective, but narrow claims to evidence. A failed speed gate means no
realtime superiority claim; it does not authorize a slower baseline, a manual
Three mutation demo substitute or quieter omitted workload. Independent-device
and comparative maintenance/extension studies remain final acceptance gates;
their absence cannot be replaced by source line counts or passing unit tests.
