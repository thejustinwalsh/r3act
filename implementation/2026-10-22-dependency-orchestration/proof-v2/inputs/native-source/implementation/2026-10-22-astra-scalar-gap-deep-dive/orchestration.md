# Sol orchestration: verified emitted scalar arithmetic

This is one proposed integrated compiler/execution capability after the current enclosed pipeline closes. Read [report.md](report.md) for the source-backed decision, rejected DAG-only alternative and evidence limits. Existing scalar-pipeline files are unverified at this review; do not mix this next work into its pending boundary or inherit its eventual timing.

## Primary decision and unit contract

Primary should first finish source review and release the current scalar-pipeline consolidated correctness/proof/comparison. Record the outcome. Then select this unit explicitly under the user's compiler/realtime implementation authorization. Do not dispatch a data-DAG-interpreter-only substitute if the new function proof is difficult.

**Replace:** per-sink recursive numeric interpretation on the eligible owned scalar path, including repeated node/operator dispatch and recursive closure entry; restore emitted straight-line arithmetic and existing compiler CSE without restoring arbitrary public callbacks. Keep one enclosing capture-to-output operation.

**Authority:** normalized `ClosedStoreHostProgram` expressions and input/prop order; existing `closed_store_execution.ts` association; existing module revision, World, Store transaction/reader history, Root caches/publication and VDOM target/journal authorities. New verified information is immutable derived state in that association only.

**Required semantics:** ordered owner/input/prop/write processing; exact grouping and JS numeric operators; signed zero; finite inputs/final outputs with nonfinite intermediates allowed; schema-5 literal sinks; old accepted state during application; newer actions retained; exact captured acknowledgement; held/fork/group/lifetime/HMR checks; original generic/manual callback support; partial-host quarantine. No host, World or Store object reaches the arithmetic function.

**Budget:** unknown. The committed comparison needs 73.5%/73.7% update median/p95 reduction for parity if React stays fixed. No evidence allocates that share to interpretation. New parse/verify/bundle/code/retention costs must be reported; cold/memory qualification is still open.

**Falsifiers:** accepting a function with a free reference or observable operation; trusting a hash/brand/claimed schema instead of behavior; modifying numeric semantics; interpretation still executing for verified numeric sinks; no verified route in production/minified/rebundled packages; a second registry/history/writer; or completed latency still above the declared parity criterion. Correctness, capability delivery and speed have separate outcomes.

## Freeze the ABI before dispatch

Keep `closedStoreExecution` as the association entry. Preserve existing v1 exactly. Add v2 with the same identity fields plus an optional emitted arithmetic function; primary freezes the field spelling (recommended `numericKernel`). `kind` remains `owned-data`: it still requires existing owned inputs and normalized host metadata, not a public callback capability.

```ts
// Conceptual shape, frozen in the unit design before editing.
type ClosedStoreDataExecutionV2 = Readonly<{
  schemaVersion: 2;
  kind: "owned-data";
  componentProgramId: string;
  moduleRevision: string;
  numericKernel?: (inputs: readonly number[], outputs: number[]) => void;
}>;
```

The optional function is untrusted at entry. A valid data descriptor with absent/unverifiable function retains interpreted execution; invalid host metadata/IDs still decline as before. Do not silently coerce arbitrary descriptors. The actual normalizer should preserve a bounded rejection reason for proof/diagnostics once at registration, without per-frame strings/counters in timing assets.

The host program already supplies input count, ordered numeric expressions and literal sinks. Do not emit duplicate sink names, a second program tree, a source hash or a new topological ABI. Derive the numeric sink mapping once. Numeric output slots are dense in host prop order; string/boolean/null literal props remain literal and keep their original positions. Output slots are fully initialized private own writable data properties before invocation.

The compiler emits an ordinary expression function, e.g. `(i,o)=>{o[0]=i[0]*.01+i[1];...}`, with optional pure local CSE temporaries. No loops, branches, runtime function construction, imports, closure captures, host writes or generic callback invocation. Keep constants/grouping exact. Source name mangling and numeric spelling are not semantic identities.

