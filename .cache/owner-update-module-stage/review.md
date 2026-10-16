# Owner update program module extraction

## Private invariant boundary

`owner_update_program.rs` owns one proof-to-emission boundary: a closed primitive AST whose identifier spans match semantic state references and whose referenced sites map into the ordered owner layout becomes rewritten primitive expressions and an emitted per-owner cut program. Unsupported AST nodes, span mismatches, or missing layout sites return `None` and leave the existing v2 descriptor path in control.

The module API is private to the crate parent: `Sink`, `StateReference`, and `emit_owner_update_program(owner_program_id, ordered_layout_site_ids, borrowed_sinks)`. The module has no dependency on `main`, World, runtime, JSX discovery, or component registration. The parent still discovers state references and candidate sinks, groups owners, orders owners/layout, assigns table indices, and registers generated component metadata. Its remaining emitter function only orchestrates those steps and assembles the shared table string.

## Dependency accounting

The moved module imports `BTreeMap`, OXC allocator/AST/parser/span types, and `serde_json` through the existing crate dependency. There is no new Cargo dependency. `BinaryOperator` and `LogicalOperator` leave `main.rs`; `UnaryOperator` remains there because the numeric source recognizer still uses unary syntax at its earlier call site. The module also needs its own `UnaryOperator` import for the primitive AST whitelist.

`Sink` and `StateReference` are the narrow handoff from semantic discovery to code generation. Their fields are crate-parent-visible only because the main module constructs them. The module does not retain parser/semantic objects or expand source references by identifier spelling.

## Expected compatibility

The per-owner loop order remains the parent `BTreeSet` order; sinks remain in candidate order; layout slots remain in their existing authored order. The emitted object formatting, kernel alias table formatting, owner-to-kernel indices, limits, fail-closed checks, AST whitelist, span replacement, and fallback behavior are copied from v4. The only code-generation input adaptation is passing the layout's ordered `site_id` slice to the per-owner emitter.

Byte-identical emitted output is expected because the same values enter the same formatting operations and owner/table iteration remains unchanged. This candidate is deliberately unrun; output parity and compiler tests require primary review first.

## Staging provenance

The v4 source and manifest hashes are in `hashes.sha256`; v4 was read-only. Candidate files and unified patch are under this directory. No live compiler, TypeScript metadata/runtime, Cargo target, or v4 file was edited. No tests, formatter, build, or emission comparison was run for this extraction.
