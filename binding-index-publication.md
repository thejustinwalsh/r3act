# Incremental scalar binding ownership — 12 October 2026

## Decision

Maintain scalar binding ownership through full reconciliation when both the incoming and committed graph are null and the direct-write mode is unchanged. Keep rebuild as an explicit reference and as the fallback for compiled CSR/column graphs or mode changes. This removes the measured full binding-index scan on the native scale fixture. Full candidate traversal remains.

## Mechanism

The existing mounted-node reconciliation hooks register binding groups on creation and detach them on removal. In-place property updates refresh each property's writer descriptors and last committed value. If source membership and style-property identity stay the same, the registered group stays in place; source changes replace only those groups. Keyed-region metadata changes use key-only hooks so they do not churn binding ownership.

A node owns arrays of groups per prop, including every direct style writer. Each group retains its sources explicitly. Removal therefore releases all source memberships rather than rediscovering only the last style group. Ordinary whole-style props remain one group; direct style mode registers a separate group per bound style property. Compound bindings retain one shared group in every relevant source set.

Property diffing reads the previous committed writer value. For direct styles it reconstructs the previous style from all retained writer values, rather than reading advanced sources as the old host value. Review also removed an unnecessary old projection read when a committed writer already supplies that value. Projections remain pure by contract.

Numeric-only updates retain the existing source-to-prop path. Mixed numeric/structural/store publication still stages numeric batches before publication, refs and effects. Refreshing indexes must preserve that coherence; it is not permission to defer writers until after effects.

## Failure behavior

After reconciliation fails, key and binding indexes are repaired from reachable live mounted records, excluding disposed subtrees. If the binding repair itself cannot use the old graph on partially changed nodes, clear binding ownership and preserve both the original host failure and the repair failure in an AggregateError. This does not roll back physical host changes. Native host failures remain terminal.

## Correctness evidence

Eight new runtime tests cover:

- Delta/rebuild parity, compound sources, multiple direct styles, source switching, removal and reattachment.
- Exact group registration work for unchanged membership and source replacement.
- Disposed bound handles after removal-cleanup failure.
- Compiler-tagged scalar fallback eligibility and restoration when tags are removed.
- Direct-mode and graph changes using rebuild fallback, followed by resumed delta maintenance.
- Three deterministic structural sequences of 30 steps each, with insert/remove/reorder/source/style changes checked against an independent value oracle and the rebuild reference; surviving keyed host identity is preserved.
- An actual bound CSR graph switching to direct bindings, subsequent projector refresh, writes and detach on the same host.
- A graph-change host failure followed by index-repair failure, preserving the original error and clearing unsafe writer ownership.

The compiled lifecycle fixture uses actual Rust/OXC-authored TSX with numeric prop and two style expressions, boolean source selection, `use(store)`, keyed observers, refs and mount/dismount effects. Existing Hot owners stay cached during the supported numeric mixed batches. Newly mounted effects observe fresh host props; removed Hot hosts receive no numeric writes. Source replacement registers one group and detaches one; final Hot removal detaches two groups (data and whole style). Its whole-style group is distinct from direct-mode style groups tested separately.

Fixture review corrected an invalid expectation that a retained effect would rerun on a store update. The final test keeps effects mount/dismount-only and mounts a fresh keyed observer to test current values. An initial report of stale store projection was not substantiated as a runtime defect; the final fixture independently asserts both store host values and fresh keyed effect observations. No store-fix claim is made from that harness correction.

A controlled Node GC probe removes two direct-style projections while keeping the root, source and host mounted. Both captured payloads are collected, the source is no longer indexed, and subsequent source writes reject. This is a narrow retention check, not an allocation-rate or heap-size comparison.

## Observed work

| Rows | Store-only row executions | Mixed insert row executions | Store-only binding rebuild visits | Mixed binding rebuild visits | Mixed group attaches/detaches | Store-only owner visits |
| --- | --- | --- | --- | --- | --- | --- |
| 1,000 | 0 | 1 | 0 | 0 | 1 / 0 | 1,002 |
| 10,000 | 0 | 1 | 0 | 0 | 1 / 0 | 10,002 |
| 50,000 | 0 | 1 | 0 | 0 | 1 / 0 | 50,002 |

Store-only group registration is zero at all sizes. Mixed owner visits remain 1,003 / 10,003 / 50,003. Key-index work remains zero for store-only updates and four new nodes for mixed inserts. The two-region compiled regression retains sparse operations around full store publication with zero full binding-index rebuild and balanced state/effect lifetimes.

Profiler units are explicit: full-rebuild visits count mounted nodes; incremental group attaches/detaches count writer groups. Zero registration does not imply zero property inspection, allocation, reconciliation or owner traversal.

## Verified checkpoint

The final checkpoint passed 35 maintained commands: 409 runtime tests, 23 Rust tests, production/type checks, compiled execution fixtures, controlled retention probes, browser/HMR/Three checks through the existing Portless origin, package build and an external consumer. The external consumer additionally byte-compares installed VDOM reconciler code with the freshly packed build; this check was rerun after adding that assertion.

## Remaining boundary

The next attributed cost is candidate reconstruction. Relevant ancestors scan child arrays; cached sibling hits enumerate subtree ownership to populate new candidate owner/cache/effect maps. A bounded candidate needs validated owner-to-output edges and retained committed state, with transactional reader refresh and generic fallback for unsafe structure/resource footprints. Simply skipping unaffected owners would lose lifetime and selector-history guarantees.

The prescribed integrated mixed-workload latency/allocation comparison remains necessary. There is no new overall React speed, bundle-size, ecosystem or maintenance verdict. Sol’s full review remains held at the comparative Three maintenance gate. Historical notebook and checkpoints are immutable; current verification and rebuilt private package are archived separately under `implementation/2026-10-12-binding-index` after all checks pass.
