# Sol B — owned scalar VDOM completion handoff

Base `427ef917`. Owned files: `src/vdom_snapshot_runtime.ts` and `src/vdom_store_prop_cut_test.ts`. No tests, builds, benchmarks, browser, server or VM were run.

## Replaced mechanism and authority

`prepareStorePropDelta` previously allocated `byNode`, `textByNode` and `completed`, recursively called `nextVNode`, then copied completed VNodes back into every target even for a wholly owned scalar cut. Each owned scalar target already has its immutable `next` VNode after its props, prior values, owner and children are captured. The new branch accepts that direct assembly only after all regions are prepared, all are privately owned scalar markers, no text target exists and every explicit `children` list is empty. Retained child wrappers qualify through their existing `retainedChildren` capture. A mixed, structural or text cut still follows the original maps, child dependency check and recursive completion without semantic edits.

Mounted nodes, key buckets, component owners, original-order targets, writer identity, publication token and accepted journal remain the authorities. Preparation still captures prior prop values and freezes accepted props/VNodes. `nextChildVNodes` is still populated for explicit empty lists; the existing pre/post-host child, bucket and target checks remain. Per-changing-write live rechecks, no-op suppression, host order, accepted-old behavior and partial-failure quarantine are unchanged. Public `prepareScopedKeyedRetainedAndStoreDeltas`, `PreparedScopedKeyedRetainedProgram`, `prepareStorePropDelta` and opaque token/target representation are unchanged. Root and host code are untouched.

The source-level cost change is a predicate over prepared targets and omission of three transient Maps, recursive completion and final target-next assignment on eligible cuts. It adds no retained cache/index. Allocation and latency savings have not been measured. The falsifier is a scalar cut that still reaches those Maps, or a mixed/structural cut that bypasses them or loses mounted identity/history after a callback.

## Authored regressions and Luna commands

`src/vdom_store_prop_cut_test.ts` adds owner-qualified duplicate-key write ordering, retained-child identity and accepted-old observation; no-op scalar writes and exactly-once host resource disposal; mixed scalar plus nested text completion; disposal during an earlier writer suppressing the later writer; and a throwing second writer preserving old accepted history with terminal quarantine. Existing tests continue to cover general Store prop shapes, child-tree assembly and stale writer checks.

After primary source review and slice release, Luna can include `deno test --frozen src/vdom_store_prop_cut_test.ts src/vdom_snapshot_runtime_test.ts` in the single consolidated correctness gate, followed by the primary's full runtime/compiler/installed proof commands. No individual verification was executed by Sol B.
