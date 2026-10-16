# Native captured cell cuts

13 October 2026. Correctness checkpoint: 573 runtime tests, 29 Rust tests,
55 full-suite commands, two final checks and six production pilot pages pass.
Five served production files match the local build byte for byte. Source/build
and evidence are preserved in `implementation/2026-10-13-native-cell-cut`.

## What changed

Eligible numeric-only root updates copy stable cell handles and captured versions
into reusable parallel buffers before the generic `StateChange` capture step.
The existing compiler-emitted numeric programs consume canonical sources from
that cut. Source values and host props remain staged coherently; successful work
acknowledges both the shared world journal and the root-local pending queue.
Newer reentrant versions stay queued.

These buffers still represent a captured snapshot. The change removes the fresh
array and per-cell `StateChange` records from this path, not snapshot semantics or
all allocations. Unsupported values, unannotated sinks, store/collection work and
async candidates retain independent snapshot capture and coherent fallback.

No author flag or mutation loop is needed. Ordinary `useState` and JSX continue
through the mandatory Rust/OXC compiler. The older private snapshot-backed
numeric-program route was removed: it duplicated execution now handled before
snapshot capture, and existing generic fallback covers declined work. This local
cleanup leaves Root 99 lines shorter than the tested intermediate implementation.
Compared with the preceding M4 checkpoint, the new route and guards add 52 Root
lines; the queue/world APIs also add code. Neither comparison proves easier
maintenance or a smaller library than React.

## Evidence available

- `compiler/native_numeric_cell_cut_execution_test.mjs` compiles ordinary TSX
  with scalar, compound and CSS sinks for 32 owners. At densities 1, 4 and 32,
  each batch updates 2/8/64 sources and evaluates/writes 5/20/160 sinks. A
  `capture()` trap records zero calls during eligible frames, while the generic
  `setSources()` trap remains silent. Retained rows keep identity without repeated
  component execution. String state and mixed topology exercise fallback.
- `src/native_cell_cut_test.ts` verifies native ordering/coalescing, caller buffer
  capacity, fallback cleanup, incarnation/address checks and version-bounded
  acknowledgement across two independent root journals.
- `src/native_numeric_cell_cut_test.ts` covers newer writes, deferred reentrant
  flush, root isolation, invalidation/fallback behavior, throwing writers and
  disposal while scratch is in use. A version mismatch declines specialization;
  generic work commits current values and preserves the newer pending version.
- `scripts/verify_native_cell_cut_retention.mjs` checks removed-row and
  dispose-inside-writer payload/target collection while roots, hosts, dead setters,
  stable handles and capture buffers remain retained. Fallback after buffer growth
  also releases active prefixes. This is a narrow controlled-GC check.

Synchronous structural updates and candidate preparation on the same root are
blocked while native numeric host work owns its scratch. Setters, deferred flush
and disposal remain available. Caught reentry leaves the host tree intact;
propagated writer failure retains the terminal failure policy.

The tested source/build before simplification is retained in
`.cache/native-cell-cut-pre-simplification`. Final evidence lives in
`.cache/native-cell-cut-milestone`; the checkpoint archive preserves both.

## Limits and next decision

World dirty maps/sets, owner/site storage, public subscriber records, CSS strings
and host allocations remain. Retained numeric buffers grow to their high-water
size and release capacity on disposal. Mixed candidate numeric writes continue
to use general source batching. No allocation-rate, latency, size or universal
React advantage follows from the capture trap or this local line reduction.

Next, freeze one fresh allocation
diagnostic against this archive. Preserve the established React/native pairs at
128, 512 and 1,024 rows and independently verify emitted-source attribution.
The profile includes cold import/mount, warm frames, checks and disposal; it is
not a measurement of steady-state allocation alone. Use its ranked current costs
to decide the bounded M5 storage work. Keep historical profiles immutable and the
registered release targets unchanged. Sol's full review remains held.
