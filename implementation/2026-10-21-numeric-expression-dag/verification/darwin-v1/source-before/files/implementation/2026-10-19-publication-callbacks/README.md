# Grouped publication callback verification

This unit combines the new actual-compiled two-root Proxy regression with one reused, matched execution comparison. The regression is `compiler/compiled_publication_callbacks_execution_test.mjs`; the platform gate runs it after building the exact Rust compiler and passes its captured SHA-256 as `R3ACT_CAPTURED_COMPILER_SHA256`. It exercises the callback-bearing acceptance path identified in the [19 October source audit](../2026-10-19-first-pass-audit/semantic-source.md). Its source and executable result must be reviewed with the runtime change before calling the semantic repair complete.

After primary review, Luna runs the baseline diagnostic once, before the corrected-source gate:

```sh
node implementation/2026-10-19-publication-callbacks/run-baseline.mjs
```

The runner creates an exclusive `evidence-baseline-v1` directory. It archives only tracked `src` and `compiler` from `7d4a66169efabe56581ab91490eba7afb0bcd6e4` (486 files, about 5.2 MB), then stages the current diagnostic fixture and exact debug compiler. It checks that the baseline Rust compiler source equals the current Rust source byte for byte and gives the staged fixture the captured compiler SHA-256. The snapshot links to the current installed `node_modules`; this proves the historical runtime failure with a shared dependency tree, not a historical dependency installation. The fixture runs once with `--expect-baseline-bug` under a 90-second deadline. The tar, source hashes, compiler/fixture hashes, command logs, fixture artifacts and PASS/FAIL receipt remain in that directory. If it fails, preserve the directory and report the failure without a favorable retry. This is a correctness observation, not a timing comparison.

The bounded comparison adapts the [forked-transition workload](../2026-10-19-forked-transitions/README.md), whose accepted C resource settlement publishes to shared DOM and Three roots. It is sensitive to the grouped publication path and has a React 19 arm with matching preloaded A/B/C provider identities. The adapted workload still imports the actual authored `examples/forked-transitions` components and native controller; `build.mjs` captures their Rust/OXC output, exact compiler binary, React Compiler `CompileSuccess` events and `_c` calls, all selected source files, transforms and production assets. No historical proof artifact is edited or treated as evidence for the new source.

After primary review of the integrated slice, Luna runs one consolidated platform gate, then one fresh proof directory, for example `implementation/2026-10-19-publication-callbacks/proof-v1`. Use Node 24.18.0, Deno 2.9.7 with `--frozen` in the gate, Rust 1.97.1, `CARGO_HOME=.cache/cargo`, and `CARGO_BUILD_JOBS=1`. The absolute output directory for the platform gate must be new. The proof commands are:

```sh
node implementation/2026-10-19-publication-callbacks/build.mjs --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-19-publication-callbacks/proof-v1
node implementation/2026-10-19-publication-callbacks/verify-browser.mjs --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-19-publication-callbacks/proof-v1 --phase behavior
```

The untimed browser must pass exact output, identity, ownership, cancellation, teardown, and all source/artifact checks. Primary review then writes `run-authorization.json` in that proof directory with `status: "APPROVED_FOR_ONE_DESCRIPTIVE_PAIR"`, `buildProofSha256` equal to the hash of `build-proof.json`, and `behaviorReceiptSha256` equal to the hash of `browser-behavior.json`. Only then run:

```sh
node implementation/2026-10-19-publication-callbacks/run-pair.mjs --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-19-publication-callbacks/proof-v1
```

The browser uses an offline exact-asset synthetic HTTPS origin, with no server, network route, focus change or VM. It is headless, GPU-disabled, interruptible and bounded to 90 seconds. The sole Native-first measured interval is C provider resolution to the first matching MutationObserver showing complete C output in both DOM roots and Three's accepted scene state. Scheduling and observer delivery are included; paint is excluded. A failed or interrupted attempt keeps its receipt and is never repeated for a favorable timing. The pair supplies a bounded descriptive comparison, not runtime CPU, median/p95, cold setup, retained memory, presentation or independent-device qualification.
