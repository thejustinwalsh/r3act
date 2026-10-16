# Mixed real-time JSX workload: preregistered production study

**Date:** 11 October 2026  
**Status:** data and correctness checks pass; preregistered performance gate fails  
**Environment:** Chrome 155, visible foreground tab, one MacIntel profile, Vite production build

## Question

Does the retained VDOM runtime keep its apparent advantage when the benchmark combines the per-frame declarative property updates of a real-time scene with ongoing keyed structural changes?

## Arms and workload

Both arms use the same benchmark-owned data and produce equivalent DOM output. React 19.3 uses keyed components, `useSyncExternalStore`, and the React Compiler. The runtime arm uses the retained VDOM with scalar source bindings. On each animation frame, the harness updates `left`, `top`, and `transform` for each active entity. Every 30th measured frame it removes eight keys, inserts eight fresh keys, and rotates retained keys. Each page starts with 128, 512, or 1,024 entities, warms for 60 frames, then measures 240 frames. Each arm/size has five fresh page-load replications, counterbalanced in the frozen 30-page schedule.

The page load is the replication unit. Frame samples within a page are nested observations, not independent replications. Reported group summaries are medians across the five page-level summaries. Structural-frame summaries use the eight topology-changing frames on each page. The harness checks output parity, stable node count, identity preservation for retained keys, complete React commit coverage, visible-tab execution, and production build mode.

This is a kernel/product-kernel comparison, not a full compiler comparison: the runtime arm directly exercises retained scalar source bindings, not general OXC-emitted bindings. It includes the runtime's keyed updates but does not include build-time compilation, layout, paint, GPU work, or physical display presentation.

## Preregistered decision rule

All correctness contracts must pass. The performance criterion requires the paired geometric mean of runtime/React page median update-to-commit latency to be at most 0.80 at two or more sizes, and the median paired p95 ratio to be at most 1.10 at every size. RAF interval is not presentation evidence. The source lock and schedule were frozen before collection in [the preregistration](./results/mixed-realtime-v1-preregistration.json).

## Results

All 30 records passed the data and correctness checks: 7,200 frame samples, 240 per page, with eight structural frames per page. No scheduled page was dropped. During the post-run audit, a documentation-integrity issue was found: `mixed-realtime-study.md` was included in the preregistered source lock, then replaced with this results report. The original 3,584-byte protocol copy was not recovered, so this source hash cannot be verified. The preregistration JSON still preserves the frozen schedule and decision rule; the benchmark implementation and the other ten locked source files match their hashes. The manifest records this exception explicitly. The source lock is therefore incomplete.

| Entities | React update→commit median / p95 | Runtime update→commit median / p95 | Paired median ratio, geometric mean | Median paired p95 ratio | Structural p95 React / runtime |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 128 | 1.00 / 3.80 ms | 0.90 / 3.50 ms | 0.998 | 0.921 | 8.20 / 10.40 ms |
| 512 | 2.70 / 5.50 ms | 3.20 / 6.60 ms | 1.117 | 1.145 | 18.10 / 19.10 ms |
| 1,024 | 4.70 / 9.00 ms | 5.30 / 10.40 ms | 1.195 | 1.148 | 28.30 / 36.70 ms |

The paired median ratios favored the runtime in two of five 128-entity pairs, one of five 512-entity pairs, and none of five 1,024-entity pairs. No size reached the preregistered 0.80 median target; the p95 guard failed at 512 and 1,024. Therefore the correctness requirements pass, but the preregistered performance gate fails.

Ordinary-frame and structural-frame costs should be read separately. At 128 entities, runtime's structural p95 is already higher despite a slightly lower all-frame median. At 1,024, runtime's structural p95 is 36.70 ms against React's 28.30 ms. This points to two costs to investigate independently: per-frame scalar binding dispatch at scale and the runtime's keyed structural update path. It does not prove which internal operation causes the gap; tracing is needed before changing the data structure.

## Interpretation

The earlier fixed-topology results demonstrated that specialized declarative update paths can beat broad rendering work on selected stable scenes. This mixed workload does not support the broader claim that the current retained scalar-binding path is already faster as real-time scenes grow and their topology changes. At 128 entities it is approximately tied; by 512 and 1,024 the production React baseline wins on both medians and tails.

This is useful counterevidence and narrows the next engineering question. Before another layout experiment, attribute the time in the runtime arm across source notification, dependency selection, binding dispatch, VDOM keyed update, and host commit. Then optimize the measured dominant path and preregister a new end-to-end comparison. Keep the VDOM and declarative contract; the data do not justify requiring users to mutate Three/DOM objects through refs.

## Limitations

- One physical machine and one browser profile; no independent-device replication.
- This fixture is a controlled DOM workload, not a Three.js renderer or a user study.
- RAF intervals describe callback scheduling. They do not show compositor completion or smoothness on screen.
- Browser timing resolution and system interference affect millisecond-scale samples; no outlier pages were removed.
- The runtime arm uses its current scalar binding kernel, not a finished OXC compiler product. The result evaluates the current path, not every possible compiled plan or the future hybrid architecture.

## Artifacts

- Surviving preregistration and 30-page schedule: [preregistration](./results/mixed-realtime-v1-preregistration.json)
- Hash-verified raw records and source-lock audit, including its exception: [manifest](./results/mixed-realtime-v1-manifest.json)
- Recomputed page-paired summary: [summary JSON](./results/mixed-realtime-v1-summary.json)
- Raw records: [`results/mixed-realtime-v1/`](./results/mixed-realtime-v1/)
- Executable checks and SVG-only charts: [research notebook](./research.ipynb)
