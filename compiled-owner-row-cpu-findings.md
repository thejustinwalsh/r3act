# Compiled owner row CPU findings

Two independently verified whole-page profiles identify repeated runtime work worth simplifying in the compiled owner row implementation. Both pages pass their correctness and disposal checks, and all 1,116 preregistered input hashes remain unchanged. The separately verified timing study still fails its speed gate.

The fixed capture profiles React sequence 20 followed by native sequence 21 at 1,024 rows, with 60 warmup frames, 240 measured frames and eight structural edits per page. It uses fresh headed Chromium contexts, disabled GPU acceleration and a 1,000-microsecond CDP sampling interval. Exact production asset hashes and the v5 engine tuple match the frozen source checkpoint and timing study.

## Sampled costs

The native arm bundle has 574.627 ms of sampled self time, compared with 295.537 ms for React by URL-based aggregation. Each bundle includes application code and runtime code. The profiles span import, mounting, warmup, updates, correctness inspection and disposal. They cannot assign samples to individual measured frames or distinguish ordinary updates from structural edits.

| Native sample location | Bundle column on line zero | Sampled self ms |
| --- | ---: | ---: |
| Cached CSS style writer | 48946 | 111.334 |
| VDOM prepared row executor | 84397 | 67.439 |
| Root row capture and publication routine | 163691 | 62.041 |
| World state dispatch routine | 44047 | 24.801 |
| Public row execution wrapper | 76346 | 21.651 |
| Root pending cell journal insertion | 15722 | 19.616 |
| Published setter forwarding closure | 37043 | 17.969 |
| World exact cell acknowledgement | 41741 | 15.082 |
| Root pending cell acknowledgement | 17029 | 13.232 |

Locations are zero-based CDP line and column positions in the locked native arm bundle. The captured UTF-16 excerpts identify the style assignment, row-cut buffer checks, Root row buffers, dispatch and journal operations. These are sampled function locations across the whole run. Inlining and sampling affect attribution; the numbers do not measure the cost of an individual check or establish the savings obtainable by removing it.

The shared harness accounts for substantial sampled work too, including DOM correctness inspection. Its costs are retained separately. Garbage collector samples are not an allocation study or a causal explanation for the timing result.

## Next change

The row executor separately validates dependencies, captures values, mirrors sources and looks up row tokens again while collecting sink fanouts. It is a concrete place to reduce repeated passes without changing the authored API. Stage a change that combines dependency validation and scratch capture, then reuses validated records for fanout collection in dirty input order.

Keep validation of the complete update before source mirroring, projection or host writes. Preserve checks for untouched dependencies, conflicting duplicate values, retired leases and stale bindings; preserve lazy first execution, cancellation, reentry, terminal host failure and cleanup. The staged change must demonstrate fewer scans/lookups with correctness tests before integration. Only a new integrated timing study can establish its performance benefit.

Root row capture and publication remain another substantial sampled location. Inspect that path after the executor change rather than combining unrelated changes into an untraceable performance claim. The compiler, retained virtual DOM, declarative prop updates and coherent store semantics remain product requirements.

## Evidence

Raw profiles, complete harness results, served asset hashes, source excerpts and preregistration are in `results/product-mixed-compiled-owner-rows-cpu/`. The authoritative integrity result is `verification-v2.json`; the derived JSON and SVG are in `results/product-mixed-compiled-owner-rows-cpu-analysis/`.

The original verifier expected different category labels than the collector. Its script and failure log remain preserved. V2 changes those reporting labels, adds direct checks of the recorded engine and pilot metadata, and independently recomputes the same raw samples. No profile was rerun, replaced or excluded.

The CPU evidence archive is `implementation/2026-10-13-compiled-owner-row-cpu/evidence.tar.gz`. These two pages provide attribution on one machine and browser. Allocation, independent-device and comparative maintenance/adoption evidence remain separate gates.
