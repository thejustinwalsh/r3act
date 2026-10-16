# Recording B deterministic operation model

**Prepared source, not executed or approved for full collection.** This phase implements the reviewed proposal's candidate schedule and semantic oracle only. Eligibility has passed one N=128 runtime page, but neither that page nor this model proves locality, latency, or a full 90-second matrix fit. Primary must review future collector and count windows before any full page dispatch.

`selflock.json` pins this model's source and the proposal, master plan, and implementation checkpoint read for this stage. The synthetic checks those hashes before checking model invariants.

`pageSchedule({size,pairIndex,arm,pageKind})` fixes sizes 128/1024/10000, five paired blocks at each size, native/React AB/BA ordering, and the exact 12 kinds from the proposal. Each page has trial indexes 0–9: two warmup and eight measured executions of every kind, 120 edits in all. Within each trial the table order rotates left by `(sizeIndex + pairIndex + trialIndex) % 12`, then reverses on odd trial indexes. This is `proposal-formula-v1`; `0x5b2026` is a label only because the formula consumes no random seed. The same block/trial receives the same new-key token in native and React pages. `oracle` and `count` use pair index 0, one fresh page per size each, so the generic native oracle budget remains three pages. These source choices remain a proposal until an executable preregistration locks collector and count semantics. No operation or sample may be dropped adaptively.

Every edit starts from canonical `row-0…row-(N-1)` order. `editFor` supplies frozen public keyed-collection `nativeOperations` and frozen React `nextIds`; create them outside an edit clock. New keys encode size, pair, trial and kind. The odd-key filter has `N/2` public removes; edge replacement has one remove plus one insert in one batch. The move-to-tail and same-key rotation deliberately have the same public move shape but separate operation identities. The moving key and fixed `row-2` sentinel are selected before each edit. The model is independent of any assertion that this authored stateful/effectful TSX takes the optimized path; actual path and compiler proof remain separate gates.

`prepareTrial` describes untimed canonical reset and preselection. Keys retained through reset retain their incarnation; a previously removed canonical key reinserted during reset receives a new incarnation, so its old node/owner is never claimed as continuous. `row-2` remains selected through reset, while an old moving key is deselected if it is no longer a sentinel. `applyExpectedEdit` returns expected order, `data-id`, text, `data-selected`, retained incarnation IDs, mounts and cleanups for post-commit inspection. These are model expectations, not observed DOM/effect counts. Native `useEffect` and React `useLayoutEffect` need settled lifecycle checks, with their timing differences kept explicit. Native dead setters and React dead setters need arm-specific behavior checks, not identical throw expectations.

For a future **count** control, canonical reset and preselection complete before the per-edit counter snapshot; public apply/flush or React `flushSync(setIds)` then commits, and the after snapshot is read immediately after return. Initial mount, reset construction, DOM inspection, collection snapshot, and lifecycle verification stay outside this window. `entryInspections` is cumulative and a raw total cannot be labeled a per-edit visit count. Released-child-vnodes length is not a traversal counter. For a future **latency** page, start immediately before native public `apply` or React `flushSync`; stop after native `root.flush` or React `flushSync` returns. Next-ID/operation construction is excluded and must be reported separately. Equal DOM output does not imply equal authored API work. This package records no timings or runtime counters.

Luna's bounded source/synthetic gate after primary review, from the repository root with Node 24.18.0:

```sh
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node --check .cache/structural-locality-recording-v1/model/schedule.mjs
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node --check .cache/structural-locality-recording-v1/model/model.mjs
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node --check .cache/structural-locality-recording-v1/model/check-model.mjs
/Users/tjw/.nvm/versions/node/v24.18.0/bin/node .cache/structural-locality-recording-v1/model/check-model.mjs
```

No build, browser page, server, performance matrix, or runtime instrumentation is authorized by this model handoff.
