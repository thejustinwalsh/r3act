# Joint input transaction diagnostic

Status: **SOURCE PREPARED; NOT BUILT OR RUN.** Primary reviews this protocol and the consolidated correctness gate before Luna builds or collects one pair.

Both arms mount 64 keyed rows, a joint numeric output initially `1 + 2 = 3`, a local-state output initially `0`, and an initially pending health resource under Suspense with a visible `health waiting` fallback. Before timing, each arm clicks `row-0` once and waits for its own retained local state to show `data-local="1"`; this checks state preservation across the later move and is disclosed as untimed setup. The measured action changes position from 1 to 7, leaves camera at 2, changes the separate local output from 0 to 5, and moves `row-0` to the tail. Native makes those changes in one `NativeRootWorkQueue.enqueueTransaction({roots:[{root,cells,collections,stores}]})` cut. A World dirty observer is installed before timing; it captures the World cell handle from the timed setter call, and that lookup is included in the timed interval. React uses one `flushSync` containing a tiny external Store dispatch, a local setter and a keyed order setter. This is an explicitly batched React transaction, not an ordinary unbatched update.

Timing starts immediately before the first action and stops at the **first matching MutationObserver callback** after the joint prop is `9`, local prop is `5`, and the original `row-0` node is the final list child. The observer records `performance.now()` first; record inspection, computed visibility and layout reads occur only after the matching timestamp. Scheduling, queue work or `flushSync`, host mutations and observer delivery are included; the native interval may also include a conservative ordinary follow-up scheduled by the Store generation after the explicit queue cut. Paint is excluded. Mount, disposal and timer quantum are separate fields. Host identity for the joint output, local output and moved row must survive. All 64 row keys and the visible fallback are checked. Health resolves untimed afterward through normal scheduling, with no forced flush, and must reveal while those identities remain stable. Cleanup requires no DOM children or native Store readers and no React external Store listeners.

`build-gate.mjs` creates a new exclusive proof directory and hashes all runtime, compiler, package, script and benchmark sources and the exact native compiler binary before build. The actual captured Rust/OXC transform must contain the schema-2 closed Store host program with two ordered direct `useAt` inputs and matching semantic revision, a World state layout plus closed numeric input sink, and keyed collection lowering. The authored Native source must use one `enqueueTransaction`; the React arm must read the two direct external Stores, and its actual transform must contain React Compiler runtime and cache output. Failed proof does not authorize timing. The gate rehashes every input after build and records output asset hashes.

Primary reviews `build-proof.json`, then writes `run-authorization.json` with `{"status":"APPROVED_FOR_ONE_DESCRIPTIVE_PAIR","buildProofSha256":"<sha256 of build-proof.json>"}`. Luna alone runs one bounded pair, after release:

```sh
NODE=/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node
PROOF="$PWD/implementation/2026-10-18-joint-inputs/benchmark/proof-v1"
"$NODE" implementation/2026-10-18-joint-inputs/benchmark/build-gate.mjs --proof-dir "$PROOF"
# Primary reviews build-proof.json and writes its hash-bound run-authorization.json.
"$NODE" implementation/2026-10-18-joint-inputs/benchmark/run-pair.mjs --proof-dir "$PROOF" --origin https://joint-input-proof.localhost
```

The pair runs headless Chromium with GPU disabled and a hard interruptible 90-second deadline. It replays only hash-locked production assets at a synthetic HTTPS `.localhost` origin; all other requests fail. There is no server, proxy, external request, warmup, retry or second timing attempt. The one-shot receipt remains `INCOMPLETE` on failure. The interval is descriptive, not a CPU, paint, input-to-presentation or general performance claim.
