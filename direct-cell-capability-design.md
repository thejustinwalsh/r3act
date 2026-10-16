# Direct committed-cell capability and row-lease design

13 October 2026. Read-only architecture proposal. No runtime, test, build, or
measurement files were changed for this audit. The current matched timing study
is archived as `284ce137...` (53 files). All 30 pages, 7,200 measured frames,
and 925 locks passed; latency is **FAIL**: median ratios 1.1752 / 1.2165 /
1.2596 and p95 ratios 1.4151 / 1.1226 / 1.3246. These are ratios, not
milliseconds. This proposal makes no claim that fewer lookups will improve the
result. The older CPU profile is not used as current-build attribution.

## Current lookup path

The hot captured-cell route crosses several structures even though the event
already carries an exact handle and version:

| Operation | Current work |
| --- | --- |
| `numericLaneForCell(handle, version)` | `#committedCellsByIdentity.get(handle.cellIdentity)`; compares handle identity fields and `entry.cell.version`; reads `cell.lane`; calls `#laneAddressIsCurrent`. |
| `#laneAddressIsCurrent(owner, site, cell, lane)` | Resolves the layout through `#numericLayouts`, then `rowsByOwner.get(owner)` and `slotsBySite.get(site)`, and checks row, generation, column, owner, site, cell lane, promotion, and numeric value. |
| `clearCellChangesThrough(handles, versions, count)` | Repeats the identity `WeakMap` lookup and handle owner/site checks for each captured entry, keeps the `cell.version <= capturedVersion` rule, then deletes the prepared dirty membership. |
| `scalarSourceForCell(handle)` / `versionForCell(handle)` | Resolve the same identity `WeakMap` entry and repeat owner/site identity checks. |
| `#laneIsCurrent` | Adds `#owners.has(owner)` and `#stateByOwner.get(owner)?.get(site) === cell` around the layout/row/slot checks. It is used by `numericLane` and `#ensureNumericLane`. |

`#numericLayouts`, `rowsByOwner`, and `slotsBySite` still have legitimate
allocation and release responsibilities. `#layoutRecord` and `#ensureNumericLane`
currently consult them even when a cell already has a current lane: `ensure`
resolves the layout first, then checks the current lane through the owner,
state, layout, row, and slot maps. Move the existing-lease check ahead of
`#layoutRecord`. With the exact cell already selected by `useState`, publication,
or `numericLane`, the attached lease can validate directly. Only the lane-miss
path needs layout/row maps for allocation, and `#releaseNumericLane` keeps those
maps for retirement. The proposal does not remove the lifecycle indexes.

## Identity lifetime and isolation today

A committed `StateCell` starts without `cellIdentity` or `cellHandle`. The first
committed dispatch that survives the functional-updater liveness guard creates
a stable identity object and a frozen `{ owner, site, cellIdentity }` handle,
stores the handle on the cell, and inserts a `CommittedCellIdentity` in
`#committedCellsByIdentity`. Notifications carry the stable handle/version;
public `StateChange` keeps its existing identity-object shape.

Candidate cells copy values, versions, layout intent, and scalar-source state,
but do not copy the committed identity, handle, lane, or dirty membership. A
private write therefore creates no live capability. Publishing into an existing
owner copies candidate state into the existing cell and preserves its identity
and lane. Publishing a new cell installs it without identity until its first
committed dispatch. Destroying an owner deletes the identity-map entry, releases
the lane, clears dirty membership and value/source payloads, then removes its
state map. The functional-updater guard prevents user code from destroying the
cell and then letting the same dispatch install a new identity on the dead cell.

Physical cell identity does not mean that an owner still occupies its keyed
child slot. A replacement can publish into a slot while the old owner remains
physically alive until retirement. World cell APIs resolve that old owner as
live until `destroyOwner`; Root and candidate validation own slot/row membership.
A direct capability must preserve this boundary and must not add a slot lookup.

## Proposed contract

Keep `StateCellHandle` as the existing plain, frozen public record with
`owner`, `site`, and `cellIdentity` fields. Do not brand the outer handle:
callers can copy it, and copied records with the same identity capability and
matching owner/site are a supported alias. Keep its structural TypeScript shape
for synthetic handles used by generic pending-change code.

Make `cellIdentity` itself a module-private, revocable private-class capability.
Its private state holds a per-World secret, immutable owner/site address, and a
pointer to the committed `StateCell`. It contains no World reference, callback,
source value, or numeric layout. A private-brand resolver takes the identity,
expected World secret, and captured owner/site, then returns the committed cell
only when the brand and all address fields match. A copied outer handle with the
same `cellIdentity` and same owner/site resolves; changed/forged tuples,
nulls, forged identities, proxies of the identity capability, and foreign-World
identities return `null` or no-op. Use a private-brand test that does not invoke
proxy traps. The public outer handle remains a plain record for compatibility;
JavaScript provides no trap-free way to distinguish a transparent proxy of
that record from the record itself. Therefore outer-handle proxies are handled
by snapshotting their fields before resolution: thrown traps return `null` or
no-op, and side effects that destroy the cell revoke the capability before it
can resolve. The resolver must never read outer fields again after resolution.

