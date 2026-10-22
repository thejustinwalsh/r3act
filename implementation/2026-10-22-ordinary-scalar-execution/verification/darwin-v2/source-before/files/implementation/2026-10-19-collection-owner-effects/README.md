# Collection owner effects boundary

The replaced mechanism treated a lowered collection map as sufficient reason to skip its parent owner on a collection edit. The invariant authority is the Rust/OXC proof of the *whole* authored owner, the collection's exact versioned operations, the mounted keyed ownership graph and the current module revision. A sibling helper or getter must execute when that owner is invalidated; a direct pure row projection may retain the collection delta path. This slice changes the proof and runtime admission without introducing a second identity/version/publication authority.

The actual compiled fixture `compiler/fixtures/native-collection-owner-effects.tsx` has an opaque sibling next to a keyed map and a separate pure collection map. `compiler/compiled_collection_owner_effects_test.mjs` inspects the transformed `requiresOwnerRender` options, then executes moves, row state, remove, insert, replace, fork, getter exceptions, exact revision retirement and cleanup through the compiled module and MemoryVDOMHost. A row getter throws from the map callback while its row is unchanged, and the opaque sibling getter throws on an explicit collection invalidation. The baseline mode uses the immutable packaged compiler copied to `baseline/` against the current runtime and records observed behavior; baseline observations are diagnostic and do not qualify an old-product comparison. The fixed mode requires correct metadata and visible behavior. The harness does not supply purity metadata.

The installed consumer uses the same two direct collection maps, a retained keyed row state update, move/remove/insert/replace actions, and a pending independent Three scene. The React arm uses keyed arrays and the actual React Compiler. Its opaque getter control has a local `use no memo` directive because a global getter change outside React state violates React Compiler's purity assumption; `App` and `SafeCollection` must emit compiler memo caches. The untimed proof checks matching order, output, host identity, row state, effect lifetimes, independent scene reveal and empty teardown. Only the safe `q`-before-`p` structural move is measured once from button click to DOM mutation, Native first. This is an observation of one prepaint interaction with different package graphs, not CPU, paint, tail, cold-start, memory or product performance qualification.

The protocol locks the package build report, five tarballs, installed graph, compiler, baseline, authored fixture/test and consumer scripts, transforms and assets before and after execution. Browser assets use offline HTTPS interception, headless GPU-off execution and a 90-second deadline. No project server or VM starts. Failed phases, snapshots and cleanup errors remain in receipts. The primary reviews source and releases the consolidated correctness gate before Luna runs:

```sh
node compiler/compiled_collection_owner_effects_test.mjs --baseline
node compiler/compiled_collection_owner_effects_test.mjs
node implementation/2026-10-19-collection-owner-effects/prepare.mjs --proof-dir implementation/2026-10-19-collection-owner-effects/proof-v1
node implementation/2026-10-19-collection-owner-effects/run-build-pair.mjs --proof-dir implementation/2026-10-19-collection-owner-effects/proof-v1
node implementation/2026-10-19-collection-owner-effects/verify-browser.mjs --proof-dir implementation/2026-10-19-collection-owner-effects/proof-v1 --phase proof
```

The primary writes a hash-bound `proof-v1/run-authorization.json` after the untimed proof passes. Luna then runs the single pair:

```sh
node implementation/2026-10-19-collection-owner-effects/verify-browser.mjs --proof-dir implementation/2026-10-19-collection-owner-effects/proof-v1 --phase measure
```

Falsifiers include stale opaque output, suppressed getter calls or exceptions, unsafe metadata that skips the owner, loss of pure collection delta eligibility, changed retained row identity or state, duplicate effect setup, stale revision writes, leaked readers/owners/resources, source drift and an unbounded browser. Historical wins, dense FAIL, Recording A's unresolved physical ledger and physical HOLD keep their prior scope.
