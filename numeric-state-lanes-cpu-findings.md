# Numeric state lanes: attribution and next implementation

The registered mixed timing comparison failed every speed gate. Native paired median ratios were 1.750, 1.918 and 1.991 at 128, 512 and 1,024 rows. The lane layout alone did not deliver the target. See `numeric-state-lanes-timing-findings.md`.

The subsequent frozen 1,024-row CPU pair passed 39 independent evidence checks. Whole-page sampled bundle self time was 785.534 ms native and 328.098 ms React. These profiles include startup, warmup, inspection and disposal: those totals are not update latency or recoverable savings. The reproducible SVG uses compiled function names and UTF-16 source coordinates; source excerpts in the raw records support attribution.

Native source-verified sampled contexts include VDOM cell-cut validation/staging (132.543 ms), prepared DOM style writer (108.898 ms), World dispatch (63.613 ms), published setter dispatch (42.273 ms), Root lane selection (40.339 ms), journal marking (31.639 ms), lane resolution (28.336 ms), cell acknowledgement (25.621 ms), lane validity (23.728 ms) and column membership lookup (20.793 ms). Browser work may be charged to its JavaScript caller.

## Bounded next change

Prepare the unary writer fanout when bindings activate, using the existing numeric program source slots. A Root can retain an opaque prepared cell program instead of repeating descriptor and membership lookups every frame. Structural refresh must invalidate or refresh that program before another cut. Whole-cut preflight must still finish before source mutation, projection or host writes. Exact cell version, generation, promotion, cancellation, reentry and disposal remain correctness requirements.

Separately remove only redundant physical owner/cell membership checks whose identity lifetime was established in `numeric-lane-identity-audit.md`, and forward published candidate setters directly to their existing arrow function. This does not authorize changing acknowledgement semantics or treating logical keyed-slot occupancy as physical liveness.

Bounded agents own VDOM preparation, World identity resolution and Root integration respectively. The primary reviews their changes and adversarial tests. Keep the existing public cell-cut fallback. Exercise ordinary OXC-compiled TSX, structural edits, promotion, duplicate cuts, stale tokens, reentry and disposal before any timing run. Repeat the unchanged registered speed targets on a new frozen candidate. Fewer lookups alone is not a performance claim.

This change preserves retained VDOM, compiler-required JSX, coherent publication, async stores and transitions, and public host adapters. It does not add a separate author mode or make a claim about full React compatibility. Worker, hydration, Wasm, device and human maintenance gates remain open; the Sol review remains held.
