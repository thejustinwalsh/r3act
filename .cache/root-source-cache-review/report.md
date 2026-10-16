# Root committed-source cache audit

## Finding

Keep `ComponentStateRoot.#lastSourceValues` for now. It is a per-root cache of the last source values that the root has successfully reflected in its retained host tree, plus the fact that the root has a committed source entry. It is not an exact duplicate of `ScalarSource.value`, a VDOM prop value, or a prepared row input vector. Deleting it or substituting one of those existing values would lose a value that no current object keeps for every execution path.

The key distinction is time: `ScalarSource.value` is changed by a state dispatch before the root commits. `#lastSourceValues` remains at the prior accepted root value until publication/acknowledgement. The native path temporarily mirrors that cached previous value into each `ScalarSource` before asking VDOM to consume the captured current values; candidate paths do the same only after host preparation succeeds.

## What overlaps, and what does not

- `ScalarSource.value` is the current numeric state input. `OwnerStateWorld` cells expose current state, current version, source identity and (when eligible) live numeric column/row data. Its dirty journal captures handle/version cuts. None retains the last value committed by a particular `ComponentStateRoot`.
- `BoundPropGroup.lastValue` in `src/vdom_snapshot_runtime.ts:70-74` is the materialized value for one sink. It may be transformed, non-injective, or depend on multiple sources, so it cannot reconstruct the previous scalar input. Ordinary `#setSources` (lines 2886-2930) updates group `lastValue` after projection; it does not keep a universal per-source prior input.
- `BoundPropGroup.lastSourceValue` is maintained on the numeric column, row and owner-kernel paths (for example lines 2972, 3118-3124, 3484 and 3541). It is per group and often represents the first input slot for that group. It is not populated/maintained as a complete source history for generic `setSources`.
- `PreparedNumericRowProgramRecord.inputValues` (lines 45-63) and changed-value/epoch arrays are row-layout scratch. During `executePreparedNumericRows`, they are refreshed from current columns/captured dirty values before source mirroring (3360-3374). They cover only prepared owner-layout slots, are overwritten per cut and are invalidated with row/writer leases. They cannot serve generic scalar fallback, async candidate staging, or unsupported bindings.
- VDOM source registries (`#groupsBySource`, `#groupsByCompiledSource` and `hasBoundSource`) answer which active writer groups are bound. They do not store committed source values. Root row/lane WeakMaps cache prepared tokens/source associations, not source history.

## Concrete loss on deletion

Suppose the retained host currently shows state `0`; the setter dispatches `1`, then dispatches `2` before the scheduled root flush. `ScalarSource.value` and the World cell/column now contain `2`, but the host still represents `0`. The root cache still contains `0`. `#flushNumericSources` uses the cached prior to rewind `source.value` before `VDOM.setSources`; VDOM compares against this old input and projects/writes `2`. If the root instead obtains the prior from `ScalarSource.value`, it gets `2`; VDOM sees no source change and can leave the host at `0`. A projected `lastValue` does not recover the source `0` in the general case.

The same distinction protects prepared candidates. `#prepareCandidate` captures `{previous,current,version,source}` before candidate commit (1590-1615); `#applyCandidateNumericWrites` temporarily rewinds only after the prepared host commit and restores only while the captured owner/version/source remain current (4757-4786). The cache advances at publication through `#syncLastSourceValues` (1818-1821), not during speculative preparation. A discarded/aborted candidate therefore leaves the prior root snapshot intact. Sparse store and mixed collection candidates also read the cache before staging and update it only in their accepted publish callbacks (1340-1358, 1517-1526; 3784-3805, 4010-4012).

Reentry makes the separation material: generic source flush restores a captured current value only if its exact captured change is still current (4820-4842). A newer dispatch can leave a newer source value pending while the root cache advances only to the accepted older cut. Replacing the cache with current World/Source state would erase that boundary.

## Lifecycle and use inventory

