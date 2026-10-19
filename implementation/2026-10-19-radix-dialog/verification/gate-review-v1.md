# Darwin correctness gate v1

The frozen Radix Dialog slice passed the consolidated native-host Darwin gate. The runner returned exit code 0; `receipt.json` records `PASS`, 37/37 steps passed, and no errors. The run used Node 24.18.0, Darwin arm64, Rust/Cargo 1.97.1, pnpm 11.25.0, Deno 2.9.7, one Cargo build job, `CI=true`, and source commit `590376c1e696df5bef01426c26ecbb457f02b262`.

## Gate results

- Deno: 1,003 passed, 0 failed.
- Rust: 63 passed, 0 failed.
- Native tooling: passed; artifact conformance: 24 checks passed.
- Compiled runtime fixtures: 23/23 passed. The React Island and Radix Dialog compiled-source AST proofs also passed as separate steps.
- Three-host checks: 7 passed; both retention checks passed.
- Fresh five-package build and consumer verification passed, with 10 consumer checks. The fresh consumer validated core imports without React, default bridge behavior without Radix, both React bridge type directions, controlled Radix Dialog props, and the installed OXC compiler.

The compiler identity remained stable across the compiled fixture and AST-proof steps: `cee5598eaa612f76fe6b4717d3161333d30c5f4503430c3c448627e27b6d0fb0`, target `aarch64-apple-darwin`, protocol 1, schema 1, compiler version 0.1.0.

Fresh package artifacts recorded by the runner:

| Package | Bytes | SHA-256 |
|---|---:|---|
| `@r3act/core` | 982,366 | `1cbd375416c43c93f59d621577f55aeaed025da39b2f06d95a5c628fa6bb2138` |
| `@r3act/vite` | 1,215,403 | `b3e5abaceec1d070377154a366bb811eed99eec8ea4d7c9a575cb7d006be6a9b` |
| `@r3act/host-dom` | 1,252 | `cd9b9ca857b1ea8ba96a6dedd7c7a8a8f379a5dd5e83db19582d3d07b9ab3e34` |
| `@r3act/host-three` | 1,437 | `a25bf2dadeb96f88d51da7a31a396e1cb78e7d330045d3c644d1946cdcd1b7fd` |
| `@r3act/react-bridge` | 1,411 | `4f228cac55b141a2e3b1df6d20c1f38359ca93b769bf2f03f94c85cf577e0c4c` |

The packaged compiler binary was Darwin arm64 (`aarch64-apple-darwin`), 3,404,000 bytes, SHA-256 `a8241eeaadbefa7b2ec7d34a13a74788775d96ee7554e94d403e7b6cff1288e7`.

## Source and cache integrity

The runner archived 874 exact runner inputs and 8 context inputs (882 files total) before product commands. `source-archive.json` has SHA-256 `c40d9b2dc39043a9b90de7fc5e061b9a0a36ddd1c0cc024a6ad3a251332bc6b8`; all 882 archived byte streams matched their recorded hashes and sizes. The before/after source audit reports `MATCH`, with no changed paths among the 874 runner inputs.

The existing package-build cache was retained. Its before/after inventories contain 498 and 510 files; 492 files remained byte-identical, while six package outputs/metadata changed as expected during the fresh build. The tracked `.cache` tree contains 19,940 files and has no diff from HEAD. The 176-file legacy native-package-build subtree is also unchanged. No legacy cache rebuild was run.

## Evidence index

- [Runner receipt](darwin-v1/receipt.json)
- [Source archive manifest](darwin-v1/source-archive.json)
- [Source-before inventory](darwin-v1/source-before.json)
- [Source-after audit](darwin-v1/source-after.json)
- [Raw step logs](darwin-v1/logs/)
- [Runner environment and shim provenance](runner-env/environment.json)
- [Runner shim bytes](runner-env/pnpm)
- [Fresh package and consumer evidence](darwin-v1/)

The gate establishes correctness for this bounded native-host run. It does not measure browser behavior or performance.
