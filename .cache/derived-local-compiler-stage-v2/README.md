# Derived-local compiler stage v2

This is an isolated compiler prototype. Nothing in `compiler/` or `src/` was edited.

## Staged patch

The source patch is [derived-local.patch](derived-local.patch). It changes only the staged copies of:

- `compiler/oxc-spike/src/main.rs` (`sha256 521f6e5f3dd569fdeb67f57e71ec96ad419403872df1222d4affb4430d7faf65`)
- `compiler/oxc-spike/src/owner_update_program.rs` (`sha256 666ab9e317c9f83092b45afc558be656896b6dff69b772609371bc9025a656a9`)

The frozen input hashes for the corresponding live files and Cargo manifests are in [baseline-inputs.json](baseline-inputs.json). No authoritative compiler source or fixture files were added, removed, or changed. The isolated baseline contains 72 copied compiler fixtures and the Rust crate. The runtime snapshot under `runtime/src` contains the 162 current `src` files and is used only by the authored TSX proof. All changes, fixtures, limits, AST facts, and expansion scratch exist at compile time; the generated runtime descriptors add no runtime registry or state.

## Behavior and limits

Direct component-body `const` bindings with closed primitive initializers can be expanded into existing numeric sink descriptors. State-derived chains and literal constants are supported. The shared AST visitor admits primitive literals, identifier references accepted by the caller, templates, parenthesized expressions, unary/binary/logical expressions, and conditionals. Arrays remain available to generic projector certification but are excluded from the owner kernel. Objects, calls, member access, assignments, updates, and other syntax are rejected. Reserved `undefined`, `NaN`, and `Infinity` bindings, mutable or escaped locals, out-of-scope/forward references, and excessive expansion keep the owner on the existing fallback. Candidate expansion is bounded by 4,096 bytes, 2,048 expression nodes, and depth 64; per-owner emitted state-derived expansion is bounded by 16 KiB and 8,192 nodes. Reference-free static output candidates do not consume that state-derived budget.

## Verification

All 38 staged Rust tests passed with `cargo test --locked` (log: `attempts/final-cargo-test.log`). `cargo check --locked` passed (log: `attempts/final-cargo-check.log`). The actual authored TSX Root proof passed under Node 24 with `--experimental-transform-types`; generated output also passed `deno check --frozen --config deno.browser.json`. It used this staged compiler binary and copied current runtime snapshot. Its result is in `proof/results/result-1791927614506-78537-9d9e1f61-8355-4418-9479-d10390616fcd.json`.

The Root proof exercises derived parity, a literal offset, repeated derived use, template output, equal-output acknowledgement without host writes, reentrant update deferral and later acknowledgement, no component rerender, and terminal behavior after a host write throws. Runtime snapshot hashes recorded in the result identify the exact Root, VDOM, World, binding, layout, and API sources used. This is correctness evidence only; it makes no performance claim.
