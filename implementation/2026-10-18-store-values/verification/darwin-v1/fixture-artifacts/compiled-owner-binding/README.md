# Compiled owner binding metadata staged patch

This is a review-only staged patch; it has not been applied to shared `src/` files.

- `compiled-owner-binding.patch` contains the source and test diff.
- `staged/src/` is a copied source tree with the patch applied, used for focused Deno verification.
- `staged/src/compiled_owner_binding_test.ts` covers optional layout program IDs, V1 compatibility, V2 owner association and isolation, direct projector capture, raw promoted multi-source values, and invalid V2 descriptors.

The metadata API is `BoundValue.numericOwner = { owner, programId, layout, sourceSlots }` and optional `projectInputs`. Multi-source V2 exposes the authored derive callback as `projectInputs`; unary V2 keeps direct scalar projection. `bindStatePropsAt` returns a raw projected value only for a valid owner-matched V2 program whose declared slot lacks a numeric source; legacy V1 overloads retain their `BoundValue<T>` type and behavior. Layout signatures use JSON structural encoding so program IDs and site IDs containing separators cannot collide.

Focused command (30 tests passed):

```sh
deno test --config .cache/compiled-owner-binding/staged/deno.browser.json \
  .cache/compiled-owner-binding/staged/src/compiled_owner_binding_test.ts \
  .cache/compiled-owner-binding/staged/src/compiled_state_layout_metadata_test.ts \
  .cache/compiled-owner-binding/staged/src/compiled_layout_activation_test.ts \
  .cache/compiled-owner-binding/staged/src/native_numeric_cut_test.ts \
  .cache/compiled-owner-binding/staged/src/native_compiled_eligibility_test.ts \
  .cache/compiled-owner-binding/staged/src/native_collection_runtime_test.ts
```
