# Empirical appendix: full study reports

This appendix preserves the full study narratives, methods, results, limitations,
and artifact references formerly in paper §8. The main paper now synthesizes
those results and keeps each subsection heading as a stable cross-reference.
The 16 report bodies were moved verbatim; the experiment log and machine-readable
results remain the source for collection history and raw evidence.

## 8. Full study reports

These are deliberately downstream, not an invitation to keep adding unranked
experiments:

- **Frame-bound host props:** V5's development collection and its matched Vite
  production-build replication each completed 100 scheduled page loads and
  30,000 measured RAF callbacks. In production, the OXC-to-VDOM arm's median
  update-to-commit was 0.3/0.5, 0.3/0.5, 0.6/0.8, and 0.9/1.1 ms median/p95 at
  32, 128, 512, and 1,024 segments; React + Compiler was 0.6/0.9, 0.4/0.6,
  0.8/1.1, and 1.3/1.5 ms. All five paired page loads favored OXC CSR at every
  size, though the paired median ratios were a narrower 0.50×–0.69×. Update CPU
  was higher for the OXC arm at 512 and 1,024; runtime-discovered VDOM bindings
  were faster than OXC CSR at those sizes; and RAF interval p95s stayed near 17
  ms across arms. The result remains fixed-topology one-device evidence, not a
  frame-presentation win. Lenis scroll effects and a real Three/R3F host remain
  follow-on workloads.
- **Host breadth:** demonstrate one declarative Three scene with props, events,
  disposal, and frame-loop interaction through the adapter.
- **Compatibility boundary:** identify which React libraries can use the adapter
  directly and which need a small explicit bridge; JSX syntax alone does not
  imply compatibility.
- **Incremental summaries:** test Xi-style cached summaries only for aggregates
  where the update algebra is explicit, and compare propagation cost against the
  full pass.
- **Client/server or worker streams:** define versioned snapshot/patch envelopes
  first; use CRDT merge only for domain data with concurrent writers.
- **Compiler maintenance:** measure OXC build time, diagnostics, source maps,
  and the cost of supporting real TSX; compare it with the current TypeScript
  path.
- **Wasm/SIMD:** revisit only if profiles from the JS implementation identify an
  isolated numeric kernel as a material bottleneck.

These questions matter after the core interaction and structural gates clarify
that the architecture is worth extending.

### 8.1 Snake frame updates: fixed-topology study

This production-build browser study uses an autoplay Snake-like trail. A
discrete simulation tick advances the head, while every `requestAnimationFrame`
interpolates and writes transforms for all visible segments. Topology stays
fixed during the measured phase. It tests frequent declarative host updates
directly, without claiming to measure a Three.js scene or actual display
presentation.

Three arms use the same deterministic path and final host output:

1. **React + React Compiler:** stable segment components subscribe to
   per-segment snapshots through `useSyncExternalStore`; notifications are
   batched each RAF. One null-rendering root marker with a layout effect
   timestamps each commit. Earlier V2 data used a layout effect per segment and
   is retained only as a pilot; V3 removes that React-side measurement bias.
2. **Retained binding runtime:** mount a JSX helper tree once, bind a scalar
   source to direct style-property writers, and update the source once per RAF.
   This path is hand-authored; it does not yet use an OXC-generated per-frame
   update plan.
3. **Direct DOM lower bound:** cache the same host nodes and write the same
   transform props directly.

The V3 protocol collected 32, 128, 512, and 1,024 segments, with three isolated
page loads per arm and size. Each page used 90 warmup and 300 measured frames,
and arm order rotated across page-load replications. All 36 pages (10,800 frame
samples) passed final transform parity, stable segment/food identity, and
complete React commit coverage. The replication unit is the page load; frame
observations are nested within a page.
[`results/browser-snake-frame-v3-manifest.json`](./results/browser-snake-frame-v3-manifest.json)
pins the raw dataset with SHA-256 hashes, and the notebook validates each record
before generating SVG charts.

The table reports the median of the three page medians / median of the three
page p95 values, in milliseconds. RAF p95 is the median of the per-page RAF p95
values.

| Segments | Update CPU: React / runtime / direct | Update-to-commit: React / runtime / direct | RAF interval p95: React / runtime / direct |
| -------: | ------------------------------------ | ------------------------------------------ | ------------------------------------------ |
|       32 | 0.10/0.30 · 0.20/0.40 · 0.10/0.30    | 0.30/0.80 · 0.20/0.40 · 0.10/0.30          | 18.0 · 18.2 · 18.2                         |
|      128 | 0.10/0.20 · 0.20/0.30 · 0.10/0.30    | 0.40/0.50 · 0.20/0.30 · 0.10/0.30          | 17.6 · 17.6 · 17.3                         |
|      512 | 0.20/0.30 · 0.40/0.60 · 0.30/0.40    | 0.80/1.00 · 0.40/0.60 · 0.30/0.40          | 17.3 · 17.4 · 17.2                         |
|    1,024 | 0.30/0.40 · 0.70/0.90 · 0.50/0.60    | 1.30/1.50 · 0.70/0.90 · 0.50/0.60          | 17.4 · 16.8 · 17.7                         |

An exploratory, post-hoc callback-tail check found one interval above 25 ms
among all 10,800 measured RAF callbacks. It occurred on one 1,024-segment React
page; no other page had an interval above that threshold. This is a callback
timing threshold, not a dropped-frame or physical-presentation measurement, and
the single observation does not support an arm-level smoothness difference.

In this workload, the retained binding path lowers median update-to-commit time
relative to React at every tested size: by 50% at 512 segments and 46% at 1,024.
Its p95 is also lower at those sizes (0.6 vs 1.0 ms and 0.9 vs 1.5 ms). The cost
moves into the update path: at 1,024 segments, runtime update CPU is 0.7 ms
versus React's 0.3 ms. Direct DOM remains fastest on both measurements, as
expected for the implementation lower bound. At 32 segments, timing is near the
browser timer resolution and the relative difference is not meaningful.

These are same-device Chrome 154 results from one MacIntel profile, 1280×720,
DPR 2, estimated 60 Hz. All measured commits stayed below 8.33 ms, but the
device did not provide a 120 Hz presentation test. RAF interval p95s were
broadly similar and are not a measurement of paint or presented frames. The
study therefore supports a narrow conclusion: this retained binding prototype
reduced measured host-update-to-commit latency in a high-fanout DOM workload,
while doing more update-path JavaScript work than React and more work than
direct DOM. It does not show that the complete compiled runtime is faster, that
users perceive smoother motion, or that the architecture scales across devices.
Later V5/V6 and sparse V1 studies added compiler-generated update plans and
sparse/dense controls; see §§8.3–8.7. Those studies remain single-device and
fixed-topology, and their update-to-commit timings are not presentation
measurements. The open performance gates are independent-device replication with
timing-floor calibration, dynamic topology, and teardown-inclusive lifecycle
cost. Lenis scrolling and a real Three/R3F host remain later workloads.

### 8.2 OXC-generated per-frame bindings: V4

V4 puts OXC-emitted repeated-host bindings in the same per-frame trail fixture.
It is intentionally separate from V3: every arm now updates the same
two-dimensional segment positions through `left` and `top`, because the current
generated-plan subset can emit those static scalar style writers. The workload
keeps fixed topology and the same food node. The generated plan has two
item-local CSR source slots (`x` and `y`), emits static host writers, and
flushes once after both values are set for each segment. The other arms are
React + React Compiler with leaf `useSyncExternalStore` subscriptions, a
retained VDOM with two hand-authored bindings, and cached direct DOM writes.

The balanced protocol has 32, 128, 512, and 1,024 segments, four arms, and four
page-load replications per cell: 64 visible page loads and 19,200 measured RAF
callbacks. Every page uses 90 warmups and 300 samples. Arm order and
segment-size order rotate across the four replications. All pages pass final
coordinate parity, stable segment/food identity, and complete React commit
coverage. The page is the replication unit; RAF observations are nested. The
[V4 manifest](./results/browser-snake-frame-v4-manifest.json) pins the selected
raw records by SHA-256, and the notebook verifies the hashes and contracts
before producing an SVG chart. Eight interactive smoke records are excluded by
the manifest.

The table reports the median of page medians / median of page p95s; RAF interval
p95 is the median of the four page p95s, all in milliseconds.

| Segments | Update CPU: React / retained / generated / direct | Update-to-commit: React / retained / generated / direct | RAF interval p95: React / retained / generated / direct |
| -------: | ------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------- |
|       32 | 0.20/0.30 · 0.30/0.45 · 0.20/0.35 · 0.20/0.40     | 0.55/0.90 · 0.30/0.45 · 0.20/0.35 · 0.20/0.40           | 17.90 · 18.05 · 18.15 · 18.15                           |
|      128 | 0.10/0.20 · 0.20/0.40 · 0.15/0.30 · 0.20/0.35     | 0.60/0.75 · 0.20/0.40 · 0.15/0.30 · 0.20/0.35           | 16.80 · 17.20 · 17.15 · 17.35                           |
|      512 | 0.10/0.20 · 0.45/0.55 · 0.30/0.40 · 0.35/0.50     | 1.20/1.35 · 0.45/0.55 · 0.30/0.40 · 0.35/0.50           | 16.80 · 17.10 · 17.10 · 17.15                           |
|    1,024 | 0.20/0.30 · 0.80/0.95 · 0.50/0.60 · 0.65/0.80     | 2.10/2.30 · 0.80/0.95 · 0.50/0.60 · 0.65/0.80           | 16.80 · 16.80 · 16.80 · 16.80                           |

The generated plan lowers median update-to-commit time by 75% against React at
128 and 512 segments, and 76% at 1,024; at 1,024 its page p95 is 0.60 ms versus
2.30 ms. The generated path uses more median update CPU than React at 128
segments and above. These measures have different boundaries: React update CPU
ends after store notification and scheduling, while update-to-commit includes
the React leaf render and commit; generated writes complete synchronously before
its update call returns. Therefore update-to-commit is the closer end-to-end
comparison. It remains an implementation-path result because React performs
component execution and reconciliation that the repeated-host plan bypasses. The
32-segment measurements are near the browser timer floor.

All V4 runs are Chrome 154 on one MacIntel profile/device. RAF callback p95s are
similar, but do not capture paint or physical presentation. The workload writes
`left` and `top`, and CSS/layout work is not forced into the measurement.
Compiler execution, plan mount, bundle/parse cost, allocation, memory, and
teardown are excluded. V4 does not establish a general React speedup, smoother
presentation, or full compiler/runtime advantage. It does provide the first
direct browser evidence that this OXC-emitted repeated-host writer path can
reduce measured host-update-to-commit latency in the tested fixed-topology
workload. The next tests are a second-device replication, mount and bundle cost,
sparse-dirty and structural updates, then a compiler-generated plan integrated
with the retained VDOM rather than the repeated-host adapter.

### 8.3 Preregistered integration study: Snake V5

V5 closes a specific comparison gap rather than adding another isolated runtime
microbenchmark. Experiment V already routes OXC-emitted CSR binding IDs through
`VDOMSnapshotRoot`, but its scalar-prop fixture does not measure the per-frame
Snake workload. V4's generated arm uses OXC-emitted writers through a
repeated-host adapter and bypasses VDOM binding dispatch. V5 puts these paths in
the same fixed-topology Snake protocol.

The frozen matrix contains five arms—React 19.3 + React Compiler,
runtime-discovered retained-VDOM bindings, OXC CSR bindings through the retained
VDOM, OXC-generated repeated-host writers, and direct DOM—at 32, 128, 512, and
1,024 segments with five isolated page-load replications per cell. Each page
uses 90 warmup and 300 measured RAF callbacks, for 100 pages and 30,000 measured
callbacks. Arm positions use a five-cycle Latin rotation and size order rotates
by replication. Every arm writes `left` and `top`; coordinate derivation happens
once per segment inside the measured frame callback. The page remains the
replication unit.

