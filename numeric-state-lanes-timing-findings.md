# Numeric state lanes: timing decision

13 October 2026. **Independent evidence verification PASS; speed gate FAIL.**

## Frozen candidate and workload

Candidate source/build SHA-256:
`83c99cd500cb9462094c637014f3e8adf3cf8bc0280e5d154442141408f192c3`.
629 runtime tests, 32 Rust tests, twelve final primary commands and six
correctness pilots qualified it. This study ran all 30 preregistered fresh
pages, five React/native pairs at each size, with 7,200 measured frames and no
exclusions. All page correctness, lifecycle, resource and frozen-input checks
passed. All pairs resolved under the five-tick clock rule.

| Rows | React median ms | Native median ms | Paired median ratio | Paired p95 ratio |
| --- | ---: | ---: | ---: | ---: |
| 128 | 0.180 | 0.315 | 1.750 | 1.736 |
| 512 | 0.575 | 1.100 | 1.918 | 1.761 |
| 1024 | 1.120 | 2.235 | 1.991 | 2.163 |

Arm medians are medians of page medians; the median ratio is the geometric mean
of five paired page-median ratios. The p95 ratio is the median of five paired
page-p95 ratios. The fixed .80 median requirement at two sizes and 1.10 p95
requirement at every size fail at all sizes. Lower ratios are better. The React
baseline includes React Compiler. The analyzer and independent verifier agree;
there was no post-registration analysis repair or page rerun in this study.

## What this proves and what it does not

The integrated column route works under the product workload but is slower than
React under this study's synchronous-step measurement. The authored TSX cut
proof separately establishes that supported sparse/dense numeric cuts avoid
StateChange snapshots and scalar-program execution. Avoiding those operations
was not sufficient to meet the performance requirement. A column layout, fewer
allocating containers, or a compiler descriptor alone does not establish speed.

This result does not isolate the causal effect of the lane change relative to
prior checkpoints: those studies were separate runs, not randomized historical
pairs. No fresh allocation result exists for this candidate. Whole-page CPU
profiles will be diagnostic attribution, not a substitute latency comparison.
Browser layout, paint, GPU presentation and perceived responsiveness are outside
commitMs; synchronous component rendering inside step is included. There is one
machine, headed Chromium with GPU disabled, and equal isolation headers.

## Next bounded action

Profile the exact frozen candidate's two 1,024-row pages to attribute remaining
World dispatch/address validation and VDOM cut work. Preserve every raw profile,
input lock and source excerpt. Review the canonical identity/lifecycle invariant
before removing repeated checks, and retain generation/promotion/version and
host-failure safeguards. Direct setter forwarding is also a bounded hypothesis.
Make one integrated change justified by current attribution, then apply the same
gate. Do not introduce another backend, alternate baseline or relaxed target.

The full goal remains active. Independent-device and human maintenance/adoption
gates are still open; the held Sol review remains held. Workers, streaming,
hydration and Wasm remain deferred.

Run ID: `ea506a97-c59f-4f86-bb7b-65d22139c800`.
