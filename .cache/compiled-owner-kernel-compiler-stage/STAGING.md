# Isolated OXC owner-kernel prototype

This is a revised, unrun compiler candidate. The earlier source snapshot remains unchanged at `.cache/compiled-owner-kernel-compiler-stage-before-review-v1/`.

## Candidate boundary

The emitted whole-cut kernel is additive. Existing schema-v2 descriptors and projectors remain available whenever the kernel cannot prove its narrow subset. The existing v2 recognizer remains the old descriptor eligibility path; it is not used as evidence that kernel expressions are safe.

Kernel eligibility reparses each sink expression with the pinned OXC parser and accepts only an explicit AST whitelist: primitive literals, template literals, parentheses, selected unary and binary operators, logical expressions, and conditionals. Calls, tagged templates, member access, globals, unresolved or shadowed identifiers, assignments, updates, arrays, objects, casts, and all unlisted AST nodes decline to v2. The enclosing OXC semantic pass records the exact source span and state-site identity for each state reference. Kernel code generation replaces only AST identifier spans that exactly match those recorded references, then maps their site IDs to the normalized layout slots. It does not rewrite identifiers by spelling.

Template text and escapes remain slices of the original expression. Every accepted result is primitive because every literal and state input is primitive and every accepted operator preserves primitive results. Unknown or recovered syntax fails closed.

## Representation and staging

The kernel takes the existing ordered row/slot cut, existing row input buffer, the prepared row-state objects, and existing output staging buffers. Each row state is expected to expose its existing prepared sink groups directly; the generated code reads their `lastValue` fields and never clones writer, force-write, or last-value tables. Its per-row seen mask only deduplicates sinks reached by multiple changed slots, preserving cut first-touch order. Projection results are staged before any host call, and inline SameValue behavior matches primitive binding semantics even when `forceWrite` is set.

This prototype does not add a lifecycle/version registry or replace the descriptor fallback. The row input vector and output staging buffers remain necessary for the existing whole-cut API. It aims to remove per-sink projector dispatch from a homogeneous cut; it does not claim lower total allocation or faster runtime.

## Review and verification status

No Rust, Cargo, or Node checks have been run. The focused Rust fixture and Node execution proof cover two independent owner programs, interleaved row/slot first-touch order, multisource arithmetic, template escapes and conditional output, NaN, signed zero, forced primitive equality, and AST rejection of member/call/shadowed-identifier/vector/global cases. The vector-only fixture checks exact v2 fallback emission.

After review, the intended commands are:

```sh
CARGO_TARGET_DIR="$PWD/.cache/compiled-owner-kernel-compiler-stage/target" cargo test --locked --manifest-path .cache/compiled-owner-kernel-compiler-stage/compiler/oxc-spike/Cargo.toml emits_one_primitive_whole_cut_kernel_and_preserves_v2_fallbacks
node .cache/compiled-owner-kernel-compiler-stage/node-proof/execute_owner_cut_kernel.mjs
```
