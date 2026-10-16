# Canonical change resolution and compiled eligibility reuse

12 October 2026. Bounded M3 integration after the captured-projection checkpoint.

## Implemented

Committed notification identities now resolve their canonical cell through a
world-local weak index. Source and current-version reads validate the owner/site
address and retain the original liveness checks. Legacy, foreign or misaddressed
identities fall back to addressed lookup. Existing candidate publication mutates
the committed cell in place; private candidate sources never enter this index.
World acknowledgement uses the identity resolution while captured versions stay
immutable. Identity registration happens once, without an added weak-index lookup
on every dispatch.

The native root interprets the compiler's approved sites intersected with active
bindings once per reused committed component cache. Subsequent numeric updates
reuse that result. A cache replacement caused by conditional binding changes
invalidates this interpretation naturally. Caches remain root-local with shared
worlds. Owners without active/proven direct bindings use a shared empty set;
generic rerenders do not allocate empty eligibility sets. The full invalidation
graph, mixed/store/resource/collection planning and candidate numeric-write route
retain their existing decisions.

Numeric flush records retain the immutable original change instead of duplicating
owner, site and version. Restore guards use canonical source/version resolution
and preserve newer reentrant writes. This does not remove pending records,
listener snapshots, per-owner eligibility maps, source batching maps/sets or
tuple arrays. It is not yet the executable dirty-slot program.

## Primary review and verification

Review removed repeated owner-liveness checks that would have added lookup work
and changed dead-owner behavior. Destroying an owner explicitly removes its
identity index entries, so retained notification identities do not retain removed
state payloads through a live world. A narrow Node GC test passes, and a temporary
negative-control copy without that deletion fails as expected. Both records are
preserved. This is specific retention evidence, not a universal leak guarantee.

495 runtime tests, 28 Rust tests and 49 integration commands pass. A real
pragma-free Rust/OXC TSX fixture observes one eligibility-cache construction and
two metadata-site inspections across an initial two-source update and reentrant
retry; the retry has zero further metadata inspections. Focused tests cover
conditional removal/re-add, foreign identity fallback, shared-world root isolation,
mixed store work, destroyed owners, numeric promotion and reentrant acknowledgement.
Installed package, DOM/Three hosts, HMR, async transitions and retention checks
remain passing. Six separately collected production pilot pages pass.

The frozen checkpoint is `implementation/2026-10-12-state-resolution`, status
`STATE_RESOLUTION_CORRECTNESS_VERIFIED`. Historical builds, notebook and evidence
remain unchanged. The candidate's speed/allocation/device/maintenance verdicts are
unmeasured; counters prove removed interpretation work, not elapsed-time advantage.

## Next decision

Collect separately registered allocation diagnostics on this tested production
build, retaining raw tree and flat sample representations and independently
checking their attribution. Use the resulting transient-allocation ledger to
choose the executable update program's queue, source normalization and scratch
ownership design. Preserve captured-cut semantics when reusing buffers. Numeric
and keyed structural work still require the planned common candidate integration.
The full goal remains active, with the original release gates and Sol review hold.
