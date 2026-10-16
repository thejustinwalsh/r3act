# Stable-cell next-step architecture audit

13 October 2026. Read-only source audit of the current stable-cell runtime. This
document proposes one bounded runtime optimization for review; it is not an
implementation or a speed claim.

## Update path inspected

1. A committed setter calls `OwnerStateWorld.#dispatchState`. It checks that
   the owner is alive, applies an action synchronously, skips an `Object.is`
   no-op, promotes a lane-backed cell before a non-number is stored, updates
   the scalar mirror/version and marks the owner/site dirty. The first write
   also creates the stable cell identity and frozen handle. It then invokes
   dirty-cell listeners in subscription order. If public change listeners
   exist, it snapshots that listener set and emits a `StateChange` record.
2. Each `ComponentStateRoot` dirty listener filters the handle with
   `world.isWithin(owner, rootOwner)`, adds or coalesces the handle/version in
   `PendingStateChanges`, and schedules the root. The pending journal keeps
   owner/site keys and queue links; repeated writes update the queued version
   without moving the entry. Acknowledged entries are unlinked, and a later
   write re-enters at the tail.
3. `flush()` first tries the snapshot-free native cut when there is no pending
   store, collection, or resource work. It captures exact handles and versions
   into Root-owned buffers sized from journal capacity. The Root resolves each
   captured handle/version through `numericLaneForCell`, uses its lane-address
   cache to retain the compatibility source and prepared VDOM token, and reads
   the current numeric column value.
4. `executePreparedNumericCells` validates every token and duplicate value
   before changing any scalar mirror. It stages the changed source slots,
   projects every affected writer before the first host write, then applies
   writes under the VDOM/root reentry guards. Root records the committed source
   history and acknowledges only the captured world and pending-journal
   versions. Writes made reentrantly remain queued for the next cut.
5. A declined native preflight leaves publication and acknowledgement to the
   existing fallback. The generic numeric path resolves sources and previous
   values, temporarily restores prior mirrors, executes the source program,
   and restores current values in `finally`. Mixed store/collection or
   structural work instead selects a candidate or ordinary render path.

The prior prepared-cell and numeric-lane product timing studies both failed
their registered speed gates. The authoritative V2 verification for the
current stable-cell candidate also fails: paired median ratios are 1.2736,
1.3620 and 1.4355, and paired p95 ratios are 1.4902, 1.2715 and 1.5551 at
128, 512 and 1,024 rows. Its frozen source archive begins
`2f99962b`. The stable-cell publication note's “latency remains unmeasured”
describes the candidate at freeze time, before this confirmation. Historical
CPU attribution identified World dispatch, Root lane selection, journal
marking, lane resolution/validity and VDOM cut work as sampled contexts; those
whole-page samples do not establish recoverable update time. No timing result
is inferred here.

## Keyed structural publication inspected

Collection edits are staged by collection key. The Root resolves or replaces
row owners through `OwnerPreparation`, renders affected rows against private
state, and prepares VDOM keyed deltas. The prepared host program validates its
targets, candidate keys and root version before commit. The mixed candidate
also validates the owner preparation, store readers, numeric writes, collection
versions and any resource read set. Only after the host phase succeeds does
publication install private owners/cells, update Root row/cache maps, commit
store readers, and retire replaced owners. Preparation discard scrubs private
payloads and disables candidate setters. The standalone collection-delta route
also applies keyed host operations before updating its Root row/owner indexes.

The structural path still creates or fills maps, sets, arrays and candidate
objects proportional to touched rows, readers, or candidate VDOM subtrees. For
example, mixed publication walks `world.ownerLineage(candidate.owner)` for each
candidate row; prepared VDOM keyed-region work collects candidate keys and
visited subtrees before host commit. These operations are bounded by structural
work and are not on the ordinary native setter cut. This audit does not propose
changing them.

## Repeated work and allocations that remain

- Every dirty Root subscription calls `isWithin`. It checks both owner IDs and
  then follows the parent chain through `#owners` until it reaches the Root's
  owner. The walk repeats for every write and every root listener, even though
  an owner's Root ancestry cannot change after publication.
- The native cut performs exact liveness/version resolution at
  `numericLaneForCell`, then later repeats exact identity/liveness checks while
  acknowledging through `clearCellChangesThrough`. The pending journal also
  resolves its identity key and checks the captured version in
  `clearNativeThrough`. These checks guard different cut boundaries and must
  not simply be deleted.
- Per captured cell, Root performs a prepared-token currentness check; VDOM
  execution then resolves the token through a `WeakMap` and checks active slot,
  generation and fanout identity again. That second validation occurs after
  all inputs are available and is the whole-cut safety boundary.
- The steady native path reuses handle, version, token, source and numeric
  buffers. It still does per-cell World/WeakMap/Map lookups, VDOM token and
  slot checks, lane reads, and source-history map updates. Public
  `subscribeChanges` listeners intentionally allocate the listener snapshot
  and `StateChange` record per dispatch; generic `capture()` intentionally
  allocates snapshots. Profiling creates counters/maps. These costs are
  conditional or outside the pure native cut and are not removed by this
  proposal.
- First dirty dispatch still allocates a handle and identity record. Owner
  preparation allocates private owner/slot/cell/control structures and its
  candidate publication/release bookkeeping. Those allocations must remain
  scoped to their existing lifecycle.

## One proposed next optimization: cache Root ancestry on owner records