The runtime verifier's internal result may be a frozen record containing the callable and derived numeric sink map. Only the registration normalizer creates/retains it in `ExecutionFacts`; no exported executor accepts an arbitrary supposedly verified record. No extra WeakMap/brand registry is needed.

## Disjoint assignments: three gpt-6-sol agents, medium

Implementation agents author source/tests and hand commands to Luna. They run no tests, build, benchmarks, browser, server or VM. Primary owns integration and docs. Root plus three implementation agents occupy all four slots; Luna remains idle until agents are released and the slice is frozen.

### Sol A — compiler emission and reuse of numeric structure

Own only:

- `compiler/oxc-spike/src/numeric_expression_dag.rs`
- `compiler/oxc-spike/src/store_numeric_kernel.rs`
- relevant emission/types/tests in `compiler/oxc-spike/src/main.rs`
- the unit's `agent-a.md`

Implement v2 ordinary arithmetic emission from the existing finite closed host expressions. Factor shared numeric structural/operator handling from `numeric_expression_dag.rs` as needed; its current source-rewrite API is not already a data IR. Add an input spelling for the two-buffer scalar function, preserve existing owner-row backends, and use the same structural grouping/literal-bit rules. Do not broaden authored eligibility or add grammar divergence between emitter and host metadata.

Emit all numeric props in exact order, with existing CSE only for actual repeated expressions. Leave nonnumeric literal sinks to the runtime's literal path. Preserve v1/manual legacy support. Generated functions use only their two buffers and bounded SSA arithmetic locals; do not add early returns, dynamic indices, loops or calls to make runtime verification harder. No cross-owner hoisting or owner regrouping: the consumer alternates program IDs.

Authored Rust cases: repeated and nested subtrees; nonshared benchmark expressions; distinct signed zero/grouping; every existing unary/binary numeric operator; overflow then bitwise coercion; numeric input arity/order; schema-5 literal/numeric mixture; wrong/revised identity; unsupported logical/conditional/aggregate/effect forms staying conservative. Preserve old backend tests.

Handoff: exact accepted emitted grammar, actual schema fields, emitted examples for Position/Rotation/marker, retired emitter branch and proposed fixture assertions. No performance claim from emitted code size or operation counts.

### Sol B — finite actual-function verifier

Own only the new internal `src/closed_scalar_kernel_proof.ts`, its new behavioral test file, and unit `agent-b.md`. C owns association and runtime invocation. Public barrels stay unchanged.

Implement bounded source acquisition through captured intrinsic Function-toString and a small tokenizer/parser for the frozen grammar. Use a lexical scope table to resolve the two buffer parameters and single-assignment locals. Function/arrow wrapper syntax, alpha-renaming, ordinary numeric spellings, parentheses, optional strict directive and sequential statement/comma forms may be accepted only with complete parsing to end-of-input. A parser that ignores trailing tokens is a blocker.

Construct a symbolic numeric graph from permitted input reads, literals, unary/binary nodes and local aliases. Prove each ordered output assignment has exactly the corresponding normalized host expression, preserving grouping and operator order. CSE aliases may reference earlier locals; no reassociation, coercion simplification or constant-fold equivalence beyond literal spelling. Bound graph work and compare structural identity without unsound hash-only equality. Reject output reads, duplicate/out-of-order output writes, unresolved/forward locals, reassignment and cycles. Restrict literals to the existing numeric domain; allow nonfinite runtime intermediates.

Reject unknown syntax rather than implementing general JS. No calls, free identifiers, `this`/`arguments`, eval, properties except literal buffer indices, accessors, dynamic indices, parameters with initializers/destructuring/rest, classes, `new`, async/generator, loops, branches, nested functions, prototype access or output escape. Read no arbitrary function properties during proof; ignore custom `.toString`, `.call`, `.apply`, names and prototype values. Proxy/bound/revoked/native/source-hidden functions decline without invocation.

