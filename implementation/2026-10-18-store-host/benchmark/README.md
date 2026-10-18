# Closed Store host diagnostic

Status: **SOURCE PREPARED; NOT BUILT OR RUN.** This is one bounded, descriptive pair for ordinary closed Store host-leaf publication beside an unrelated pending Suspense branch. Primary source review and consolidated correctness gates precede any build or collection.

Both arms mount an initially pending health resource under Suspense, displaying the same visible `health waiting` fallback. Two independent keyed host leaves display `data-x="1"` and `data-double="2"`. Native leaves each use the same direct canonical numeric `createStore(1)` through `use(props.position)` and compiler-owned closed Store host metadata; React leaves use `useSyncExternalStore` against one tiny external Store with the same initial value and synchronous notification. Neither arm uses an explicit preparation API or a forced root render for the measured action. After two frames of initial readiness, one Store dispatch changes position from 1 to 7.

Timing starts immediately before that dispatch and stops at the **first matching MutationObserver callback** after both leaves display `data-x="7"` and `data-double="14"`. The single timed observer records `performance.now()` first; mutation-record inspection and all computed-visibility or collector layout reads occur after the matching timestamp. The interval includes scheduling and observer delivery and ends before paint. The page checks that the initial health fallback stays connected and visible, the two output host identities stay stable, and the health primary does not reveal during the interval. Health settles **outside** timing; both arms must then reveal `health ready`, keep the Store hosts, and dispose with no children or Store listeners/readers. Mount, disposal, and the observed timer quantum are reported separately. The output digest contains only matched health-fallback text and the two Store props. No warmup, retry, filtering, physical input, CPU, paint, tail, network, or general UX claim is made.

`build-gate.mjs` creates a new exclusive proof directory, freezes benchmark and repository runtime/compiler/tooling sources plus the exact native compiler binary, then uses the repository Rust/OXC native plugin and installed React Compiler Vite plugin. Its AST proof requires two actual `defineComponent` registrations with `closedStoreHostProgram` schema 1, stable `useAt` sites with direct `props.position` input, the same revision as the registered semantic plan and its invalidation call, and the expected closed identity and multiply-by-two numeric prop expressions. It checks the authored React external Store reads and outputs plus actual React Compiler runtime/memo output. Debug JSON and source comments are not compilation proof. The gate hashes produced assets and rechecks every source input after building. If any assertion fails, the build proof is incomplete and no pair is authorized.

The primary reviews `build-proof.json`, then writes `run-authorization.json` containing `{"status":"APPROVED_FOR_ONE_DESCRIPTIVE_PAIR","buildProofSha256":"<sha256 of build-proof.json>"}`. Only Luna runs the commands below, after release. A unique proof path is required; a failed or incomplete attempt remains immutable.

```sh
NODE=/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node
PROOF="$PWD/implementation/2026-10-18-store-host/benchmark/proof-v1"
"$NODE" implementation/2026-10-18-store-host/benchmark/build-gate.mjs --proof-dir "$PROOF"
# Primary reviews build-proof.json and writes the hash-bound run-authorization.json.
"$NODE" implementation/2026-10-18-store-host/benchmark/run-pair.mjs --proof-dir "$PROOF" --origin https://store-host-proof.localhost
```

The runner uses headless Chromium with GPU disabled, a 1200×900 viewport, and a hard interruptible 90-second deadline. It replays only source-locked production assets at the synthetic HTTPS `.localhost` origin; all other requests are aborted and fail the pair. There is no project server, proxy, external request, trust change, warmup, or second timing attempt. The runner writes an incomplete receipt on error and refuses to overwrite a prior one-shot receipt.
