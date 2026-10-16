# Stable native state channel and persistent pending cells

## What changed

Native roots now subscribe to stable, frozen, payload-free committed cell handles.
The World copies its native listener list only when subscriptions change. It
allocates public `StateChange` snapshots only when public observers are present;
those observers retain fresh records and captured-version behavior.

The root pending journal caches a key per owner/site and links it into a pending
queue. Repeated writes update a version; acknowledgment unlinks the key for reuse.
There is no pending Map insertion/deletion or notification record allocation on
each native write. Version maxima apply within one cell identity. A new identity
at the same address starts its own version history.

Each flush/candidate calls `capture()` to produce an independent change array.
Callbacks cannot mutate that captured cut. Newer reentrant writes remain pending
when an older capture is acknowledged. Root filtering, owner preparation,
resource/store transactions, numeric projection staging and publication rules
continue through their existing code paths.

Destroying an owner clears cell payload/source references before retaining dead
setter closures can keep them alive. Dead setters still throw before evaluating
actions. The Node GC check covers both committed and published-candidate setters;
a copied-source negative control without payload clearing fails as expected.

## Verification

The integrated source passes **512 runtime tests, 28 Rust tests and 52 recorded
check commands**, plus six production pilot pages. Checks include ordinary
compiled TSX execution, async stores/tasks, captured numeric cuts, DOM/Three,
React adapter, HMR, inferred JSX types, package build and fresh package consumer.
The final source was checked again after primary review removed a third redundant
capture-array copy. Five served production assets match local hashes.

The production pilot verifies props, keyed order, retained identity, lifecycle,
production mode and complete teardown. It is not latency confirmation.

## Evidence and boundaries

[The allocation diagnostic](./state-resolution-allocation-findings.md) justified
this cut: the previous qualified runtime still sampled 2.13–2.52 times the React
Compiler arm's full-page allocation. The diagnostic is archived separately at
`implementation/2026-10-12-state-resolution-memory/`, SHA-256
`9962064a2203d4efc2f7d235af86f92ebb021f5f76fa268d9b1f2516dcb454ed`.

This change removes identified operations, but its allocation and elapsed-time
effects have **not been measured**. Dispatch still maintains the World's public
dirty journal; flush captures still allocate records; source batching still uses
generic normalization and projection scratch. Cached keys cost retained memory
for live owner/sites and are released on owner removal/root disposal.

The next cut is compiler-executed source/sink programs with captured buffers and
safe invalidation, followed by coherent mixed numeric/keyed delta publication.
Retained VDOM, ordinary TSX, mandatory Rust/OXC, public hosts and the existing
async semantics remain the product direction. The integrated performance,
independent-device and comparative maintenance gates remain open; Sol's full
review remains held by its prerequisites.
