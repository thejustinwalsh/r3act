# Four-arm realtime baseline: comparator verified, Native still slower

Production runtime/compiler is unchanged from 04b7757; Native, declarative React/R3F, imperative and shared scene sources retain their exact preceding bytes. The new arm adds an idiomatic useFrame/scheduler contract beside the existing declarative comparison, without treating them as equivalent Store/publication semantics. [Design](design.md); [primary source review](source-review.md).

Darwin-v1 passes all 72 phases: 1147 runtime tests, 99 Rust tests, 52/52 actual compiled fixtures, native tooling and package build/consumer. All 1693 runner input hashes match before and after. The supervisor exits 0, no stop, after 116.57 seconds. [Receipt](verification/darwin-v1/receipt.json). Fresh installed build, untimed proof and a separate hash-authorized single timing episode follow only after review; no new speed result is claimed yet.

The R3F frame arm uses its actual public root scheduler, 257 update callbacks and one render takeover, owning equivalent scene resources through JSX. Proof-only renderer instrumentation checks default draw suppression and exactly 72 common draws; timing leaves the renderer unwrapped. The control-commit counter observes offset-dependent committed effects, not every possible component execution; static callback checks and source inspection establish that the per-frame application updater does not dispatch React state. No broader absence-of-rerenders claim follows from that counter alone.

The current workbench HMR source review establishes no repair. Its preserved missing-membership failure remains unresolved, with no additional server/browser run. [Bounded source note](hmr-source-note.md). Full-plan speed, broader computation fusion, HMR, cold/memory and independent-device requirements remain open. Physical HOLD and historical evidence limits remain intact.

## Preserved installed preparation v1 failure

The first preparation exits 1 after 9.81 seconds, no stop. Install/typecheck and the Native/declarative React builds pass; the frame Vite bundle is produced, but the authored guard rejects missing Position CompileSuccess. No frame capture JSON survives because the initial builder writes it only after its assertions; original logger diagnostics were not persisted. This missing diagnostic evidence is not reconstructed. No browser or timing occurs. The input lock remains valid for that exact failed attempt, with 14 consumer files, 53 package sources, 17 R3F source-basis files, three tarballs and 6092 installed entries. All prior 13 basis files, 53 package sources and three tarballs match the previous slice. [Failed build](proof-canvas-v1/build-proof.json); [stderr](proof-canvas-v1/build-react-frame.stderr.log).

Primary reviews a tooling correction to preserve actual Compiler diagnostics before assertions. The original declarative React purity/success/memo guards remain. A valid Compiler decline in the distinct ref-mutation frame arm must be reported explicitly; it cannot be relabeled as CompileSuccess. An actual scheduler proof is the required comparator contract, while component memoization and native Store semantics are separate. Fresh installed preparation is required before any browser release; no speculative authored rewrite or performance conclusion follows.

## Compiler diagnostics and corrected preparation

Preparation v2 exits 0 in 9.45 seconds and preserves the actual frame Compiler decline rather than claiming success. Position and Rotation each report four CompileError/Todo diagnostics: `(BuildHIR::lowerExpression) Support UpdateExpression where argument is a global`. Marker and render takeover also decline for those observer counter operations; App compiles. No primary fallback-review receipt, browser or timing is approved for v2. [V2 frame capture](proof-canvas-v2/capture-react-frame.json).

The concrete source correction moves only global observer/lifetime increments and decrements into noncomponent module helpers. Frame callbacks, scene ownership, direct ref writes, local controls, scheduler advance and telemetry values remain. Timing's diagnostics=false branch calls no per-frame observer helper. Corrected preparation v3 exits 0 in 9.36 seconds: install, typecheck and all four builds pass. Position, Rotation, FrameMarker, RenderTakeover and App all have actual CompileSuccess events; both motionCompiled fields are true, with no fallback approval needed. [V3 build](proof-canvas-v3/build-proof.json); [V3 frame capture](proof-canvas-v3/capture-react-frame.json).

These are separately source-locked consumer follow-ons after the consolidated product gate; production source is unchanged. Original v1/v2 bytes, outcomes and missing v1 diagnostics remain preserved. No timing has yet been run.


