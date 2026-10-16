# Conditional contract: compiler-known owner/site numeric lanes

**Status: proposal only; implementation remains gated on the registered timing
result.** This note narrows the layout design to the actual `NumericColumn` and
VDOM APIs. It makes no speed claim.

## Current API constraints

`NumericColumn` in `src/jsx_binding_runtime.ts` has a stable object identity,
`sourceSlot`, `ScalarSource`, and a public `Float64Array values`. Its capacity is
fixed when created; callers can replace `values`, but there is no reserve or
row-generation contract. `bindCompiledColumn` stores the column reference and
an entity index in each binding.

`VDOMSnapshotRoot.setColumnRows` in `src/vdom_snapshot_runtime.ts` validates
each dirty row against the bound column and row index. It increments each
column's source, scans the groups for those rows, then creates fresh
`stagedGroups`, `stagedSources`, and `stagedValues` arrays on every call. It
projects all changed groups before the first host write, which is important for
consistent staging and host-error behavior. Its row-group index is built from
activated bindings. Therefore changing `column.values` capacity alone is not
enough to add mounted bindings for new owner rows; normal structural activation
must attach/index those bindings. Existing retained bindings continue to refer
to the same column object.

The smallest viable layout should preserve those semantics while adding
capacity growth and a Root-to-VDOM dirty-row cut. It should not copy lane values
into a second generic state-change snapshot.

## Minimal layout contract

The compiler emits an optional immutable layout descriptor for a component
site. It is an internal extension of the existing metadata, with a versioned,
dense mapping from state hook site to numeric lane slot. A lane is emitted only
for a `useState` site proven to feed supported unary numeric prop bindings and
to have no other compiler-known consumer. Ordinary authored `useState` stays
unchanged. Components or sites without this proof use the existing cell and
binding path.

The World owns one layout instance per compiled component site. A layout
instance owns one `NumericColumn` per eligible hook slot and a row allocator.
Each live owner has a row and row generation; reuse increments generation.
Each state cell retains its stable public handle, logical version, setter
semantics, and owner/site identity. Its internal address is the tuple
`(layoutId, slot, row, ownerGeneration, rowGeneration)`. Resolving a handle to
that address is an exact identity check, not an inference from row equality.

The minimum internal address shape passed between World, Root, and VDOM is:

```ts
type CapturedLayoutCell = {
  layout: StateLayout;
  column: NumericColumn;
  slot: number;
  row: number;
  ownerGeneration: number;
  rowGeneration: number;
  cellIdentity: object;
  version: number;
};
```

This is a contract sketch, not a requirement to allocate one object per dirty
cell. Production capture should fill reusable parallel buffers with these
fields (including the column/layout references) and a count. Root must retain
the captured versions and generations until host commit and acknowledgement.
There is no intermediate `StateChange[]`, per-cell `{source,current,previous}`
materialization, or copied column-value buffer on the eligible numeric route.

### Growth and VDOM binding

Add an internal `NumericColumn.reserve(minCapacity)` operation. It may replace
the `Float64Array` with a larger array and copy the live prefix, but must keep
the `NumericColumn` object, `source`, `id`, and `sourceSlot` stable. Growth is
geometric or otherwise bounded by a documented capacity policy; it occurs only
when allocating an owner row, not while applying a dirty cut. Capacity is not
live-row count. Retired rows are cleared before reuse, and every reuse advances
the row generation.

Owner activation binds generated props with the layout's existing column and
the owner's row through the equivalent of `bindCompiledColumn`. VDOM
structural activation remains the authority for adding/removing bound groups
and rebuilding the row index. A live row may not be exposed to a VDOM binding
until its owner identity and generation have been installed. Row retirement
detaches the owner bindings through the existing structural lifecycle before
the row can be reused.

### Setter and sticky promotion

The ordinary setter remains the only author-visible state update operation. A
lane setter computes the same `StateAction<T>` result and `Object.is` check as
the object-cell path, then increments the same logical version and marks the
same World journal/root queues. A number stays in the lane. If an action
returns a non-number, promote that owner/site cell to an ordinary cell before
notifying listeners: preserve current value, cell identity, setter contract,
and version; mark the lane row as promoted and advance its generation so stale
captured row addresses fail. Promotion is sticky for that owner lifetime.
Other owners in the same column remain eligible. Promoted sites render through
the normal generic prop binding path; the compiler helper must accept this
runtime fallback without fabricating a numeric source.

`NaN` and infinities remain numbers under the runtime representation check;
any stricter numeric domain must be a separate compiler proof and is outside
this first cut.

### Root cut and VDOM staging

World offers Root a capture/validate/ack contract for eligible layout cells:

1. Capture dirty native handles and their exact cell versions into Root's
   reusable buffers, resolving each address only once. Reject the lane route
   before host writes if any entry is legacy/promoted, stale, non-numeric, or
   outside the bound layout. Leave the queue intact and use the current
   generic path for that cut.
