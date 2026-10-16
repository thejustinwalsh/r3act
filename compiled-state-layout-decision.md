# M5 compiled state-layout decision

**Status: design only.** The next runtime/compiler change remains conditional on
the pending timing gate. This document does not claim a speed improvement and
does not authorize changing the workload or release thresholds.

## Evidence boundary

`world-journal-cpu-findings.md` reports one registered 1,024-row React/native
CPU-profile pair at a 1,000 μs requested sampling interval. The profile covers
module import, mount, 60 warmup frames, 240 measured frames, inspection, and
disposal. It is a whole-page sampled-self profile, not an update-only latency
measurement, inclusive call time, or paired estimate. The largest verified
native bundle contexts were `writeStyle` (140.089 ms), numeric-program execution
(81.770 ms), the root native cell-cut method (69.840 ms), DOM `setStyleProp`
(45.193 ms), state forwarding (39.370 ms), `scalarSourceForCell` (33.983 ms),
`versionForCell` (21.517 ms), equality (23.646 ms), journal `mark` (20.831 ms),
and pending-queue `setCell` (19.682 ms). These are sampled self contexts; they
can include browser work charged to a JS caller and do not isolate CSS engine
work. The authored CSS projectors and harness inspection also contribute work.

The accompanying allocation diagnostic is likewise full-page sampling. It
places the old generic `setSources` context at about 2.9 MB for the 1,024-row
page, but does not measure an update-only allocation rate or identify exact
allocating statements. Neither diagnostic establishes that a numeric state
layout will improve latency or allocation. The prepared DOM style-writer change
is newer than the cited profile and has not been characterized by these numbers.

## Repeated work still present in compiled TSX

The compiler already gives each component and state hook a stable string site
ID. It marks `propOnlySites`, and each generated numeric prop descriptor has a
`sinkId` plus `sourceSites`. The VDOM caches compiled-site eligibility and
numeric source/sink fanout after activation. Those facts avoid repeatedly
parsing compiler metadata, but the steady update still traverses several
runtime identity and capability checks:

1. **Dispatch and world journal.** Each saved setter is still a per-cell
   closure. It reads and calls the action, does `Object.is`, advances an
   object-cell version, maintains a per-cell `ScalarSource` for numeric values,
   marks the owner/site dirty journal, and sends the stable handle/version to
   listeners. The queue coalesces by stable handle and maximum version, so it
   has removed public `StateChange` allocation on the native route. Journal
   lookup/marking and listener dispatch remain. A root's listener also calls
   `isWithin`, which walks owner ancestry for each notification.
2. **Native-cut preflight.** For every captured cell, `ComponentStateRoot`
   resolves the owner cache, checks the cached compiler-approved site set,
   resolves the scalar source and current version through separate World
   lookups, checks committed source history, and asks the VDOM if that source
   still has an eligible program. The exact-cell resolver repeats identity,
   owner/site, liveness, and cell-map checks. The root also keeps a
   `Map<ScalarSource, number>` for previous committed output values.
3. **Write and acknowledgement.** The root temporarily restores each source's
   previous value, invokes `executeSourceProgram`, then after host writes looks
   the cell up again to update history, acknowledge the World journal, and
   acknowledge its own queue. The `finally` restoration checks cell version and
   source identity again so a reentrant newer write survives. Those repeated
   checks are correctness fences; the profile does not say which checks can be
   removed safely.
4. **VDOM dispatch.** `executeSourceProgram` resolves each source in a source
   map, checks eligibility and source membership, stamps epochs to reject
   duplicates, walks source fanout, resolves every affected group's sink slot,
   retrieves the binding and checks its numeric descriptor/projector, stages
   projected outputs, compares with `Object.is`, and calls the host writer.
   The compiler descriptor proves a fixed source shape but currently carries
   site strings and sink identity rather than a direct owner/site row address
   or executable projection. CSS formatting and host property writes remain
   necessary when the displayed value changes.