The protocol adds mount-to-first-commit timing, update CPU, update-to-commit,
RAF interval p95, and per-page Chrome heap-used snapshots before mount, after
mount, and after measured updates when available. Heap readings are noisy
diagnostics and do not claim precise allocations or per-component retained
memory. Paired setup-plus-update break-even counts compare each page's mount
time and per-frame median with the React page from the same size and
replication. A pre-data hostname amendment moved collection to an isolated
Portless route without changing the matrix. The
[`source lock`](./results/browser-snake-frame-v5-source-lock.json) hashes the
schedule, measured paths, compiler inputs, dependencies, and archive middleware.
The manifest SHA-256-pins all accepted raw pages; the notebook revalidates each
hash and emits SVG charts for update-to-commit, mount, and RAF interval p95. One
60-frame contract smoke is excluded.

All 100 scheduled pages passed parity, stable-host identity, visibility, and
frame-coverage checks: 30,000 measured callbacks, with five page-load
replications per arm and segment count. The measured medians and per-page p95
summaries are:

| Segments | React + Compiler | Retained VDOM | OXC CSR through VDOM | OXC repeated host | Direct DOM |
| -------: | ---------------: | ------------: | -------------------: | ----------------: | ---------: |
|       32 |        0.8 / 1.0 |     0.1 / 0.2 |            0.1 / 0.2 |         0.1 / 0.2 |  0.1 / 0.2 |
|      128 |        1.9 / 2.2 |     0.2 / 0.3 |            0.2 / 0.3 |         0.1 / 0.2 |  0.2 / 0.3 |
|      512 |        2.4 / 6.0 |     0.4 / 0.5 |            0.5 / 0.6 |         0.3 / 0.4 |  0.4 / 0.5 |
|    1,024 |        3.7 / 9.6 |     0.7 / 0.8 |            0.8 / 1.0 |         0.5 / 0.6 |  0.6 / 0.8 |

Values are update-to-commit median / p95 in milliseconds; each is the median
across five page-load summaries. At 1,024 segments, OXC CSR through the VDOM is
about 4.6× lower in median update-to-commit than React in this run. Its update
CPU median is higher at 512/1,024 segments (0.5/0.8 ms versus React's 0.2/0.3
ms), so the latency result does not mean less JavaScript CPU. Runtime-discovered
bindings are slightly faster than the generated graph path at these sizes (0.4
versus 0.5 ms; 0.7 versus 0.8 ms); on this workload the compiler graph did not
improve over the simpler runtime binding path.

The V5 collection ran through `pnpm run dev` with Vite 8.3.1. Its schedule
omitted build mode, so the development-only limitation was recorded post hoc. A
separate confirmatory schedule repeated the same matrix against Vite's
production build; its protocol, source lock, manifest, and paired notebook
analysis are documented below.

Median page-level RAF interval p95s ranged from 16.8 to 17.5 ms across arms and
sizes, with overlapping page ranges. This does not show a smoother frame cadence
for any arm. The measurement excludes bundle parse/evaluation, layout, paint,
GPU work, and physical presentation; it cannot establish display smoothness.
Heap snapshots are noisy diagnostics, not allocation attribution.

### 8.4 Confirmatory production-build replication

Because V5's frozen schedule did not specify build mode, the production
comparison uses a separate schedule frozen before those page loads. It repeats
the same five arms, four sizes, Latin arm order, five page-load replications per
cell, 90 warmup frames, and 300 measured RAF callbacks. The 100 production
records have `production-` trial IDs and are archived under
`results/v5-production/`; the development records and manifest remain separate.
The
[production preregistration](./results/browser-snake-frame-v5-production-preregistration.json),
[source lock](./results/browser-snake-frame-v5-production-source-lock.json), and
SHA-256-pinned
[production manifest](./results/browser-snake-frame-v5-production-manifest.json)
define the accepted dataset. The notebook verifies both sets of raw hashes and
emits inline SVG comparisons for update latency, mount time, and RAF interval
p95.

All 100 production pages passed parity, stable-host identity, visibility, frame
coverage, and archive contracts, yielding 30,000 measured callbacks. The table
reports the median of five page-level summaries; each page summary is itself the
median / nearest-rank p95 across its 300 measured callbacks.

| Segments | React + Compiler | Retained VDOM | OXC CSR through VDOM | OXC repeated host | Direct DOM |
| -------: | ---------------: | ------------: | -------------------: | ----------------: | ---------: |
|       32 |        0.6 / 0.9 |     0.3 / 0.5 |            0.3 / 0.5 |         0.2 / 0.4 |  0.2 / 0.4 |
|      128 |        0.4 / 0.6 |     0.2 / 0.4 |            0.3 / 0.5 |         0.2 / 0.3 |  0.2 / 0.4 |
|      512 |        0.8 / 1.1 |     0.5 / 0.6 |            0.6 / 0.8 |         0.3 / 0.4 |  0.4 / 0.5 |
|    1,024 |        1.3 / 1.5 |     0.8 / 1.0 |            0.9 / 1.1 |         0.4 / 0.6 |  0.7 / 0.8 |

Values are update-to-commit median / p95 in milliseconds. For OXC CSR through
the VDOM, the median ratio against React was below 1 in all five paired page
loads at every size; the median of the five paired ratios was 0.50×, 0.75×,
0.625×, and 0.692× as size increased. The absolute median saving at 1,024
segments was about 0.4 ms per measured update. React's production build
materially narrows the apparent gap from development V5: React's update median
at 1,024 segments fell from 3.7 ms to 1.3 ms. The OXC CSR path's update CPU
median was higher at 512 and 1,024 segments (0.6/0.9 ms versus React's 0.2/0.2
ms), while its mount median was also higher at those sizes (4.3/6.4 ms versus
2.9/4.1 ms). This supports a lower measured commit delay for this stable binding
workload, not lower JavaScript CPU or a faster initial mount. Runtime-discovered
VDOM bindings were faster than OXC CSR at 512 and 1,024 segments, so the
generated graph has not shown a speed advantage over the simpler binding path
here.

Production RAF interval p95 medians remained similar across the arms and sizes
(16.8–18.2 ms). No arm shows a cadence advantage, and this remains a one-device,
fixed-topology DOM result that excludes paint and presentation. The follow-up
answers the build-mode gap; a second-device replication, dynamic structural
updates, and end-to-end input-to-present measurements remain needed before
making a broad performance claim.

#### What the V5 per-frame result says about the design

The production result supports the narrow update-delay hypothesis, but it does
not show that compiler-emitted graph metadata is the cause of the advantage. A
source audit found that the V5 `generated-vdom` arm creates two `ScalarSource`
objects per segment, allocates a new update array and tuple for every source on
every measured frame, and routes the batch through
`VDOMSnapshotRoot.setSources`. That generic method creates a `Map` and `Set` per
batch to deduplicate sources and affected props. This diagnosis motivated V6's
columnar binding path; it was not itself a causal measurement.

### 8.5 Preregistered production columnar-binding experiment: Snake V6

V6 tests whether compiler-assigned binding IDs can connect reusable numeric
columns directly to retained VDOM host-property writers. JSX and the mounted
VDOM remain the structural description. At mount, entity rows resolve to stable
bindings; each animation frame writes x/y coordinates into shared `Float64Array`
columns and `setColumns` visits the precomputed writers, skips unchanged values,
and avoids per-row source tuples plus generic `Map`/`Set` deduplication. React +
Compiler, runtime-discovered VDOM, generated scalar-source VDOM, columnar VDOM,
and direct DOM all consume the same x/y input columns. The schedule was frozen
before collection with 128, 512, and 1,024 segments, five paired page-load
replications per arm and size, 90 warmup frames, and 300 measured callbacks per
page. The source lock covers the compiler inputs, generated plan, benchmark,
runtime, and archive contract. A post-collection import audit found that the
shared `compiled_bindings.ts` transitive import was absent from both V6 and V7
source-lock lists; it is separately hash-pinned in each source-snapshot
manifest, and its file modification time predates both preregistrations.

The frozen React V6 arm uses one `useSyncExternalStore` snapshot per segment.
Its timed RAF update calls `publishColumns`, which batches listener
notifications with `unstable_batchedUpdates`; it does not wrap each update in
`flushSync`. A `useLayoutEffect` marker records the corresponding completed
commit. This is a synchronous external-store baseline with commit coverage, not
a forced `flushSync` render. The earlier §5.3 filename containing “no-flush”
refers to disabling graph diagnostic flush work; that React arm still uses
`flushSync`.

The
[preregistration](./results/browser-snake-frame-v6-production-preregistration.json),
[source lock](./results/browser-snake-frame-v6-production-source-lock.json), and
SHA-256-pinned
[manifest](./results/browser-snake-frame-v6-production-manifest.json) define 75
production pages and 22,500 measured callbacks. All pages passed position
parity, stable host count/identity, visibility, and frame-coverage contracts on
one Chrome 154 profile at 1280×720 and device pixel ratio 2. The table shows the
median of five page summaries; each page summary is the median / nearest-rank
p95 across its 300 callbacks.

| Segments | Arm                   | Mount median | Update CPU median | Update-to-commit median / p95 | RAF interval p95 |
| -------: | --------------------- | -----------: | ----------------: | ----------------------------: | ---------------: |
|      128 | React + Compiler      |          1.7 |               0.1 |                     0.4 / 0.5 |             17.1 |
|      128 | Runtime VDOM          |          1.2 |               0.2 |                     0.2 / 0.3 |             17.2 |
|      128 | Generated scalar VDOM |          1.5 |               0.2 |                     0.2 / 0.3 |             17.1 |
|      128 | Columnar VDOM         |          1.7 |               0.2 |                     0.2 / 0.3 |             17.1 |
|      128 | Direct DOM            |          0.2 |               0.1 |                     0.1 / 0.2 |             17.0 |
|      512 | React + Compiler      |          2.8 |               0.1 |                     0.8 / 1.0 |             17.1 |
|      512 | Runtime VDOM          |          3.0 |               0.4 |                     0.4 / 0.6 |             17.1 |
|      512 | Generated scalar VDOM |          4.0 |               0.5 |                     0.5 / 0.6 |             17.0 |
|      512 | Columnar VDOM         |          3.9 |               0.4 |                     0.4 / 0.5 |             17.2 |
|      512 | Direct DOM            |          0.3 |               0.3 |                     0.3 / 0.5 |             17.2 |
|    1,024 | React + Compiler      |          4.1 |               0.2 |                     1.3 / 1.4 |             17.5 |
|    1,024 | Runtime VDOM          |          4.6 |               0.7 |                     0.7 / 0.9 |             17.8 |
|    1,024 | Generated scalar VDOM |          6.6 |               0.9 |                     0.9 / 1.0 |             17.4 |
|    1,024 | Columnar VDOM         |          6.3 |               0.6 |                     0.6 / 0.7 |             17.4 |
|    1,024 | Direct DOM            |          0.5 |               0.6 |                     0.6 / 0.7 |             17.6 |

Times are milliseconds. The median paired update-to-commit ratio for columnar
VDOM versus React was 0.50× at all three sizes, with all five paired page
medians faster at each size. At 1,024 segments, columnar update CPU was about
one-third lower than generated scalar VDOM (0.6 versus 0.9 ms); at 512 it was
modestly lower (0.4 versus 0.5 ms), and at 128 it matched at the displayed
precision. Columnar VDOM also reduced measured update CPU relative to runtime
VDOM at 1,024 (0.6 versus 0.7 ms), while matching it at 512. These gains do not
come for free: columnar mount medians were 3.9 and 6.3 ms at 512 and 1,024,
above React's 2.8 and 4.1 ms and close to generated scalar VDOM. Direct DOM
stayed lowest in commit delay at 128/512 and tied columnar at 1,024, but it
gives up the retained VDOM path.

A post-hoc mount-amortization analysis uses each paired page's mount time and
median update-to-commit time to estimate how many measured updates offset a
candidate's extra mount cost. For columnar VDOM, the median estimate was 3
updates at 512 segments (range 0–4 across five paired pages) and 4 at 1,024
(range 3–4). At 128, estimates were dominated by mount ties and commit values
near the 0.1 ms timing floor. These are descriptive estimates from browser
timings, not a preregistered endpoint or a user-visible latency prediction; they
exclude compile, page-load, teardown, and presentation costs. They suggest the
extra mount work can amortize quickly in continuously updated large scenes,
while leaving initial-render cost higher.

