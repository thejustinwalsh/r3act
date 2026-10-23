# Agent A: Store contraction handoff

Base: `ff95540a7188a4ff2f94ad9ef611b3fcc47b314a`. Owned files: `src/owned_store_record.ts`, `src/closed_store_host_program.ts`, `src/async_store_runtime.ts`, their three named tests, and this handoff. No tests, builds, benchmark, browser, server or VM were run by this agent.

## Retirements and authority

* `normalizeClosedProjectionPaths(raw): readonly (readonly string[])[] | null` copies and validates metadata paths once. The frozen outer array is privately marked in a WeakSet. `isOwnedClosedProjectionPaths(paths)` accepts only that copied identity. `captureOwnedClosedProjectionValues(state, paths)` traverses own data descriptors of `storeRecord` objects and checks finite numeric results, returning a frozen array. The existing public `captureClosedProjectionValues` still validates arbitrary arrays through descriptors. `closed_store_host_program` uses the normalizer without changing schemas or path output shape. Duplicate path rejection remains JSON-key based.
* `StoreRenderTransaction` caches only successful owned captures by the exact pinned `StoreRenderSnapshot` object and normalized outer path-array identity. Every new reader still stages its own footprint, whole-state observation and direct pending value. Existing snapshots survive savepoint rollback by design, so immutable values may remain while their original snapshot is pinned; rollback still removes reader membership and observation. The cache clears on `discard` and `publishAccepted`. No Store/root/version registry is added.
* A private `directReaderCut` symbol replaces empty pending and accepted selector Maps for direct reads. Each accepted reader still has its own frozen history object and captured stamp. `capturedReaderCut`, direct, selector Map and retirement null remain distinct. Generic previous-value access materializes a fresh empty Map when history is direct or absent; no shared mutable empty Map escapes. Diagnostics count direct records; receipt identity, root epoch/version and retained/current inspection continue to use the existing history record.
* `_isClosedNumericCanonical` now compares one key count and each captured key's exact own descriptor, including symbol/function identity and flags. That proves membership with unique captured keys; the instance-shadow check runs on the same captured string keys. Exact prototype, private-brand access and `storeDependencies` checks remain. This retires the quadratic `currentKeys.includes` searches and second prototype-key array. No status cache or callback-crossing audit receipt was added.

## Callback and fallback boundaries

The first owned capture still runs the canonical audit before and after projection traversal; a later reader still runs the canonical audit before staging. The memo lookup and traversal occur inside one transaction with its pinned snapshot, and no external callback is invoked by owned frozen paths or owned record data descriptors. The numeric result does not carry admission authority. Public unowned paths continue descriptor/getter/Proxy validation on every read. Unsafe nested objects and nonfinite leaves decline. Root/kernel ordering and publication preparation remain unchanged. I found no useful callback-free interval that would safely reuse canonical Store status across the public range kernels, so that optional audit reuse is deliberately absent.

## Tests and Luna commands

New tests cover owned path copying and brand forgery, unsafe nested records, public getter/Proxy path behavior, two readers sharing one pinned result while retaining distinct observations, fork isolation, rollback membership, direct→selector→direct previous values and receipt replacement, and rejection after a selector callback changes the Store prototype. Existing `store_closed_read_test.ts`, `held_store_reader_progress_test.ts`, `store_render_savepoint_test.ts`, and publication tests cover held/direct versus current, fork retirement and captured history. The primary should include these in its consolidated runner. If focused diagnosis is needed after that gate, hand Luna:

```sh
deno test --frozen src/owned_store_record_test.ts src/closed_store_host_program_test.ts src/async_store_runtime_test.ts src/store_closed_read_test.ts src/held_store_reader_progress_test.ts src/store_render_savepoint_test.ts
```

The owned projection cache is derived scratch, and no phase timing or performance saving is claimed. The prior 515-audit count is source-derived and remains largely present across public kernel callbacks; this patch only makes each audit linear. No physical layout choice or causal performance conclusion follows before the integrated boundary.