5. **Non-numeric and mixed work.** A nonnumeric-only, store, resource, or
   collection update does not use the snapshot-free numeric route. Mixed
   collection work captures public change snapshots and uses the common
   prepared-candidate path. This conservative fallback preserves correctness,
   but its maps, arrays, validation, and whole-tree fallback remain separate
   from the native numeric cut.

`NumericColumn` and `VDOMSnapshotRoot.setColumnRows`/`setColumnBuckets` already
provide typed values, row-indexed compiled bindings, staged projections, and
dirty-row writes for compiled collection data. `ComponentStateRoot` does not
currently use them for `useState` cells: `OwnerStateWorld` stores a `Map<site,
StateCell>` per owner, and each numeric cell owns a distinct `ScalarSource`.
Consequently the stable state handles still resolve through object identity and
maps, while VDOM numeric fanout uses scalar-source maps rather than the existing
column row indexes.

## One integrated layout to evaluate

If the timing gate continues to justify this cost center, add a compiler-known
**owner/site numeric lane layout** backed by the existing `NumericColumn` and
row-writer machinery. Keep ordinary authored `useState` syntax and the existing
general state path. The compiler adds immutable layout metadata to the existing
component metadata: schema version, dense hook-site slot order, source-site
mapping, and a conservative set of numeric candidates already certified as
prop-only by the emitted plan. Existing numeric sink descriptors remain the
source of projection eligibility; no author flag or hand-written mutation is
introduced.

For each `(world, component site)` layout, one numeric column per eligible
state-site slot stores values for owner rows. A row allocator maps a live owner
to its layout row; a row generation changes whenever the slot is retired or
reused. The state cell still has one stable `StateCellHandle`, logical version,
owner/site identity, and dispatch behavior. The handle's identity record points
to the current layout slot, row, and generation rather than requiring a
`StateCell` object lookup on every eligible numeric update. The `useStateAt`
runtime resolves the compiler slot internally while preserving its public
return value and setter contract. Generated `bindStatePropAt`/plural bindings
resolve an eligible state cell to the same `NumericColumn` plus entity row
shape already consumed by `bindCompiledColumn`; unsupported bindings retain
the current scalar or ordinary prop route.

The update flow remains in the existing ownership and publication pipeline:

```text
ordinary setter
  -> exact owner/site cell + version; update numeric lane or promote to object cell
  -> world dirty journal and each root's versioned handle queue
  -> capture handles/versions; resolve eligible layout slot/row/generation once
  -> stage all affected column-row projections and host writes in VDOM
  -> validate/ack only the captured versions; preserve newer writes
  -> publish owner/store/collection state, then refs and effects
```

The native numeric-only flush may use the layout row batch directly, but
collection, store, resource, or other mixed work must include the same staged
column writes in `NativeRootCandidate.commitHost`; it cannot append a second
numeric phase after candidate publication. Extend the existing VDOM column
writer entry point only as needed to stage rows across all participating
columns before the first host write. Use existing prepared style writers for
eligible style fields. Keep CSS projection strings, equality policy, host error
handling, and host setter work visible in diagnostics.

### Eligibility and fallback

Static eligibility is limited to compiler-certified prop-only state sites
whose sinks have supported numeric source descriptors. Sites used outside those
outputs, dynamic/unrecognized expressions, effects or other runtime consumers,
and components without a layout stay on the current object-cell path. At owner
creation, evaluate the ordinary initializer once. A numeric runtime value may
occupy the lane; any other value uses the ordinary `StateCell` immediately.

Every setter still accepts the normal `StateAction<T>`. If a numeric lane action
returns a non-number, promote that cell to the ordinary representation before
notifying observers. Copy the current value and version, preserve the stable
cell identity and setter semantics, retire the row generation, and mark the
site as promoted for diagnostics. A later render of a promoted nonnumeric cell
must produce an ordinary projected prop rather than requiring a numeric source;
the compiler helper needs an explicit generic fallback for that case. Keep
promotion sticky for the owner lifetime to avoid oscillating representations.
All other owners and rows in that site column remain eligible.

