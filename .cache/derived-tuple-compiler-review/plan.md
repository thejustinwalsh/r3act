# Derived scalar aliases in generic tuple props

## Recommendation

Make the small eligibility correction first: when collecting a JSX prop candidate, use the shared `PrimitiveOrArray` AST policy for the candidate expression so a closed array output can expand a direct immutable scalar alias. Keep derived-local initializer certification on `Primitive`, and leave `owner_update_program::owner_kernel_expression` on `Primitive`. This should let a component such as:

```tsx
function Row() {
  const [x] = useState(1);
  const y = x % 2;
  return <mesh position={[x, y, 0]} />;
}
```

retain the existing generic numeric projector route rather than being disqualified by `y`'s use inside an array. It does not qualify an array for the primitive-only whole-owner kernel, and it does not change the binding descriptor or runtime ABI.

The relevant collector is `NativeStateUsageCollector::candidate` in `compiler/oxc-spike/src/main.rs`. It currently asks `visit_closed_primitive_expression(..., Primitive, ...)` for `expression_syntax_supported`. `numeric_expression_is_pure` already accepts `PrimitiveOrArray`; the derived-local collector itself should continue to certify only primitive initializers. The owner kernel builder independently reparses sinks with `Primitive`, which is the required array rejection boundary. Keep those policies distinct.

This is a compiler eligibility change, not a new tuple execution strategy. It should be reviewed and proved separately before any owner-kernel tuple work.

## Small-step acceptance proof

Use actual authored TSX and the existing compiler/runtime APIs, without authored binding helpers or runtime markers.

1. Compile an inline control `position={[x, x % 2, 0]}` and the alias case `const y = x % 2; position={[x, y, 0]}`. Both should emit a schema-v2 numeric projector and the same ordered source-site set; the alias case must preserve the expanded JSX expression and its source spans.
2. Assert the owner has no primitive owner-update kernel for this array sink. Assert scalar sinks in a different all-primitive component still emit the kernel.
3. Mount both actual TSX components through Root. Change `x`, flush, and assert the array values and Three vector output match the inline control, with no component rerender for the eligible owner. This is evidence for generic numeric projection only.
4. Retain the current negative cases: alias initializers containing arrays, holes, spreads, calls, member access, mutation, escaped reads, forward/out-of-scope bindings, and shadowed reserved identifiers must keep the existing fallback. Preserve the primitive kernel's existing `Vector`/mixed-owner rejection checks.
5. Confirm that `NaN` and signed-zero behavior remains governed by the generic VDOM equality/writer path. This small compiler change must not add tuple equality or suppress host writes.

The expected review is that JSX's outer closed array is permitted only as a candidate sink shape. Derived initializer ASTs remain closed primitive expressions; unsupported initializer syntax continues to poison state reads rather than being expanded. Existing shared AST visitor policies remain the only whitelist; do not add a second scanner.

## Larger tuple-kernel idea: defer

A specialized flat numeric tuple output could in principle evaluate axes inline, compare them to `group.lastValue`, and allocate the output array only when staging a changed result. It is not safe to add that to schema-v2's primitive-only kernel as-is:

- `CompiledOwnerUpdatePrimitive` and the emitted kernel contract are primitive-only. A tuple result needs a new explicit output shape/API or a distinct schema; quietly widening the current schema would weaken its validation contract.
- State-bound authored projectors currently retain `read` closures. VDOM groups set `forceWrite` for those closures. `sameBoundValueCanSkipWrite` deliberately keeps those writer calls observable, including when object values compare equal. A deep tuple comparison that skips the host call would change behavior for generic/custom hosts.
- The old `lastValue` is the array previously passed to the host. A generic host may retain or mutate that object, so reading its elements as the authoritative previous tuple can be unsafe. Copying axes into per-row cache buffers would add another output representation and allocations, against the current shared-layout goal.
- If `forceWrite` is honored, a fresh array still has to be staged and sent to the writer for each affected tuple sink. The obvious array allocation remains, so the proposed comparison does not by itself remove that cost.
- An in-place reusable array would change identity/retention semantics. Direct component writes would be host-specific and bypass the existing general host writer contract.

Therefore the first tuple follow-up should be profiling and semantics evidence only: measure the eligible generic tuple path after the small alias eligibility fix; record allocations and host writer calls for actual `position={[x, y, 0]}` updates. Proceed to a tuple kernel only if a concrete profile still shows array construction as material, and only with an agreed value/identity and force-write contract. Preserve the generic array projector as fallback.

## If a tuple kernel is later justified

Bound it to flat fixed-length numeric array literals whose axes are closed primitive expressions over the component's numeric state slots and numeric literals. Reject nested arrays, holes, spreads, nonnumeric axes, user calls, members/accessors, dynamic tuple lengths, and mixed unsupported sinks for the whole owner. Reuse existing prepared row records, `inputValues`, sink groups, `lastValue`, and host writer staging; do not add a per-row registry or copied sink/last-value map.

The generated result must preserve one captured source cut across all rows, evaluate every selected axis for the whole cut before the first host write, preserve global first-touch row/sink write order, check cancellation before publication, and let Root acknowledge only the captured versions. Host errors stay terminal under the existing policy. Until the `forceWrite` and array-identity behavior is explicitly resolved, tuple comparisons may not suppress an existing writer call. If a new kernel schema is needed, keep schema-v2 primitive-only and validate the new schema independently.