Add a dedicated constant-time World query for Root subscription membership,
backed by an owner-to-root-scope membership index. Keep general
`isWithin(owner, ancestor)` semantics for callers that ask about arbitrary
ancestors. A single `rootOwner` tag is sufficient only for today's disjoint
top-level roots: `claimRootId` creates a fresh owner with `parent: null`.
It would be incorrect if a renderer Root were later grafted below another
Root's owner, or if one owner could belong to more than one renderer scope.
The index should therefore answer membership for every active renderer-root
owner, not infer membership from “top-level root” equality. If the scope index
is not kept authoritative for a query, that query must retain the existing
`isWithin` fallback.

For current Roots, the membership set per owner contains its one claimed Root
owner. For a future nested/grafted Root, descendants carry both the outer and
inner root-owner IDs; a nested owner may consequently pass both Root
subscriptions. Root registration after descendants already exist must either
backfill the current subtree before enabling the fast query or use the
`isWithin` fallback until backfill completes. Owner creation and private
preparation inherit the parent's committed/private scope memberships and add
any renderer-root boundary declared at that owner. A private scope remains
private until candidate publication. Root listeners query this index instead
of walking the parent chain for every notification. This costs membership
storage/update work proportional to active nested scopes, which must be
reported and measured along with dispatch savings.

This targets repeated work in the setter-to-journal edge, where every root
currently pays an ancestry walk on each write. It does not change cell
versions, lane addresses, dirty-journal ordering, native cut acknowledgement,
projection order, or host writes. It should be implemented and timed as one
named candidate only if source review confirms root ancestry is immutable for
all owner creation and publication paths. The historical CPU attribution and
passing correctness tests alone do not justify a speed claim.

### Correctness proof obligations

- **Root containment:** The index agrees with `isWithin(owner, rootOwner)` for
  every active renderer Root, including nested/grafted roots and owners covered
  by multiple roots. Existing `isWithin` remains correct for arbitrary
  non-root ancestors and is the fallback whenever membership is unknown.
- **Private and async candidates:** A private owner derives its root identity
  without publishing that identity to live queries. Discarded or stale
  preparations cannot alter a committed owner's root tag. A candidate
  published after host validation carries the tag of its validated parent;
  async resource/store candidate validation and publication ordering are
  unchanged.
- **Reentry:** Dirty listeners remain synchronous and preserve registration
  order. The optimized membership predicate changes only whether a Root
  accepts a handle; it does not defer, combine, reorder, or suppress a write
  that was previously within that Root.
- **Public listeners:** `subscribeDirtyCells` and `subscribeChanges` retain
  their current callback count, order, payload, exception propagation and
  subscription-snapshot behavior. The root-specific query is used only by
  Root's private listener.
- **Promotion and lane retirement:** Changing a cell from numeric to nonnumeric
  still promotes it and releases its lane. Root ancestry is orthogonal and
  cannot make a promoted cell eligible for the native cut.
- **Row reuse and identity:** Numeric row reuse remains guarded by lane
  generation and cell identity. Root ancestry tags do not use row numbers,
  are not recycled with rows, and do not keep destroyed owners or payloads
  alive. Owner IDs remain non-reused.
- **Owner destruction:** Destroying a subtree removes owner records and
  pending work as today. A stale handle is never accepted merely because its
  numeric row or a later owner's row is reused.

## Adjacent state-setter compiler fusion

General fusion of adjacent setter calls is not semantics-preserving. A setter
may receive an updater function whose body has effects, reads mutable state, or
throws. Imported callbacks, accessors and getters are opaque and cannot be
assumed pure. Each committed dispatch also synchronously increments its own
version and invokes dirty-cell subscribers; public change listeners receive a
separate callback for each write and may read the intermediate World state.
Changing those into one combined dispatch, or delaying listeners until after
all setters, changes observable behavior. The pending journal already
coalesces owner/site work for the scheduled Root flush, so collapsing dispatch
notifications would add a new semantic mechanism without a clear hot-path
benefit.

A future compiler could only batch a narrowly proven sequence if it preserves
the individual dispatches, action evaluation order, version increments,
`Object.is` no-op behavior, listener observations and exception boundaries.
That is not fusion of notifications, and without evidence that scheduling or
journal marking remains dominant it is not the next optimization proposed
here. Do not infer purity from a syntactically adjacent call or from an
imported function's source shape.

## Finite validation for the proposed change

1. Unit-test root-scope membership for a root owner, multiple nesting levels,
   sibling roots in one World, a nested/grafted root sharing descendants with
   an outer root, arbitrary-ancestor `isWithin`, and destruction.
2. Test private owner creation, replacement, rollback, discard, stale
   preparation, and publication; compare the new root query with
   `isWithin(owner, rootOwner)` for every live owner/root pair in each state.
3. Test two Roots sharing a World, and public dirty/change listener order and
   intermediate reads, proving that only Root membership filtering changed.
4. Test numeric promotion, owner destruction followed by row reuse, and
   reentrant writes through the existing native-cut suite; require the same
   captured-version acknowledgement and stale-handle outcomes.
5. Run the existing async/store/collection candidate lifecycle suites to
   verify private root tags are invisible before publication and discarded
   candidates do not retain or leak live membership.
6. Collect a new matched product timing candidate under the unchanged gate.
   Report failure as failure; fewer parent-chain lookups are implementation
   evidence, not a speed result.