`#lastSourceValues` is created at line 871. It is populated after accepted full-root, keyed-owner, collection-row, store-candidate, generic source and native cell commits; selectively synchronized/deleted when a component's bound sites change or an owner retires; swept against the full live cache on full commit; and cleared on root disposal (2269). It also gates direct-owner eligibility (2031), sparse collection numeric staging (3788-3795), and generic source/native fallback (4802-4805, 5111-5117). `#acknowledgeNativeCellCut` records the accepted values before clearing exact World and Root cuts (4863-4875).

The map contains only primitive numbers keyed by `ScalarSource`, so it does not retain owner/cell payloads. Its `has` checks are meaningful membership checks because the cache intentionally represents a successfully committed binding; using VDOM membership alone would accept a bound source with no committed root snapshot.

## Kernel and CPU evidence

The owner-update kernel consumes the existing prepared row record (`inputValues`, `seenMask`, sink references) and updates selected groups' `lastSourceValue`; the Root still has to publish the source history for every accepted cell so later decline/fallback/candidate work can bridge to the generic path. The kernel does not make the Root cache redundant.

The frozen current headless study reports FAIL (native/React median geometric ratios 1.064/1.322/1.496 at 128/1024/10000, as recorded by the task owner). The 1024-row CPU record is explicitly whole-page sampled CPU from navigation through initialization, warmup, measured frames, per-frame inspection, disposal and dead-setter checks. The reported 19.877 ms self sample for `#acknowledgeNativeCellCut` contains more than `Map.set` work and does not establish that the cache is causal or that deleting it would improve the measured result. Treat source-map writes as one profiling lead only.

## Smallest defensible next step

Do not remove or relocate the cache. Avoid a replacement field on `ScalarSource` or `StateCell`: the cached history belongs to the root's accepted host state, while source/cell values move ahead of commit and row arrays cover only optimized layouts. Moving the map into VDOM would still be a map and would cross the current Root-to-VDOM ownership boundary.

A minor, optional cleanup is removing the private `previousValues` parameter from `#flushNumericSources` (4790-4805): the only call site is 2066 and always uses the default map. This deletes an unused alternate-history seam but does not remove map lookups or establish a speed gain. For performance work, first instrument or isolate the committed-history lookup/write cost from the entire acknowledgement phase; do not use the whole `#acknowledgeNativeCellCut` sample as causal evidence.

## Source hashes

- `src/component_state_runtime.ts`: `dc6ceceba93b59c6c688e250cb0cce2be3ed836296994d4101de218fada602a9`
- `src/vdom_snapshot_runtime.ts`: `00d8516d2164d1f212e804dd3a579bc13588158eb361e756e2ebd25753b73aab`
- `src/owner_state_world.ts`: `e9aadf02db1e8f29f18b2999b60b93681c1458e0f18dd2891f2b36e8f43c2d34`
- `src/jsx_binding_runtime.ts`: `d2c2a059c2abf3ec9cb88a40c10a9cfbb982074b3e0c8ade3438e8cef9101646`
- `src/compiled_state_layout.ts`: `92a048e585ced4c7e74ef04bedd738b27a2ee49574c0cd11539d481937184dd1`
- `compiler/oxc-spike/src/main.rs`: `0130ca4e1f5d43ea81511c1477e5da0a72f33a2416e7d068bde0f427c609d5e7`
- `compiled-owner-row-program-design.md`: `0ea59245d2e594f29ddcb9f60444fb0db2cab1460c285a5a439514d0795eb649`
- Native CPU record: `950a42e99e1cc4292b8a906c98ff801fcfcafd4ac62bd5addd6fd934b04441d6`
- React CPU record: `eba0a1f671e21a720226dbeff80f61eabc452bdb2923ea528ae51aed727cb77f`

No source or evidence files were changed; this report is the only new artifact. No tests, benchmarks, or servers were run.
