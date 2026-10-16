# Coherent mixed candidates

12 October 2026. Correctness checkpoint: 556 runtime tests, 29 Rust tests,
54 full-suite commands, three final checks and six production pilot pages pass.
Five served production files match the local build byte for byte. Source and
evidence are preserved in `implementation/2026-10-12-mixed-candidates`.

## Change

Compiler-certified collection edits now compose with approved numeric props and
participating store readers through the existing candidate lifecycle. Preparation
uses private owner/state overlays and a shared store transaction. Host work applies
keyed topology, independent reader leaves and numeric values before publication,
refs and effects. Removed-owner cleanup precedes newly mounted effects.

`prepare(tree)` retains its explicit full-tree contract. `preparePending()` is the
additive entry point for tracked root work, with coherent full-tree fallback for
unsupported footprints. The automatic flush path selects the same mixed strategy.
Authors continue to write ordinary TSX, `useState` and `use(store)`.

## Evidence available

- `compiler/native_mixed_candidate_execution_test.mjs` compiles ordinary TSX with
  Rust/OXC. It combines shared store and numeric updates with keyed insert,
  same-key replace, move and remove. Its full-tree `prepareCommit` trap records
  zero calls. A stale pre-host cut is rejected without changing the host or
  releasing refs/effects; the replacement cut publishes numeric value 8 and store
  value 1. Retained rows preserve host identity. Disposal balances four mounts and
  cleanups and releases store/collection registrations.
- `compiler/native_store_owner_execution_test.mjs` exercises 1,000, 10,000 and
  50,000 rows. A mixed store update plus insertion visits exactly two component
  owners, executes only the new row and existing store reader, attaches one new
  numeric writer and preserves existing rows/state. The historical full-traversal
  assertion was replaced with a stricter bounded-visit assertion; historical logs
  and archives remain unchanged.
- `scripts/verify_mixed_candidate_retention.mjs` passes controlled Node 24 GC
  checks while mounted roots, closed candidate handles, raw prepared programs and
  setters remain retained. It covers explicit discard, automatic stale rejection,
  and published rows subsequently removed. This is a narrow retention result,
  not a heap-size or allocation-rate claim.
- Primary review corrected nested region validation, duplicate leaf normalization,
  quadratic captured-write lookup, private-owner cancellation, store-reader
  preservation, committed-read validation, terminal handle cleanup and effect
  cleanup ordering. Focused regressions accompany these changes.

Evidence artifacts for this milestone live in `.cache/mixed-candidate-milestone`;
the archive captures final source/build hashes and final checks together. The two
initial review failures remain recorded separately.

The shared-root regression uses an actual store transition: committed views stay
old during preparation, both candidates read the selected transition projection,
both roots apply host work and publish, then a batched transition completion
precedes effects. Retained rows keep identity and the transition scope closes.
This exercises the coordinated publication protocol; competing out-of-order
transition arbitration is not covered by this new regression.

## Limits and next decision

This removes the general-tree planning step for supported mixed work. It does not
prove a latency win over React Compiler. Existing numeric candidate application
still uses general source batching; snapshot capture and object/dirty-map costs
remain. Unsupported resources, native boundaries and unproved owner footprints
continue through coherent fallback.

The large fixture reports bounded component visits, but its first structural edit
also releases a cached child array of collection size. Ordered bucket maintenance
and these release costs remain visible; component counts must not be presented
as proof that every operation is constant time.

Continue the attributed M3/M5 storage work
before the unchanged registered performance confirmation. Independent-device and
comparative maintenance/adoption evidence remain required. Sol's full review is
still held by `sol-review-prerequisites.md`.
