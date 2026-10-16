# Production DOM correctness pilot plan

Status: proposed, not preregistered or run. Build 03 is production-build/compiler evidence only; no server, browser, or workload run has occurred.

## Build provenance

The preserved build 01 failed React Compiler eligibility because both row effects directly mutated the shared session props (`.cache/high-frequency-build-proof-20261013-01/react-compiler-diagnostics-v2.json`, `Immutability` diagnostics). The repair moved setter-map and mount/cleanup counter mutations behind the same factory-owned callback surface in both arms. State hooks, row output, dirty selection, and the timed loop were left unchanged. This is a compiler-fixture repair, not a runtime optimization or performance result; build 02 remains preserved as the pre-kernel build.

## Frozen six-page matrix

Run one fresh page context per case, serially, with no mode changes after page load:

| Sequence | Arm | Rows | Dirty selection | Placement | Program mix |
|---|---|---:|---|---|---|
| 1 | React | 128 | all rows | contiguous | homogeneous |
| 2 | Native | 128 | all rows | contiguous | homogeneous |
| 3 | Native | 1,024 | all rows | contiguous | homogeneous |
| 4 | React | 1,024 | all rows | contiguous | homogeneous |
| 5 | React | 10,000 | all rows | contiguous | homogeneous |
| 6 | Native | 10,000 | all rows | contiguous | homogeneous |

These are correctness and lifecycle checks only. The harness's commit/RAF timings are kept verbatim in each raw `window.__highFrequencyResult` record for traceability, but the collector must not compute or report arm ratios, speed ranks, medians, p95s, or a performance gate. This matrix does not qualify any workload outside these six page configurations.

## Per-page acceptance

Use the staged harness's existing checks without injecting app code: result `status === PASS`; all `checks` true; `errors` empty; `rows` and `programs` match the scheduled case; production flag true; 60 warmup records and exactly 240 measured records; active diagnostics show `mounts === rows`, `cleanups === 0`, `writers === rows`; disposed diagnostics show `mounts === rows`, `cleanups === rows`, `writers === 0`; host rows are absent after dispose; stale-setter probe does not restore rows or register writers; page remained visible. The harness already checks row count, unique IDs, order, node identity, values for all three props, and active lifecycle every frame. Preserve the complete raw result for each page, including failures; never retry a failed case under the same record.

Use a headed browser, 1200x900 viewport, GPU enabled as an ordinary DOM workload, serial fresh contexts, and record browser version/UA, visibility, start/end, loaded production resource URLs and hashes. The collector may navigate and wait for the harness result, then read the published result object. It must not call `mount`, `step`, setters, component helpers, or mutate DOM/page state itself.

## Production build binding

Serve only the build 03 output, then verify the loaded app reports `production: true` and loaded response bytes match these build files before accepting results:

- `.cache/high-frequency-build-proof-20261013-03/dist/high-frequency.html` — `f481926e51897eb85e30d0353d33c695dca599f83722c9c66d01977297c4f944`
- `assets/highFrequency-Dk3MpsD8.js` — `664210da6a73f7acc266f4f36fe04186c4ee1c5c7e65cb42798bee5f78fb52e7`
- `assets/native_high_frequency_arm-CoEbLbje.js` — `aa84bd264ffdebf8e259f525608fab936a85f001e88c62d5e62f1bf65b4879a3`
- `assets/react_high_frequency_arm-Cio8XO_I.js` — `5f6b1c07d3db89ab96ad86662db07c4172575e47dcc28b5fd6e49b3b605f212a`
- `assets/highFrequency-GrFjeJ6A.css` — `6e8c589e7715cc058dceb37820c50bda5e4ec1529cf5b3029d83e6d4797c30e4`

The build proof is `build-proof.json` (`8abcbdf4034c5e71c97cf0e61dbc275c2555a9561c2e4ffb2470d0c37867d305`). It records native row registration/layout IDs, both owner-update kernel table links and six-argument schema-2 programs, React row compiler events/caches, and the Rust source lock `compiler/oxc-spike/src/owner_update_program.rs` (`fad744b9f877b3b16522ad4be6a9df10b4fdcc245aef046ee739913b1df529a6`).

## Serving and scope boundary

If the primary approves the pilot, use the existing shared Portless HTTPS proxy on its stable 1355 route (proposed alias `https://current-product-high-frequency.localhost:1355`). Launch the static production preview through Portless so Portless supplies the app port and host; do not set a fixed Vite port or access a numbered HTTP origin directly. Do not add Portless to package scripts or dependencies. No server has been launched for this plan.

## Open review item

Confirm the proposed Portless alias and preview command/config against the existing shared proxy before starting anything. Do not extend the matrix, add timing-based acceptance, or change harness behavior under this pilot plan.
