# Host reveal slice: consolidated gates and one descriptive pair

The final integrated source passed the frozen Deno suite (820 passed, 0 failed), native tooling, seven compiled execution fixtures, the seven-case Node Three conformance suite, Rust (43 tests) and package build plus fresh installed consumer. Rust test/build evidence is reused from v1 because the Rust source and debug compiler binary hashes are unchanged. The compiled reveal fixture initially failed only its final identity assertion because logical VNode keys are not host props. The fixture was corrected to retain the actual B `MemoryNode` and compare object identity through A's later retry; the reviewed single rerun passed. The original v4 failure remains archived.

The package builder completed with tool exit code 0. The fresh installed-consumer receipt reports `PASS` for all six checks. The shell wrapper itself returned 1 after the gate because it tried to assign zsh's read-only `status` variable while recording the exit code. The raw consumer output and its own receipt are preserved. The package build tool returned a truncated console stream that was not tee-captured; this evidence gap is recorded in `package-build-v4.log`. All 416 generated build files and tarballs are preserved in `packaging-v3/`, with hashes in `packaging-v3-manifest.json`.

The one hash-authorized offline browser pair passed both arms. The Native arm's manually settled direct `AsyncResource` revealed B while retaining A in 1.900 ms from settlement to the first matching `MutationObserver` callback; React's equivalent Promise reveal took 256.600 ms. The single observed difference was -254.700 ms (Native minus React). Each arm's timer resolution was 0.100 ms. These are one-shot descriptive observations that include observer delivery and stop before paint; they are not latency qualification, network-DAG evidence, or a causal claim. The page also recorded 3.300/3.700 ms initial mount and 0.500/0.100 ms disposal for Native/React. Both arms ended with identical text and output hashes, retained A's actual host identity, inserted no A fallback, and disposed to zero children; Native additionally reported zero owners and pending changes. There were no blocked or failed requests, page errors, console errors, or run deadline stop.

The proof locked 699 source inputs plus the compiler and transformed/assets. The collector checked 705 source/compiler/transform/asset entries both before and after the pair with zero hash mismatches. It used Node 24.18.0 and headless Chromium 153.0.8010.12 at 1200×900 with GPU disabled. The page served the same exact-manifest production assets offline in both arms. The production JavaScript was 445,790 bytes; all listed assets totaled 2,589,082 bytes including the source map and HTML. No project server, Portless proxy, network connection, or TLS trust change was used. The pair remains limited to the supported accepted-fallback/direct-AsyncResource subset; it does not measure paint, user latency, network behavior, cold or retained memory, second-device performance, or broader async UX.

## Evidence

- `source-lock-v4.json`: frozen integrated runtime/compiler/tests/package inputs used by the consolidated gates.
- `source-lock-v5.json`: fixture-only reveal identity correction; all other gate inputs reused from v4.
- `deno-full-v4.log` and `deno-full-v4.exit.json`: 820 passed, 0 failed.
- `native-tooling-v4.log` and `native-tooling-v4.exit.json`: passed.
- `three-host-node-v4.log` and `three-host-node-v4.exit.json`: 7 passed.
- `compiled-fixture-1-v4.*`: original assertion failure; `compiled-fixture-reveal-v5.*`: reviewed correction passed.
- `compiled-fixture-2-v4.*` through `compiled-fixture-7-v4.*`: six remaining compiled fixtures passed.
- `cargo-test-v1.*`, `cargo-build-v1.*`: 43 Rust tests passed and the debug compiler built; reused after source/binary hash audit.
- `package-build-v4.exit.json`, `packaging-v3-manifest.json`, `consumer-verification-v4.json`, `package-consumer-v4.log`, and `package-consumer-v4.exit.json`: package build and consumer evidence, including the wrapper exit discrepancy and console-capture limitation.
- `benchmark/proof-v1/build-proof.json`, `benchmark/proof-v1/run-authorization.json`, and `benchmark/proof-v1/pair-one-shot.json`: hash-reviewed proof, authorization, and the single pair result.
- `benchmark-build-v1.log` and `benchmark-pair-v1.log`: command outputs and exits.
