# Sol C handoff — Root cache integration

Replaced mechanism: each passive Store update rebuilt an unbound execution request and interpreted a mounted scalar target cold. The existing `closedStoreOutputShape` now carries an authentic A receipt, the exact Store/reader membership identities used to bind it, and B's accepted mounted successor. Root still constructs eager authored and expanded outputs and uses the existing VDOM candidate and publication lifecycle.

Authority: the cache's program, owner, key, props, authored and expanded output identities; associated data execution; live Store and reader membership; VDOM's opaque target recipe; and the existing candidate's `closed.publish()`. No extra registry, version, value cache, host writer, or lazy output view was added. The input receipt only reuses static descriptions. Fresh captures, complete coverage, canonical phase checks, writer checks, accepted history, exact acknowledgement and partial-host quarantine remain in their original paths.

## Mutation ledger

| Existing site | Treatment |
| --- | --- |
| Scalar Store publication in `#stageClosedStoreOutputs` | Stages a new shape; `setScalarSuccessors` attaches candidate-private VDOM output plans by region index. Only `publish()` installs the new shape. Schema1 owned host leaves receive the same cache-local shape for subsequent binding, with their owner associated by candidate region index. |
| Sparse Store leaf and ancestor patches | Both clear `closedStoreOutputShape` when output/effects or ancestor expansion changes. |
| Resource reveal boundary and ancestor patches | Clear the shape when child, pending resource, subtree, or ancestor output changes. |
| Partial numeric owner, stable keyed owner, structural owner, and multi-owner commit patches | Clear the shape on every changed result/expanded result/effect shape. |
| Mixed collection leaf and ancestor patches | Clear the shape on changed owner output and invalidated ancestor output. |
| Direct collection acceptance and ancestor invalidation | Fresh candidate cache has no shape; changed ancestor output clears it. |
| Full-map replacement | The fresh `ComponentCache` constructor has no derived shape. Exact reused records remain exact reused records and still face VDOM identity checks. |
| Keyed/collection owner retirement and final disposal | Existing cache delete/clear releases accepted recipes. |
| Compiled revision retirement | Clears only the derived shape from retained cache records, leaving terminal accepted `result` and `expandedResult` readable. Existing candidate discard and Store reader cleanup continue. |

The cut's outward `scalarPlans` is a getter over a candidate-local holder, which `release()` empties. `setScalarSuccessors` checks array length and region owner association before creating new frozen `nextShape` records. It never mutates accepted shape records. Ordinary, reveal and scoped structural preparation pass hints in the fifth VDOM argument and stage VDOM successors before host mutation. B determines warm eligibility; mixed work remains cold. The extracted successor array and binding references leave the candidate on release. The accepted shape alone retains its successful recipe until normal invalidation.

## Regressions authored

`native_mounted_scalar_plan_test.ts` covers a literal marker, signed scalar progression, immutable saved snapshots, cold/new then warm/reused counters, HMR terminal accepted reads, and independent roots publishing shared Store epochs separately. The retained-child test now exercises the owned data route, checks warm reuse, and continues to cover child state, stable host/resource identity, stale cuts, reentry and exactly-once effect cleanup. These files were authored without running tests, builds or measurements.

## Luna commands after integrated primary review

The primary's consolidated boundary command in `design.md` is the gate. For a focused failure diagnosis within that gate, the relevant cases are:

```sh
deno test --frozen src/native_mounted_scalar_plan_test.ts src/component_retained_store_child_test.ts src/closed_store_numeric_kernel_test.ts
```

No speed claim or memory budget is made. Falsifiers are stale binding reuse after any exact identity changes, a warm candidate that still uses cold mounted preparation, changed accepted snapshots during applying, an invalidated cache retaining a removed row/child through its recipe, or any failed candidate installing a successor.
