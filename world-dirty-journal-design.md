# World dirty journal: bounded replacement option

13 October 2026. This is a conditional design option after the current timing
confirmation. The allocation profile locates `Set` creation in World dispatch
and `Set`/`Map` deletion in acknowledgement, but that attribution does not prove
those operations are a latency bottleneck or that removing them will improve
speed. Keep the current implementation unless the timing result and attributed
dispatch cost justify this experiment.

## Current contract

`OwnerStateWorld.#dirtyByOwner` is an insertion-ordered `Map<OwnerId,
Set<StateSiteId>>`. It establishes two ordering levels:

1. Owners are listed in the order they first became dirty while absent from the
   map. An owner remains at its position while it has at least one dirty site.
2. Sites are listed in the order they became dirty while absent from that
   owner's set. Acknowledging one site and writing it again appends it after the
   owner's other currently dirty sites.

Repeated writes coalesce by owner/site. `pendingChanges()` reads current cell
versions and returns the legacy `{ owner, site, version }` shape. `drainChanges()`
returns that snapshot and clears the current work. `clearChangesThrough()` and
`clearCellChangesThrough()` remove only captured entries whose live cell version
has not advanced beyond the captured version. A newer or reentrant write must
remain pending. Destroying an owner removes its dirty work.

Preparation writes are isolated: private setters do not enter the World journal.
Successful `OwnerPreparation.publish()` adds changed existing cells and new
cells with a nonzero candidate version. `discardPrivateOwner()` and
`OwnerPreparation.discard()` must not add or remove committed dirty work. A
replacement owner has a fresh, never-reused `OwnerId`; retiring the old owner
after publish removes only that old ID's journal entries.

## Smallest candidate structure

Replace the per-owner `Set` with a dedicated, persistent owner/site journal:

- A lookup `Map<OwnerId, DirtyOwnerBucket>` retains one bucket from an owner's
  first committed dirty write until `destroyOwner()`.
- Each bucket has a lookup `Map<StateSiteId, DirtySiteEntry>` and an intrusive
  ordered list of its currently dirty site entries.
- The journal has an intrusive ordered list of currently active owner buckets.
  A bucket links into this list when its first site becomes dirty, stays in
  place while it has dirty sites, and unlinks when its last site is acknowledged
  or drained. A later write links it at the tail.
- A site entry is linked at its bucket's tail on a clean-to-dirty transition and
  unlinked on acknowledgement. Its node can be reused if that site is dirtied
  again. It stores no state value, scalar source, cell, handle, or payload.

This removes recurring per-owner `Set` construction and avoids deleting and
recreating the owner lookup entry on every empty/nonempty transition. It still
uses one small site lookup map per bucket and node metadata per unique
owner/site dirtied. The journal's operations remain O(1) per state write or
acknowledgement, excluding the existing snapshot construction and version
lookup.

Do not add journal membership to `OwnerRecord`: private owner records are
candidate data and must not acquire committed journal state before publication.
Create or activate the bucket only as committed dirty work is installed. During
publish, process candidate owner/site cells in the existing iteration order so
new pending-order behavior matches today's implementation.

## Captures, acknowledgement, and lifecycle

`pendingChanges()` walks active owner buckets, then each bucket's active site
list, and creates the same current-version public records in the same order.
`drainChanges()` creates the snapshot first, then unlinks all active sites and
owners. It retains reusable bucket/site metadata until owner destruction.

For both clear methods, validate the same address, liveness, identity where
provided, and captured-version conditions as today. When a site is cleared,
unlink that site node. If the bucket becomes empty, unlink it from active owner
order; otherwise keep its owner position. If a later write reactivates an
unlinked bucket or site, append it at the corresponding tail. A write that
advanced past a captured version leaves its node and order untouched.

`#dispatchState()` must mark the site dirty before calling listeners, as today,
so listener-triggered writes coalesce into the already active entry and use the
same reentrancy behavior. `OwnerPreparation.publish()` activates journal entries
only for the existing changed-cell and newly committed nonzero-version cases.
Preparation discard/cancellation never touches the journal. `destroyOwner()`
recursively unlinks and removes each destroyed owner's bucket and its site map;
never key cleanup by component slot, since replacement can leave old and new
owner incarnations alive at once. Cell identity remains managed by the existing
weak identity table and is not a journal node lifetime key.

