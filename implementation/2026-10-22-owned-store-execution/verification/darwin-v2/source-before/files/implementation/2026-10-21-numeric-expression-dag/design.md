# Shared numeric expression DAG

Base: `5b58924051d18a1e50c125189570bae20f934ee1`, local main, MIT. The user means main-thread batching/fusion and shared computation, not promise overlap or workers. This slice preserves shared arithmetic in the existing compiled owner kernel. It does not select a new storage layout, adaptive traversal or remedy for the exhausted dense attribution recording.

## Concrete source basis and replacement

`NativeStateUsageCollector` already expands supported immutable component locals into closed sink expressions, with bounded expansion and transitive state references. `owner_update_program.rs` then emits each expanded expression independently inside the affected slot case. A local polynomial used by three props can consequently appear three times in the generated case. The existing kernel deduplicates sinks through `seenMask`, but does not share their numeric subexpressions.

Replace duplicated closed numeric arithmetic inside one affected slot case with a deterministic compiler-built DAG and topologically ordered local constants. Keep the existing input capture, source-to-sink edges, slot switch, selected sink order, equality, staging buffers, runtime row/cell validation, exact acknowledgement and publication lifecycle. No runtime registry, persistent memo values, new semantic version authority or additional traversal family is introduced. The existing generic and unspecialized paths remain.

## Proof boundary

Accept only expressions that already pass the compiler's closed primitive kernel proof. Generated captured numeric input reads and numeric literals are leaves. A shared arithmetic node must be proven number-valued from number-valued children; operators retain their original JavaScript grouping, coercion, signed-zero, NaN and infinity behavior. Never reassociate arithmetic or invent fast-math rules. Do not hoist string/template/unknown computations from short-circuit or conditional branches. Numeric-only arithmetic may be shared because captured inputs are private numbers, operations are effect-free and do not allocate strings or call application code.

Intern nodes using structural operator/operand identity, not raw textual coincidence. Elide parenthesis wrappers only when AST structure preserves grouping. Emit a temporary only for a repeated non-leaf eligible node, with collision-free generated names and bounded compiler work. Emit no additional runtime work when a case has no useful sharing. Do not eagerly evaluate a derived temporary when every consuming sink is already masked out. Preserve the original order of selected sink staging and host writes, including multi-slot updates and heterogeneous original-order runs. Sharing is within a slot case; it does not claim general DAG-wide fusion or reuse across rows/frames.

World owner/source identity, Root accepted histories, module revision and the existing publication authority remain sole semantic authorities. Public callbacks cannot gain purity from the new lowering. Keep whole-root guards and partial-failure quarantine. Failed/discarded candidates, newer reentrant actions, forks, resources and HMR retirement retain their existing behavior.

## Costs, budget and falsifiers

No measured removable-time fraction or speed benefit is established. The named source duplication is an authoring/code-generation issue, not a phase-cost attribution. Costs include compiler parsing/interner work and generated temporary declarations; no persistent runtime cache or new per-row storage is allowed. The matched end-to-end observation at the boundary decides what can be said about performance. If it does not help, preserve that outcome and do not stack further caches or rerun for a favorable result.

Falsifiers include changed values or floating-point grouping, hoisted potentially throwing/string work, repeated temporary evaluation after all sinks were already seen, changed sink/host order, lost controlling dependency, a new runtime version/identity registry, altered generic fallback, source growth without sharing, stale writes, lost reentrant actions or premature resource disposal. Actual Rust/OXC execution and AST inspection must prove the lowering ran; hand-authored metadata is insufficient.

## Integrated deliverable

Sol medium authors own disjoint compiler, compiled-fixture/gate registration and installed-consumer files. Primary reviews/integrates before Luna runs tests. The actual compiler fixture covers common derived-local sharing, multi-input/sink selection/order, signed zero/NaN, numeric versus string/conditional safety, generic fallback and reentrant exact acknowledgement with Memory/Three targets where applicable. Rust unit cases verify bounded structural interning and grouping.

The installed authored RAF/canvas interaction has 256 retained Three objects, local setters and three declarative transform outputs sharing a small polynomial. Native and React use the same authored arithmetic; React Compiler keeps normal local reuse and an explicit layout-effect Three adapter. A separate imperative floor has fewer obligations. A common oracle checks all transforms and retained identity before a Canvas2D draw/readback. This workload differs from the prior one-prop interaction, so its numbers cannot be reported as an old/new Native saving.

At source freeze run one consolidated frozen Darwin gate. Preserve failures. Only after a pass prepare fresh package tarballs and an untimed installed proof, then primary releases one hash-bound fixed-order comparison (12 warmup/60 measured frames per arm). No project server, VM or browser diagnostics are needed; offline synthetic HTTPS remains bounded/headless. No R3F, GPU/presentation, population-tail, cold/memory or independent-device claim follows. HMR delivery and the full product goal remain open.
