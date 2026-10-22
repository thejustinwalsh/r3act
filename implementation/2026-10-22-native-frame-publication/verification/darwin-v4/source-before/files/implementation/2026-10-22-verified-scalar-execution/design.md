# Verified emitted scalar arithmetic

Base main `2a789a2ed437111941f587b538d16788752698d8`, MIT. Primary reread the complete master guide (212,601 characters), current checkpoint, research/paper/notebook evidence, actual compiler/runtime seams and Astra's report/orchestration before selecting this unit. The preceding slice passes correctness and fails realtime parity: update3.00/3.70ms versus declarative React0.70/0.90ms; through-draw5.60/6.30 versus3.25/3.90ms. No causal interpretation budget is established. Roughly77%/76% update reduction would be needed if those denominators stayed fixed; this is target distance, not removable cost.

## Contract and retirement

Replace per-sink recursive arithmetic evaluation on proven executions with one compiler-emitted ordinary JavaScript call per owner inside the existing enclosed batch. Existing compiler structural sharing applies where repeated expressions exist; the actual motion fixture has no repeated compound subtree, so CSE is not the performance story. Historical direct-writer results motivate specialization without transferring their percentages. A data-DAG interpreter alone is not selected.

The normalized host expressions remain the semantic authority; the existing execution association retains immutable derived proof and the function. World identities, Store snapshots/readers/history, Root accepted caches/publication, VDOM targets/journal and host lifetime remain unchanged. No second registry, identity/version/history authority, host writer, runtime code generation, source hash trust, physical layout, owner regrouping or cross-owner hoisting. Keep whole-tree guards, exact acknowledgement, newer actions, independent/fork/held histories, original generic callbacks, retained children/resources and partial-host quarantine.

No World, Store, owner, host, metadata or public buffer reaches the function. Inputs/final outputs remain finite numbers; intermediate Infinity/NaN must retain JS behavior, including overflow followed by bitwise coercion. Signed zero, expression grouping, operator/operand order, numeric sink order and schema-5 nonnumeric literals remain exact. Exceptions discard preparation, never retry observation on a partially populated transaction.

## Frozen ABI and internal interfaces

`ClosedStoreDataExecution` becomes a versioned union. Existing schema1 is unchanged. Schema2 has the same four identity fields and optional `numericKernel?: (inputs: readonly number[], outputs: number[]) => void`. `kind` remains `owned-data`. Function contents are untrusted until verified. Valid v2 with absent/nonfunction/unverifiable optional kernel retains interpreted data behavior; malformed semantic metadata, IDs, unknown descriptor fields or accessor-shaped descriptors still decline. Copy descriptor data before proof; no caller getters gain a trust channel.

Compiler diagnostic JSON stays serializable: its descriptor contains the four schema2 identity fields, with no duplicate expression tree/source hash or fake function value. Actual emitted module JavaScript contains the fifth `numericKernel` field. Installed proof checks actual emitted code and runtime selection, not the diagnostic marker alone.

Sol B exports from its new internal module:

```ts
export type ClosedScalarNumericKernel =
  (inputs: readonly number[], outputs: number[]) => void;
export type ClosedScalarKernelProof =
  | Readonly<{ kind: "verified"; kernel: ClosedScalarNumericKernel;
      numericPropIndices: readonly number[] }>
  | Readonly<{ kind: "rejected"; reason: string }>;
export function proveClosedScalarNumericKernel(
  candidate: unknown, host: ClosedStoreHostProgram,
): ClosedScalarKernelProof;
```

B must check the existing normalized host-program brand before deriving expressions/input count, never trust arbitrary expression objects. Numeric output slots are dense in host prop order; nonnumeric literal props are excluded. Rejection reasons are bounded static codes, never arbitrary source/errors. C calls proof once during association and retains it there. No public barrel/exported fast executor or extra WeakMap is added.

C exports internal `inspectClosedStoreDataExecution(execution)` returning an immutable registration-time diagnostic or null: `{mode:"verified-scalar"|"interpreted", reason:string}`. It exposes no callable, mutable graph or buffers. Primary alone uses it at Root's existing profiling seam to count verified rows in untimed proof. Timing has no diagnostic inspection/counters. These internal metadata helpers are not new application entry points. The unrelated Glyph/text-engine call-contract skill was inspected for applicability and is not applied to r3act.

## Bounded proof language

Acquire actual source using captured intrinsic Function.prototype.toString, never candidate properties, and parse to end. Accept ordinary or arrow functions with exactly two distinct simple ASCII identifiers, optional ordinary function name, block or assignment-sequence expression body, optional strict directive, const/let/var declarations of distinct single-assignment arithmetic locals, and ordered literal-indexed output assignments. Alpha-renaming, whitespace/comments, equivalent finite numeric spellings, parentheses and comma sequencing may preserve the same structure. No early return is required; request a reviewed interface refinement before broadening forms for a minifier. Preserve JS precedence/associativity and signed literals; literal spelling normalization is not algebraic reassociation or general constant folding.

