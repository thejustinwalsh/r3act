# Installed compiler build pair: prepared protocol

Status: source prepared, **not run**. This is one descriptive build-cost pair for master-plan Unit 9. It compares two small authored counter/button components: the installed `@r3act/vite` Rust/OXC plugin and React Compiler through the installed Vite and React plugin. Both library builds bundle their actual runtime imports; neither uses a server or browser. Timing is one new Node process per arm from spawn to exit, native first. The pair includes Node, plugin, compiler-artifact validation and Rust process startup, transform and bundle work. Package installation, dependency resolution, untimed review builds and hash checks are outside the timed interval.

Luna should first finish and archive the correctness and current five-package build/consumer gate. The setup command below creates a **new, exclusive** `proof-...` directory inside this benchmark folder, installs the current five tarballs and pinned root-declared React/Vite/compiler tooling with scripts disabled, freezes the complete source/tarball/compiler inventory in `source-lock.json` before installation, checks the report and installed compiler hashes/info, and performs one untimed build of each arm. It captures post-compiler transforms, emitted bundles, logs, consumer lockfile and a `build-proof.json` whose status is `BUILD_CAPTURED_PENDING_PRIMARY_REVIEW`. A failed setup leaves `setup-attempt.json` and logs in place; use a new name for any authorized repair attempt. The script does not run the timed pair.

```sh
node implementation/2026-10-18-compiler-artifacts/benchmark/prepare.mjs --proof-dir "$PWD/implementation/2026-10-18-compiler-artifacts/benchmark/proof-v1"
```

Primary reviews the actual transforms and source/tarball/compiler hashes. The native transform proof checks its generic semantic plan, HMR source/revision, Counter registration and lowered state site; it does not require a numeric specialization for a state value also read in child text. Only after approval, primary writes `proof-v1/run-authorization.json` with `{"status":"APPROVED_FOR_ONE_DESCRIPTIVE_PAIR","buildProofSha256":"<SHA-256 of exact build-proof.json bytes>"}`. Luna then runs exactly one invocation with the same Node executable used for setup:

```sh
node implementation/2026-10-18-compiler-artifacts/benchmark/run-once.mjs --proof-dir "$PWD/implementation/2026-10-18-compiler-artifacts/benchmark/proof-v1"
```

The runner refuses an existing `pair-one-shot.json`, creates its receipt before validation, rechecks the source lock, approved build proof, authorization, source, all five tarballs, installed compiler/manifest and reviewed assets before and after, then builds native and React in fresh processes. A single 90-second interruptible deadline covers the pair. The timed runner requires POSIX process groups so interruption can kill the Node child and compiler descendants. It saves transforms, bundles, stdout/stderr, exit status and spawn-to-exit durations; failure leaves an `INCOMPLETE` receipt, with no retry or sample filtering. The runner verifies that timed post-compiler transforms match the reviewed ones. Preserve the entire proof directory and any failure logs unchanged.

The required untimed proof builds and pre-pair hash checks read the same inputs and may prime OS/filesystem caches. The timed arms use fresh processes but do not represent cold cache or cold compiler startup; there are no additional warmup iterations. This fixed native-first observation does not establish mean/p95, runtime speed, cross-platform compatibility, independent-device reproducibility, or a release qualification. It does not replace the separate installed-consumer correctness gate.
