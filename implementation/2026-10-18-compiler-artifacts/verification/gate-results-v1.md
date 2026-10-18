# Compiler-artifacts correctness gate v1

The released correctness gate completed with one failure in the new native compiler-artifact lifecycle fixture. The preserved source and log are in [attempts/v1](attempts/v1/); the fixture exited 1 while reading the absent `.cache/compiler-artifact-conformance-187e7bdf-c75c-4071-b814-cd91d3bafbc7/info-started` marker at line 157. No source was changed or rerun.

The rest of the boundary passed: Cargo test/build and `--compiler-info` exited 0; the frozen Deno suite reported 904 passed and 0 failed; native tooling passed; all 15 compiled runtime fixtures passed; the Three host suite and both retention checks passed. The Rust compiler binary SHA-256 is `15ef00a5838ac2cb23ea1f742efa66efd1f4f81c874c6d9f06d93d8c48498ddd`. Its before/after hash is recorded for each compiled fixture.

Both package workflows passed their fresh build and installed-consumer check: R3act packaged 437 files, and the legacy native package archived 207 files. Before replacement, the R3act cache snapshot contained 427 files and the native cache snapshot contained 176 files; both are preserved under `prebuild-archives/`.

The correctness lock covers 740 inputs and matches after the gate with no changed paths. The benchmark directory was excluded. Exact commands, exit codes, logs, and package manifests are in this verification directory; the machine-readable summary is [gate-results-v1.json](gate-results-v1.json). No benchmark build or browser run was performed.