Only literal-indexed input reads, numeric literals, existing numeric unary/binary operators and earlier immutable local aliases form values. Fully consume every token. Reject calls, free references, this/arguments, output reads/escapes, dynamic/prototype properties, destructuring/default/rest parameters, duplicate/reassigned/forward locals, duplicate/reordered/missing outputs, nested functions/classes, new/eval, control flow, async/generators and unknown syntax. Bound source at32KiB, tokens16384, symbolic nodes8192, locals128, parse depth128, input/output slots32; a smaller safe implementation may decline larger programs. Compare exact expression structure with bounded pair work, not hash-only equality or exponential local substitution. Proxies, bound/revoked/native/source-hidden functions decline without invocation. Existing unmodified/captured intrinsic initialization is the explicit premise.

The proof is a new maintenance surface. If soundness requires a general JS parser/optimizer, stop this candidate and retain interpreted data. Do not silently replace it with a DAG interpreter and claim delivery.

## Disjoint Sol medium ownership

Sol A: only `compiler/oxc-spike/src/{numeric_expression_dag.rs,store_numeric_kernel.rs,main.rs}` and `agent-a.md`. Emit schema2 two-buffer straight-line functions using existing finite numeric structure/CSE, preserving old owner backends and authored eligibility. Serialize numeric literals/grouping exactly and keep pure CSE locals single-assignment. No loops, calls, external references or owner reordering. Author Rust regressions for all operators, signed zero/grouping, repeated/nested and nonshared expressions, overflow/coercion, input/sink mapping, primitive marker and conservative decline. No tests/builds/runs.

Sol B: only new `src/closed_scalar_kernel_proof.ts`, its test file and `agent-b.md`. Implement the frozen bounded proof API/language above, including hostile source/property/proxy/scope/trailing-token/alias/order/size controls. Author actual compact/alpha-renamed function controls and exact-match negatives. Never execute a candidate during proof. Handoff accepted grammar, complexity and no-reentry argument. No tests/builds/runs.

Sol C: only `src/closed_store_execution.ts`, its test, `src/closed_store_numeric_kernel_test.ts`, `compiler/compiled_owned_store_execution_test.mjs` and `agent-c.md`. Consume A/B interfaces; preserve v1, interpret unverifiable v2, retain immutable proof/diagnostic in the existing association. Fill private dense numeric input/output scratch with own writable data elements before invocation through captured intrinsic apply. Overwrite all slots each row; no buffer escapes or aliases. Weave final finite results and literal props into the same immutable tuple producer, with no extra tuple pass/copy. Retire recursive evaluation for verified numeric sinks in both owned batch and associated public evaluator. Preserve public arbitrary-array normalization and all lifetime/fallback semantics. Author actual compiled selection, minified-shaped function, malicious decline, scratch lifetime, signed zero/nonfinite intermediates, alternating inputs/independent offsets and stale revision controls. No Root/VDOM/World/Store/host edits or runs.

Primary owns Root's untimed route counter, runner inclusion if needed, frozen copied consumer/build/proof/delivery scripts, installed minified/rebundled/CSP proofs, all docs/checkpoint and review. Root's execution/publication semantics do not change. All agents hand commands to Luna; no source changes during frozen verification. Comments at most two lines unless public TSDoc.

## Integration and boundary

Primary first reviews A's emitted grammar against B's full-consumption/name-resolution/equivalence proof, then C's actual invocation/buffer/exception paths. Report blockers promptly and retire unsuccessful scaffolding. No per-helper tests, timings or RecordingA rerun.

At the integrated boundary Luna runs one consolidated frozen correctness gate covering all authored regressions and actual compiler/package/lifetime controls. Fresh installed proof must select the verified route for actual motion/marker programs in the existing unminified configuration, the pinned normal production minifier and one consumer rebundle, with exact outputs and no-unsafe-eval/CSP support. Unsupported transforms may safely fall back, but default production fallback is delivery FAIL. Do not disable minification, mutate final bundles or trust emitted hashes to pass. Grammar extensions after a failure must remain bounded, sound and source-reviewed; transformations needing general control/algebra close this attempt.

After primary accepts proof, run exactly one unchanged four-arm Native→declarative React/R3F→useFrame→imperative12warmup/60measured comparison with existing common renderer/draw/readback and no timed diagnostics. Additional minified builds are untimed delivery controls, not a new timing protocol. All browser work is headless, bounded, interruptible, offline HTTPS without a project server where possible; Portless skill before any listening server, no focus/VM/worker.

Budget remains unknown. New proof/parser/bundle/cold/retained costs must be explicit. Correctness, compiled delivery and realtime parity receive separate verdicts. Preserve failures, source/assets and cleanup; no favorable repeat or causal old/new/phase/presentation/cold/memory/independent-device claim. Full product, HMR/structural/reveal/lifecycle and independent-device finish-line requirements remain active; historical wins, qualified dense FAIL, exhausted RecordingA/physical HOLD and zero human maintenance participants retain scope.
