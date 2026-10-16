# Incremental key indexes through full publication

## Decision — 12 October 2026

Use the existing mounted-node attach/detach index hooks during full VDOM commits. Keep the explicit rebuild mode as a differential reference. This removes a redundant full key-index pass; it does not make full candidate publication proportional to the changed nodes.

## Mechanism and failure boundary

The default delta mode supplies the same index hooks used by sparse reconciliation. Inserts and removals index their subtrees; unchanged topology performs no attach/detach work. Region metadata changes detach the old entry before attaching the new entry. Global duplicate keys retain sets of nodes, so ambiguous key lookups still decline the sparse path.

After reconciliation throws, rebuild the index from reachable mounted records and skip disposed subtrees. Review found that indexing those disposed records could revive stale handles after cleanup failure. This is index repair, not physical host rollback. Native host failures remain terminal.

Binding-index rebuilding is unchanged. Its new profiler counter counts mounted-node visits, excluding subsequent compiled-group expansion, and makes that remaining work visible.

## Evidence

Five focused runtime tests compare delta and rebuild modes through deterministic edits, duplicate keys across parents, key lookup and region metadata changes. They also assert two-node replacement costs, duplicate ambiguity changes and removal-cleanup failure. The replacement fixture indexes two old and two new nodes while still visiting seven nodes for binding-index reconstruction.

Real Rust/OXC-compiled authored TSX produces these work counts:

| Rows | Store-only row executions | Mixed insert row executions | Store-only key visits | Mixed key visits old/new | Store-only owner visits | Store-only binding visits |
| --- | --- | --- | --- | --- | --- | --- |
| 1,000 | 0 | 1 | 0 | 0 / 4 | 1,002 | 4,005 |
| 10,000 | 0 | 1 | 0 | 0 / 4 | 10,002 | 40,005 |
| 50,000 | 0 | 1 | 0 | 0 / 4 | 50,002 | 200,005 |

Mixed insert owner visits are 1,003 / 10,003 / 50,003; binding visits are 4,009 / 40,009 / 200,009. These are work counters, not timings or comparisons with React.

A second compiled fixture alternates six sparse edits across two regions with a same-root store full commit. Each sparse edit retains its delta operation; the store commit executes one probe and zero rows. All 96 surviving initial host nodes retain identity and local state; final projections contain 49 and 47 rows, with balanced 97 mount/cleanup pairs. It uses distinct collection owners. Multiple collection maps inside one owner still use the documented generic fallback.

Fixtures retain exact projection, execution, keyed state, lifetime and teardown assertions. Full integration logs and the rebuilt private package are archived in `implementation/2026-10-12-full-key-index` after verification completes. Historical notebook and earlier checkpoints remain unchanged.

## Next boundary

Candidate owner traversal and binding-index rebuilding remain linear in these full commits. Investigate incremental binding registration and the candidate dependency footprint before running the prescribed integrated latency/allocation comparison. Direct numeric frame updates continue to use their separate existing source-to-prop path. Resource/async fallback remains conservative.

This establishes one removed pass and preserved semantics. It does not establish overall React superiority, smaller consumer bundles, broad ecosystem compatibility or easier total maintenance. Sol’s full original-goal review remains held: the real Three host is proved, but matched comparative maintenance evidence is still absent.