RAF interval p95 medians remained between 17.0 and 17.8 ms across all arms and
sizes. This shows no frame-cadence win; the primary measurement is JavaScript
update-to-commit latency, not paint or physical presentation. The result
supports adding compiler-selected columnar writers as a specialized path inside
the VDOM runtime, with runtime-discovered bindings as a serious baseline. It
does not support replacing React broadly or claiming lower mount cost. The
sparse-versus-dense browser comparison is now reported in §8.7. Remaining gates
are independent-device replication with timing-floor calibration, dynamic
growth/key changes, and teardown-inclusive lifecycle cost against a
well-structured React external-store/selectors implementation.

The notebook validates the frozen source lock and all raw hashes, emits the
paired results above, and creates inline SVG charts for update-to-commit, update
CPU, and RAF p95. Reproduce the manifest and notebook using the commands in
[README.md](./README.md#reproduce-the-columnar-snake-v6-analysis).

### 8.6 Dirty-row density and locality: columnar dispatch V1

V6 measured only dense changes, so V1 asks when a retained column should scan
all bindings, visit an explicit dirty-row list, or scan contiguous dirty
buckets. The preregistered matrix contains 720 workload/strategy cases: 256,
1,024, and 4,096 rows; 1%, 5%, 10%, 25%, 50%, and 100% changed; clustered and
scattered row patterns; and four strategies (dense scan, dirty rows, 32-row
buckets, and 128-row buckets). Each of five fresh Deno processes ran all 144
cases, with 30 warmup and 80 measured batches per case. Each batch updates x/y
in `Float64Array` columns and commits through the same
`VDOMSnapshotRoot`/`MemoryVDOMHost` path. All 720 cases passed final-value
parity, stable-host identity, and exact write-count contracts. The notebook
validates source/raw hashes and emits three SVG plots. See the
[preregistration](./results/columnar-dispatch-v1-preregistration.json),
[source lock](./results/columnar-dispatch-v1-source-lock.json),
[source snapshot](./results/columnar-dispatch-v1-source-snapshot-manifest.json),
and [manifest](./results/columnar-dispatch-v1-manifest.json).

The table reports median per-update elapsed microseconds, first summarizing 80
samples within each process and then taking the median across five fresh
processes:

|  Rows | Dirty % | Pattern   | Dense scan | Dirty rows | Bucket 32 | Bucket 128 |
| ----: | ------: | --------- | ---------: | ---------: | --------: | ---------: |
|   256 |       1 | clustered |      14.96 |       4.00 |     14.90 |       7.25 |
|   256 |       1 | scattered |      13.29 |       0.67 |      3.13 |      10.19 |
|   256 |      10 | clustered |       5.42 |       3.33 |      2.12 |       3.60 |
|   256 |      10 | scattered |       5.96 |       3.04 |      7.21 |       7.08 |
|   256 |      50 | clustered |      10.42 |       8.96 |      8.38 |       8.38 |
|   256 |      50 | scattered |      14.17 |       9.23 |     14.54 |      14.37 |
|   256 |     100 | clustered |      16.08 |      17.56 |     17.65 |      16.04 |
| 1,024 |       1 | clustered |      14.79 |       0.79 |      1.00 |       2.25 |
| 1,024 |       1 | scattered |      15.17 |       0.83 |      6.54 |      11.00 |
| 1,024 |      25 | clustered |      28.27 |      17.62 |     16.60 |      16.08 |
| 1,024 |      25 | scattered |      35.44 |      19.71 |     37.23 |      38.46 |
| 1,024 |      50 | clustered |      38.29 |      35.98 |     32.69 |      32.35 |
| 1,024 |      50 | scattered |      56.33 |      36.21 |     57.48 |      58.42 |
| 1,024 |     100 | clustered |      65.50 |      68.23 |     64.02 |      63.50 |
| 4,096 |       1 | clustered |      59.38 |       2.75 |      3.00 |       4.00 |
| 4,096 |       1 | scattered |      60.02 |       2.92 |     22.83 |      48.63 |
| 4,096 |      10 | clustered |      76.83 |      28.00 |     27.79 |      30.71 |
| 4,096 |      10 | scattered |      93.06 |      32.92 |    101.46 |      88.08 |
| 4,096 |      25 | clustered |     100.04 |      71.40 |     64.17 |      62.98 |
| 4,096 |      25 | scattered |     141.40 |      76.71 |    159.48 |     157.08 |
| 4,096 |      50 | clustered |     155.12 |     141.02 |    131.75 |     124.87 |
| 4,096 |      50 | scattered |     224.65 |     139.54 |    206.96 |     214.19 |
| 4,096 |     100 | clustered |     255.87 |     274.10 |    263.19 |     254.98 |
| 4,096 |     100 | scattered |     258.00 |     280.02 |    252.96 |     257.94 |

Across all 180 paired process/workload cells, the dirty-row list had a median
ratio of 0.523× to dense scanning and was faster in 153/180. The 32-row bucket
path had a 0.857× ratio and won 118/180; the 128-row bucket path had a 0.894×
ratio and won 114/180. The ratios make the design trade-off clearer than one
global winner. For clustered data, bucket scans were sometimes faster than the
exact dirty-row list at 25–50% density (for example, 4,096 rows at 25%: 62.98 µs
for 128-row buckets versus 71.40 µs for the row list). For scattered data,
bucket scans often touched mostly clean rows and lost to exact row dispatch. At
100% density, dense scanning was generally best; the row list was about 6–9%
slower across these cases.

An audit caught that the timed collector checked parity after the last batch in
each case, although the preregistration called for checking every batch. To keep
correctness checks out of the timing loop, a separate replay using the archived
runtime repeated every scheduled input and checked output, host identity, and
write count after all 79,200 warmup/measured batches. It passed 141,926,400
per-entity state checks. The raw timing process remains unchanged; the
[replay verification record](./results/columnar-dispatch-v1-replay-verification.json)
documents this validation path. This post-collection replay is an explicit
protocol clarification.

This supports a workload-sensitive kernel: use exact dirty rows for sparse or
scattered updates, allow contiguous bucket scans where locality is high and
density is moderate, and fall back to dense scans for near-total changes. It is
not evidence that the current scheduler can infer these conditions cheaply: V1
precomputes row/bucket worklists and excludes their construction cost. Nor is it
UI evidence. `MemoryVDOMHost` omits DOM and CSS costs, the matrix has no React
arm, and it does not measure layout, paint, or presentation. The preregistered
browser follow-up now measures worklist construction and host writes against
optimized React; its completed results are in §8.7. Reproduce with the commands
in [README.md](./README.md#reproduce-the-dirty-column-dispatch-study).

### 8.7 Sparse per-frame browser study: Snake workload V1

The in-memory V1 sweep excluded worklist construction and DOM writes. This
preregistered production-build study includes both and compares them with
React + Compiler. It covers 512 and 4,096 entities; 1%, 10%, 50%, and 100% dirty
fractions; clustered and deterministic scattered rows; and six arms: per-entity
React `useSyncExternalStore` with a synchronous commit, dense compiled VDOM
columns, exact dirty-row VDOM, 32-row and 128-row bucket VDOM, and direct DOM.
Three visible page-load replications per cell yield 288 pages and 17,280
measured RAF callbacks. Each page has 30 warmups and 60 timed frames. The page
is the replication unit; frame callbacks are nested samples.

Each callback times dirty-worklist construction, changed x/y computation,
dispatch, and host writes; React also includes its synchronous commit. The fixed
DOM nodes preserve identity. Final coordinate parity, node count, and complete
commit coverage are required contracts. The callback measures update cost, not
paint or presentation. The fixture is a particle-like entity workload, not the
full playable Snake rules. All six arms were collected in one visible
Chrome/device profile.

The table gives the median of three page-level medians and the median of three
page-level nearest-rank p95s, in milliseconds. Each cell is shown as
`median / p95`.

| Entities | Dirty % | Pattern   | React + Compiler |  Dense VDOM |  Dirty rows |   Bucket 32 |  Bucket 128 |  Direct DOM |
| -------: | ------: | --------- | ---------------: | ----------: | ----------: | ----------: | ----------: | ----------: |
|    4,096 |       1 | clustered |      0.80 / 0.90 | 0.10 / 0.20 | 0.00 / 0.10 | 0.10 / 0.10 | 0.10 / 0.10 | 0.00 / 0.10 |
|    4,096 |       1 | scattered |      0.85 / 1.00 | 0.20 / 0.20 | 0.10 / 0.20 | 0.10 / 0.20 | 0.20 / 0.20 | 0.10 / 0.20 |
|    4,096 |      10 | clustered |      1.20 / 1.40 | 0.30 / 0.40 | 0.30 / 0.40 | 0.30 / 0.40 | 0.30 / 0.40 | 0.20 / 0.30 |
|    4,096 |      10 | scattered |      1.70 / 1.90 | 0.60 / 0.80 | 0.80 / 1.00 | 0.70 / 1.00 | 0.70 / 0.90 | 0.50 / 0.70 |
|    4,096 |      50 | clustered |      2.70 / 2.90 | 1.30 / 1.50 | 1.30 / 1.40 | 1.40 / 1.60 | 1.30 / 1.50 | 0.80 / 1.00 |
|    4,096 |      50 | scattered |      3.80 / 4.50 | 1.50 / 1.70 | 2.60 / 3.20 | 1.95 / 2.20 | 1.60 / 1.80 | 1.90 / 2.20 |
|    4,096 |     100 | clustered |      4.60 / 5.70 | 2.50 / 2.70 | 2.50 / 2.80 | 2.40 / 2.60 | 2.50 / 2.70 | 1.60 / 1.80 |
|    4,096 |     100 | scattered |      5.50 / 6.50 | 2.60 / 2.90 | 4.10 / 5.50 | 2.70 / 2.90 | 2.70 / 3.00 | 2.90 / 3.60 |

Across all 48 paired workload/replication pages per candidate, the median paired
update-time ratios to React were 0.409× for dense VDOM, 0.453× for dirty rows,
0.444× for 32-row buckets, 0.412× for 128-row buckets, and 0.333× for direct
DOM; each was nominally lower in all 48 pairs. These pooled ratios include many
observations recorded at 0 or 0.1 ms. Across the 2,880 measured samples per arm,
7 React samples and 255–592 candidate samples were recorded at 0 ms, and
70–1,022 per arm were at or below 0.1 ms. The browser timing resolution was not
separately calibrated, so the near-zero values are censored observations, not
evidence of zero-cost work. An exploratory sensitivity slice restricted to 4,096
entities, 10–100% dirty, and pairs where both page medians exceeded 0.1 ms
retained 18 pairs per arm; median ratios ranged from 0.422× to 0.491×, with all
18 pairs lower for each candidate. This filter was chosen after collection and
is descriptive, not the preregistered primary result.

At higher densities, the dispatch winner depends on pattern. For 4,096 scattered
rows at 50% dirty, dense VDOM measured 1.5 ms, exact dirty rows 2.6 ms, 32-row
buckets 1.95 ms, and 128-row buckets 1.6 ms. At 100% scattered, dense VDOM
measured 2.6 ms versus 4.1 ms for exact dirty rows. Worklist construction
therefore changes the in-memory mechanism result: exact dirty rows are not a
universal browser winner. RAF interval p95s showed no stable arm-specific
improvement; at 4,096 entities they rose to roughly 33–35 ms across arms at
50–100% dirty. This confirms that lower measured JavaScript update cost did not
yield a measured frame-cadence advantage in this run.

The accepted records passed all preregistered contracts, and the manifest
verified all 288 trial IDs, source snapshots, raw hashes, and 17,280 samples. An
earlier rehearsal's 69 records were rejected after duplicate expected-coordinate
writes were found in the timed path; the correction and preserved pilot are
documented in [amendment 1](./results/snake-sparse-frame-v1-amendment-1.json).
The accepted source was locked after that amendment and before collection. The
notebook rechecks hashes and emits six inline SVG charts: update medians, update
p95s, and RAF interval p95s at each size. See the
[preregistration](./results/snake-sparse-frame-v1-preregistration.json),
[source lock](./results/snake-sparse-frame-v1-source-lock.json),
[manifest](./results/snake-sparse-frame-v1-manifest.json), and raw pages in
`results/snake-sparse-frame-v1-production/`.

**Interpretation:** this is the strongest current browser evidence for a
workload-sensitive declarative per-frame update path, because it includes
worklist generation and real DOM writes and compares with React + Compiler. It
supports preserving dense, exact-row, and bucketed dispatch options inside the
retained VDOM and selecting among them by measured update shape. It does not
establish a generally faster React, smoother presentation, mount/teardown
break-even, performance under changing topology, another-device reproducibility,
or lower maintenance cost. The next study should replicate on a second physical
device and explicitly calibrate sub-0.1 ms timing before making claims from the
smallest workloads. Reproduce using the steps in
[README.md](./README.md#reproduce-the-sparse-per-frame-browser-study).

### 8.8 Browser structural phase profile: Experiment AP diagnostic

To investigate the structural-update counterexample, an exploratory Chrome 154
run enabled runtime phase callbacks on the 10,000-row fixture. It collected 24
paired updates each for rotate, edge replacement, and half-list filtering.
Output, host identity, and retained-state contracts passed. The first diagnostic
(seed `83001047`) showed one full-reconcile fallback per operation. A follow-up
with explicit gate and bailout markers found two dirty owners and two changes in
each fallback; the multi-owner path declined because one changed owner had a
nested subtree. The benchmark had clicked a row to seed its local state, but had
not awaited the runtime's scheduled commit. Because operation order is shuffled,
that setup update could be batched into the first measured structural update.

The harness now drains the row-selection setup update before timing. In the
corrected visible Chrome 154 profile (seed `83001051`), all 72 measured updates
had one dirty owner and one change and took the keyed structural-owner path; no
update used full reconciliation. A second corrected profile (seed `83001052`)
adds work counters. For rotation, the median update visited 10,000 component
owners but rendered one and reused 10,000 cached rows; the key index visited
20,004 old and 20,004 new host-tree nodes, while the host recorded one prop
write and one move. Edge replacement likewise visited 10,000 owners and 20,004
old/new index nodes, while creating and retiring one owner. Half filtering
visited 5,000 surviving owners, retired 5,000, and traversed 20,004 old plus
10,004 new index nodes; the host recorded 5,000 removals and 5,001 prop writes.
These counts expose broad traversal around small edits, especially key-index
maintenance on rotation, and give a concrete target for the next structural
algorithm. They do not establish that this work caused the AP timing gap.

The baseline v7 counter profile shows that the keyed region refresh walked
20,004 old plus 20,004 new host-tree nodes for rotation, despite one host move.
The VDOM now maintains its global key index as reconciliation attaches or
detaches changed subtrees. A v8 diagnostic profile reports zero key-index visits
for rotation, two old plus two new visits for edge replacement, and 10,000
detach/attach visits for half-list shrink/restore. In that run, the filter
operation comprised 11 shrinks and 13 restores; those directions have different
work and must be reported separately. For the baseline v7 profile they comprised
14 shrinks and 10 restores, with 20,004 old / 10,004 new visits on shrink and
10,004 old / 20,004 new on restore. The changed-subtree index work is therefore
proportional to inserted/removed nodes rather than the whole keyed region. Owner
visits remain 10,000 for rotation and restore and 5,000 for shrink.

The v8 diagnostic timing medians were 11.0 / 10.7 / 32.8 ms for rotate / edge
replacement / pooled filter directions. They include instrumentation, and the
filter median reflects 13 restore samples versus 11 shrink samples. A separate
uninstrumented one-page run (seed 83001054) passed parity, identity, and
retained-state checks, with runtime/React medians 10.5/25.3 ms for rotate,
10.5/24.5 ms for edge replacement, and 28/37 ms for pooled filtering. The filter
direction can be reconstructed from that record's seed and the harness's
deterministic shuffled update schedule; this reconstruction matches the v8
diagnostic's owner-created/retired direction markers. The uninstrumented page
contains 13 shrink samples (React/runtime median 19.2/24.7 ms; median paired
difference React−runtime −3.5 ms; paired ratio 0.846) and 11 restore samples
(38.6/38.6 ms; paired difference +3.3 ms; ratio 1.089). This suggests the pooled
result hides direction-dependent costs: the runtime loses on shrink and has a
modest paired advantage on restore in this page. These are retrospective,
one-page descriptive estimates; they do not establish a general speedup or
overturn the 216-pair AP result. The work-count result supports the
implementation mechanism; a preregistered multi-page comparison must still test
uninstrumented latency by direction and include mount and lifecycle costs. See
the
[v7 baseline profile](./results/browser-component-state-structural-profile-v7-83001052.json),
the
[v8 delta-index profile](./results/browser-component-state-structural-profile-v8-83001053.json),
the
[v8 diagnostic timing record](./results/browser-component-state-structural-v4-83001053.json),
the
[uninstrumented follow-up](./results/browser-component-state-structural-v4-83001054.json),
the
[v6 corrected profile](./results/browser-component-state-structural-profile-v6-83001051.json),
and earlier
[initial](./results/browser-component-state-structural-profile-v5-83001046.json)
and
[gate-reason](./results/browser-component-state-structural-profile-v6-83001048.json)
diagnostics.

### 8.9 Key-index maintenance mechanism study

The corrected structural profile found that the keyed path performed large
key-index scans around small changes. This preregistered browser study isolates
that work inside the same VDOM reconciler: the prior algorithm removes old keys
from the changed keyed subtree, reconciles, then scans the new subtree to
rebuild its key entries; the delta arm keeps the same map current from
attach/detach events. A React + Compiler arm is included as context, not as the
causal comparison. Each of five fresh visible Chrome pages runs 10,000 rows,
eight warmups and 24 measured paired updates per operation. Filter samples are
split evenly into 12 shrinks and 12 restores. All pages pass output parity,
retained host identity, reinsertion identity, and empty teardown checks. The
page is the replication unit; within-page updates are repeated observations. The
frozen
[preregistration](./results/key-index-maintenance-v1-preregistration.json),
[manifest](./results/browser-key-index-maintenance-v1-manifest.json), and five
raw records preserve the schedule and data.

| Operation        | Pages where delta median was faster | Rebuild median | Delta median | Median paired difference (rebuild − delta) | Median paired ratio |
| ---------------- | ----------------------------------: | -------------: | -----------: | -----------------------------------------: | ------------------: |
| Rotation         |                                 5/5 |        7.90 ms |      5.95 ms |                                    1.90 ms |               1.32× |
| Edge replacement |                                 5/5 |        7.85 ms |      6.05 ms |                                    1.85 ms |               1.31× |
| Filter shrink    |                                 4/5 |        8.85 ms |      7.80 ms |                                    0.80 ms |               1.10× |
| Filter restore   |                                 5/5 |       12.55 ms |     11.25 ms |                                    0.55 ms |               1.05× |

Medians summarize five page-level medians or paired page-level summaries; they
are not pooled sample-level estimates. React's contextual page-median medians
were 25.10 ms for rotation, 24.40 ms for edge replacement, 17.95 ms for shrink,
and 31.00 ms for restore. This is consistent with delta index maintenance
removing avoidable work, but the test does not isolate all runtime costs and
cannot establish general React superiority.

Lifecycle-inclusive totals combine one mount and teardown observation with all
24 measured updates in each page/operation. The median filter-episode saving was
20.1 ms over the five pages, and four episodes favored delta; one episode lost
97.5 ms because delta's mount was 105.8 ms slower on that page. That outlier is
retained. Mount/teardown are single measurements and this combined estimate is
descriptive; it does not overturn the owner-state benchmark where the full keyed
update path remains slower than React. The study excludes component-local state,
layout, paint, and presentation, and it covers only one browser/device profile.

The mechanism result supports keeping incremental key-index maintenance: it
changes index work from whole-subtree revisits to no visits for a pure reorder
and visits proportional to attached/detached subtrees for structural edits. The
unresolved question is whether owner discovery and reconciliation can also be
narrowed enough for the full keyed stateful workload to win. The notebook
verifies raw and preregistration hashes and emits SVG page-level comparisons.
Reproduce it with the commands under
[README §Reproduce the key-index maintenance study](./README.md#reproduce-the-key-index-maintenance-study).

### 8.10 Stateful keyed structure with index rebuild versus delta maintenance

The key-index mechanism study compares mounted host trees without
component-local state. This follow-up carries the same causal contrast into the
full owner-state structural fixture: 10,000 keyed row components each own a
local selected state, and a parent-owned list update rotates, replaces one edge,
or alternates between a half-list and full-list. The React arm uses React 19.3 +
React Compiler as a contextual baseline. The two runtime arms share OXC-lowered
component/state-site metadata and the same `ComponentStateRoot`; they differ
only in whether `VDOMSnapshotRoot` rebuilds the keyed index by scanning the
target subtree or maintains it from attach/detach events.

Five fresh visible production-build pages were scheduled before collection. Each
operation ran eight warmups first, followed by 24 measured update pairs whose
three-arm order was randomized and balanced across all six permutations. Filter
samples are direction-labeled and split 12/12 between shrink and restore. A
smoke run exposed that the first draft interleaved warmups with measured pairs;
amendment AMD-1 fixed the phase ordering before any scheduled seed was
collected. The original preregistration, amended preregistration, and source
lock are preserved separately. All five accepted pages passed ordered-output
parity, keyed host identity, remove/reinsert identity, local-state retention,
and empty-container teardown checks. Pair samples are nested within each page;
page load is the replication unit. The
[manifest](./results/component-state-structural-index-v1-manifest.json) pins the
preregistration, source lock, build inputs, and five raw pages.

| Operation        | React median | Rebuild median | Delta median | Median paired difference (rebuild − delta) | Median paired ratio | Pages delta faster |
| ---------------- | -----------: | -------------: | -----------: | -----------------------------------------: | ------------------: | -----------------: |
| Rotation         |      5.20 ms |       13.70 ms |     12.00 ms |                                    1.90 ms |              1.166× |                5/5 |
| Edge replacement |      4.90 ms |       14.55 ms |     12.60 ms |                                    1.75 ms |              1.137× |                5/5 |
| Filter shrink    |      7.40 ms |       22.70 ms |     22.55 ms |                                    3.60 ms |              1.187× |                4/5 |
| Filter restore   |     11.85 ms |       41.25 ms |     39.85 ms |                                    1.75 ms |              1.045× |                5/5 |

Each latency is the median of five page-level medians or paired page summaries;
no sample pooling is used. The paired-difference column takes the median of each
page's sample-by-sample rebuild-minus-delta differences, then the median across
pages; because medians are nonlinear, it need not equal subtracting the two
displayed arm medians. The React arm was faster than both runtime arms on every
page median for each operation. Delta maintenance therefore improves this
runtime's structural update path but does not make this full stateful workload
faster than optimized React. This is a valuable falsification of the claim that
broad key-index scans were the primary explanation for the structural gap. The
fixture still performs broad owner discovery and keyed expansion, and this
experiment does not time those phases separately; owner traversal, VDOM
reconciliation, and other runtime costs remain competing explanations.

The filter episode's combined mount + 24 updates + teardown total favored delta
on four pages, with a median rebuild-minus-delta saving of 50.7 ms. Page-level
savings ranged from −105.4 to +112.1 ms. Each arm's mount and teardown has one
timing observation per page, so this lifecycle estimate is descriptive and
unstable; the large spread is retained. Direction-level p95s are also variable,
with only 12 samples per direction. These are update-to-commit times from one
Chrome/device profile; layout, paint, and display presentation are excluded.

The result narrows the optimization target: retain delta index maintenance
because its matched update gains are reproducible, but profile and reduce owner
discovery/expansion and host reconciliation before adding more keyed algorithms.
Reproduce with the
[README workflow](./README.md#reproduce-the-stateful-keyed-index-follow-up). A
later
[source-drift audit](./results/component-state-structural-index-v1-source-drift-audit.json)
verifies the five raw pages and preserves collection-time hashes: eight of the
26 input files differ in the latest audit. An exact historical
`jsx_binding_runtime.ts` survives in another study snapshot, but exact copies of
seven other changed files were not found in this workspace, so the exact
measured implementation cannot be reconstructed completely. The notebook reports
that limitation, validates the raw data and protocol balance, computes
page-level paired results, and renders SVG figures.

### 8.11 Exploratory owner-expansion and reconciliation profile

The accepted V1 stateful comparison did not instrument its latency pages. To
identify the next experiment, five 10,000-row diagnostic pages were collected
with the V8 phase profiler against the delta-index runtime. Each page used 8
warmups and 24 measured pairs per operation. All five pages used Chrome 154 on
the same MacIntel device and browser profile, so they estimate within-profile
repeatability rather than independent-device replication. The raw profile hashes
and collection-time source hashes remain pinned in the immutable
[multi-page manifest](./results/component-state-structural-profile-v8-83004001-83004005-manifest.json);
the original
[first-page manifest](./results/component-state-structural-profile-v8-83004001-manifest.json)
remains as a record of the initial exploratory pass. A later
[source-drift audit](./results/component-state-structural-profile-v8-source-drift-audit.json)
verifies all five raw records and reports that six of 15 original inputs still
match and nine differ: six runtime/build sources, `deno.json`, and the revised
notebook cell/updater. An exact historical copy of `jsx_binding_runtime.ts`
survives in other study snapshots, but exact copies of the other five changed
runtime/build sources were not found in the workspace. The saved records still
support reproducible descriptive analysis, while the exact measured runtime
cannot be reconstructed completely. These data are not preregistered and their
instrumented development-server timings must not be compared with React or the
production latency study.

For filtering, direction is classified from each sample's owner
creation/retirement counters, not sample parity. The five exploratory schedules
yielded 9–14 shrink samples and 10–15 restore samples per page; page direction
medians are computed first, then summarized across pages. No samples are pooled.
Values below are median and range of the five page-level medians.

| Operation        |             Total ms | Outside root flush ms | Owner expand/cache ms | VDOM normalize ms |    Host reconcile ms | Owner visits | Cached rows reused |             Host mutations | Key-index visits |
| ---------------- | -------------------: | --------------------: | --------------------: | ----------------: | -------------------: | -----------: | -----------------: | -------------------------: | ---------------: |
| Rotation         | 11.00 [10.30, 11.15] |     1.85 [1.45, 1.90] |     5.45 [5.30, 5.55] | 0.40 [0.30, 0.40] |    1.50 [1.50, 1.55] |       10,000 |             10,000 |                     1 move |                0 |
| Edge replacement | 11.20 [10.80, 11.35] |     2.00 [1.50, 2.05] |     5.50 [5.45, 5.60] | 0.40 [0.40, 0.40] |    1.50 [1.50, 1.50] |       10,000 |              9,999 | 3 insert/remove operations |                4 |
| Filter shrink    | 23.90 [21.80, 24.10] |    9.70 [7.80, 10.60] |     3.30 [3.20, 3.40] | 0.40 [0.40, 0.40] |    6.90 [6.80, 8.10] |        5,000 |              5,000 |             5,000 removals |           10,000 |
| Filter restore   | 41.50 [39.10, 47.80] |  16.90 [11.95, 19.60] |    9.80 [9.35, 11.00] | 2.40 [2.30, 2.50] | 10.50 [10.05, 11.20] |       10,000 |              5,000 |          10,000 insertions |           10,000 |

The low-change cases consistently visit all row owners: rotation does 10,000
owner visits and cache reuses for one host move, while edge replacement visits
all 10,000 owners to replace one row. Delta indexing removed key-index traversal
from rotation and reduced edge replacement to four index visits. The remaining
broad owner walk is therefore a concrete optimization target. Filtering has a
different floor because each direction performs thousands of host operations.
The restore outside-flush interval is both larger and more variable than shrink
(page medians 11.95–19.60 ms versus 7.80–10.60 ms); the profiler does not
attribute it, so it remains an open measurement question rather than a runtime
phase claim.

These are diagnostic medians with profiler overhead and overlapping phase
scopes. They identify hypotheses, not causal shares or stable speed claims. The
next work is to implement the frozen same-runtime keyed-owner reuse comparison,
preserve the React + Compiler contextual arm, and independently attribute the
outside-flush interval. The notebook verifies all five raw-profile hashes,
checks the immutable historical manifest and available source copies, reports
source drift explicitly, summarizes page-level and across-page results, and
renders an SVG phase chart.

### 8.12 Preregistered keyed-owner reuse study

The phase profile motivated this controlled optimization study, but is not
evidence for the candidate. The initial protocol was frozen before
implementation; an amendment was frozen before latency collection when the
implemented eligibility contract proved narrower. The treatment covers
compiler-marked homogeneous leaf-row lists whose unique key set and shallow
props are unchanged. On rotation, it reuses prior expanded row outputs. Edge
replacement and half-list filtering exercise generic fallback. React + Compiler
is contextual; the causal comparison is between two paths in the same
component-state runtime and retained VDOM.

Five fresh visible production-page loads on one Chrome 154 / MacIntel profile
were collected from the frozen source lock. Every page completed 24 paired
samples per operation after eight warmups; all six arm orders were balanced four
times. The 12 shrink and 12 restore filter samples are analyzed separately. All
accepted records pass output parity, host identity, retained state, and page
archive checks. The page is the replication unit; summaries below take medians
across five page-level medians/paired summaries, without pooling all samples.

| Operation         | React + Compiler | Generic runtime | Keyed reuse | Median page paired ratio (reuse/generic) | Reuse faster pages |
| ----------------- | ---------------: | --------------: | ----------: | ---------------------------------------: | -----------------: |
| Same-key rotation |          5.10 ms |        10.75 ms |     6.15 ms |                                    0.564 |                5/5 |
| Edge replacement  |          4.20 ms |        10.70 ms |    12.70 ms |                                    1.179 |                0/5 |
| Filter shrink     |          7.65 ms |        19.20 ms |    20.15 ms |                                    1.041 |                2/5 |
| Filter restore    |         12.15 ms |        39.55 ms |    38.35 ms |                                    0.980 |                4/5 |

The frozen rotation gate passes: all five pages meet the ≤0.80 paired-ratio
threshold (page ratios 0.519–0.591). The diagnostic pass shows 10,000 generic
owner visits versus zero generic visits plus 10,000 keyed-cache hits on
rotation, a 100% reduction in that mechanism counter. This confirms the
compiler-marked reuse path does the intended work avoidance. It does not beat
React: the reuse median remains about 21% slower than React + Compiler on
rotation. The frozen fallback guardrail fails because edge replacement's median
paired ratio is 1.179, above the 1.10 ceiling; shrink and restore meet their
individual limits. Diagnostic counters show the treatment correctly falls back
on membership changes and revisits the owners, but do not attribute the extra
edge time to a single phase.

This is a narrow same-runtime optimization, not evidence that the overall
runtime is faster than React. It supports preserving the stable-key-set fast
path only if invalidation checks can become cheap enough that
membership-changing updates remain within budget. The V2 token follow-up is
complete and reported in
[§8.13](#813-preregistered-keyed-region-version-token-follow-up): both rotation
gates pass, but edge replacement exceeds the 1.10 fallback ceiling, so the
overall preregistered result fails. The
[initial V1 protocol](./results/component-state-owner-reuse-v1-preregistration.json),
[pre-collection amendment](./results/component-state-owner-reuse-v1-amendment-01.json),
[source lock](./results/component-state-owner-reuse-v1-source-lock.json), and
[manifest](./results/component-state-owner-reuse-v1-manifest.json) preserve V1's
design and results. The
[21-file source snapshot](./results/component-state-owner-reuse-v1-source-snapshot-manifest.json)
preserves the exact implementation and build inputs for replay. Five raw latency
records and the separate diagnostic record are under
`results/component-state-owner-reuse-v1/`. The notebook verifies hashes and
contracts, computes page-level summaries, applies the gates, and emits SVG
charts. These measurements stop at host commit and exclude layout, paint, and
presentation; one physical device does not establish cross-device performance.

### 8.13 Preregistered keyed-region version-token follow-up

**Question and protocol.** V1's checked keyed-owner reuse skipped row expansion
on pure rotation but still scanned all 10,000 rows to validate eligibility. V2
tested whether an opaque compiler/runtime version token could certify stable
keys and row data, bypass that scan, and fall back early when membership
changed. The frozen V2 protocol intended to compare React 19.3 with React
Compiler, generic expansion, V1 checked reuse, and V2 token reuse over a
persistent keyed sequence. Post-collection inspection of the locked Vite
configuration shows its compiler selector includes the V1 module but omits the
V2 page module. Therefore the V2 React arm is preserved as React 19.3, but its
React Compiler transformation is not verified and its measured values must not
be described as a compiler baseline. The separate V3 production follow-up below
uses a dedicated, build-verified compiler path. The five V2 pages used 10,000
stateful rows, eight warmup pairs, and 24 measured pairs per operation. Every
one of the 24 four-arm orders appeared once per operation/page; filter shrink
and restore were split 12/12. The five-page source lock froze 30 inputs before
latency collection, and a byte-verified snapshot preserves them. One separate
diagnostic page checked token hits, cache reuse, and early mismatch behavior.

**Results.** Displayed times are medians of page-level medians. Paired ratios
are summarized across page-level paired ratios; samples are not pooled.

| Operation        |    React |  Generic | V1 checked | V2 token | V2/React paired ratio | V2/generic paired ratio | Guardrail               |
| ---------------- | -------: | -------: | ---------: | -------: | --------------------: | ----------------------: | ----------------------- |
| Rotation         |  7.50 ms | 11.50 ms |    6.50 ms |  5.05 ms |                 0.688 |                   0.450 | Primary gates pass 5/5  |
| Edge replacement |  6.60 ms | 11.85 ms |   13.40 ms | 13.40 ms |                 2.113 |                   1.143 | **Fail** (ceiling 1.10) |
| Filter shrink    |  9.70 ms | 21.70 ms |   21.85 ms | 23.00 ms |                 2.458 |                   1.081 | Pass                    |
| Filter restore   | 14.65 ms | 44.30 ms |   43.95 ms | 45.50 ms |                 3.068 |                   1.021 | Pass                    |

The rotation product gate (V2/React ≤0.90) and runtime gate (V2/generic ≤0.50)
both passed on 5/5 pages. Shrink and restore remained within the 1.10 fallback
ceiling; edge replacement did not (all five page ratios exceeded it). Therefore
the overall preregistered outcome is **FAIL**, despite a strong same-key
rotation result. The separate mechanism pass recorded 240,000 valid rotation
token hits and cached-output reuses with zero row eligibility visits; each
membership-change sample detected one token mismatch, took one generic fallback,
and performed zero pre-fallback per-row checks. Diagnostic timings are excluded
from latency claims.

**Correctness and amendments.** A diagnostic first found stale keyed output
after a child-local state update followed by token-preserving reorder. Amendment
04 refreshes the retained keyed output when a child owner commits and adds a
regression test; that test passes. Amendment 05 corrects archive validation to
count the original sample-order sequence, avoiding a sorting bug that collapsed
distinct four-arm permutations. All five latency records pass output parity,
host identity, child-state retention, archive, and schedule contracts. The
source lock and amendments are preserved with the raw records in
`results/component-state-owner-reuse-v2/`.

**Interpretation and limits.** The token path is a credible, narrow optimization
for stable-key rotation, but key membership changes remain a counterexample and
React is faster on both filter directions and edge replacement. Keep generic
keyed reconciliation as the correctness path and the token fast path
opt-in/shape-gated pending a fix for edge fallback overhead and independent
replication. All five pages share one Chrome 154 MacIntel profile; timings stop
at host commit and omit layout, paint, presentation, setup, and teardown. The
result does not establish broad runtime speed, smoothness, or maintainability.
Reproduce with `deno task component-state:owner-reuse-v2:verify-lock`,
`deno run --allow-read=. --allow-write=results scripts/analyze_component_state_owner_reuse_v2.ts`,
the notebook updater
`deno run --allow-read=research.ipynb,notebook_cells/component_state_owner_reuse_v2.ts --allow-write=research.ipynb scripts/update_research_notebook_component_state_owner_reuse_v2.ts`,
then
`UV_CACHE_DIR=/private/tmp/uv-react-research-cache UV_OFFLINE=1 deno task notebook`.
See the [analysis](./results/component-state-owner-reuse-v2-analysis.json),
[preregistration](./results/component-state-owner-reuse-v2-preregistration.json),
[source lock](./results/component-state-owner-reuse-v2-source-lock.json),
[source snapshot manifest](./results/component-state-owner-reuse-v2-source-snapshot-manifest.json),
and raw records under
`results/component-state-owner-reuse-v2/{latency,diagnostic}/`.

**Fallback mechanism hypothesis (source inspection, tested in V3).** On token
mismatch, the fast path exits before its row-eligibility scan, then generic
expansion handles the update. In token mode, that expansion also builds fresh
`outputsByKey` and `keysByOwner` maps while visiting the keyed children
([V2 runtime path](./src/component_state_runtime.ts#L1088)). Rebuilding those
indexes across 10,000 rows might account for some of the edge penalty. The
[V3 staged delta-cache diagnostic](#exploratory-v3-staged-delta-cache-diagnostic)
tests this hypothesis: it reduces expansion/cache time modestly and preserves
the next rotation fast path, but edge fallback remains slower than generic
overall. The
[production-browser V3 comparison](#preregistered-v3-production-browser-follow-up)
confirms the same within-runtime pattern against a verified React Compiler arm.
Therefore full map rebuilding is a contributor in the prototype, not a
sufficient explanation for the structural gap.

**Exploratory phase diagnostic.** Five fresh Deno processes each measured 12
paired edge replacements per arm after eight warmups, using a `MemoryVDOMHost`
and runtime phase callbacks. The across-process median of per-process medians
for `owner.expand-and-cache` was 6.377 ms generic, 8.628 ms checked reuse, and
8.214 ms token reuse. The paired token-minus-generic difference was +1.796 ms
(range +1.361 to +1.911 across the five processes). Total `root.flush` medians
were 11.895 ms generic and 14.158 ms token; the paired process-level difference
was +2.251 ms (range +1.988 to +2.916). All samples preserved output parity,
keyed host identity, and child state. This supports locating extra work in
expansion/cache handling and shows token mismatch is cheaper than checked
eligibility validation in this mechanism fixture. It does **not** isolate map
allocation as the cause: profile callbacks add overhead, scopes are not
additive, the host is in memory rather than a browser DOM, and React is not
included. Reproduce with
`deno run --config deno.browser.json --allow-write=results scripts/profile_component_state_owner_reuse_v2_fallback.ts <1..5>`,
create the post-collection hashes with
`deno run --allow-read=results,src,scripts,deno.json,deno.browser.json --allow-write=results scripts/create_component_state_owner_reuse_v2_fallback_manifest.ts`,
and execute the notebook. The raw process records and manifest are under
`results/component-state-owner-reuse-v2/`.

#### Exploratory V3 staged delta-cache diagnostic

A separate preregistered five-process experiment compared generic expansion,
V2-style token fallback that rebuilds both keyed maps, and a V3 prototype that
stages changed outputs and owner mappings, then applies map deletions/upserts
only after the host commit succeeds. Each fresh Deno process measured 12 paired
edge-replacement-then-rotation sequences per arm after eight warmups, with
10,000 keyed rows and a seeded child-local state value. The source lock was
verified before collection; the post-collection
[manifest](./results/component-state-owner-reuse-v3/delta-profile-manifest.json)
pins all five raw records.

| Phase                                    |    Generic median (range) |      Token median (range) | Token-delta median (range) |
| ---------------------------------------- | ------------------------: | ------------------------: | -------------------------: |
| Edge expansion/cache                     |    6.170 (6.137–6.343) ms |    8.091 (7.760–8.412) ms |     7.486 (7.333–7.840) ms |
| Edge total `root.flush`                  | 10.941 (10.435–11.391) ms | 13.730 (13.510–14.254) ms |  13.440 (13.056–13.792) ms |
| Following same-key rotation `root.flush` | 10.435 (10.095–10.809) ms |    3.355 (3.237–3.435) ms |     3.389 (3.306–3.623) ms |

The preregistered mechanism gates pass: median process-paired expansion/cache
improvement share is 26.3% of the token arm's excess over generic (threshold
25%); the following-rotation `root.flush` ratio is 1.021× token (limit 1.10×);
and all five processes preserve output parity, surviving host identity, and
child state. Each edge sample records one removed owner, one output upsert, and
one owner-mapping upsert; the locked runtime deletes the corresponding output
key, and the next rotation records 10,000 token hits and output reuses. However,
delta maintenance only lowers edge expansion/cache from 8.091 to 7.486 ms and
total edge flush from 13.730 to 13.440 ms. The edge path remains about 1.23×
generic in this diagnostic. Thus incremental keyed-map maintenance explains only
a small part of the fallback cost, and does not meet the production fallback
guardrail or change the V2 overall **FAIL**.

**Work attribution.** The locked per-sample counters identify the work left
behind by the map-delta optimization: every one-key edge replacement still
visits all 10,000 component owners and reuses 9,999 cached subtrees, while
creating one owner and retiring one. The following reorder-only rotation hits
and reuses all 10,000 cached outputs. Across five process medians, token-delta
edge phases are 7.486 ms for owner expansion/cache, 0.725 ms for VDOM
normalization, and 2.622 ms for host reconciliation; same-key rotation is 0.290,
0.523, and 1.884 ms for those phases. These instrumented phase scopes are not
additive and include no React timing. They localize the next hypothesis: the
one-key edit still pays to rediscover the full owner collection, and the host
still reconciles a large keyed region. The post-profile
[notebook figures](./research.ipynb) report both phase medians and work counts.

This points to a distinct experiment rather than another cache-map variant: let
the collection/owner store produce a trusted keyed membership delta, then
propagate that delta to a bounded set of owner buckets and host operations while
keeping the committed VDOM snapshot inspectable. The compiler/runtime must
derive the delta from ordinary state or ECS updates; requiring app authors to
hand-write mutation instructions would violate the declarative product goal.
The next structural gate should compare tail and middle insert/remove plus
derived filtering against React Compiler, verify order, DOM identity, and child
state after every edit, and measure dynamic work separately from mount and
teardown. The current evidence motivates that design test but does not show it
will be faster.

The source path agrees with this diagnosis: `commitKeyedRegion` normalizes the
candidate subtree and calls `updateMounted`; for an element, `updateMounted`
delegates its children to `reconcileChildren`. The notebook asserts these
source-level links against the same locked VDOM source used for the diagnostic.
This is consistent with the measured normalization and host-reconciliation
phases, but does not establish what share of either phase is caused by a
particular loop. A delta-aware VDOM operation needs its own browser experiment.

This is a mechanism result, not browser latency or a comparison with React: the
fixture uses `MemoryVDOMHost`, profile callbacks add overhead, and phase scopes
are not guaranteed to sum to total flush time. The following rotation confirms
that the post-commit directory remains reusable, but browser DOM behavior,
uninstrumented performance, filter changes, and larger membership edits remain
untested. The notebook verifies the source lock and raw hashes and generates an
inline SVG. Reproduce with
`deno run --allow-read=results,scripts,src,deno.json,deno.browser.json scripts/verify_component_state_owner_reuse_v3_delta_source_lock.ts`,
run the five fresh processes with
`deno run --config deno.browser.json --allow-write=results scripts/profile_component_state_owner_reuse_v3_delta.ts <1..5>`,
create the post-collection manifest with
`deno run --allow-read=results --allow-write=results scripts/create_component_state_owner_reuse_v3_delta_manifest.ts`,
regenerate the notebook cell with
`deno run --allow-read=research.ipynb,notebook_cells/component_state_owner_reuse_v3_delta.ts --allow-write=research.ipynb scripts/update_research_notebook_component_state_owner_reuse_v3_delta.ts`,
then execute the notebook. See the
[preregistration](./results/component-state-owner-reuse-v3/delta-profile-preregistration.json),
[source lock](./results/component-state-owner-reuse-v3/delta-profile-source-lock.json),
[manifest](./results/component-state-owner-reuse-v3/delta-profile-manifest.json),
and raw records in `results/component-state-owner-reuse-v3/`.

#### Preregistered V3 production browser follow-up

**Protocol correction and baseline.** The initial implementation smoke caught a
fixture error before production collection: rotating the complete list moves
selected `row-0` to the tail, so a later literal tail replacement removed the
stateful sentinel. The
[pre-collection amendment](./results/component-state-owner-reuse-v3/browser-preregistration-amendment-1.json)
changes the edge operation to replace the final non-sentinel key; no measured
page was collected under the invalid version. The dedicated production build
applies React Compiler target 19 to the measured React module and records the
transformed component names and memo-cache sites. This is a verified React
19.3 + React Compiler baseline. The older V2 build's React Compiler selector
does not include its V2 page module, so V2 timings remain preserved but must not
be cited as a verified compiler comparison.

Five fresh visible Chrome 154 / MacIntel production pages each ran 10,000 keyed
stateful rows, eight warmup pairs, and 24 measured edge-then-rotation pairs.
Every page passed output parity, keyed host identity, and selected child-state
retention. The five pages are the replication units; paired samples are nested
within page. Summary times are medians of page-level medians, and paired ratios
are medians of page-level paired-ratio summaries.

| Operation         | React + verified Compiler | Generic runtime | V2 token | V3 token-delta | V3/generic paired ratio | V3/React paired ratio | Gates                                          |
| ----------------- | ------------------------: | --------------: | -------: | -------------: | ----------------------: | --------------------: | ---------------------------------------------- |
| Edge replacement  |                   3.50 ms |        11.00 ms | 12.50 ms |       12.05 ms |                   1.077 |                 3.329 | Fallback ceiling passes 4/5; minimum 4/5       |
| Same-key rotation |                   3.60 ms |        10.80 ms |  4.75 ms |        4.70 ms |                   0.442 |                 1.343 | Runtime gate passes 5/5; React gate passes 0/5 |

The overall preregistered outcome is **FAIL**. Staged token-delta clears the
edge fallback ceiling on exactly four pages and beats generic on rotation by
more than 2× on all five, but it never meets the product threshold against
verified React Compiler. On edge replacement, it remains slower than generic in
median time and about 3.3× React. Against the V2 token path, its edge median
improves only from 12.50 to 12.05 ms; the mechanism-level map-delta improvement
did not close the structural fallback gap. This browser result strengthens the
MemoryVDOMHost diagnostic by showing the rotation result survives production DOM
commits, while establishing that the design still loses to optimized React in
this workload. It supports retaining the specialization as an opt-in experiment,
not promoting it as the default renderer.

The 19-input
[browser source lock](./results/component-state-owner-reuse-v3/browser-source-lock.json)
and its four production assets preserve compiler evidence; the
[post-collection manifest](./results/component-state-owner-reuse-v3/browser-manifest.json)
verifies all five raw records and records the failed product gate. The notebook
rechecks source/build/raw hashes and renders an SVG. Reproduce the analysis and
notebook with:

```sh
deno run --allow-read=results,scripts --allow-write=results scripts/create_component_state_owner_reuse_v3_browser_manifest.ts
deno run --allow-read=research.ipynb,notebook_cells/component_state_owner_reuse_v3_browser.ts --allow-write=research.ipynb scripts/update_research_notebook_component_state_owner_reuse_v3_browser.ts
UV_CACHE_DIR=/private/tmp/uv-react-research-cache UV_OFFLINE=1 deno task notebook
```

### 8.17 Keyed region buckets: bounded ordered edits

This preregistered Deno mechanism study compares a flat array (`findIndex` plus
`splice`) with `KeyedRegionBuckets`, an ordered list of bounded buckets plus a
`Map` from key to entry. It performs 64 move-before edits at head, middle, and
tail localities for 1,000, 10,000, and 50,000 rows. Bucket capacities are 32,
64, 128, and 256. Each arm/case receives two warmup and seven measured samples;
the fixed seed shuffles arm order. The replication unit is one timed sample.

The harness checks exact final key/value order against the array arm and calls
the bucket link, occupancy, and index integrity check after every bucket run.
All 315 measured samples passed. A preliminary order check caught a merge
ordering defect before collection; the neighbor selection was corrected before
the timed data were gathered. The post-collection manifest hashes the
preregistration, source, benchmark, and raw result file.

At 50,000 rows, median elapsed times were:

| Locality | Flat array | B32 | B64 | B128 | B256 |
| -------- | ---------: | --: | --: | ---: | ---: |
| Head | 0.874 ms | 0.028 ms | 0.031 ms | 0.037 ms | 0.076 ms |
| Middle | 9.217 ms | 0.022 ms | 0.019 ms | 0.018 ms | 0.019 ms |
| Tail | 17.197 ms | 0.017 ms | 0.014 ms | 0.014 ms | 0.013 ms |

The work counters explain the pattern. The array arm performs about 50,049
key/anchor comparisons per middle move, plus about 49,951 shifted array slots;
the B128 arm records one bucket-slot read and 256 bucket-slot writes per move.
At the tail, array lookup scans about 99,837 entries per move even though only
about 163 array slots shift; B128 records one bucket-slot read and 106 bucket
slot writes per move. In the head case, bucket writes rise from about 65 per
move at B32 to 696 at B256 because the moving group repeatedly edits its local
bucket. B128 is not uniformly optimal, and these integer counters describe only
data-structure slot activity.

The timing strongly favors buckets for this particular baseline and workload,
and the work counts remain roughly local while `n` grows. However, `findIndex`
is a weak control: it has no separate key-to-index map. An indexed flat-array
implementation would replace key scans with index maintenance, so this
experiment does not yet establish that buckets beat the best practical flat
array, and it says nothing about the current UI runtime's owner scan and host
reconciliation. These are not React/DOM results; allocation, map overhead,
cache behavior, compilation, rendering, and lifecycle are not measured. The
large-sample p95 uses seven observations, so its nearest-rank value is the
maximum and should not be read as a stable tail estimate.

The notebook verifies the source, collection, updater, and analysis-code hashes and renders SVG timing charts
for each locality. Reproduce the collection and report with:

```sh
deno run --allow-read=src/keyed_region_buckets.ts --allow-write=results scripts/benchmark_keyed_region_buckets_v1.ts
deno run --allow-read=results/keyed-region-buckets-v1-preregistration.json,results/keyed-region-buckets-v1.json,scripts/benchmark_keyed_region_buckets_v1.ts,src/keyed_region_buckets.ts --allow-write=results scripts/create_keyed_region_buckets_v1_manifest.ts
deno run --allow-read=research.ipynb,notebook_cells/keyed_region_buckets_v1.ts --allow-write=research.ipynb scripts/update_research_notebook_keyed_region_buckets_v1.ts
UV_CACHE_DIR=/private/tmp/uv-react-research-cache UV_OFFLINE=1 deno task notebook
```

### 8.18 Bucketed regions versus an indexed flat array

Experiment AU repeats the V1 keyed move-before workload against a stronger flat
array. The array arm maintains `Map<key, index>` and updates every shifted
suffix index after each `splice`; the bucket arm uses a key map and reindexes
only the affected bucket. It retains the 1,000/10,000/50,000 sizes, head/middle/
tail localities, 32/64/128/256 bucket capacities, 64 operations per sample,
two warmups, seven measured samples, and seeded arm order. The timed array arm
includes row movement and the required index-map rewrites.

All 315 samples passed exact final order/value comparison and bucket-integrity
checks. At 50,000 rows the median times were:

| Locality | Indexed array | B32 | B64 | B128 | B256 |
| -------- | ------------: | --: | --: | ---: | ---: |
| Head | 125.149 ms | 0.031 ms | 0.032 ms | 0.040 ms | 0.077 ms |
| Middle | 46.901 ms | 0.025 ms | 0.020 ms | 0.018 ms | 0.018 ms |
| Tail | 0.070 ms | 0.017 ms | 0.017 ms | 0.015 ms | 0.013 ms |

The head array move rewrites a median 99,836 index entries and shifts 99,835
rows per operation; B32 records about 65 bucket-slot writes and one bucket-slot
read. The middle array move rewrites 49,952 positions and shifts 49,951 rows;
B128 writes 256 local slots and reads one. For tail edits, the indexed array is
near-local too: 164 index writes and 163 row shifts per operation, compared
with 106 bucket writes and one read for B128. The corresponding tail medians
remain about 4.7× apart, but all are sub-millisecond and the seven-sample p95
is the maximum; treat that timing ratio as provisional. The middle and head
timings scale sharply with suffix length for the indexed array, while bucket
slot work stays local.

This validates bounded buckets as a promising ordered keyed-region primitive
against both a simple array and a key-indexed array for this operation pattern.
It still does not measure allocation, cache locality, JSX/graph traversal,
component owner reuse, VDOM reconciliation, DOM commit, browser frames, or React.
The mechanism warrants one integrated runtime experiment: a one-row membership
delta must avoid visiting all owners and must avoid reconciling the full host
region, while preserving keys and child state, then pass the existing React
Compiler product gate including setup and teardown.

The post-collection manifest pins preregistration, implementation, benchmark,
updater, analysis cell, manifest generator, and raw data; the notebook checks
all hashes and emits SVG timing plots. Run:

```sh
deno run --allow-read=src/keyed_region_buckets.ts --allow-write=results scripts/benchmark_keyed_region_buckets_v2.ts
deno run --allow-read=results/keyed-region-buckets-v2-preregistration.json,results/keyed-region-buckets-v2.json,scripts/benchmark_keyed_region_buckets_v2.ts,src/keyed_region_buckets.ts --allow-write=results scripts/create_keyed_region_buckets_v2_manifest.ts
deno run --allow-read=research.ipynb,notebook_cells/keyed_region_buckets_v2.ts --allow-write=research.ipynb scripts/update_research_notebook_keyed_region_buckets_v2.ts
UV_CACHE_DIR=/private/tmp/uv-react-research-cache UV_OFFLINE=1 deno task notebook
```

The archive is under
`results/component-state-owner-reuse-v3/browser-production/`. The five pages
share one device/browser profile, and timings stop at host commit; layout,
paint, and display presentation are not measured.

### 8.14 Lifecycle-inclusive per-frame browser study: Snake V1

V6 showed repeated-update wins on a fixed topology, but its mount-amortization
estimate excluded teardown. This follow-up preregistered five randomized page
blocks for each of 512 and 1,024 segments and compared React 19.3 + verified
React Compiler, scalar-source retained VDOM, and OXC-plan columnar retained
VDOM. Each fresh visible production page mounted, ran 90 warmup RAF callbacks
and 300 measured updates, checked final output and host identity, then unmounted
or disposed and asserted that the container, subscription sets, binding groups,
and retained nodes were empty. The primary metric is mount + the sum of 300
update CPU measurements + teardown. It excludes navigation, network,
parse/evaluation, compile work, layout, paint, GPU, and presentation.

All 30 scheduled records passed correctness. The 93-file source and
production-bundle lock verified before collection; the raw manifest hashes every
accepted record. A pre-collection amendment set final CSS coordinate tolerance
to 0.01 px after an excluded smoke run showed that Chrome serializes fractional
inline styles to three decimals. The smoke data remain outside the production
directory.

| Segments | Arm                    | Lifecycle cost median / p95 | Mount median | Update median / p95 | Teardown median |
| -------: | ---------------------- | --------------------------: | -----------: | ------------------: | --------------: |
|      512 | React + Compiler       |            219.1 / 241.9 ms |       2.6 ms |        0.7 / 0.9 ms |          1.1 ms |
|      512 | Scalar retained VDOM   |            123.3 / 135.7 ms |       2.8 ms |        0.4 / 0.5 ms |          0.8 ms |
|      512 | Columnar retained VDOM |            102.5 / 113.5 ms |       4.3 ms |        0.3 / 0.4 ms |          0.7 ms |
|    1,024 | React + Compiler       |            333.4 / 346.3 ms |       3.7 ms |        1.1 / 1.2 ms |          1.5 ms |
|    1,024 | Scalar retained VDOM   |            206.2 / 206.8 ms |       5.1 ms |        0.7 / 0.8 ms |          1.0 ms |
|    1,024 | Columnar retained VDOM |            171.9 / 176.7 ms |       6.4 ms |        0.6 / 0.6 ms |          1.0 ms |

The preregistered gate **passes**: columnar VDOM's paired lifecycle cost was at
most 0.90× React on all five page blocks at both sizes; median paired ratios
were 0.508× at 512 and 0.513× at 1,024. Its update CPU median was no greater
than React in all ten pairs. Mounting the columnar VDOM was slower (4.3 vs 2.6
ms at 512; 6.4 vs 3.7 ms at 1,024), but did not erase its savings in the
specified 300-update episode. The scalar VDOM arm also beat React's median
lifecycle total at both sizes, so the evidence supports retaining both a general
scalar binding route and a compiled columnar specialization.

An exploratory cadence summary can be derived from the archived `fullRafElapsedMs`
field. Dividing each page's full-run wall time by its 391 scheduled callback
slots gives median estimates of 16.86 ms (React), 16.78 ms (scalar VDOM), and
16.79 ms (columnar VDOM) at 512 segments; at 1,024 the medians are 17.25,
17.24, and 17.24 ms. This aggregate includes the initial wait for RAF and does
not preserve individual callback intervals, missed-frame counts, or physical
presentation timestamps. It shows no material difference in average callback
cadence here, and cannot establish visible smoothness. A follow-up must record
per-frame RAF deltas and browser presentation data if available.

This is a narrow same-device result for a fixed-topology repeated-prop workload;
it does not show smoother presentation, changing-topology performance, an
independent-device result, lower maintenance cost, or a general React speedup.
The harness also recorded Chrome's `performance.memory.usedJSHeapSize` before
mount, after mount, and after teardown. This is not a valid allocation or
retention measure here: 22 of 30 pages reported exactly zero mount delta, while
15 of 30 reported a lower heap after teardown than before mount; signed
teardown changes ranged from about −17.5 to +17.5 MiB. The browser heap includes
unrelated allocations and garbage-collection effects. Treat these fields as
diagnostic only; this study measured neither allocation counts nor retained
objects.

The update measurements cluster around sub-millisecond values on one Chrome 154
profile, so timer resolution and cross-device replication remain important. The
next per-frame gate is an independent physical device plus a separate
dynamic-structure/lifecycle workload. The notebook verifies the frozen inputs
and raw manifest and renders SVG plots. Reproduce with
`deno run --allow-read --allow-write=results scripts/create_snake_lifecycle_v1_preregistration.ts`,
build using
`deno task compiler:plan && pnpm exec vite build --config vite.config.ts`,
freeze the production lock with
`deno run --allow-read --allow-write=results scripts/create_snake_lifecycle_v1_source_lock.ts`,
then run
`deno run --allow-read --allow-write=results scripts/summarize_snake_lifecycle_v1.ts`
and update/execute the notebook as described in README. The
[preregistration](./results/snake-frame-lifecycle-v1/preregistration.json),
[source lock](./results/snake-frame-lifecycle-v1/source-lock.json),
[raw manifest](./results/snake-frame-lifecycle-v1/manifest.json),
[summary](./results/snake-frame-lifecycle-v1/summary.json), and individual page
records preserve the study.

### 8.15 Callback cadence under load: Snake V1

The lifecycle study showed lower JavaScript update cost, but had only measured
the mean RAF wall-time over a full run. This preregistered follow-up asks when
that lower cost changes callback cadence under load. It compares React 19.3 +
verified React Compiler, scalar retained VDOM, and OXC-plan columnar retained
VDOM at 1,024, 4,096, and 8,192 fixed segments. Five randomized blocks produce
45 fresh visible production pages. Each page calibrates 120 idle RAF intervals,
warms up for 60 callbacks, then records 240 update CPU samples and callback
intervals. An interval is classified late above 1.5 times that page's idle
median; estimated missed slots use the preregistered ratio rule. The outcomes
are page-level summaries; individual callbacks are not independent samples.

All 45 pages passed output, identity, visibility, and teardown contracts. The
frozen build contained the React Compiler marker. Page medians were:

| Segments | Arm | Update CPU median | RAF interval median / p95 | Late callback rate | Estimated missed slots |
| -------: | --- | ----------------: | ------------------------: | -----------------: | ---------------------: |
| 1,024 | React + Compiler | 1.1 ms | 16.7 / 17.1 ms | 0% | 0 |
| 1,024 | Scalar VDOM | 0.6 ms | 16.7 / 16.8 ms | 0% | 0 |
| 1,024 | Columnar VDOM | 0.5 ms | 16.7 / 17.6 ms | 0% | 0 |
| 4,096 | React + Compiler | 3.9 ms | 16.7 / 33.7 ms | 27.5% | 76 |
| 4,096 | Scalar VDOM | 2.2 ms | 16.7 / 34.5 ms | 24.2% | 70 |
| 4,096 | Columnar VDOM | 1.8 ms | 16.7 / 33.4 ms | 22.5% | 59 |
| 8,192 | React + Compiler | 8.0 ms | 50.0 / 66.6 ms | 100% | 451 |
| 8,192 | Scalar VDOM | 4.6 ms | 49.8 / 66.7 ms | 98.8% | 422 |
| 8,192 | Columnar VDOM | 3.9 ms | 49.9 / 66.7 ms | 96.3% | 414 |

The preregistered decision passes: columnar VDOM had a lower per-update CPU
median than React in all five pairs at both 4,096 and 8,192 segments, and fewer
estimated missed slots in four of five pairs at 8,192. The page-median missed
slot count fell from 451 to 414, while RAF interval p95 remained effectively
unchanged. At 1,024 segments every arm stayed within the calibrated cadence.
This places the first observed cadence pressure between 1,024 and 4,096
segments on this profile. At 8,192, all arms were severely over budget: a
roughly 50 ms median callback interval is about three 60 Hz refresh periods.
The runtime cut JavaScript update work substantially, but did not make this
large DOM scene look frame-smooth.

The one cadence regression among the five 8,192 pairs was retained. Its
columnar page contained RAF gaps as large as 11.6 seconds, which dominate its
estimated missed-slot count and suggest external scheduling or system
interference. The raw page data are preserved and no outlier was removed. This
illustrates that estimated skipped slots are more sensitive to extreme stalls
than late-callback rate. The cadence gate passes narrowly and should be
replicated on another device before treating it as a general presentation
advantage.

This is a same-device callback-cadence proxy, not a compositor timestamp or
human-perception study. It records RAF times and JavaScript update durations but
does not separate style, layout, paint, GPU, and display work. RAF interval
parity at 8,192 despite lower update CPU implies that work outside the measured
runtime update still dominates the delivered loop. The raw manifest, 45 page
records, frozen source/build lock, preregistration, summary, and SVG charts are
under [results/snake-frame-cadence-v1](./results/snake-frame-cadence-v1/); the
notebook reruns its integrity checks and renders three SVG comparisons. The
earlier lifecycle study did not archive its production source snapshot; the
notebook now reports its post-study live-source drift instead of claiming the
old bundle remains present.

### 8.16 Long Animation Frames phase attribution: Snake Frame Phase V1

This 30-page follow-up compared React 19.3 + verified React Compiler, scalar
retained VDOM, and columnar retained VDOM at 1,024 and 8,192 segments. Each page
calibrated 120 idle RAF intervals, warmed 60 callbacks, and measured 240 updates
with Long Animation Frames diagnostics. All records passed API support, output
parity, stable identity, and teardown contracts.

At 1,024 segments no arm produced an entry. At 8,192 the page-level median entry
counts were 8 / 3 / 6 for React / scalar / columnar; median update CPU was
8.5 / 4.9 / 4.1 ms, while RAF p95 was 66.7 / 66.6 / 66.6 ms. Among pages with
entries, median script-attributed sums were 87.7 / 32.5 / 62.1 ms; summed
`styleAndLayoutStart`-to-entry-end intervals were 138.7 / 56.7 / 108.8 ms.
These are thresholded, coarse diagnostics, not a partition of frame time.

The study does not explain the high-load callback gaps. LoAF records cover only
entries longer than 50 ms, and no entry does not imply no style, layout, or
paint cost. The browser API does not report compositor completion or physical
display presentation. Results make no causal or smoothness claim; an
independent-device cadence replication remains the next gate. The notebook
renders three SVGs and checks all 30 raw hashes plus the 21-source/50-asset
lock. The preceding cadence study's Vite config hash differs because this
separate harness was added after its collection; the notebook explicitly
reports that drift and still verifies the locked production assets and raw
records. See [experiment log §5.87](./experiment-log.md#587-long-animation-frames-phase-attribution-snake-frame-phase-v1).

### 8.19 Keyed-region representation and integrated hybrid probe

The indexed-flat-array follow-up was extended with a parallel-array bucket
candidate (`keys[]` and `values[]` with packed key slots) at 1,000, 10,000, and
50,000 rows. Three serialized Node 24 processes each ran 315 samples per arm.
The candidate was compared with the existing object-backed bucket structure and
an indexed flat array. At 50,000 rows, median head-to-tail / middle-to-tail move
times were 1.169 / 0.422 ms for the indexed array, 0.0008 / 0.0006 ms for
object-backed buckets, and 0.0015 / 0.0010 ms for parallel-array buckets. A
full ordered scan was 0.274 / 0.285 / 0.313 ms, respectively. The data favor
the existing object buckets for sparse moves; the columnar candidate did not
win either operation consistently. Full-scan results are similar and do not
show a compelling reason to replace the current layout.

The runtime probe now stores compiler-marked keyed child order in
`KeyedRegionBuckets`, maintains a mount-time index of keyed-region nodes, and
accepts prevalidated insert/remove/move/replace operations without expanding
the region into a sibling array. A single excluded 10,000-row browser smoke
passed output parity, host identity, and retained child-state checks. It was a
correctness check, not a performance replication. The current owner-update
path still enumerates incoming children to verify/rebuild owner metadata, and
the direct region path still declines roots with compiled or direct bindings
until it can update those subscription indexes safely. The probe therefore
does not yet meet the product's combined structural-plus-prop-update promise.

The implementation decision is a hybrid, not a wholesale B+ tree VDOM:
columnar traits serve dense numeric property changes; object-backed bounded
buckets serve sparse keyed structure edits; the VDOM remains the semantic
snapshot and identity model; and general JSX continues through keyed diff as a
fallback. The next core implementation step is for OXC to emit sparse keyed
operations and for the owner cache and binding indexes to consume them without
scanning all siblings. Then compare complete DOM updates with React Compiler
for sparse edits, dense edits, and structure changes combined with per-frame
props. These Node microbenchmarks and the correctness smoke do not establish an
end-to-end speed win. Raw layout measurements are in
[`results/keyed-region-columnar-layout-v1`](./results/keyed-region-columnar-layout-v1/);
the SVG analysis is in the research notebook.

### 8.19 Mixed per-frame and keyed structural workload

The preregistered production comparison combines three declarative prop writes
(`left`, `top`, and `transform`) for every active entity on each animation
frame with eight structural events per page. Each event removes eight keys,
inserts eight new keys, and rotates retained keys. The arms use the same
benchmark-owned source data and output contract: React 19.3 + React Compiler
with keyed components and `useSyncExternalStore`, and the retained VDOM's scalar
source-binding path. This directly exercises a combined realtime workload
while keeping the current runtime's intended declarative surface.

The frozen schedule covers 128, 512, and 1,024 entities, five fresh page-load
pairs per size, and 30 total visible Chrome 155 production page loads. Each
page warms 60 frames and measures 240, for 7,200 measured frame samples; the
page is the replication unit and the frame samples are nested. Eight of the
240 frames per page contain structural changes. The preregistered performance
gate requires all correctness contracts, a paired geometric-mean runtime/React
median latency ratio ≤0.80 at two or more sizes, and a median paired p95 ratio
≤1.10 at each size. The frozen source set is recorded in
[`results/mixed-realtime-v1-preregistration.json`](./results/mixed-realtime-v1-preregistration.json).

All 30 records pass output parity, stable DOM count, retained-node identity,
complete commit coverage, visibility, production-build, and sample-count
checks. Every raw file matches its SHA-256 in the [manifest](./results/mixed-realtime-v1-manifest.json). The post-run audit found that `mixed-realtime-study.md`, one file in the original source lock, had been replaced by the results report and its original content was not recovered. Its source hash therefore mismatches; the preregistration JSON retains the decision rule, and the benchmark sources plus ten other locked inputs match. The manifest reports this deviation. Results are page-level
medians across five replications:

| Entities | React all-frame median / p95 | Runtime all-frame median / p95 | Paired median ratio geometric mean | Median paired p95 ratio | Structural p95 React / runtime |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 128 | 1.00 / 3.80 ms | 0.90 / 3.50 ms | 0.998 | 0.921 | 8.20 / 10.40 ms |
| 512 | 2.70 / 5.50 ms | 3.20 / 6.60 ms | 1.117 | 1.145 | 18.10 / 19.10 ms |
| 1,024 | 4.70 / 9.00 ms | 5.30 / 10.40 ms | 1.195 | 1.148 | 28.30 / 36.70 ms |

The median target is met at zero of the required two sizes, and the p95 guard
fails at 512 and 1,024. The preregistered performance gate therefore fails,
while the correctness requirements pass. Paired median wins occurred in two of
five 128-entity replications, one of five 512-entity replications, and none at
1,024. Runtime structural-frame p95 is higher at each size despite its slightly
lower all-frame median at 128. This suggests that stable updates and topology
changes should be analyzed separately; it does not attribute the structural
cost to any specific internal step.

The result narrows the earlier stable-topology claim. The current scalar
binding path does not beat React as this scene grows and changes structure.
Before changing the VDOM representation again, profile source notification,
dependency selection, binding dispatch, keyed reconciliation, and host commit
in separate diagnostic runs, then optimize the measured dominant cost. The
study is a controlled DOM fixture on one device/browser profile, not a Three.js
comparison or a user-visible smoothness test. RAF interval is only a callback
scheduling diagnostic. The runtime arm uses current scalar source bindings,
not a completed general OXC plan. Full analysis is in
[`mixed-realtime-study.md`](./mixed-realtime-study.md), and the notebook rechecks
the raw data before drawing SVG charts.

### 8.20 Preregistered async DAG frontier study: V2

This browser study tests whether a compiler-emitted task DAG can start all
currently ready asynchronous branches, respect hard input dependencies, retain
the old UI until a coordinated reveal, and match React when both have equal
preload knowledge. Each fresh visible production page block runs three arms:
a deliberately sequential React loader control, React 19.3 with explicit
promise preloading inside a state transition, and the OXC-compiled task DAG.
All use the same same-origin controlled endpoints (profile 90 ms, feed 130 ms,
recommendations 110 ms), the same output model, the same prior UI, and one
reveal commit. The page block is the unit of replication. The fixed
counterbalanced schedule contains each arm order five times over 30 blocks.

The v2 protocol and source/build hashes were frozen before collection in
[`results/async-dag-frontier-v2/preregistration.json`](./results/async-dag-frontier-v2/preregistration.json).
The immutable page records, schedule, and recomputable summary are in
[`results/async-dag-frontier-v2`](./results/async-dag-frontier-v2/). All 30
blocks pass output parity, pending-view retention, keyed node identity,
dependency ordering, dependent-start lag, and exactly one commit per arm.
The DAG's three independent requests start within 16.7 ms in 30/30 blocks;
dependent tasks start within 16.7 ms after the last prerequisite in 30/30,
with zero hard-edge violations. Median independent-start gap is 0.7 ms for the
DAG and 0.65 ms for preloaded React. These are concurrent I/O/readiness results,
not parallel JavaScript execution.

| Arm | Completion-to-layout-commit median | p95 |
| --- | ---: | ---: |
| Sequential React loader control | 364.4 ms | 385.3 ms |
| React with explicit preload | 143.6 ms | 152.1 ms |
| Compiled DAG | 144.8 ms | 151.2 ms |

The paired median DAG/control ratio is 0.397 (60.3% lower), which clears the
preregistered 20% sequential-control threshold. The paired median DAG/React
preload ratio is 1.000, and the DAG p95 is 0.994× React's p95, within the
preregistered 1.10 ceiling. The result supports a precise claim: the compiled
DAG automatically exposes and schedules the ready frontier, avoids a
sequential-loader waterfall, and matches this explicitly prewarmed React
baseline. It does not show a meaningful speed advantage over idiomatic React
that already knows all independent request keys.

This is a single-device Chrome 155 study with deterministic delayed I/O; the
measured interval ends at layout effect/host commit and does not measure painted
frames or scrolling smoothness. Data wait dominates the path. The run does not
test speculative fetch, cancellation/supersession, cache reuse, CPU-heavy
tasks, worker execution, progressive reveal, server streaming, or hydration.
Those remain separate product questions. The initial v1 run is preserved in
[`results/async-dag-frontier-v1`](./results/async-dag-frontier-v1/) but excluded:
its first-arm readiness race caused 20/30 blocks to measure a visible React
fallback. V2 waits for the initial layout commit and was collected from scratch;
no v1 observations enter these estimates.
