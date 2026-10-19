# Selected resource transaction diagnostic

The two arms mount two selected Suspense boundaries A/B, an independent health boundary, and an urgent Store reader. All three promises are created before mount. A settles first and must remain fallback while B waits; the urgent Store and health boundary update during that wait. Final B settlement must reveal A/B coherently. Native uses `enqueueResources` on the public root and compiler-proven host readers; React uses a shared `Promise.all` over the same two prestarted promises. The observer interval is final B settlement to the first matching A=10/B=5 MutationObserver callback. It includes scheduling and observer delivery before paint, not paint or CPU. Mount, fallback lifetimes, urgent/health update and disposal are observed separately. The comparison does not claim arbitrary DOM visual atomicity.

After source review and the consolidated correctness gate, the primary chooses the next absent `proof-vN` directory and requests **one** proof build:

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node implementation/2026-10-19-resource-transactions/workload/build-gate.mjs --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-19-resource-transactions/workload/proof-v1
```

The build freezes source and the explicit debug compiler binary, captures Native/React transforms, requires closed Native A/B/C and urgent programs and React Compiler memo calls in the actual A/B components, then hashes the production assets. A `BUILD_CAPTURED_PENDING_PRIMARY_REVIEW` proof needs primary review of the source, transforms and manifest. If accepted, the primary writes `run-authorization.json` to that proof directory with `status: "APPROVED_FOR_ONE_DESCRIPTIVE_PAIR"` and `buildProofSha256` equal to the exact build-proof file hash. The runner binds the authorization and source lock, refuses a second attempt, records failures, and rehashes every source/compiler/asset before and after:

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node implementation/2026-10-19-resource-transactions/workload/run-pair.mjs --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-19-resource-transactions/workload/proof-v1 --origin https://resource-transaction.localhost
```

The runner uses fixed Native-first order, fresh contexts, headless GPU-disabled Playwright, exact offline asset replay on synthetic HTTPS, and a 90-second deadline. It launches no project server and does not steal focus. The resulting pair is one bounded descriptive observation, not cold, CPU, presentation, tail, retained-memory or independent-device qualification. Combined bytes describe the shared artifact, not per-arm equivalent-feature size.
