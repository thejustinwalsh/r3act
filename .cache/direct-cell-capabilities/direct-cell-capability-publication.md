# Direct cell capability patch: publication plan

Status: v3 reviewable staged patch only. Runtime source has not been changed.
Focused staged checks pass; this is ready for source review, not yet applied.

## Intended source surface

The staged source patch is `.cache/direct-cell-capabilities/implementation-v3.patch`.
Its only tracked-source changes are:

- `src/owner_state_world.ts`
- `src/direct_cell_capability_test.ts` (new)
- `src/direct_cell_capability_retention_proof.ts` (new standalone GC proof)

The proposal exports `NumericCellRowView` and
`OwnerStateWorld.numericRowForCell(handle, version)`. The returned view is
created once when a committed cell attaches to a numeric row and then reused by
exact handle/version queries. Exact cell and row resolution uses no identity,
layout, owner-row, or site-slot `Map` lookup and allocates no result tuple.
The existing layout indexes remain for allocation and teardown.

## Identity contract

The public frozen handle remains the plain `{ owner, site, cellIdentity }`
record. A copied handle alias with the same capability and matching owner/site
continues to resolve. The `cellIdentity` value becomes a frozen, null-prototype
object with module-private class fields. Those fields contain the per-World
secret, owner/site, and committed cell pointer. Resolver checks use a private
brand, not `instanceof`, symbol properties, or a `WeakMap` lookup. Forged,
proxied-capability, null, mismatched, foreign-World, and revoked capabilities
fail closed.

Each public API snapshots handle owner, site, and capability exactly once
before private resolution. Batch acknowledgement also snapshots the handle
array entry and captured version first. Any getter or proxy trap that throws
returns null/no-op; a getter that destroys the cell revokes the capability
before resolution. No public handle or input-array property is read after the
private capability proves the cell live. Generic `StateChange.cellIdentity`
resolution keeps the existing identity WeakMap.

Destroy revokes the capability and clears its private cell and World-secret
references before deleting the owner, releasing the row, and clearing cell
payloads. This leaves copied public handles inert while preserving legacy
change-object lookup during the cell's lifetime.

## Row lease and view

Each active owner row gets one private `NumericRowLease`, stored on the row
record and borrowed by attached committed cells. It captures normalized layout,
owner, row, generation, columns, source slots, and lane slots; it never stores a
cell or World pointer. Its exposed `rowIdentity` has a null prototype, no
reflectable data fields, and no instance mutation methods. The cached per-cell
view captures only public address primitives, layout, and this lease.

Lane currentness checks the cell's lane, layout, slot, source, cached view, and
lease directly. The lease verifies active state, exact owner/layout/row/
generation, lane identity, column identity at the cell slot, source identity at
the slot, and site-to-slot correspondence through the normalized dense slot
array. It does not use the WeakMap or owner-row/site-slot maps. The outer public
lane address remains unchanged.

The cached row view is a plain frozen data object with definite lane/source
references and shared `sources`/`columns` arrays typed readonly. It has no
getters and adds no runtime proxy to hot row access. A view is created only
when both lane and source exist; if source creation follows attachment, the
view is rebuilt once at that activation edge. Exact-version resolution checks
that the cached view source is still the cell source. On detach, source and
lane slots clear before decrementing row occupancy. Promotion and destruction
clear the cell's cached view. On last-cell release, the lease clears source
and lane slots, becomes inactive, then row generation advances and the row can
enter the free list. A retained old view intentionally keeps its own lane and
source references; its shared source array has its entries cleared. The next
row allocation receives a distinct lease and generation.

New and private candidate cells initialize identity, handle, lease, and view
fields to `undefined`. Candidate copies do not borrow those fields. Publishing
into an existing committed cell retains its identity and row lease; publishing
a new committed cell creates a row lease only when it attaches to an allocated
numeric row, and creates an identity only after the first committed dispatch.

## Focused proof set

The Deno test covers copied aliases, exact-version queries, frozen data-only
row views and reuse,
forged and proxied identity capabilities, cross-World rejection, address
getters that destroy the owner, batch input getters, row source cleanup and
generation reuse, newer-write acknowledgement, legacy future-cut acknowledgement,
and functional-updater destruction. A separate Deno GC script retains only a
dead copied handle while checking that its payload collects after destruction;
the filename intentionally does not match Deno's test discovery convention.
Run it explicitly with `deno run --config deno.browser.json
--v8-flags=--expose-gc
.cache/direct-cell-capabilities/proposed/src/direct_cell_capability_retention_proof.ts`.
The GC loop does not call `WeakRef.deref()` until after its collection attempts,
so it does not keep the target alive during the proof.

V3 staged verification passed:

- `deno check --config deno.browser.json` for the staged World and two tests
- `deno test --config deno.browser.json .cache/direct-cell-capabilities/proposed/src/direct_cell_capability_test.ts` (8 passed)
- the standalone GC command above (`PASS`)
- ten staged World suites (67 passed): owner state, preparation replacement,
  preparation savepoints, preparation, state staging, numeric layout, World
  dirty journal integration, dirty journal, native cell channel, and native
  cell cut

V1 and V2 patch artifacts are preserved. V3 is emitted to
`.cache/direct-cell-capabilities/implementation-v3.patch`.
The standalone proof ends in `_proof.ts`, not `_test.ts`, so Deno's ordinary
test discovery does not import it; it runs only through the explicit command.

These are correctness and retention checks, not speed evidence. The current
matched latency study remains FAIL; the patch makes no performance claim.
