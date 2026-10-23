# Data-owned Store execution: verified capability, performance parity fails

Base main 5fe544459e2842622064289fef8b1663ee62ca68, MIT. [Design](design.md), [primary source review](source-review.md), [Astra deep dive](../2026-10-22-astra-speed-orchestration/report.md), [exact next-unit orchestration](../2026-10-22-astra-speed-orchestration/orchestration.md) and [raw summary](summary.json). Changed source does not inherit historical timings.

## What changed

Compiler-selected closed Store numeric owners now emit an explicit four-field owned-data marker instead of an executable callback. Runtime privately associates the marker with its normalized host expressions and reuses existing finite expression evaluation. Mixed local inputs and retained children remain supported. Primitive empty-child group eligibility depends on supported literals/numeric expressions, not a benchmark name. Legacy manual kernels retain their exact callback ABI and conservative original order.

One enclosed Store operation normalizes requests first, audits each distinct canonical instance once, captures each exact Store/path once, then stages independent reader observations and accepted histories through the existing transaction. Canonical World capture supplies exact local values/handles/versions/lineage; uncertain inputs, lane/accessor cells, legacy/opaque/resource selections and unselected accepted-reader preservation keep conservative capture. Integrity facts expire on return. No new identity/version/history registry, physical traversal, JIT or host writer was selected.

Source review also repaired public World callbacks inside specialized final acceptance. Public preparation and validation remain observable; final post-host validation, captured lineage and exact acknowledgement use canonical internal bookkeeping. Newer actions remain pending. Resource retirement shares existing World/Root destruction bodies, uses canonical deepest-first order and admits only privately checked zero-lane subtrees; generic retirement retains broader behavior. Numeric-column storage is externally reachable, so its release cannot be assumed passive. This finite edge and wider inherited publication/validation review remain explicit; the named changes do not certify every path in the repository.

Data evaluation loses generated DAG CSE/inlining and adds normalization/cut scratch. Common empty kernel arrays still allocate. Private metadata provenance, request/result maps and retirement staging have unmeasured cold/allocation/retained-memory costs. Primary retains the capability because explicit owned computations permit enclosed preparation and retire arbitrary callback boundaries, not because this observation establishes a speed or memory saving.

## Consolidated verification and preserved failures

Darwin v3 passes all **73 phases**, **1165 Deno tests**, **101 Rust tests** and **53 actual compiled fixtures**, including package/Three/resource and retention gates. All **1742** runner input hashes match before/after. It covers actual emitted marker/evaluation, mixed data/manual callbacks and errors, duplicate host keys under distinct owners, per-root histories, newer actions and late-publication overrides.

- Darwin v1 fails type checking/package build on a zero-argument publication interface called with a boolean; new compiled fixture also observes four staged rows instead of two. Fix closes over the existing preparation mode and supplies owner identity on schema-5 scalar staging. No route assertion is weakened.
- Darwin v2 executes 1164/1165 runtime tests successfully; one newly authored schema-5 test incorrectly supplies only a direct scalar path. Correct it to a supported record property projection. Actual compiled assertions pass, but missing compiler plugin cleanup leaves its worker alive until the 300-second timeout. Add cleanup preserving original exceptions. Both failures remain archived.
- Installed v1 builds pass. Browser proof v1 stops after Native because the verifier mistakes cumulative counters for per-frame totals: first frame 257/1 is correct, final rows18504 equals257×72. Correct only the verifier to exact cumulative totals for every epoch; preserve the failed proof. No timing occurred.

Installed v2 separately locks that verifier follow-on. Its 14 inputs/13 staged files, 54 package sources, 17 pinned R3F basis files, three tarballs and 6097 installed entries are captured. Authored Native, declarative React, useFrame, imperative and common-scene source bytes retain the preceding comparison’s arithmetic/topology/draw/resource contract. Actual Native Position/Rotation schema7 data metadata is captured; both React arms have actual Compiler success, including all five frame components.

## Untimed installed proof

All four arms complete 12 warmup/60 measured frames with matching scalar/pixel checksums and retained object/child identity. Native records exactly257 data rows and one successful capture batch per frame (18504/72 cumulatively), zero kernel executions and zero component renders. R3F frame scheduling and common draw remain independently observed. Each arm disposes all512 resources exactly once. Native leaves zero owners, pending actions and registered setters; frame callbacks/root are stopped. All contexts/browser close with zero request/page/console/proof/cleanup errors. Both proof source boundaries match all12378 hashes.

## The single fixed-order timing comparison

One Native → declarative React → R3F useFrame → imperative episode, 12 warmup/60 measured, headless Chromium with real WebGL2 on ANGLE Metal Apple M4. Counters are disabled. Both boundaries match all12378 hashes and every context/resource closes cleanly. Median uses the two central values; p95 uses nearest rank. Milliseconds:

| Arm | Update step median/p95 | Through draw/readback median/p95 | State age median/p95 |
| --- | ---: | ---: | ---: |
| Native | 3.45 / 3.90 | 5.85 / 7.20 | 3.50 / 4.00 |
| React Compiler + declarative R3F | 0.70 / 0.90 | 4.40 / 5.20 | 0.80 / 1.00 |
| R3F useFrame | 3.00 / 3.20 | 6.40 / 13.00 | 3.10 / 3.40 |
| Imperative | 0.10 / 0.20 | 3.90 / 4.70 | 0.30 / 0.40 |

Native parity against the declarative comparator **FAILS**. It also loses update-step/state-age to useFrame, though this episode observes lower Native through-draw intervals. That difference does not isolate renderer/scheduler cost or prove a general ranking. publishMs names the update step in the frame arm, not accepted Store publication. Callback time equals the reported through-draw interval; median RAF is16.7ms in all arms. Approximately equal RAF cadence does not prove equal spare CPU or presentation smoothness.

One episode and dependent frames do not establish causal old/new saving, phase cost, population-tail, automatic-frameloop/presentation, matched cold/memory or independent-device qualification. No favorable repeat occurs. React’s declarative application clock does not promise Native’s complete accepted-history/fork/hold/group model; useFrame’s ref mutation is a separate contract, and imperative does fewer bookkeeping obligations. Required output writes remain; source operation counts are not a measured removable budget.

## Disposition and remaining work

This semantic slice is complete within its stated eligibility; the full-plan goal remains active. Primary retains data-owned preparation and selects Astra’s separately bounded ordinary scalar contraction as the next candidate after this boundary: one ordered row footprint, World private validation batching, VDOM scalar-only assembly, and one publication core with an optional deferred adapter. It must retire named duplicate work and preserve all callbacks/validation/history/lifetime barriers. It is not a rescue cache or a guaranteed speed result.

Private World validation must also inspect lane-backed canonical methods carefully: a captured method can still read externally reachable column accessors. A new operation may only share checks within a proven passive phase, preserving post-callback/post-writer freshness. It cannot declare a canonical method automatically callback-free.

Broader fusion, current workbench HMR delivery, lifecycle/cold/memory/performance qualification, independent device and remaining product conformance stay open. Human maintenance participants remain zero; no maintenance advantage is claimed. Historical narrow wins, dense FAIL, exhausted RecordingA and physical HOLD remain unchanged. No VM/listening server or Depot permission change occurs.