Required authored hostile controls: same metadata with impure function; faked `.toString`; proxy apply trap and revoked proxy; bound kernel; own `.call` override; free identifier shadowed by an outer lexical scope; output escape; index accessor/dynamic index; trailing statement; local reassignment; output duplicate/reorder; signed zero/grouping mismatch; oversized/recursive input; actual alpha-renamed compact source; missing source. Also verify schema-5 numeric-only mapping and overflow/NaN-to-bitwise finite results via C's execution tests.

Handoff: exact accepted grammar, all source-derived authority assumptions, complexity bounds, and a line-by-line account of why accepted instructions cannot reenter. This proof module is a new maintenance surface; primary must review it as such. No claim of support for an unexamined minifier transform.

### Sol C — owned execution association, invocation and actual compiled fixtures

Own only:

- `src/closed_store_execution.ts` and `src/closed_store_execution_test.ts`
- `compiler/compiled_owned_store_execution_test.mjs`
- `src/closed_store_numeric_kernel_test.ts`
- the unit's `agent-c.md`

Wait for the frozen A/B interfaces, then extend the existing descriptor normalizer/association. Call B once per normalized component execution, never per row/frame; retain the actual verified function and numeric sink map only there. Existing v1 and unverified v2 use the same current interpreter. Do not add a second registration map, trusted boolean, callback permit or public fast-executor entry.

Inside `prepareOwnedClosedStoreOutputs`, reuse bounded candidate-local numeric input/output scratch. Fill every permitted element as an own data property before calling the verified function through a captured intrinsic apply. Pre-fill output slots every row; do not leave holes that could hit inherited setters, and do not expose either buffer. Validate final results with the current finite primitive policy; weave numeric outputs and literal props directly into the same frozen output tuple producer. Do not add an intermediate tuple copy or restore Root per-row flattened inputs.

Retire recursive evaluation only for verified numeric sinks. Preserve the public evaluator's arbitrary-input normalization, conservative function routes, final validations and output lifetime. The new kernel has no authority to suppress existing World/Store/Root/VDOM checks; it is passive computation within the already proven interval. Exceptions fail preparation/discard, never fall through to conservative capture in an already populated transaction.

The actual Rust-generated fixture must prove v2 selection, actual numeric execution and no recursive evaluator on that selected path without weakening existing reentry/fork/lifetime assertions. It also proves valid-but-unverifiable v2 falls back correctly, malformed semantic metadata fails, legacy callbacks still retain their callback checks, alternating programs and literal marker work, retained outputs survive scratch reuse, independent offsets remain independent, and stale code/revision preparation rejects. Add untimed route counters only at the existing profiling seam if necessary; no timing instrumentation.

Do not edit Root, VDOM, World, Store or host implementation unless primary identifies a mandatory integration defect and reallocates ownership. Their current enclosed interface is sufficient for this capability. Any requested change there is an explicit review item, not a reason to enlarge this unit silently.

## Primary checkpoints and hard feasibility gate

1. **Current-unit closure.** Record the enclosed pipeline's actual outcome first. Preserve failures and timings without importing them into this new source.
2. **Interface/source review.** Freeze ABI, numeric sink mapping and parser grammar. Review A's generated code against B's verifier before C uses it. Confirm full source consumption, no free references/calls, exact expression correspondence and finite bounds. If this demands a general JS parser/optimizer or expanding trusted authority, NO-GO: do not integrate the callable path. Keep current interpreted data route.
3. **Integration review.** Inspect every function/buffer reference and exceptional cleanup; verify no hot-path source inspection or new registry. Verify old published API compatibility. Primary owns any API-boundary skill review needed by metadata versioning. Inspect generated semantic fixtures and existing counters. Keep source/test ownership disjoint.
4. **Freeze full slice.** Primary owns package/consumer proof scripts, runner inclusion, docs/checkpoint and source inventory. Build checks below are one consolidated acceptance boundary, not a preliminary performance experiment. No production/source changes while Luna runs a frozen attempt; preserve failed attempts before correction.
5. **Hard delivery gate.** The existing four-arm build is `minify:false`; passing it is insufficient for this capability. Add untimed installed-package build variants for (a) existing configuration, (b) pinned normal production minification, (c) minified consumer rebundle. Execute actual resulting functions in the supported environment with route-selection and value proofs. Preserve source/function diagnostics on decline. Do not disable minification, rewrite arbitrary bundle strings after minification, loosen the grammar or rely on an emitted hash. Unsupported transforms may fall back safely, but failure to select the intended default production artifact means capability delivery FAIL and no claim that compiled execution ships by default.

