# Stable notifications and coherent numeric projections

12 October 2026. This is a bounded continuation of M3, preserving the full
library's existing compiler, root, store and host contracts.

## Stable notification identity

Each committed state cell lazily owns one opaque identity. Notifications retain
their owner/site address and a fresh immutable captured version, and now carry
that identity. Existing-cell candidate publication retains the committed cell's
identity; candidate copies do not alias it. Public `pendingChanges()` and
`drainChanges()` retain their original plain record shape.

The root's pending queue caches identity-to-key resolution. Repeated notifications
and acknowledgements use that cache instead of resolving nested owner/site maps.
Legacy records still coalesce with identified records in their original insertion
order. Owner removal invalidates key liveness; clear resets the weak cache. Root
review added address checks so a reused foreign identity cannot alias another
owner or site. No strong list of identity aliases is retained.

This is not a complete dirty-slot program: world acknowledgement, root eligibility,
source resolution, notifications and listener snapshots still incur their existing
work. Notification records are still allocated. No speedup is inferred from
replacing a lookup.

## Correctness failure found during integration

A host writer could synchronously update a second state source. Later projections
in that same numeric batch then read the new value, mixing versions. The preserved
failing test observed `[2, 9, 11]` instead of captured `[2, 3, 5]` for two fields
and their sum. A real Rust/OXC-compiled ordinary TSX regression covers this case.

Scalar batches now project every affected prop before invoking the first host
writer. Native state setters triggered by a writer remain pending; the current
commit uses its captured cut and the next commit uses the newer version. Compound
projections, primitive equality suppression and conservative mutable-object
writes remain in place.

Dense columns, selected rows and selected buckets now capture numeric inputs and
projected values before writing too. Duplicate visits use a per-invocation group
marker, retaining one projection/write per changed group. All dense column inputs
are validated before any source version advances. Host errors still propagate;
successful writes update committed history only after the writer returns.

Raw VDOM numeric APIs reject nested direct numeric mutations before mutation and
reset the guard in `finally`. A caller can retry the rejected call after the outer
batch finishes. This differs from native state setters, which use the scheduler's
existing deferred flow. Root review rejected an initial raw test that allowed a
nested commit to be overwritten by the outer one. Raw topology mutation during a
numeric writer is outside the supported contract; native root guards remain.
Host mutation has no rollback guarantee. No broader arbitrary-projector purity
or atomic GPU/DOM rollback claim is made.

## Allocation and performance implications

Scalar staging adds one O(A) array of projected references per changed batch.
Column staging adds one invocation token and three O(A) arrays for groups,
numeric inputs and projected references. It adds no per-field staging objects or
global pending payload. The column path no longer has its former allocation-free
staging shape; previous kernel measurements cannot qualify this implementation.
Future executable programs should reuse safely scoped buffers while retaining
these captured-cut semantics. This checkpoint's integrated speed and allocation
verdicts remain unmeasured.

## Verification and next work

482 runtime tests, 28 Rust tests and 48 integration commands pass, including
compiled TSX cut/reentry coverage, Three/DOM hosts, async stores, forked-root
work queues, retention, HMR and a newly installed package. Six separate production
pilot pages pass at 128, 512 and 1,024 rows for both arms. The frozen source/build
checkpoint is `implementation/2026-10-12-cell-identity-cut`. Historical production
builds, notebooks and evidence remain preserved.

Next: attribute current phase counts/allocation, connect committed source/sink
identities to root-local eligibility and executable update programs, and compose
numeric/structural/store work through one candidate. The integrated latency,
allocation, device and maintenance gates remain unchanged. The goal is active;
the requested full Sol review retains its prerequisite hold.
