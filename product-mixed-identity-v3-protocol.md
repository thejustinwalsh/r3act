# Compiled product mixed identity V3: confirmation protocol

**Status:** protocol fixed before confirmation collection; zero confirmation pages collected.
**Date:** 12 October 2026.

## Question and arms

Does the archived state-change identity candidate meet the existing product speed
threshold on the unchanged V2 mixed workload? This is a named candidate
confirmation. V2 results remain unchanged and are not pooled with this study.
The candidate adds stable pending owner/site identities and guarded numeric-only
reentrant restoration; compiler host JSX declaration generation does not emit
runtime code. Comparing historical V2 with V3 does not isolate one source change
or remove browser/device/time-of-run differences.

Native authored TSX passes the Rust/OXC compiler: each row has three numeric state
sites, three direct style writers, and a board mapping an explicitly typed native
KeyedCollection. React 19.3 authored TSX has the same three state fields, keyed rows
and DOM output. React Compiler must emit memo-cache code in ReactRow and ReactBoard.
Neither arm manually mutates host objects or uses a custom JSX factory in app code.
Both use explicit CSS pixel strings for left/top and a rotation string. Native
numeric CSS lengths do not currently emulate React's implicit pixel conversion.

Each row registers one frame callback on mount, which computes the same shared
x/y/rotation function and sets all three fields. On structural frames, both arms
first update retained rows and commit topology, then initialize inserted rows in
a second synchronous commit. All setter, native collection-operation planning,
commit, mount and cleanup work in these phases stays inside the step timer. Native
flush and React flushSync are public synchronous commit APIs. Initial mount plus
frame-zero initialization and final disposal receive separate timed totals.

## Fixed workload and schedule

- Sizes: 128, 512, 1024.
- Five paired fresh page loads per size; alternate React/native order by pair.
- Exact 30-page order is product_mixed_schedule.ts; no page may be dropped.
- 60 warmup frames, 240 measured frames, one update per RAF.
- Every 30th measured frame: remove first eight IDs, append eight new IDs, rotate
  the resulting order by thirteen positions. New IDs never reuse removed IDs.
- Shared state function: x=(id*17+frame*2)%760; y=(id*29+frame*3)%500;
  rotation=(id*7+frame*4)%360.
- Each page checks output, order, node count, retained-node identity, exact mount/
  cleanup counts, active writers and final disposal. Native collection readers and
  retained operation batches must be zero after teardown.

## Lock, collection and validity

Use the verified source/build archive at
implementation/2026-10-12-state-change-identity/source-and-build.tar.gz, including
its dist-product-mixed-candidate production bundle. Before collection create a separate
preregistration JSON referencing that archive hash, all production file hashes,
this protocol hash, collector hash, schedule and browser/device/clock calibration.
The unchanged page filename is product-mixed-v2.html; source content and schedule
are identical to V2. A different Portless hostname serves only the candidate
production output. Preserve the candidate and React emitted asset hashes.
Build proof files from the tested candidate build are copied into
results/product-mixed-identity-v3-buildproof before collection. Store each raw
page result separately with schedule identity and hashes; preserve failures,
loading errors and incomplete pages. Do not silently replace or exclude pages.

Only production mode, visible foreground pages, matching schedule and compiler
proofs qualify. Collect serially through Portless with fresh browser contexts.
Archive every page even if a gate fails; implementation changes require a new
named preregistration. Pilot pages are correctness preparation and never enter
confirmation analysis. Record timer granularity, user agent and available machine
metadata. A second browser profile on this computer is not independent-device
replication.

## Analysis and decision

The page load is the replication unit. Frame samples are nested observations.
Report page median/p95 for all, ordinary and structural commits; mount, disposal,
combined mount+sum(step CPU)+disposal, and RAF intervals separately. DOM checks and
harness diagnostics occur outside the step timer; their allocations can affect
later frames, so report this limitation. An interval precedes its recorded update
and cannot be attributed to that update's structural flag.

For each size pair native and React by pair index. Require paired geometric mean
of page-median native/React commit ratio <=0.80 at at least two sizes and median
paired p95 ratio <=1.10 at every size. Every correctness contract and scheduled
record must pass. Report failures rather than treating them as missing samples.
Report medians and ratios with sufficient precision; do not decide from rounded
chart labels. Use SVG charts. Zero/coarsely resolved denominator timings require
an explicit unresolved result rather than fabricated ratios.

Collect memory/allocation profiles on separate untimed pages using the same
archived build, labelled separately; do not mix profiling overhead into latency
samples. Rendering/layout/paint/GPU presentation, module import latency, and build
time are outside this controlled commit comparison. It is not a Three.js or async
transition performance study. The existing mixed thresholds are reused. V3 numerical differences are not
attributed solely to the identity cache; a source-controlled counterfactual would
be needed for a single-optimization causal estimate.

Failure withholds dynamic-realtime superiority claims. It does not erase prior
fixed-topology evidence. Complete the finite comparison and memory profile before
another optimization family; independent-device and human maintenance evidence
remain prescribed separate gates.
