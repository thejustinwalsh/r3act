# Current compiled pipeline: CPU attribution

12 October 2026. Tested input: automatic direct-writers checkpoint
`cc4c5370868bea0e32b5e2212c80a2fde90c2448116ec1f079a11455170cae51`.
Separate protocol: `product-mixed-direct-writers-cpu-protocol.md`.
Raw collection: `results/product-mixed-direct-writers-cpu-v3`.
Independent verification: **32/32 checks PASS**, including raw weighted samples,
loaded build bytes, frozen inputs, compiler proofs and harness samples.

## What this measures

Two fresh, serial, headed browser contexts with GPU disabled; schedule pages 20
and 21, React then native, 1,024 rows. Both passed 240 measured frames, 60 warmup
frames, eight structural frames and all five UI checks. Profiling began before
navigation and includes import, mount, warmup, harness inspection and disposal.
These are sampled self times across the whole page, not update-only timings.
No latency gate or independent-device claim follows from these records.

## Ranked current costs

Verified emitted offsets in the native bundle locate the following self frames.
Times are summed `timeDeltas` in milliseconds, not inclusive stack time.

| Frame identified in emitted source | Sampled self ms | Current work |
| --- | ---: | --- |
| `setSources` | 136.005 | Last-write source map, validation, changed sources, affected-group set, projection/write dispatch |
| `flush` | 132.234 | Owner invalidation/eligibility and branch planning; this frame does not isolate each substep |
| DOM style helper `De` | 106.925 | Style property conversion and assignment |
| Numeric flush `#Me` | 81.082 | Resolve sources/versions, deduplicate, construct pending records and tuples, restore guarded values |
| World `clearChangesThrough` | 60.202 | Version-checked dirty-site acknowledgement |
| Pending queue `clearThrough` | 51.527 | Owner/site lookup and version-checked pending-entry deletion |
| Pending queue `set` | 36.788 | Coalesced owner/site notification lookup |
| World state setter `#p` | 33.306 | State version/value mutation and notification |
| `scalarSource` | 29.404 | Owner/site lookup and numeric-source resolution |
| `setStyleProp` | 28.394 | Host style writer entry |
| Setter closure `a.dispatch` | 22.382 | Authored setter dispatch wrapper |
| Derived reader `n` | 20.868 | `derive(sources.map(source => source.value))` |

The native arm bundle accounts for 918.448 ms of sampled self time, including
authored code. Framework dispatch, validation and bookkeeping remain substantial
even when row functions do not rerun. A function entry offset identifies code,
but does not attribute every operation in that function separately.

Harness inspection is itself large: its `O` frame is 392.249 ms native and
415.784 ms React. Native `(program)` and `(idle)` are 1,015.275/193.901 ms;
React is 992.844/719.259 ms. These synthetic frames are not a framework cost
ledger. Whole-profile totals of 2,655.642/2,598.371 ms therefore cannot establish
an update-time ratio. Actual `(garbage collector)` frames are 50.621 ms native
and 55.406 ms React; this does not establish allocation volume or show GC as
the sole cause of the prior speed failures. Category labels are heuristic.

## Allocation evidence and limits

Source inspection establishes per-read unary arrays, per-flush maps/sets,
numeric pending objects and tuple arrays in these paths. This CPU collection
does not measure their allocated bytes or lifetime. The identity-V3 allocation
study is historical evidence for a different checkpoint, not current M1
allocation qualification. An allocation profile and phase/count instrumentation
remain open parts of M2; do not substitute function time for allocation counts.

## Next implementation decision

1. Emit a scalar projection helper for compiler-proven unary numeric JSX.
   Resolve the source at activation and read its value directly. Retain derived
   object mutation semantics, ownership capture, source maps and compound fallback.
   This removes the verified per-read input array. Its 20.868 ms self frame is
   small relative to the remaining work; it is not a predicted threefold win.
2. Resolve stable dirty source/sink identities once, then reduce repeated
   owner/site eligibility and acknowledgement lookups. Preserve reentrant
   versions, conditional lifetimes, teardown and shared-root semantics.
3. Prepare a coherent source cut without repeated tuple/map normalization when
   the internal producer proves uniqueness. Keep public duplicate/last-write
   semantics and compound projections coherent. Measure this path separately
   before adopting reusable queue storage.
4. Compose numeric and keyed structural work in one candidate lifecycle as M4
   specifies. Bounded edits should not force total owner/index visits.

Prioritize these measured costs before changing ordered VDOM storage. Rope-style
summaries cannot remove dense required prop writes. The integrated speed and
allocation gates, human extension comparison and independent-device gate remain
open. The Sol review remains held by its existing prerequisites.

## Preserved collection defects

The original run failed a collector requirement for the unselected dynamic arm
asset and lost the already-stopped profile before that assertion. V2 corrected
this and passed, but persisted no raw harness samples. Both directories remain
unchanged. V3 saves those samples and passed independent verification. Nothing
is pooled into a latency confirmation, and no failed evidence is removed.