Before resolving the private identity, each public handle API snapshots every
outer address field exactly once, in this order or an equivalent all-before-
resolve sequence: `owner`, `site`, and `cellIdentity`. For batch acknowledgement,
also read the handle-array entry and captured-version entry before resolving
that identity. Accessor/proxy exceptions return `null` or no-op. The resolver
then validates only those captured primitives plus private identity state; no
outer handle, handle-array, or version-array property is read after liveness is
established. This is required because an address or array getter can destroy the
owner as a side effect. If the destroy happens during extraction, it revokes the
identity before resolution; if getters ran after resolution, they could
otherwise invalidate the returned cell before the API uses it.

The capability itself must be opaque, not a symbol-keyed record or an
`instanceof` check. A private class brand test (for example, `#identity in
candidate`) rejects forged values and proxies of a genuine identity without
invoking proxy traps. The resolver snapshots the candidate once, checks the
private brand and World secret, then uses only its private identity data plus
the already captured owner/site. Revocation clears both the cell pointer and
World-secret reference. This keeps copied public handle aliases valid while
making retained identity tokens inert after owner destruction.

On the first committed dispatch, create one identity capability bound to the
World secret, owner, site, and cell; store it as `cell.cellIdentity`, and keep
the existing frozen plain handle with that identity. Continue populating
`#committedCellsByIdentity` for `StateChange.cellIdentity` resolution and
explicitly deleting it on destroy. Exact-handle APIs resolve the identity
directly instead of consulting that map. A private candidate copy receives
neither the identity capability nor any row lease. Publication into an existing
cell retains its identity; a newly committed cell gets one only on its first
committed dispatch.

On owner destruction, revoke the identity capability before releasing cell
payloads: clear its private cell pointer and World-secret reference, clear the
cell's identity/handle fields, delete the identity-map entry, release its lane
and row lease, clear dirty membership, then clear value/source payloads. A
retained outer handle then references only its frozen public fields and a
revoked identity object. It cannot keep the cell, source, World, row lease, or
neighboring owners alive.

### Cached row-record lease

Add a `NumericRowLease` owned by the current numeric row record and referenced
by each committed cell attached to that row. Its minimal mutable/private state
is `active`, `owner`, `row`, `generation`, and the layout's columns-array
pointer. The cell stores `rowLease` in a fixed initial shape; the lease stores
no cells, World, sources, or payload values. Candidate cells always start with
`rowLease: undefined`; they never borrow a committed lease or row record.

The row record is the sole owner of the lease. The cell only borrows its opaque
lease reference while attached. A private lease brand prevents callers from
forging or reflecting mutable row data. The lease does not contain a cell
pointer, and identity capability data and leases are never copied into private
candidate cells. The committed cell keeps its slot number in a fixed-shape
field, so validation compares the lane column directly with
`lease.columns[cell.numericLaneSlot]` without consulting the layout or slot
maps.

On a lane hit, `#ensureNumericLane`, `#laneIsCurrent`, and
`#laneAddressIsCurrent` validate through the already selected cell and lease:
lease active; exact owner; `cell.rowLease === lease`; current immutable lane has
the same row, generation, owner, and site; its column equals
`lease.columns[cell.numericLaneSlot]`; the cell is not promoted and remains
numeric. This preserves explicit row-generation, column, and slot checks without
`#numericLayouts`, `rowsByOwner`, or `slotsBySite` lookups. Move the existing
lease check in `#ensureNumericLane` before `#layoutRecord`, so the repeated
`useState` path for an already lane-backed cell takes this path. Keep all three
indexes for lane allocation and release.

Lease lifecycle must match row lifecycle exactly:

1. When allocating a row, create a fresh active lease with its owner, row,
   generation, and columns pointer; store it in the existing row record and on
   each committed cell when attaching lanes.
2. When releasing one cell from a shared row, detach its lane and clear that
   cell's `rowLease` before decrementing the row's cell count. Keep the row lease
   active while other cells still use that row.
3. When the last cell leaves, mark the row lease inactive and clear its columns
   pointer before incrementing the stored row generation or putting the row on
   `freeRows`. The next allocation creates a distinct lease at the incremented
   generation; an old lease cannot validate against it.
4. Promotion, owner destruction, and any other lane detach clear the cell's row
   lease before releasing or reusing storage. Destroying the last cell for an
   owner retires and scrubs the lease before the row can be reused.
5. The `NumericLaneAddress` returned publicly stays its existing immutable
   record. It is not itself the authority: currentness comes from the private
   identity capability plus the cell's current active row lease. A separately
   retained lane address may still reference its public shared column; the new
   identity token and row lease must not add a path that retains that address
   after revocation.

The exact-cell entry points use one snapshot-and-resolve helper. All public
fields are captured before identity resolution; version and row checks then use
only the resolved cell and its lease:

