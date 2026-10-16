# Derived array eligibility stage

This is an isolated, compiler-only staged change. The sole source diff is [derived-array.patch](derived-array.patch), changing only a staged copy of `compiler/oxc-spike/src/main.rs`. Its staged source SHA256 is `0130ca4e1f5d43ea81511c1477e5da0a72f33a2416e7d068bde0f427c609d5e7`; the unchanged staged `owner_update_program.rs` hash is `666ab9e317c9f83092b45afc558be656896b6dff69b772609371bc9025a656a9`. Live compiler inputs matched their staged baselines before editing (`main.rs` `521f6e5f3dd569fdeb67f57e71ec96ad419403872df1222d4affb4430d7faf65`; owner program `666ab9e317c9f83092b45afc558be656896b6dff69b772609371bc9025a656a9`). No live file was edited.

## Change

`NativeStateUsageCollector::candidate` now uses the existing shared `PrimitiveOrArray` AST policy for JSX sink candidates. Derived-local initializers and owner-kernel emission still use `Primitive`. No descriptor, runtime type, layout, kernel schema, equality rule, or force-write behavior changed.

The focused golden has one scalar sink and an aliased tuple sink in the same component. It verifies both remain generic V2 projectors and no owner update kernel is emitted. Negative cases for array and object initializers, calls, member access, and escaped captures retain owner fallback. The existing compound projector test and primitive owner-kernel/V2 fallback test also pass.

## Verification

- `cargo test --locked ... derived_scalar_aliases_qualify_generic_numeric_tuple_sinks_only`: pass.
- `cargo test --locked ... unsupported_derived_array_aliases_keep_the_owner_fallback`: pass.
- `cargo test --locked ... emits_one_primitive_whole_cut_kernel_and_preserves_v2_fallbacks`: pass.
- `cargo test --locked ... state_layout_admits_compound_projectors_and_excludes_other_reads`: pass.
- `cargo check --locked`: pass.
- Node 24 `--experimental-transform-types` actual authored TSX proof: pass. It uses the dynamic real Three namespace, writes `[x, x % 2, 0]` to a real `Mesh.position`, confirms the Vector3 identity is retained, exercises a reentrant update and the next flush, verifies no component rerender, and disposes the host/root. Result: `proof/results/result-1791929803023-27288-b655b05a-6372-4bb8-bc33-915724f5d62d.json`.

The proof uses a copy of the exact runtime sources identified by the result hashes: World `e9aadf02db1e8f29f18b2999b60b93681c1458e0f18dd2891f2b36e8f43c2d34`, Root `dc6ceceba93b59c6c688e250cb0cce2be3ed836296994d4101de218fada602a9`, VDOM `00d8516d2164d1f212e804dd3a579bc13588158eb361e756e2ebd25753b73aab`, API `dac67d06c68eb81ebd680b755ba4fb08eba35648adae311d589156b5174a4d74`, layout `92a048e585ced4c7e74ef04bedd738b27a2ee49574c0cd11539d481937184dd1`, and binding runtime `d2c2a059c2abf3ec9cb88a40c10a9cfbb982074b3e0c8ade3438e8cef9101646`.

This proves generic projector eligibility and runtime correctness only. It does not exercise a tuple owner kernel or make a performance claim.