### Candidates, generations, and reentry

Candidate render state must remain private. New/replacement owners receive a
private row incarnation; reused owners read committed lanes and keep candidate
writes in an isolated overlay. A candidate captures owner generation, row
generation, cell identity, cell version, and the relevant column generation.
Validation rejects a stale candidate before host writes. Host commit consumes
the captured overlay for inserted/replaced rows; publish installs its values
and indexes synchronously; discard clears private rows/overlays and releases
their identities. A replacement cannot overwrite the old row before publish.

The numeric-only host phase likewise uses the captured version and generation
as its acknowledgement boundary. If a writer reenters a setter, its newer
version stays queued and is not overwritten by restoration or acknowledgement.
If a host writer throws after partial writes, preserve the existing terminal
host-failure/disposal policy; do not acknowledge the captured cut. A shared
World continues to notify each root independently: each root has its own row
bindings, dirty queue, VDOM candidate, and acknowledgement state. A forked or
transition candidate cannot mutate committed columns before it validates and
publishes. Refs and effects run only after host writes and state/owner
publication, and observe the new lane values. Row reuse is never sufficient
proof of identity without the generation check.

### Diagnostics and scope limits

Add truthful counters for layout eligibility/fallback, live and peak owner rows,
row reuse/promotion, exact layout resolutions, captured dirty rows, columns
staged, and candidate row validation/discard. Keep these separate from VDOM
projection, equality, and host-write counters. They explain which work ran; they
are not latency estimates or inferred phase counts. Do not add a runtime
sparse-versus-dense threshold in the first cut. First record dirty rows and
contiguous runs with the same workload; any later threshold must include its
accounting cost and tail behavior.

The profile ranks CSS writer/projection contexts as well as dispatch and lookup
contexts. A column layout can remove repeated state representation and address
work; it cannot remove a changed value's projection, CSS string creation,
equality check, or DOM style mutation. No amount of source-line attribution
turns those whole-page samples into an estimate of recovered frame latency.

## Bounded implementation seams, only after the timing gate

1. **OXC plan and emitted helpers:** add versioned owner/site slot metadata to
   `NativeComponentMetadata` and pass hidden slots to the existing transformed
   `useStateAt` and binding helpers. Add compiler execution proofs from ordinary
   TSX; do not add an author-facing mode.
2. **World storage and lifecycle:** add a layout registry/row allocator keyed
   by compiled component site, numeric columns and generation/version arrays,
   exact handle-to-row resolution, candidate-private row/overlay support, and
   sticky promotion to `StateCell`. Keep general cells and public snapshot APIs
   unchanged.
3. **Root routing:** cache eligible layout metadata at owner activation; collect
   reusable per-root row/version cuts; use the layout only for all-numeric
   eligible work and route unsupported cells to the existing capture/candidate
   implementation. Extend exact-version acknowledgement for rows without
   weakening cell identity checks.
4. **VDOM column cut:** reuse `NumericColumn` and the existing staged column
   writers. Add one cross-column dirty-row cut only if required to preserve
   pre-write projection staging and host failure semantics. Retained keyed moves
   keep row groups; owner replacement and removal detach them.
5. **Focused evidence:** test actual OXC-authored components for sparse/dense
   writes, two state sites, promotion, insert/move/remove, private candidate
   discard, stale versions, host reentry/error, shared-world roots, and refs and
   effects. Then run the unchanged registered performance gate; preserve all
   failures and do not infer speed from fewer lookups or generated lines.

The first implementation should be limited to unary numeric state outputs in a
single compiled component layout. Compound sinks and any density threshold can
follow only if the focused proof and current attribution support them. No source
layout, runtime, compiler, build, or benchmark change is authorized by this
design note alone.
