# Runtime page v2: single N=128 correctness/path receipt

## Outcome

The one authorized headless page completed with collector exit code 0 and status `CORRECTNESS_AND_DELTA_PATH_PASS_SINGLE_N_128`. This is a bounded correctness and instrumentation-path check only. It provides no latency, locality, asymptotic, or performance evidence.

## Invocation and served artifacts

- Pinned Node: `v24.18.0`; Chromium: `153.0.8010.12`; headless, GPU disabled; viewport `1200x900`.
- Collector: `node .cache/structural-locality-protocol-v1/eligibility/runtime-page-v2/collect-once.mjs`, with `STRUCTURAL_RUNTIME_GATE_ORIGIN=https://structural-locality-runtime-gate-v2.localhost:1355`.
- Portless preview used alias `structural-locality-runtime-gate-v2`, with Vite CLI and the frozen runtime-gate-v2 config. The exact nested HTML readiness path returned 200 before collection.
- Served HTML SHA-256: `908a2b84356bfef164e9198decad26ec8f77af0386a97ce7257c5eace965d11c`; JS: `488be8145f31d197b12794b31fb3de183baa2835aa76ead3b70fc512cda37951`; source map: `8f2e3c52d20d5f06ddc2fba32f0309835e1382840fb8bef7651213dbf3910206`. Each matched the frozen build artifact; the map fetch returned 200.
- The response inventory contained the expected HTML, JS and map, all status 200. No favicon request occurred, so the declared favicon-204 interception was not exercised. No other console, page, request, response, or cleanup errors were recorded.

## Correctness and path observations

Collection, generic, and React arms passed the page's assertions. Each reported the same signatures: 128 mounted rows; selection of `row-0` and `row-2`; moving `row-0` to the tail; inserting `fresh-head` (129 rows); removing it (128 rows); and edge update replacing `row-127` with `edge-new` at the head (128 rows).

For each arm, the page recorded 130 distinct lifecycle row IDs with one mount and one cleanup each. After disposal, the DOM had zero children and the setter was unregistered. Native additionally reported reader count 0 and owner count 0; generic reported owner count 0. React owner/reader counts were not exposed by this page.

Native `collection.delta-operations` values were move/insert/remove/edge = `[1, 1, 1, 2]`. The native `released-child-vnodes: 128` field is the prior child-array length used when assigning the replacement array; it is not evidence of 128 visited children. Cumulative native collection statistics were inspections `[129, 131, 132, 135]`, anchors `[0, 1, 1, 2]`, listener notifications `[1, 2, 3, 4]`, retained batches all 0, reader count 1 during the operation samples, and errors all 0. These cumulative counts include the initial mount; they must not be read as per-operation deltas.

The generic arm reported whole-region owner visits of 128 for the update samples. This one size and one page do not establish relative scaling or locality.

## Preservation and cleanup

Independent before/after audit passed: all five locked runner source hashes; two API declaration hashes; the failed runtime-page-v1 manifest and its 13 protected files; all 424 v2 locked inputs; the v2 build report and compiler binary; all 31 preserved v1 files; all three built assets; all prior synthetic gate receipts; and all 126 original evidence files remained unchanged. See `before.json` and `after.json` for per-file hashes. Collector stdout/stderr and the exact invocation receipt are retained here; the page report SHA-256 is `e6832f587f6e5749538cbde0db5efcc91258680f36d06f06573381c5a24da7f5`.

The owned preview was stopped after collection (Portless session 58289 returned 130 on deliberate interrupt). The owned route was absent and app listener port 4348 was down afterward; shared proxy PID 43235 remained active and the three pre-existing aliases were preserved. No source, build, runner, or frozen lock files were changed.

## Limits

This validates the exercised page assertions, served artifact identities, and observed instrumentation paths at N=128. It does not prove the production runtime is correct in general, establish operation cost or complexity, or support a speed comparison. Missing React owner/reader fields and the unexercised favicon interception remain unverified.
