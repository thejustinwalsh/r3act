# Darwin correctness gate v2

The integrated Radix Dialog repair passed the fresh consolidated native-host Darwin gate. The pinned Node command returned exit code 0. `darwin-v2/receipt.json` records 37/37 steps as PASS with exit code 0 and no errors. This result applies to the repaired source captured in the v2 pre-command archive. The earlier v1 correctness PASS remains tied to its own archived source; the v1 proof-build failure remains preserved in [its review](workload-proof-v1-review.md). Neither result was relabeled or replaced.

## Gate results

- Deno: 1,003 passed, 0 failed.
- Rust: 63 passed, 0 failed.
- Native tooling passed; artifact conformance passed all 24 checks.
- Compiled runtime fixtures passed 23/23. The React Island and Radix Dialog compiled-source AST proofs passed as separate steps.
- Three-host checks passed 7/7; both retention checks passed.
- Fresh five-package build and consumer verification passed all 10 checks. The consumer validated the installed core, Three, both React bridge directions, controlled Radix Dialog props, and installed Rust/OXC compiler behavior.

The recorded compiler remained the Darwin arm64 executable at target `aarch64-apple-darwin`, protocol 1, schema 1, version 0.1.0, SHA-256 `cee5598eaa612f76fe6b4717d3161333d30c5f4503430c3c448627e27b6d0fb0`. The packaged executable is 3,404,000 bytes with SHA-256 `a8241eeaadbefa7b2ec7d34a13a74788775d96ee7554e94d403e7b6cff1288e7`.

Fresh package artifacts:

| Package | Bytes | SHA-256 |
|---|---:|---|
| `@r3act/core` | 982,802 | `ad14f96a8a69e1ca5d2e6b0fee912dd3ab5bed960c8c0071b803c61ef4c2b099` |
| `@r3act/vite` | 1,215,403 | `b3e5abaceec1d070377154a366bb811eed99eec8ea4d7c9a575cb7d006be6a9b` |
| `@r3act/host-dom` | 1,252 | `cd9b9ca857b1ea8ba96a6dedd7c7a8a8f379a5dd5e83db19582d3d07b9ab3e34` |
| `@r3act/host-three` | 1,437 | `a25bf2dadeb96f88d51da7a31a396e1cb78e7d330045d3c644d1946cdcd1b7fd` |
| `@r3act/react-bridge` | 1,411 | `4f228cac55b141a2e3b1df6d20c1f38359ca93b769bf2f03f94c85cf577e0c4c` |

## Source and cache integrity

The runner archived the exact source inputs before any product command. The archive contains 874 runner inputs plus 8 context files (882 total), with no unavailable context. Its manifest SHA-256 is `e259e47a5741165040f0b19d2da6c92134a07987d39991c741f44acf2edfa9e5`. I independently checked each archived file against its manifest hash and byte count: zero mismatches. The source-before and source-after inventories each contain 874 inputs and are identical.

The package-build cache was captured before and after the run with 510 files in each inventory. 480 entries remained byte-identical; 30 generated package outputs and report metadata changed during the fresh build. The tracked `.cache` tree has no diff from HEAD; all preexisting cache evidence remains in place.

## Evidence index

- [Runner receipt](darwin-v2/receipt.json)
- [Raw-source archive manifest](darwin-v2/source-archive.json)
- [Source-before inventory](darwin-v2/source-before.json)
- [Source-after inventory](darwin-v2/source-after.json)
- [Raw step logs](darwin-v2/logs/)
- [Fresh package tarballs and consumer evidence](darwin-v2/)
- [Pinned runner environment and shim provenance](runner-env-v2/environment.json)
- [Exact pnpm shim bytes](runner-env-v2/pnpm)

This is correctness and package-consumption evidence for the repaired source. No proof build, browser run, or timing comparison was part of this gate.
