# One descriptive structural pair

Status: **ONE DESCRIPTIVE PAIR COMPLETED.** The original build gate’s transform assertion failure and the separate primary review are both preserved; no source or assets were rebuilt for the pair. The planned observation is one matched Native/React page pair at 1,024 keyed rows. It covers moving `row-0` to the tail and removing `row-512`; removal reinsertion is an untimed reset. The arms check local state, keyed node identity, effect mount/cleanup counts, final output equality, and disposal. Native move/remove calls use `createKeyedCollection.apply` followed by the public `root.prepareCollections([rows])` candidate lifecycle (`validate`, host commit, post-host validation, publication preparation, publish, subscriptions, effects). Timed Native work does not use `root.flush()` or `profileCounter`. The insertion reset uses ordinary `root.flush()` outside timing. React uses React Compiler-authored rows and precomputed array replacements through `flushSync`; that API difference is reported.

Each arm receives a fresh headless Chromium context, Native then React. Each operation has two warmups and eight measured trials. Model setup, identity/lifecycle assertions, reset, output digests, and timer-resolution sampling are outside the update timer; native apply and the full scoped candidate lifecycle are inside. The page also records initial mount and final dispose durations separately, plus bundle byte totals from the frozen build proof. It retains every sample, including pauses or GC; it does not trim or retry. The recorded `p95` is the maximum of eight within-page observations and is descriptive only. If either median is at or below twice its arm’s smallest observed positive `performance.now()` step, ratios are marked unresolved. GPU is disabled, viewport 1200×900, and one interruptible 90-second deadline covers both arms. The browser stays headless and does not take focus.

Assets are replayed offline through Playwright `BrowserContext.route`: only exact paths and bytes in the source-locked build manifest can be fulfilled, from the local frozen `dist` files. Other origins and paths abort and fail the pair. The unique HTTPS `.localhost` address is synthetic; the browser makes no TLS or network connection. This provides secure-context semantics for real DOM execution but is not live-Portless, transport, network, visual, or paint evidence. No project server or shared route is started.

This is a descriptive pair, not a qualification. It does not establish locality, tail latency, speedup, the full master-plan budget, heap/GC behavior, cold-mount repetition, or a second-device result. It omits 128/10,000 rows, additional operations, generic-oracle timing, and count instrumentation.

## Review and run sequence

Primary reviews the exact harness and source proof before any build. At the released boundary:

1. Run the consolidated correctness gates in `../verification/preparation.md`, preserving all receipts.
2. If the slice changed the Rust compiler, build its executable once with `/Users/mini/.cargo/bin/cargo build --locked --manifest-path compiler/oxc-spike/Cargo.toml --bin ui-graph-compiler-spike`. The build gate locks and rechecks the executable SHA-256.
3. Build once into a unique, nonexistent proof directory:

   ```sh
   /Users/mini/.local/share/mise/installs/node/24.18.0/bin/node implementation/2026-10-17-scoped-structure/benchmark/build-gate.mjs --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-17-scoped-structure/benchmark/proof-v1
   ```

   The build gate locks the finite source inventory across `src/`, `compiler/`, compiler Cargo manifests, package/tool configuration, the authored fixture and itself, plus the exact compiler binary. It preserves Vite stdout/stderr and transformed native/React modules. Proof assertions require native component, keyed collection, owner-state layout/revision/program lowering and React Compiler runtime/memo-cache output. It hashes all produced assets. `BUILD_CAPTURED_PENDING_PRIMARY_REVIEW` is not authorization to collect.
4. Primary inspects the transformed modules and proof, then writes `run-authorization.json` binding the exact build-proof SHA-256 with status `APPROVED_FOR_ONE_DESCRIPTIVE_PAIR`.
5. Run the collector once, with a new synthetic origin name and the same approved proof directory:

   ```sh
   /Users/mini/.local/share/mise/installs/node/24.18.0/bin/node implementation/2026-10-17-scoped-structure/benchmark/run-pair.mjs --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-17-scoped-structure/benchmark/proof-v1 --origin https://r3act-structure-20261017.localhost
   ```

   The collector requires the primary authorization, refuses existing output or source/compiler/asset drift, intercepts every browser request, and writes `pair-one-shot.json`. One attempt consumes the proof directory; retain and report its exact result, including an incomplete failure. No Portless CLI, server, certificate, TLS exception, or network access is part of this replay.

The task-owned Portless preflight receipts are historical setup only. Its unsafe `trust --help` attempt and cleanup are recorded separately; the current proposed pair does not use Portless or touch trust state.


## Observed pair

The one-shot collector passed with no blocked requests, no page or console errors, and all before/after source hashes matching. Browser: Chromium 153.0.8010.12, headless with GPU disabled. Both arms rendered 1,024 rows and ended with zero remaining DOM children; Native accepted 20 scoped candidates and disposed to zero owners/readers. Output digests matched. The transport was offline production-asset replay at `https://r3act-structure-20261017.localhost`, not a Portless server or live network request.

The timer step was 0.1 ms in each arm. Update medians were 0.05 ms Native vs 0.40 ms React for move and 0.10 ms vs 0.30 ms for removal; all measured ratios are intentionally null because medians were within twice the timer step. The recorded maxima (the within-page p95 for eight samples) were 0.10/0.70 ms for move and 0.20/0.80 ms for removal. Every sample, including zeros and pauses, remains in the receipt. Initial mount was 22.9 ms Native and 12.1 ms React; disposal was 1.6 ms and 0.7 ms, respectively. These single-page values are descriptive, not comparative qualification.

The production JS asset was 440,194 bytes; its source map was 2,113,842 bytes, and all proof assets totaled 2,554,243 bytes. The original proof’s overstrict `nativeOwnerStateProgram` assertion failure is documented in `../verification/gate-results-final.md`; primary reviewed the actual hook, owner, revision, collection registration and React memo transforms and authorized the existing assets without rebuilding or claiming a numeric owner program. Primary’s `reviewed-proof-v1/primary-result-review.json` independently verified the final pair, all 409 live source inputs, binary and assets, with no drift or errors. One pair does not establish latency tails, speedup, locality, heap/GC behavior, cold-mount repetition, or a second-device result.
