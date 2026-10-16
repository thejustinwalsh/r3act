Strict generated TypeScript revision — staged and verified.

This revision is based on the slotCount revision and leaves it immutable. It makes three compiler-only changes:

1. When owner kernels exist, the generated kernel table receives contextual typing from `readonly import(<same runtime helper module>).CompiledOwnerUpdateProgram[]`. The helper API staged by the runtime owner exports this type; there is no duplicate inline ABI type or new metadata registry.
2. The generated `rowStates[rowIndex]!` reflects the VDOM preflight guarantee that the cut's row indices are validated before execution.
3. SameValue comparison narrows both operands before numeric reciprocal arithmetic. The guards preserve strict-equality handling for all non-numbers, distinguish signed zero, and treat two numeric NaNs as equal without casts or calls.

The Node proof sends the emitted table declaration through Vite's existing `transformWithOxc` TypeScript erasure before VM evaluation. A separate Deno strict check type-checks the generated table against the staged `native_runtime_api.ts` overlay.