2. Pass layout columns plus the captured dirty row descriptors directly to one
   VDOM row-cut entry point. The entry point verifies row generations and
   bindings, reads values directly from `column.values[row]`, and stages every
   affected projected prop before the first host write.
3. Preserve `setColumnRows` ordering and host failure behavior, but retain its
   staging arrays as VDOM-owned reusable high-water buffers. Fill a used prefix,
   project into its value prefix, perform writes, then clear object references
   in that prefix in `finally`. This removes per-cut staging-array allocation
   without skipping the all-projections-before-writes boundary. Capacity grows
   only to the observed peak and is released on VDOM disposal.
4. After successful host writes, acknowledge World and Root queues only through
   each captured version and matching owner/cell/row generations. A setter
   reentered by a host writer has a newer version and remains pending. If a
   host writer throws, retain the current terminal host-failure policy and do
   not acknowledge the captured cut.

This is one direct lane-to-column route, not a second general-purpose
transaction or snapshot layer. Sparse row input remains the initial policy;
do not introduce density selection in this contract.

## Candidate and shared-World rules

Rows and overlays created during a candidate render are private until
validation, host commit, and publication. A replacement owner cannot overwrite
the committed owner's row before publication. Candidate state writes are held
in a private row or a bounded overlay keyed by candidate owner/site; validation
checks owner generation, cell identity/version, and row generation before any
host write. On discard, release private rows/overlays and advance their
generations. On publish, install the candidate row/index atomically with the
existing World publication order.

For a mixed store/collection/state candidate, candidate column writes join the
same `commitHost` staging boundary as its collection and store reader writes.
Do not run a post-publication numeric flush. Refs and effects stay after host
commit and World publication, so they observe the published lane values.

A shared World owns the lane storage once. Each Root independently subscribes,
captures/acknowledges versions, and has its own VDOM groups and host writes. One
Root's acknowledgement must not clear another Root's pending cut. Forked or
transition candidates use private overlays and cannot mutate the shared
committed `Float64Array` before validation/publication. Column source identity
and compiler source slots must remain stable for every Root binding the same
layout.

## Bounded ownership and dependency order

Keep agent ownership disjoint; integration starts only after the timing gate
and follows this order:

1. **Compiler metadata/helper agent** — own
   `compiler/oxc-spike/src/main.rs` and compiler-authored proof fixtures/tests.
   Emit the versioned state-site-to-slot descriptor and hidden slot arguments
   for existing transformed helpers. Do not alter author syntax or runtime
   storage. This schema is the dependency consumed by the World and binding
   work.
2. **World agent** — own `src/owner_state_world.ts` plus one new focused layout
   module/test if needed. Implement layout registry, capacity/row allocator,
   exact handle address resolution, versions/generations, promotion, and
   candidate-private row/overlay lifecycle. Preserve public snapshot APIs and
   listener/journal ordering. This depends on the compiler descriptor shape;
   expose stable internal layout handles for Root and the binding helper.
3. **Binding-helper agent** — own `src/jsx_binding_runtime.ts` and a new
   focused helper test. Add only the internal operations needed to reserve a
   `NumericColumn` and bind a certified layout slot/owner row to the existing
   compiled-column binding representation. No World queue policy or Root
   flush changes.
4. **VDOM agent** — own `src/vdom_snapshot_runtime.ts` and focused VDOM tests.
   Add the generation-checked multi-column dirty-row entry point and reusable
   projection/write staging buffers. Keep binding activation/indexing and host
   writer/error/ref/effect boundaries authoritative. It consumes the binding
   contract from step 3.
5. **Root agent** — own `src/component_state_runtime.ts` and focused Root tests.
   Resolve emitted layouts at owner activation, capture exact World addresses
   into reusable buffers, select the lane only for a wholly eligible numeric
   cut, route all other work through existing fallback/candidate paths, and
   acknowledge only captured versions after success. Include lane writes in
   mixed candidates' existing host commit. This depends on the World capture
   API and VDOM cut API; it must not write columns directly around VDOM.

The integration handoff between steps should specify descriptor version and
slot numbering, row/generation/address types, VDOM dirty-row method signature,
capacity ownership, and exact-version acknowledgement before parallel source
changes begin. Keep the first implementation to unary numeric state outputs in
one compiled component layout. Store/collection composition, multiple layouts
per candidate, and compound projections need focused proof before widening.

## Evidence boundary

The existing whole-page CPU and allocation samples identify contexts worth
testing; they do not establish update-only cost or predict savings from this
contract. `setColumnRows` currently allocates staging arrays per invocation,
while the proposed reusable VDOM staging buffers are a hypothesis to measure,
not a result. CSS projection, equality, and actual host mutation remain on the
changed-value path. Any implementation remains conditional on the unchanged
registered timing gate and must preserve its failures and thresholds.
