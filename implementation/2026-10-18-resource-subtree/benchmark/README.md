# Compiled resource subtree diagnostic

Status: **SOURCE PREPARED; NOT BUILT OR RUN.** Primary reviews the integrated source and consolidated correctness gate before authorizing one build and one matched browser pair.

Both arms mount A as a revealed `A ready` primary, B as a visible `B waiting` fallback, and an independent local-state row. Before timing, the row receives one click and each arm waits for `data-local="1"`. A then selects a pending resource; its accepted DOM host and text must remain. Native B receives a canonical `AsyncResource<number>` and has compiler-emitted schema-2 closed host data. React B reads the matching Promise. B's ready output is a keyed `div` containing adjacent keyed `span` and `output` children. The numeric value 7 appears in both text nodes, and the output has `data-count="8"`. Both fallback components carry a local state slot and activation effect. Native uses `useEffect` and React uses `useLayoutEffect`, their nearest mount/unmount counterparts; each effect must mount once and clean up once at B reveal, with no second cleanup at teardown.

Timing starts immediately before B's controlled resource resolution and stops at the **first matching MutationObserver callback** with both nested children, texts and the count prop. The observer records `performance.now()` before inspecting mutation records or performing any style/layout reads. Scheduling and observer delivery are included; network, paint and input are excluded. A's accepted host must stay connected and visible without fallback insertion, B's fallback must be removed, and the clicked row's host/state must remain. A settles outside timing; its later reveal must not replace B's ready subtree. Mount, disposal and timer quantum are reported separately. Both arms must produce identical defined output, account for fallback effect lifetime and remove all DOM on teardown; Native must also release owners and Store readers/listeners.

`build-gate.mjs` freezes and hashes runtime, compiler, package, script and benchmark sources plus the exact Rust/OXC compiler binary before build. Its AST proof checks the actual compiled B registration, schema-2 recursive resource host tree, ordered children, finite input expressions, resource use site and semantic revision; the fallback component registration, scoped lowered state/effect hook sites and Suspense site are also required. The unused fallback state is not a numeric prop layout. React must show actual React Compiler runtime/cache output and the authored direct resource use. All source and binary hashes are checked again after build. A missing proof rejects the pair; no shape or comment is accepted as purity evidence.

Primary reviews `build-proof.json`, then writes `run-authorization.json` with `{"status":"APPROVED_FOR_ONE_DESCRIPTIVE_PAIR","buildProofSha256":"<sha256 of build-proof.json>"}`. Luna alone runs the released commands with a new exclusive proof directory:

```sh
NODE=/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node
PROOF="$PWD/implementation/2026-10-18-resource-subtree/benchmark/proof-v1"
"$NODE" implementation/2026-10-18-resource-subtree/benchmark/build-gate.mjs --proof-dir "$PROOF"
# Primary reviews build-proof.json and writes its hash-bound run-authorization.json.
"$NODE" implementation/2026-10-18-resource-subtree/benchmark/run-pair.mjs --proof-dir "$PROOF" --origin https://resource-subtree-proof.localhost
```

The runner uses headless Chromium with GPU disabled, a 1200×900 viewport and a hard interruptible 90-second deadline. It replays only source-locked production assets at a synthetic HTTPS `.localhost` origin and blocks everything else. No server, network request, warmup, retry, sample filtering or second attempt is included. It preserves an `INCOMPLETE` one-shot receipt on failure. The pair is descriptive settlement-to-prepaint-observation evidence, not an async UX, CPU, tail, network or broad performance qualification.
