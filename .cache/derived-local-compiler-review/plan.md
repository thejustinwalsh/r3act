# Derived local support for compiled owner updates

## Observed compiler path

The current native compiler collects state bindings by resolved OXC `SymbolId`, then records JSX attributes on intrinsic elements as `NativePropCandidate` spans. `visit_identifier_reference` attaches a state reference to a candidate only when its source span is inside that candidate. Any other use of the state binding is added to `outside_state_reads`.

That rule makes this form ineligible even though its initializer is immutable and primitive:

```tsx
const parity = value % 2;
return <output data-parity={parity} />;
```

The reference to `value` lies in the declaration, outside the JSX candidate. The candidate only references the separate `parity` symbol, which is not a `NativeStateBinding`. The owner-wide outside-read check then prevents `propOnlySites` and the owner kernel from being emitted. A preserved compiler attempt with `useState(1)` confirms `propOnlySites: []` and no `ownerUpdateProgram`; the inline equivalent emits and runs through the schema-v2 kernel.

The current candidate pipeline is in the ordinal-v2 compiler's `NativeStateUsageCollector` and the `CandidateClassification` pass. It already checks immutable direct state bindings, owner-local state sites, numeric initializers, whole-owner eligibility, and a textual `numeric_expression_is_pure` predicate. Derived locals need a compile-time dependency analysis ahead of candidate certification. They do not need runtime state, a World field, or a row-local derived-value registry.

## Bounded eligibility rule

Start with a narrow definition subset:

- A derived binding is a `const` identifier with one initializer, declared directly in the owning component's function-body block before the returned JSX. It must dominate every candidate use. No destructuring, nested declaration scope, loop, branch-local declaration, or reassignment is eligible.
- The initializer is a closed primitive expression made from numeric state bindings, earlier eligible derived bindings, literals, parentheses, unary operators, the supported arithmetic/comparison/logical/conditional operators, and template literals. Use OXC AST node kinds and semantic `SymbolId` links to prove this. Do not widen the existing lexical scanner or substitute names textually.
- Every derived binding in the transitive dependency chain is immutable, owner-local, acyclic, and has only references in another proven derived initializer or a certified JSX sink. Any other use of a derived binding or one of its state dependencies marks the owner ineligible and keeps the existing render fallback.
- All candidates in an owner that depend on a given state site must remain eligible. Mixed eligible and unsupported sinks do not get a partial owner kernel.
- Preserve the authored declarations for ordinary initial rendering. For the update projector/kernel, inline the proven initializer expression by resolved symbol and source span, recursively expanding earlier derived bindings. Keep ordered state-site references deduplicated in authored layout order. Do not copy a runtime derived-local map into the component, Root, World, or VDOM.

The emitted sink expression must retain source evaluation order. Inlining may duplicate an expression when one local feeds multiple sinks, so the proof subset must contain only primitives and operators with no user code, accessors, or mutation. Calls, member reads, computed property access, object/array creation, function/closure expressions, assignments, updates, and unknown globals remain fallback cases. Shadowed `undefined` and other name-based ambiguities must be rejected by semantic binding resolution rather than accepted by spelling.

## Analysis shape

Keep the analysis local to the compiler transform:

1. Record `const` identifier declarations with their resolved binding symbol, owner component, initializer AST span, lexical block, and source order.
2. Record resolved identifier-reference spans, including the containing JSX candidate or declaration initializer. Defer the current immediate outside-read classification until the compiler can tell whether a reference belongs to a certified dependency chain.
3. For each JSX candidate, walk its AST. A direct numeric state read is a leaf. A derived-local reference expands only if the resolved symbol has one eligible, dominating definition. Any other symbol or AST node rejects that candidate.
4. Build the transitive dependency set and expanded expression in a temporary compiler data structure. Derive projector parameter order from the owning component's existing state layout, not map iteration or local declaration order.
5. Classify all candidates and all remaining references for the owner. Emit the existing schema-v2 program only when every state dependency is numeric, owner-local, and has no use outside the certified sink/dependency graph. Otherwise emit the existing bindings/render behavior with no owner-update program.

The temporary graph is discarded after code generation. Existing compiled state layout slots, numeric sink descriptors, `CompiledOwnerUpdateProgram`, and VDOM execution remain the only runtime representations. No identifier lookup or derived-expression work is added to a frame cut.

## Required invariants

- Resolution is by OXC symbols, so shadowed names cannot alias a state or derived binding.
- A derived definition must dominate its sink use and belong to the same component function. Lexical or conditional scope uncertainty declines eligibility.
- A state value used outside the certified dependency graph still requires component rerendering. The compiler must not hide such a read by deleting it from `outside_state_reads` globally.
- Any unsupported candidate poisons every dependent state site in that owner, preserving current whole-owner fallback behavior.
- Expressions are proven primitive and side-effect-free before inlining. Host projection and output ordering stays governed by the existing owner-kernel schedule.
- The emitted projector receives the same captured numeric inputs as an equivalent inline expression. Dependency-site ordering and duplicate-source behavior match current direct expressions.
- A rejected derived-local owner emits no partial owner metadata; legacy/uncompiled bindings continue to work.

## Acceptance cases

1. **Single derived scalar:** `const parity = value % 2; <output data-parity={parity}/>` emits one owner kernel with the same state slot and a projector equivalent to the inline modulo expression. Initial render and numeric updates match.
2. **Chain and template:** `const parity = value % 2; const label = \`v${parity}px\`; <output data-label={label}/>` expands the chain, preserves the template text/escaping, and matches direct inline output after updates.
3. **Shared two-source chain:** `const sum = x + y; const doubled = sum * 2;` used by more than one sink yields the existing authored-order layout slots once, each sink has the correct ordered dependency list, and one cut captures both changed source values before projection.
4. **Repeated dependency:** `const sum = x + x;` records one dependency slot while preserving both uses in the expression and SameValue output behavior.
5. **Non-JSX use:** reading the derived local or its state dependency in a branch, return text, trace value, or another unsupported location emits no owner kernel for that owner; full component rerender observes the new value.
6. **Mutable/escaping values:** `let`, reassigned variables, updates, closures, callback captures, and references that escape the component's certified JSX sink set decline to the current fallback.
7. **Scope and resolution:** a declaration in a conditional/block scope, a non-dominating declaration, a shadowed local, or a cyclic/forward dependency is rejected without attaching the wrong state slot.
8. **Opaque expressions:** function calls, `Math` or other globals, member/accessor reads, object/array outputs, computed properties, and shadowed `undefined` stay on the existing generic path. Mixed eligible and opaque sinks produce no partial owner kernel.
9. **Primitive parity:** numeric literals, nested parentheses, unary/arithmetic/comparison operators, conditional expressions already supported by the AST subset, and escaped/nested template literals produce the same output as direct expressions. Include `NaN`, signed zero, and primitive force-write behavior where reachable through the existing compiler helpers.
10. **Authored execution proof:** ordinary TSX with a derived local compiles through OXC, registers the expected schema-v2 metadata, drives the integrated VDOM kernel, preserves output/acknowledgment/reentry semantics, and does not rerender for a qualified cut.

## Scope boundary

This is a compile-time eligibility expansion only. It does not change runtime ABI, component state layout, root capture, VDOM preflight, host publication, or lifecycle ownership. Derived-local cases outside the proven subset retain the current coherent render path. No performance claim follows from eligibility alone.
