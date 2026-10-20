# Reentrant keyed replacement installed proof

The replaced mechanism is the transition queue's prior-key cancellation path that could resume a replacement after a settlement callback registered a newer operation under the same key. The queue's key owner and operation generation remain the invariant authority. A newly enqueued C must win when A's cancellation callback runs during B's replacement; B must resolve cancelled without starting its provider. Stale A/B settlements cannot publish over C. An independent urgent operation must progress while C waits. All roots retain the old accepted view until C publishes; teardown must leave no owners or Three resources.

The installed consumer imports the public five-package Native API and renders ordinary compiler-transformed TSX into DOM, Three and a fork over one World and Store. The React comparison uses equal deferred providers and an explicit deterministic current-operation policy. React Compiler must report success for Hot, Result and App and emit Hot's memo cache. This is a semantic comparison: no runtime latency interval is recorded. The offline HTTPS browser uses exact archived assets, headless GPU-off execution, two stale settlement orders, a 90-second deadline and no server.

The current verification source selector, package report, five platform-matched tarballs, installed graph, compiler binary, transforms and assets are copied and rehashed before and after. Historic Darwin artifacts are excluded. A failed or interrupted proof retains its logs and receipt. Run only after the primary releases the integrated slice:

```sh
node implementation/2026-10-19-reentrant-replacement/prepare.mjs --proof-dir implementation/2026-10-19-reentrant-replacement/proof-v1
node implementation/2026-10-19-reentrant-replacement/run-build-pair.mjs --proof-dir implementation/2026-10-19-reentrant-replacement/proof-v1 --phase proof
node implementation/2026-10-19-reentrant-replacement/verify-browser.mjs --proof-dir implementation/2026-10-19-reentrant-replacement/proof-v1
```

The primary reviews `build-proof.json`, `input-lock.json`, `pair-proof.json` and `browser-untimed.json` and writes `run-authorization.json` with `status: "APPROVED_FOR_ONE_BUILD_PAIR"` and their SHA-256 values under `buildProofSha256`, `inputLockSha256`, `pairProofSha256` and `browserUntimedSha256`. That receipt permits exactly one Native-first fresh-process Vite build comparison:

```sh
node implementation/2026-10-19-reentrant-replacement/run-build-pair.mjs --proof-dir implementation/2026-10-19-reentrant-replacement/proof-v1 --phase measure
```

The build pair reports only build time for this installed graph. It cannot establish runtime speed, tail, memory, other-platform or independent-device performance.