## Installed WebGL proof and single comparison

The v3 untimed proof passes in 12.32 seconds within 120 seconds. Every arm preserves 256 objects/children, matching numeric transforms and nonempty pixel output across 12 warmup plus 60 measured frames. All 72 frame-arm steps observe exactly 256 motion callbacks, one marker callback, one render takeover, zero offset-effect commits and zero renderer calls during scheduler advance; total common draw calls are 72. Actual root unmount leaves zero frame jobs/setters and stopped root, zero scene children, and all 512 resources disposed exactly once per arm. Native has zero owners/pending/setters. All contexts/browser close without errors. Both proof and timing match all 12367 source/asset hashes before/after. [Untimed proof](proof-canvas-v3/canvas-proof-one-shot.json).

Primary authorizes exactly one fixed-order Native → declarative React → R3F useFrame → imperative comparison. It passes correctness, hash chain and cleanup in 11.16 seconds, no stop or repeat. All 72 timing-frame counters are null per arm. WebGL2/ANGLE Metal Apple M4, headless GPU Chromium 153.0.8010.12, 640×480/DPR1, identical manual camera and common render/readback. Conventional median averages the central pair; p95 is nearest rank ceil(0.95×60), measured epochs 13–72.

| Milliseconds, median / p95 | Native | Declarative React + R3F | R3F useFrame | Imperative |
| --- | ---: | ---: | ---: | ---: |
| Update step | 4.10 / 4.90 | 0.80 / 1.00 | 3.10 / 3.40 | 0.10 / 0.20 |
| Update through draw | 6.60 / 7.50 | 3.55 / 4.40 | 5.70 / 6.20 | 3.30 / 5.40 |
| State age | 4.10 / 5.00 | 0.80 / 1.10 | 3.10 / 3.40 | 0.10 / 0.40 |
| Callback | 6.60 / 7.50 | 3.55 / 4.40 | 5.70 / 6.20 | 3.30 / 5.40 |
| RAF interval | 16.70 / 16.80 | 16.70 / 16.70 | 16.70 / 16.70 | 16.70 / 16.70 |

Raw `publishMs` denotes the common harness's update-step interval. For Native this includes Store dispatch through accepted publication; for declarative React it includes external Store dispatch through commit; for useFrame it includes passive input assignment and actual scheduler advance through ref writes; imperative performs manual writes. These contracts differ. The frame result supplies no equivalent Store/fork/coherence guarantee. React Compiler succeeds for both React arms, but frame hooks execute via R3F's independent scheduler. The offset-dependent committed-effect counter does not prove absence of all possible React component renders.

**Performance parity remains FAIL:** Native loses update-step and update-through-draw median and p95 to both React paths. The observation does not attribute time to R3F cloning, native audits, React memoization or any other phase. It establishes no causal old/new speed saving, population-tail, scheduler superiority, presentation, automatic frameloop cadence, cold/memory, independent-device or maintenance advantage. All four follow the same explicit manual draw boundary. No favorable repeat or rescue optimization occurs. [Raw timing](proof-canvas-v3/canvas-timing-one-shot.json); [authorization](proof-canvas-v3/canvas-timing-authorization.json).

## Remaining full-plan work

The required idiomatic frame comparator is now implemented and verified. All production runtime/compiler files and the three original arms are unchanged. Post-gate follow-ons are proof tooling/observer bookkeeping and maintained documents, separately source-locked by v2/v3 installed preparation. Four generated fixed-path cache outputs are archived then restored to original HEAD bytes, and new cache research artifacts remain preserved. No VM/server, push or publication occurred.

Astra's separate source review provides one possible data-only execution/passive capture contract and bounded Sol orchestration. It is not implemented here, makes no predicted millisecond saving, and preserves arbitrary legacy callbacks, live checks, exact acknowledgement, accepted histories and physical HOLD. Current workbench HMR remains unresolved with no source-backed repair or new diagnostic run. Realtime speed, broader computation fusion, cold/memory and independent-device requirements remain open under the original full goal. Human maintenance participants remain zero.