No promise of all bundlers, old engines, CSP environments or realms is implicit. Require one no-unsafe-eval installed proof for the claimed browser configuration; no runtime code generation is permitted. HMR uses current module-revision retirement; regression prepares with old code and retires before commit. Source/proof objects release with their existing association/lifetime. Explain fallback support once in authoring/compiler documentation after actual verification.

If the default pinned bundler produces a simple equivalent spelling outside the frozen grammar, a source-reviewed bounded grammar extension preserving exact graph equivalence may repair the failed gate. A transformation requiring algebraic reasoning/general control flow closes this attempt as infeasible; do not broaden into a general JS verifier or repeat until a convenient artifact appears.

## One Luna boundary

Only primary releases Luna after combined source review. Use the repository's pinned runner and `--frozen` Deno verification. Extend the consolidated gate once to include A/B/C regressions, actual Rust emission, legacy compiled fixtures, installed packages, minified/rebundled route proofs, CSP/no-eval, HMR/revision, Three/resource and retention cases. Preserve actual failures and exact source locks.

After correctness and capability delivery pass, run the unchanged installed untimed four-arm application proof: same arithmetic, scenes, controls, resources, values, nonempty pixels, retained identity, action semantics and 512 exactly-once disposals. Prove selected verified arithmetic alongside one enclosed batch/immediate run; counts do not establish phase savings. Keep a forced data fallback control untimed.

Then run exactly one existing bounded Native → declarative React Compiler/R3F → R3F useFrame → imperative comparison: 12 warmup / 60 measured, existing common renderer/draw/readback and source checks, no diagnostic counters in timed assets. Do not change the timed build's minification configuration relative to its comparator simply to select the new path. Minified variants are delivery/correctness evidence; a new minified timing protocol would be a separate comparison.

Load `$portless-dev-servers` before any server; headless, bounded, interruptible, never focus-stealing; stop only owned processes and preserve shared routes. No VM, worker, Recording A rerun or per-helper timings. Primary gives exact fresh output paths and preserves evidence before any repair.

Report three separate verdicts: semantic correctness, compiled execution delivery under named builds, and observed realtime parity. Report update, through-draw and state-age median/p95 plus setup/bundle facts already honestly available; mark cold/memory and independent-device qualification absent. Do not infer causal saving from historical episodes. If timing still loses, record FAIL and close this candidate as an unproved parity solution without a favorable repeat.

## After a negative boundary

Do not automatically launch a data-DAG interpreter, cross-owner cache, trusted compiler-hash API or new writer registry. The deeper candidate is a mounted scalar execution plan using existing Root/VDOM ownership to retire repeated target/shape/prop-descriptor reconstruction. It is not dispatch-ready here: primary must first map existing `closedStoreOutputShape`, `MountedNode`, `#nodesByKey`, `#storePropDeltas`, snapshots, generic fallback and retirement consumers and name the exact old work and preserved lifetime guards. That is one architectural decision, not another recording loop or permission request.

This report does not establish that the remaining budget is recoverable. Full realtime performance, HMR delivery, structural/reveal scope, cold/memory, independent-device and human-maintenance obligations remain open. Do not declare the full plan complete or turn a delivered capability into a speed/maintenance claim.
