# Numeric writers in candidate commits — 12 October 2026

## Change and invariant

The preceding checkpoint exposed an effects-visible inconsistency when a
retained numeric owner stayed cached during another owner's structural/store
update. Its numeric writer ran after the candidate published and activated
effects. The safe workaround rerendered that numeric owner.

Numeric updates now belong to the candidate's host phase. Each candidate attempt
captures the changed numeric source's owner/site, source identity, world state
version, prior committed value and current value. Cached owners do not execute
their state hooks during preparation, so these explicit versions supplement the
ordinary owner/store/resource read cut. They are validated before host mutation
and again before publication. A stale preparation retries with fresh numeric
values; it does not reuse the abandoned candidate's snapshot.

After the prepared VDOM commit installs the candidate's binding index, the
numeric updates run in one `setSources` batch, while the publication barrier is
held. All source values update before any affected prop group writes. Only then
may the candidate publish and run ref callbacks/effects. The old post-publication
numeric flush is removed. Ordinary numeric-only frames retain their direct path.
The committed source-value history advances through candidate publication, not
through speculative preparation.

## Removal and failure behavior

The VDOM exposes `hasBoundSource` as a read-only binding-index query. Removed sinks
are skipped before writing, rather than treating an exception message as control
flow. A host writer throwing the same text as the missing-source diagnostic still
fails the commit. Partial host mutations are not rolled back; the root becomes
terminal and the caller disposes it. No new ref/effect activates for that failure.

A host writer can synchronously mutate state. Restoration preserves a newer
world version rather than overwriting it with the candidate value. Post-host
validation then rejects publication. Candidate-owned numeric entries are cleared
on discard, failure and completion. No full committed-source Map clone is needed
to stage the changed sites.

## Maintained evidence

Seven focused runtime tests exercise store plus numeric work, structural plus
numeric work, removal, writer failure, stale preparation/retry, compound sources,
and state mutation during the host phase. Root review added a newly attached ref
that reads the numeric prop, new effects/refs that must stay unpublished after a
failure, and a compound prop that must receive the complete tuple **once**.

The existing store regression now requires the numeric owner render count to
stay at its initial **one**, while preserving its stronger assertion that a
newly mounted effect sees the fresh numeric prop and selector history advances
correctly. This changes the former rerender workaround, not the coherence goal.

`compiler/native_numeric_commit_execution_test.mjs` runs actual Rust/OXC-authored
TSX through the composed native plugin. Combined store/numeric batches leave
the Hot owner's execution count unchanged, retain its raw host/ref identity,
update its prop/style, and expose values **2 and 4** to newly mounted observers.
The store-free structural case behaves the same way. Keyed replacement/removal
release refs/effects, and stale setters reject writes to retired owners without
changing the replacement.

The complete checkpoint runs **32 verification commands**, including **396
runtime tests**, **23 Rust tests**, the 1k/10k/50k selective-store fixture,
WebGL frame bindings and HMR, retained input/resource transitions, and an external
consumer of the rebuilt private package. Historical notebook and archives stay
unchanged.

## Remaining work

This closes the observed synchronous cached-writer/effect ordering seam. Public
async preparation still uses its existing full candidate traversal; this is not
a new sparse multi-root async execution plan. Resource/boundary fallback remains
conservative. Whole candidate cache traversal and VDOM key-index rebuilding still
scale with tree size, as recorded in the preceding selective-store checkpoint.

No new React latency, bundle-size or allocation superiority follows from these
correctness/render-count checks. The next cost target is the candidate traversal
and index work before the plan's finite integrated performance comparison. Sol's
full review remains held by the comparative maintenance prerequisite.