## Reusing `PendingStateChanges` versus a dedicated journal

Reusing `PendingStateChanges` would reduce the number of journal types, but its
current observable order is one global first-arrival queue. World order is
owner-major with site insertion order inside each owner: writes A/site1,
B/site1, A/site2 enumerate as A/site1, A/site2, B/site1. A global queue would
enumerate them in dispatch order and change `pendingChanges()` behavior. It also
supports caller-owned legacy `StateChange` references, native handles, and
identity-indexed acknowledgement for root-local capture; these concerns are not
needed in World storage. Adapting it would require an owner-grouped ordering
mode and careful separation of its root-specific native cut state.

A dedicated `WorldDirtyJournal` is the smaller semantic change: it owns only
owner/site dirty membership and ordering, while World remains responsible for
live version and identity checks. Keep it private to `OwnerStateWorld` unless a
second real consumer appears. Reusing a public/general journal should be
reconsidered only if the owner-grouping behavior becomes a shared requirement.

## Retained-memory risks

The persistent bucket avoids churn by retaining data. Its retained size is
O(unique owners ever dirtied + unique sites ever dirtied per owner) until those
owners are destroyed. This is bounded by normal compiler-generated sites for a
fixed tree, but the public `StateSiteId` API permits dynamic strings; a
long-lived owner that sees unbounded site IDs could grow its site cache.
Destruction must clear the bucket, site map, and intrusive links, including for
owners removed during keyed replacement retirement. Never cache cell values,
closures, sources, handles, or payloads in the journal. If dynamic site churn is
observed, compare a bounded cache/reclamation policy against the allocations it
reintroduces before adopting the persistent design.

The allocation findings report higher post-disposal JS heap for the native arm
than for React in that diagnostic. They do not measure mounted journal retention
or prove this design leaks. Measure mounted and post-disposal retention separately
if this option advances; do not infer a speed improvement from the avoided
allocations alone.

## Exact implementation surface

If selected, changes should be limited to these `OwnerStateWorld` sites and the
new private journal type:

- `#dirtyByOwner`: replace with the dedicated journal field.
- `#dispatchState()`: dirty-site insertion and reentrant ordering.
- `clearCellChangesThrough()`: identity/version-gated site removal.
- `clearChangesThrough()`: captured-version-gated site removal.
- `pendingChanges()` and `drainChanges()`: owner-major snapshot and drain.
- `hasPendingChanges()`: report whether the active owner list is nonempty.
- `OwnerPreparation.publish()`: activate entries for changed existing and new
  candidate cells with the same conditions and traversal order.
- `destroyOwner()`: recursively remove only each destroyed owner ID's bucket.

No changes are required to root-local `PendingStateChanges`, state-cell identity
allocation, notification payloads, owner-slot publication, or candidate
validation. Private preparation and discarded candidate setters remain outside
the committed journal.

## Finite correctness plan

Before any implementation, compare the old and new journal against a small
reference model that uses the current nested `Map`/`Set` semantics. The finite
suite should cover:

1. Interleaved owners and sites; repeated writes; site clear/re-dirty while an
   owner remains active; last-site clear and owner reactivation at the tail.
2. Snapshot versions, `drainChanges()`, stale captured versions, and writes
   triggered reentrantly from change listeners; newer versions must survive.
3. Native handle address/identity validation, dead owners, and acknowledgement
   of an old cut after a newer write.
4. Candidate preparation with writes to an existing cell, a new private owner,
   and a replacement owner; discard and private-subtree cancellation must leave
   committed order and contents unchanged. Publish must enqueue only the same
   cases as the current code, in candidate traversal order.
5. Replacement publication followed by destruction of the old owner; the new
   owner's dirty entries and slot must survive. Recursive owner destruction must
   remove all old descendant entries and leave no pending changes for them.
6. Deterministic randomized operation sequences checked after every operation
   against the nested-map reference for `pendingChanges()`, `hasPendingChanges()`,
   drain results, and captured-version clears.

Only after those checks pass should the integrated timing protocol be run. Report
allocation observations and latency results separately; do not treat one as
evidence for the other.
