# Independent reveal workset: v1 consolidated correctness receipt

The primary-released v1 source snapshot is frozen in `source-lock-v1.json` (708 files plus the compiler binary hash). Its post-gate audit has zero mismatches. The exact failing Root and boundary test sources are archived under `attempts/v1/` and match the lock.

The full frozen Deno gate failed three boundary workset assertions: **827 passed, 3 failed**. The preserved actual values show partial progress and separate contract mismatches:

- `host-time state action keeps the next ready boundary and exact dirty work`: actual view `old-aready-bready-c0`, expected `old-aready-bc-loading0`.
- `opaque ready target stays pending while a closed sibling reveals`: `bRenders` was 3 while the assertion expected the previous value 2.
- `disposal during the first receipt stops the remaining ready target`: the assertion expected `Root disposal was requested`, but the thrown error was `Native root candidate was cancelled during host commit`.

All other released correctness checks passed: native tooling; seven Three host cases; eight actual compiled fixtures including the shared-resource two-root workset fixture; and the notebook integrity check. The notebook audit found 190 baseline cells and 191 current cells, with baseline cells, outputs, cell metadata and notebook metadata unchanged and exactly one appended Markdown cell. The 43-test Rust result and debug compiler were reused after all five Rust source/manifest/lock files matched baseline `ffd0af9` and the binary SHA matched the previous reviewed compiler proof.

The required fresh package build completed with exit 0. Its 416 artifacts are archived in `packaging-v1/` with a complete hash manifest. The fresh installed consumer completed with exit 0 and passed all six checks; its receipt is preserved in `consumer-verification-v1.json`. Before building, all 416 historical package artifacts matched the prior archived manifest; the only additional live cache file was the prior consumer receipt, preserved separately.

No performance proof build or browser pair ran. The Deno failures remain pending primary review; no repair or retry was performed by verification.

## Evidence files

- `deno-full-v1.log`, `deno-full-v1.exit.json`
- `native-tooling-v1.log`, `native-tooling-v1.exit.json`
- `three-host-node-v1.log`, `three-host-node-v1.exit.json`
- `compiled-fixture-1-v1.log` through `compiled-fixture-8-v1.log` and matching exits
- `compiled-fixture-output-v1/manifest.json` (24 generated files)
- `notebook-audit-v1.log`, `notebook-audit-v1.exit.json`
- `rust-reuse-v1.json`
- `package-cache-preservation-v1.json`, `package-build-v1.log`, `package-build-v1.exit.json`
- `packaging-v1-manifest.json`, `consumer-verification-v1.json`, `package-consumer-v1.log`, `package-consumer-v1.exit.json`
- `source-lock-v1.json`, `source-lock-audit-v1.json`, `attempts/v1/source-archive.json`
