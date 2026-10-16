# Isolated OXC owner-kernel prototype, v3

This is a revised, isolated compiler candidate. The before-review snapshot remains unchanged at `.cache/compiled-owner-kernel-compiler-stage-before-review-v1/`. Earlier failed attempts remain preserved in `.cache/compiled-owner-kernel-compiler-stage/review-execution-v2/` and `.cache/compiled-owner-kernel-compiler-stage-v3/review-execution/`.

## Candidate boundary

The emitted whole-cut kernel is additive. Existing schema-v2 descriptors and projectors remain available whenever the kernel cannot prove its narrow subset. The existing v2 recognizer remains the old descriptor eligibility path; it is not used as evidence that kernel expressions are safe.

Kernel eligibility reparses each sink expression with the pinned OXC parser and accepts only an explicit AST whitelist: primitive literals, template literals, parentheses, selected unary and binary operators, logical expressions, and conditionals. Calls, tagged templates, member access, globals, unresolved or shadowed identifiers, assignments, updates, arrays, objects, casts, and all unlisted AST nodes decline to v2. The enclosing OXC semantic pass records each state reference's exact span and state-site identity. Code generation replaces only AST identifier spans that exactly match those recorded references, then maps their site IDs to normalized layout slots. It does not rewrite identifiers by spelling.

Template text and escapes remain slices of the original expression. Every accepted result is primitive because each literal and state input is primitive and every accepted operator preserves primitive results. Unknown or recovered syntax fails closed.

## Representation

`executeCut(changedRows, changedSlots, changeCount, rowStates, stagedRows, stagedSinkIds, stagedValues)` consumes the existing ordered cut. Each `rowStates[rowIndex]` is the prepared row record: the kernel reads `inputValues[slot]` and the existing `sinks[sinkIndex].lastValue` directly. It does not copy captured inputs into a flat matrix or clone writer, force-write, or last-value records. Its seen mask deduplicates sinks reached by multiple changed slots. Projection results are staged before any host call, and inline SameValue behavior matches primitive binding semantics even when `forceWrite` is set.

The row input vectors and output staging buffers remain necessary to the shared whole-cut contract. This prototype adds no lifecycle/version registry and does not claim lower total allocation or faster runtime. Heterogeneous or partially eligible owners use the existing descriptor path.

## Focused evidence

- Rust: the focused compiler unit test passes for two isolated owners, primitive AST emission, mixed eligible/nonprimitive whole-owner fallback, and unchanged v2 vector fallback.
- Node 24.18.0: the generated kernel proof passes multisource interleaved ordering, conditionals, escaped templates, NaN, signed zero, equal forced primitive suppression, and mixed-owner fallback. It extracts the emitted declaration with a lexical state machine that handles strings, comments, template raw text and nested template interpolation, rather than stopping at a newline or literal-sensitive delimiter.
- The proof is compile-time emitted-code evidence only. It does not integrate a runtime consumer, establish a speedup, or test host cancellation/reentry behavior.

Final commands run:

```sh
CARGO_HOME="$PWD/.cache/cargo" CARGO_TARGET_DIR="$PWD/.cache/compiled-owner-kernel-compiler-stage-v3/target" cargo test --locked --manifest-path .cache/compiled-owner-kernel-compiler-stage-v3/compiler/oxc-spike/Cargo.toml emits_one_primitive_whole_cut_kernel_and_preserves_v2_fallbacks
PATH="/Users/tjw/.nvm/versions/node/v24.18.0/bin:$PATH" CARGO_HOME="$PWD/.cache/cargo" CARGO_TARGET_DIR="$PWD/.cache/compiled-owner-kernel-compiler-stage-v3/target" node .cache/compiled-owner-kernel-compiler-stage-v3/node-proof/execute_owner_cut_kernel.mjs
```

## Separate bookkeeping cleanup revision

This v4 stage is based on v3 and removes only the unread `NativePropCandidate.state_ref_counts` field, its two candidate initializers, and its unused increment. The isolated delta is `cleanup-only.patch`; `compiler.patch` includes the kernel plus cleanup against live source. No v4 tests have been run. The v3 full locked suite passed all 34 tests and is preserved at `.cache/compiled-owner-kernel-compiler-stage-v3/review-execution/cargo-test-full.log`.

## v4 verification

The complete v4 locked Rust suite passes (34 tests). The Node 24.18.0 emitted-kernel execution proof passes. A direct comparison invokes the v3 and v4 staged compiler binaries on the identical fixture and request; the emitted `plan.component_module` strings are byte-identical with SHA-256 `fa4d7e2c8d4352ba5a7cf284dfe25dfa288d29cd5f25a9ca346eb7c515100530`. Responses and emitted modules are preserved in `review-execution/emission-comparison/`; the comparison result is `comparison.json`.
