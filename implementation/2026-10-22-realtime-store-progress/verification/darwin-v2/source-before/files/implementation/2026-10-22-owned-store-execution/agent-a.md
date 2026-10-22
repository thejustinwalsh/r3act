# Sol A source handoff — data execution and compiler

## Owned changes

- `src/closed_store_execution.ts`: exact four-field data marker normalization, private branded association to an already normalized host program, finite numeric evaluation through `evaluateClosedHostValue`. Supports schema 1/2/3/6/7 numeric leaves/wrappers and normalized schema-5 empty-child primitive groups with numeric expressions and permitted static primitive literal props. The expression plan is shared, not copied into another graph. Raw or forged normalized objects cannot retrieve the private host association.
- `src/closed_store_host_program.ts`: private WeakSet provenance for programs returned by complete normalization. Legacy direct Store paths now use the existing owned-path normalizer, allowing canonical passive capture for schema 1/2/3 without a new path representation. The existing public raw evaluators retain their schema-7 decline behavior.
- `compiler/oxc-spike/src/store_numeric_kernel.rs`: retained the existing finite numeric shape proof, including arithmetic grouping and flattened Store then state input count, but retired callback source generation, DAG lowering, output buffer writes and kernel descriptor emission. It now emits only the revision-associated `owned-data` marker. Schema-5 selection requires an empty `group` and at least one numeric expression; permitted static primitive literals have no benchmark-specific name, key or value restriction.
- `compiler/oxc-spike/src/main.rs`: selected markers from the same existing closed-program proof and revision; metadata and emitted component options carry `closedStoreExecution`, with no generated `closedStoreNumericKernel` for selected owners. No authoring grammar or child purity proof changed.
- `src/closed_store_execution_test.ts`, `src/closed_store_host_program_test.ts` and Rust tests in the owned compiler modules: normalization, private provenance, owned direct paths, flat mixed input order, finite/signed-zero evaluation, unsupported shapes, emitted callback absence, renamed primitive group selection and child/logical rejection.

## Cost, lifetime and compatibility

Data execution replaces generated CSE/inlining with existing recursive expression evaluation per affected prop. It also adds marker normalization and candidate-owned input/output arrays; no saving is measured or claimed. The private host association lasts only with the normalized execution object and component registration/revision. There is no new accepted history, global registry or performance cache. Manual kernel-1 metadata remains a runtime concern for C and must keep its exact callback identity/order/arguments/buffer checks. Older runtimes can ignore the new marker for older host schemas and use their existing conservative host evaluation; their existing schema-7 registration must reject unsupported mixed owners before mounting. Installed compatibility remains a primary proof task.

Only compiler-selected whole-owner numeric shapes receive the marker. Aggregate, logical, conditional, subtree/text and opaque shapes keep existing routes. The retained child's body is never an expression in this plan. Failure to keep the private association or exact finite output checks would falsify this unit. The measured budget is unselected; the single slice comparison belongs after consolidated correctness.

## Verification handoff to Luna

Implementation agents executed no tests, builds, benchmarks, browser, server or VM. After primary source review and slice release, include:

```sh
deno test --frozen src/closed_store_execution_test.ts src/closed_store_host_program_test.ts
cargo test --manifest-path compiler/oxc-spike/Cargo.toml
```

Primary owns compiled JS fixture expectations, installed proof and final gate release. Include its fixture migration in the same consolidated boundary; old compiler snapshots expecting emitted `executeRange` must be updated only where the data selection intentionally changed output.
