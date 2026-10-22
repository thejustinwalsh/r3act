# Compiled numeric Store kernels

Base 9ef7ac1fd8036a737321b34cb7cd860d51b78a99, local main, MIT. The complete master guide has been reread before selection, including its semantic/publication contracts, Recording A exhaustion and dependency backlog. The active full-plan goal and human override authorize integrated compiler work and main-thread computation batching; physical selection remains HOLD. The preceding source passes 69 consolidated phases but its sole shared-clock canvas publication is slower than React Compiler, 3.10/3.80 versus 0.20/0.20 ms. No changed source inherits that timing.

## Replaced work and authority

Eligible numeric Store props currently pass through evaluateClosedStoreHostProgram, evaluateClosedHostValue and recursive evaluateClosedNumericExpression for each owner/prop. Replace that interpretation with Rust-emitted shared-expression range code for compiler-proven numeric leaf outputs in existing Store schemas 1/2/3/6. Aggregate tuple/style values, fixed subtree schemas 4/5, nonnumeric outputs and unsupported forms keep their existing evaluator/generic path. This narrows an optimization proof, not the product's supported authoring scope.

Reuse existing numeric_expression_dag lowering and buffer-range conventions. Do not copy its CSE implementation or change floating-point grouping. Existing World incarnation, component/module revision, StoreRenderTransaction, per-root reader history, VDOM deltas and publication lifecycle remain sole authorities. Do not add a persistent binding, owner, dependency or version registry. Host ordering, exact acknowledgements, newer reentrant actions, fork history, resource/child lifetime, generic fallback and whole-root guards remain.

## Executable metadata contract

Add optional compiler metadata named closedStoreNumericKernel beside the unchanged closedStoreHostProgram:

```ts
type ClosedStoreNumericKernel = {
  schemaVersion: 1;
  componentProgramId: string;
  moduleRevision: string;
  inputCount: number;
  propNames: readonly string[];
  executeRange(
    inputValues: readonly number[], inputStart: number, rowCount: number,
    outputValues: number[], outputStart: number,
  ): number;
};
```

Inputs and outputs are row-major. Offsets count scalar elements, not rows; strides are inputCount and propNames.length. The return is the number of written scalars, exactly rowCount multiplied by the output stride. Values are staged before host writes and checked finite with exact extent/count. Input count matches lexical flattened Store paths; prop names/order match the normalized leaf host. Component ID and module revision must match existing normalized metadata. Missing metadata retains the old evaluator. Malformed or mismatched supplied metadata must not execute; follow existing registration error conventions. No public authoring API or new Store host schema is required.

The compiler owns expression/effect proof. Kernel function shape alone does not certify arbitrary callbacks pure. Match existing executable compiler-metadata trust and revision association, and retain conservative opaque authoring behavior. Emit a compiler semantic ABI discriminator in module revision input for the new code shape; do not reuse old revision labels for changed executable contracts. Preserve exact trusted runtime-import authority. Prefer a focused Rust emitter module and a focused TypeScript kernel normalizer over enlarging unrelated passes.

Numeric admission must preserve the current normalized expression evaluator, including signed zero, arithmetic grouping, conditional/logical evaluation and finite-output rejection. If a form cannot be proved equivalent, leave it interpreted. Reuse the DAG pass through an unmasked/all-output mode or another explicit shared API; do not fake owner state or create per-row subarray views just to call the old kernel.

## Runtime integration and failure order

Root keeps existing input capture and current checks, selected reader coverage, accepted caches and StorePropDelta staging. Eligible canonical Store-only rows may share whole-cut flat buffers and execute contiguous runs of the same normalized kernel in original owner order. Legacy/mixed/ineligible owners stay on their existing route. Resource inputs keep the evaluator until their capture ordering is independently proven. Do not collect a new callback-bearing input past a prior failure merely to fill a range. Source review must prove passive canonical Store capture before batching it; split/flush at opaque or resource boundaries. Every row's accepted reader membership must already exist, and failed staging must release all captured artifacts without advancing history.

Generated kernels perform no host writes or notifications. Validate all staged outputs before application. Keep original kernel/host errors and cleanup errors distinct. Live code, owner/cache, reader/source/writer and post-host guards still run at their existing lifecycle points; batching is not cached admission. Candidate release clears the new buffers/references. Retire the eligible recursive evaluation call instead of evaluating both paths in production.

## Work split, verification and limits

Sol medium compiler ownership: Rust main.rs, a focused Store kernel emitter, numeric_expression_dag.rs and their test source. Sol medium runtime ownership: component_state_runtime.ts, new kernel normalizer and focused runtime tests; existing closed Store types only if needed. Sol medium fixture ownership: actual Rust/OXC fixture 50, runner registration and a fresh installed 12-file shared-clock consumer. Primary reviews/integrates/checkpoints. Implementation agents do not run tests, builds or benchmarks. Luna stays idle until the integrated source freeze, then runs one consolidated gate, installed proof and one bounded matched comparison, preserving all failures.

Actual compiled coverage must show metadata/revision/prop-input order, shared arithmetic, nonzero buffer offsets and mixed original-order runs, scalar/schema-6 DOM/Three props, retained state/events/resources, old-metadata fallback, opaque/aggregate/subtree fallback, stale code/candidates, nonfinite output, newer reentry, forked histories and partial host failure. Differential evaluator comparisons belong to the consolidated suite, with no helper benchmark. Installed authoring keeps one shared frame Store, 256 retained groups, repeated component keys beneath keyed hosts, the same React Compiler/imperative arms and 12 warmup/60 measured RAFs. Browsers remain headless, bounded, interruptible and do not steal focus. No server is needed; any project server requires Portless HTTPS guidance. No VM or architecture matrix.

Costs include generated code/normalization, cut buffers, run dispatch, output staging and cold/memory/lifetime work. Removable phase share and a speed budget are unmeasured; source loop removal is not a causal timing claim. Falsifiers are evaluator disagreement, reordered callbacks/exceptions, hidden effects admitted as closed work, buffer extent overlap, stale owner/source/code writes, accepted-history advance on decline/failure, consumed newer actions or resource leaks. A passing semantic slice does not establish speed, R3F/direct-frame, GPU/presentation, matched cold/memory or independent-device qualification. Historic wins and losses remain scoped; the full product goal remains active.
