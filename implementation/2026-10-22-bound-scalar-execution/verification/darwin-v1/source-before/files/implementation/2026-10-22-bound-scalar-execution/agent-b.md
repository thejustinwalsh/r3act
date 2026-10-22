# Sol B handoff: mounted scalar successors

The replaced mechanism is the descriptor recapture, old-value capture, name `Set`, and `(name,next,previous)` triple construction on every privately owned mounted Store scalar row. The existing mounted node/VNode, key index, `#storePropDeltas` candidate, accepted journal, and host writer remain authoritative. A cold candidate still performs the old public-shaped checks; only its private frozen `target.next` can mint a successor. The recipe holds static prop order and constants, the exact accepted target and child identities, and weak proof references for key-bucket peers. Warm preparation checks the live index, exact node/VNode/handle, owner, child identities, binding exclusion, and output shape before making a one-shot target with current placement. Cold mint proves owner uniqueness; warm exact bucket cardinality/member/owner checks preserve it without a second owner scan. Stale or untrusted hints take the cold path before mutation. Prepared candidate staleness still rejects.

The compact target discriminant is `kind: "scalar" | "generic"`. Scalar targets hold the immutable owned output list and captured previous props; generic targets keep write triples. Application reads scalar previous values from that captured props object. It runs `#isStoreTargetReady` before each changed write when the entire candidate is privately owned scalar, preserving the existing mixed-candidate path. `Object.is`, journal capture, post-host validation, VNode replacement, snapshot dirtying, publication token/version, and failure quarantine follow the existing path. The getter for `program.storeScalarPlans` reads the live `#storePropDeltas` record; `discard()` clears/deletes that record, so a retained program cannot retain its successor array. A deliberately retained extracted plan has the existing explicit-retention caveat.

The candidate region-to-target map is one-to-one and ordered. `storeScalarPlans` has exactly one entry per `storeRegions` item; generic/tree regions get `null`, and a mixed candidate gets all `null`. The optional fifth argument is used only for Store-only, all-owned-scalar programs. Root may associate a schema1 row by candidate index even without `componentOwner` on its region. No new registry or writer was added.

## Target-consumer ledger

| Consumer | Treatment of scalar and generic variants |
| --- | --- |
| Keyed delta overlap near `#prepareKeyedRegionDeltas` and host replacement overlap | Both inspect `target.node`; discriminant is irrelevant. |
| Scoped keyed post-host node lookup | Both inspect `target.node` and `target.next`; final immutable VNode is available in either variant. |
| `ownedStoreOnly` in scoped preparation | Uses record-wide `ownedScalar`, independent of target layout. |
| Completion graph in `prepareStorePropDelta` | Scalar returns its private `next`; generic performs retained/child completion. Mixed candidate remains on the generic completion and gets no reusable successors. |
| `#isStorePropDeltaCurrent` | Both share exact bucket, target, placement, component owner, child, binding, writer, publication, and post-host checks. |
| `#applyCheckedStorePropDelta` | Scalar iterates private output and reads previous from captured immutable props. An all-owned candidate checks the live target for each changed write; a mixed candidate keeps its prior admission behavior. Generic iterates captured triples as before. Both capture journal before writing and assign `next` only after all host writes succeed. |
| `#isStoreTargetReady` | Both use the same node, VNode, handle, placement, child, writer, version, and publication checks. |
| Candidate release | Both remain in the one existing weak candidate registry until release; scoped `discard()` deletes the record and severs the successor getter. |

## Regression matrix and evidence limits

`src/vdom_mounted_scalar_plan_test.ts` adds cold-to-warm accepted snapshot, literal constant, retained child, signed-zero, foreign/forged/Proxy hint fallback, static-method replacement, same-key distinct owners, stale prepared candidate, second warm writer error, and released-getter cases. Existing `src/vdom_store_prop_cut_test.ts` retains generic/mixed bridge, target overlap, same-key ambiguity, writer replacement/retirement, partial failure, snapshots, keyed placement, scoped prop capture, children, and resource lifetime checks. Root-owned tests must cover cache/HMR invalidation, joint stores, forks, groups, and the actual compiler route. The existing Node `--expose-gc` retention mechanism should add a two-owner same-key case: retain owner A's accepted recipe, remove owner B and release its candidate, keep root A live, then require B's row and host payload weak references to clear. Recipe bucket members are `WeakRef`s so A's recipe does not pin B. This is collection evidence for that case, not a memory budget.

No tests, builds, benchmarks, browser, server, VM, or Git mutation were run by Sol B. Hand these bounded commands to Luna after primary integration review:

```sh
deno test --frozen src/vdom_store_prop_cut_test.ts src/vdom_mounted_scalar_plan_test.ts
```

The consolidated native platform command and installed proof/timing commands remain those in `design.md`. The measured budget is the same-run Native update and through-draw median/p95 at or below declarative React Compiler/R3F; no VDOM phase milliseconds or performance benefit are claimed here. A correctness failure, a warm-row miss after an accepted successor, or a collected peer still retained by a sibling recipe falsifies this slice's respective semantic/lifetime claims.
