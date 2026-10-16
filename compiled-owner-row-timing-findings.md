# Compiled owner row timing findings

The independently verified study passes all 30 correctness pages, 7,200 measured frames and 1,044 frozen input checks. The compiled owner row implementation fails the speed gate at all three sizes. It is 27–43% slower than the React Compiler baseline by the paired median statistic.

| Rows | React median ms | Native median ms | Paired median geometric mean ratio | Median paired p95 ratio |
| --- | ---: | ---: | ---: | ---: |
| 128 | 0.205 | 0.270 | 1.2700 | 1.1186 |
| 512 | 0.620 | 0.855 | 1.3750 | 1.3822 |
| 1024 | 1.165 | 1.665 | 1.4313 | 1.6617 |

Ratios are native divided by React; lower is faster. Arm medians are medians of page medians, whereas the decision statistic is the geometric mean of five paired page ratios. The fixed target remains a median ratio at most 0.80 at two sizes and a p95 ratio at most 1.10 at every size. All pairs resolve under the unchanged five-clock-tick floor. No page was excluded, replaced or rerun.

Both arms use their required compilers. Native has three owner-qualified numeric descriptors, matching state slots and bindings; React has row and board memo caches. These results compare the integrated implementations with their compiler support enabled.

## What works

The frozen implementation retains a virtual DOM and ordinary authored TSX. Rust/OXC emits owner identities and ordered state dependencies; the JavaScript runtime prepares row programs and publishes captured numeric updates before effects. Eligible prop updates avoid component rerenders. Separate authored-module proofs cover sparse and dense updates, repeated and reordered reads, keyed lifetime changes, private candidates and promotion to nonnumeric values. A proof through the public Three host checks 240 batches against actual Three objects and resource cleanup. That proof does not measure WebGL rendering or frame latency.

The source checkpoint passes 694 runtime tests and 33 Rust tests. Its Chromium diagnostic confirms fast properties for the inspected numeric cell classes and checks capability revocation and row view semantics. Those results establish bounded correctness and representation properties; they do not establish a performance benefit.

## Where the design falls short

Avoiding component rerenders has not made the integrated update path cheaper. Native's ordinary update medians are higher, and structural updates, mounting and disposal also cost more in this study. At 1,024 rows, the medians of structural page medians are 5.560 ms for native and 1.660 ms for React; mount medians are 46.650 and 14.685 ms respectively. The next optimization must account for the whole path from a setter through publication and host writes.

The previous prepared dirty membership study also failed, with paired median ratios of 1.1752, 1.2165 and 1.2596. This new study has higher ratios. The studies were collected separately, so they do not isolate a causal regression from row programs, direct capabilities or any individual change. The older stable-cell CPU profile predates this implementation and cannot attribute its current costs.

The current application bundles are 184.96 kB native and 221.03 kB React, with gzip sizes of 50.76 and 69.30 kB. These are application build measurements. Native grew from the previous application build; an isolated library size advantage and current package qualification remain unproven.

## Evidence and repairs

The original analyzer rejected all pages because it expected a different study name and expected filenames on pilot records that only contain arm, size and status. The preserved V1 summary remains invalid. The V2 analyzer corrects those interpretations using the original preregistration, separate pilot page file records and the same 30 raw pages.

The independently run verifier also required schema repairs for the authored proof, pilot provenance and nested compiler metadata. Executed V1, V2 and V3 tools and failure logs remain preserved. V4 independently recomputes the statistics and gate, verifies the original locks and archive contents, and records repair provenance. These repairs changed no raw measurements, thresholds, schedules or exclusion rules.

The authoritative analysis is `results/product-mixed-compiled-owner-rows-confirmation/summary-v2.json`; its independent verification is `verification-v4.json`. The SVG chart is `summary-v2.svg`. Timing evidence is archived under `implementation/2026-10-13-compiled-owner-row-timing/`. The earlier source checkpoint remains unchanged and continues to describe its status at source freeze time.

Raw records retain the harness's checks and errors rather than every frame's DOM snapshot. Independent verification checks the frozen harness logic and recorded outcomes; it cannot reconstruct all row values from the records. Commit timers exclude layout, paint and presentation. This is one machine and one mixed numeric/keyed workload.

## Next implementation decision

Collect a fixed pair of whole-page CPU profiles from this frozen production build, with exact served asset hashes and the verified timing evidence attached. Resolve sampled frames to production bundle offsets before choosing a change. Inspect World dispatch and acknowledgement, Root capture and validation, VDOM projection and deduplication, host writes and structural publication where the samples identify them. Whole-page sampling includes startup, warmup, inspection and teardown; its results must retain that scope.

Use that attribution to remove repeated work while preserving complete captured cuts, reentry safety, lifecycle cleanup and unchanged-value suppression. Keep the compiler and declarative props as product requirements. Allocation, current package, independent-device and comparative human maintenance/adoption gates remain open, and the Sol review remains held. Workers, streaming, hydration and Wasm remain deferred.