```ts
numericLaneForCell(handle, capturedVersion):
  const { owner, site, cellIdentity } = snapshotAddress(handle);
  const cell = resolveIdentity(cellIdentity, worldSecret, owner, site);
  require cell.version === capturedVersion;
  return current cell.lane only if its row lease is active and exact, else null;

versionForCell(handle):
  resolve the snapshotted address;
  return cell.version, else null;

scalarSourceForCell(handle):
  resolve the snapshotted address;
  return cell.source only while the value remains numeric, else null;

clearCellChangesThrough(handles, versions, count):
  snapshot handle[index] and versions[index], then the handle's address fields;
  resolve the exact identity only after those reads;
  skip if current version > captured version;
  unlink that cell's prepared dirty node otherwise.
```

`numericLaneForCell` requires an exact captured version. An older or future
version returns `null`. Native acknowledgement retains its current upper-bound
rule (`currentVersion <= capturedVersion`), including accepted future captured
versions. No identity, owner/site, dirty membership, or version check moves into
the compiler program.

## Compiler owner-row boundary

The Compiler/OwnerRow update-program design is complementary. World resolves a
captured `StateCellHandle` to the exact current cell version and current
owner/generation/site row lease, then supplies the row address and current value.
The compiled owner program groups supported projections, preflights all of its
source/fanout tokens, and performs host writes. It does not resolve cell
identity, recheck World versions, or infer keyed-slot occupancy. Root remains
responsible for selecting the captured cut and acknowledging it only after the
program accepts the cut. This keeps one authority for each invariant and avoids
duplicating World lookups in the owner program.

`numericLane(owner, site)` remains the convenience path for explicit live-owner
lookup and may retain its owner/site map checks. `#ensureNumericLane` and
`#releaseNumericLane` keep layout and row maps for lifecycle operations. The
optimization target is exact captured-cell resolution and acknowledgement,
not all state APIs.

## Finite correctness proof

1. **Identity brand, aliases, and World isolation:** A copied plain handle with
   the same identity capability and matching owner/site resolves to the same
   cell. A forged identity object, mismatched owner/site alias, null, proxy of
   the identity capability, or foreign-World identity returns `null` / no-op
   even when numeric owner IDs match across Worlds. Test address accessors that
   destroy the owner during extraction; the subsequent identity resolution
   must reject the revoked capability, with no post-resolution accessor reads.
2. **Address and version exactness:** Wrong owner/site, a changed identity,
   an old version, and a future version are rejected by lane resolution. The
   same live handle reports its current version/source. An old captured
   acknowledgement preserves a newer dirty write; a future acknowledgement
   retains the current legacy `<=` behavior.
3. **Lease generation and promotion:** The current handle returns its original
   address while the row lease is active. Repeated `useState` layout activation
   validates lease generation, owner, column, and site slot without the layout,
   owner-row, or slot maps. Release of one cell keeps a shared row lease active;
   release of the last cell revokes it and clears the columns pointer before
   generation advance/reuse. Promotion and destruction clear cell leases.
   Reusing a row creates a different lease and higher generation; an old handle
   cannot resolve or clear the new owner's row. Allocation/free-list behavior
   remains indexed by the existing lifecycle maps.
4. **Keyed replacement boundary:** After replacement publication but before old
   owner retirement, the old owner capability remains physically valid, just
   as it does today. It does not claim that the old owner still occupies the
   keyed slot. After `destroyOwner(oldOwner)`, the old capability is revoked.
   Candidate slot validation and Root row membership remain separate checks.
5. **Candidate isolation and publication:** Candidate copies contain no
   capability or lane lease. Discard/rollback leaves the live capability and
   lane unchanged. Existing-cell publication preserves the exact handle, source,
   and lane; new-cell publication produces a capability only on its first
   committed dispatch.
6. **Reentrant dispatch and acknowledgement:** A functional updater that
   destroys/replaces its owner returns `false` before post-updater mutation,
   dirty marking, identity creation, or notification. Listener reentry that
   advances a still-live cell keeps its newer version and dirty membership.
   Acknowledgement uses the captured prefix and cannot clear newer writes.
7. **Retained-token cleanup:** Keep a copied handle and its identity capability
   after destroying its owner, while holding only `WeakRef`s to a payload,
   `ScalarSource`, and row lease; after explicit GC, they should collect. The
   retained identity capability must have its private cell pointer and World
   secret cleared; the retained ordinary setter also must not keep the
   payload/source because destruction clears those fields. This validates
   identity revocation, row-lease scrubbing (including clearing its columns
   pointer before row reuse), and explicit deletion of the identity weak-map
   entry. A separately retained public lane address may still reference a
   shared `NumericColumn`; the new capability must not extend that existing
   edge.
8. **Compatibility:** `scalarSourceForChange`, `versionForChange`, public
   `StateChange.cellIdentity` stability, generic pending-change APIs, native
   listener ordering/snapshots, dirty journal ordering, promotion, and row
   release behavior continue to pass their current suites.

These cases define the implementation gate; they are not benchmark evidence.
