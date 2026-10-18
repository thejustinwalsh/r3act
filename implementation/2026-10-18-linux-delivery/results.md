# GNU Linux ARM64 native delivery

Status: **v2 correctness PASS; sole descriptive build pair PASS; v1 integrity FAIL preserved**. This completes the local GNU Linux ARM64 compiler/package execution case. The full-plan first-pass goal stays active.

Source basis is local `cd8ea3385bca141b61ef1608068dd12167b7dcba` plus the archived launcher, staging and five fixture-option changes. Origin main was checked at `a694d72959970eca750d2fa09c91d0b64ae5494a`; no hosted workflow, package publication or remote push ran. See the [design](design.md) and [source review](source-review.md).

## Actual native execution

The existing Colima daemon reports Linux aarch64, Ubuntu 24.04.4 and `/var/lib/docker`; the container userland is the official Node 24.18.0 Bookworm ARM64 image pinned to `sha256:5711a0d445a1af54af9589066c646df387d1831a608226f4cd694fc59e745059`. Bootstrap records Node 24.18.0, Rust/Cargo 1.97.1, Deno 2.9.7 and pnpm 11.25.0. The launcher transfers selected source through Docker cp because the VM does not mount Depot. Phase containers mount that source volume read-only. Exported evidence and source archives are on Depot; temporary toolchains/builds occupy Docker's existing VM filesystem. Actual free space is checked, with no hard per-volume quota promised.

The [v2 gate](../2026-10-18-native-platforms/linux/evidence-docker-v2/runner/receipt.json) passes 34/34 steps, 978 runtime tests, 63 Rust tests, 24 artifact checks, 22 actual compiled fixtures, seven Three cases, both bounded retention checks and fresh build/consumption of all five private-alpha packages. The 829 runner inputs match before/after. All 838 staged source entries (9,200,253 bytes) match both host and [pre-gate archive](verification/linux-v2/source-archive). V2's source-lock SHA is `e3306fb1ddadca48e7540d7d7e2bdff75eba9e8877f818000b37a7ad9a21cde2`. Exact commands/logs and the independent [post-gate audit](verification/linux-v2/post-verify-audit.json) remain preserved.

All 22 fixture before/after hashes equal debug compiler SHA `4669a3e55c0a49253b2e3592137890549e06d42a7bc51a12efa1ba9efe97376b`, protocol 1 and actual target `aarch64-unknown-linux-gnu`. The packaged release executable is a separate build: SHA `22c0be6620800be9173a69cc7305ccf4d3fce7d345cbd4e8dab9d2e1238650b7`, 3,679,512 bytes. Its manifest SHA is `3722d2823dcb35896f54aea0838ec7f3d8b91d2048e56de11c19ef81f050ef33`. Fresh package evidence has 488 files, five hash-checked tarballs and a passing Cargo-blocked installed consumer; 132 generated fixture artifacts are archived. This establishes the GNU Linux ARM64 case, not all Linux ABIs or platforms.

## Preserved failure and repair

The [v1 receipt](../2026-10-18-native-platforms/linux/evidence-docker-v1/runner/receipt.json) remains FAIL: 33/34 steps passed, but compiled-07 was `FAIL_COMPILER_CHANGED`. Its fixture command exited 0 while default checkout Cargo startup changed the debug executable from `4669a3e…97376b` to `4ccb641e…e9ad4f`. The 829-input source audit matched; all behavior commands passed, but the consolidated integrity requirement did not. V1's 838 source entries (9,199,748 bytes), logs and artifacts remain archived. Before owned-volume cleanup, 838 archive hashes and 712 raw-output copies matched their originals.

Source review identified five older execution fixtures selecting the default plugin path, which invokes Cargo under checkout `.cache/cargo`. They now select the already captured explicit debug binary, retaining actual Rust/OXC execution and every assertion/hash guard. The v2 snapshot differs in exactly these five files, 505 bytes total; no input was added/removed and no runtime/Rust implementation changed. V2 uses a fresh owned workspace, not modified v1 evidence. No benchmark was attempted on v1, and no favorable timing retry ran.

## Single installed Vite build pair

Primary inspected actual Native lexical state/module revision and generic opaque callback fallback, plus the actual React Counter `_c(3)` cache. All 747 ordinary host source entries, five Linux tarballs, consumer inputs, six review assets, source lock, package report and copied compiler were independently rehashed before authorization. The [proof](../2026-10-18-native-platforms/linux/evidence-docker-v2/benchmark/proof-v1/build-proof.json) SHA is `835dab24437ecc23e8da34bb0aa5bbf14b14dd2de97e3aace7c00c01116a06ac`. Native/React transform hashes are `919845b6ea26de0cfe07a373e1420fe7598cba810d1e686c0951acb7f97ad8b3` / `d802127e6faead7541ccbb97f61559da077a0072786c9e3dc0772028e4927a88`.

The sole [one-shot receipt](../2026-10-18-native-platforms/linux/evidence-docker-v2/benchmark/proof-v1/pair-one-shot.json), SHA `aca05e4c3b2e8a4707303f5be72b7808367c7afb061f367f2cef0b71b602eb02`, reports `PASS_DESCRIPTIVE_BUILD_PAIR_ONLY`, exit 0 and no errors. Order is Native then React, one fresh Node process each. All 772 before/after input rows match, both timed transforms match review, and all 40 exported proof files match the separate copy. See the [independent comparison audit](verification/linux-v2/benchmark-run-audit.json).

| Observation | Native | React Compiler |
| --- | ---: | ---: |
| Fresh-process Vite build, spawn to exit | 232.696526 ms | 437.271901 ms |
| Main JavaScript bytes | 146,935 | 72,007 |
| JavaScript map bytes | 926,895 | 125,070 |
| Post-transform bytes | 4,260 | 654 |

The pair totals 681.746524 ms. The interval includes Node/plugin/compiler startup, artifact validation and bundling; it excludes untimed package setup/proof checks. Required untimed proof builds and hashes may prime OS/filesystem caches. These are fresh-process observations, not cold-cache/compiler qualification. One fixed-order pair supplies no population median/p95, runtime update latency, physical-input/presentation, independent-device or general speed conclusion. Output sizes do not establish equivalent feature coverage. No project server, browser, TLS/trust change or timing retry ran.

## Limits and remaining requirements

This VM runs on the same physical Mac as Darwin. Linux x64/musl, Windows, actual hosted CI and independent-device execution remain unverified. Each package still bundles only its build target's executable; no scope was published or reserved. Public runtime identity, retained VDOM, accepted histories, exact acknowledgements and generic fallbacks are unchanged by this slice. No physical layout is selected.

Apple Container 1.5.0 and its data remain under `/Volumes/Depot/Containers/apple`; service startup separately awaits the existing native macOS administrator authorization for Depot filesystem ownership. This Docker route neither changes that installation nor starts/stops shared daemons or mounts. Finalization removes only receipt-labelled owned volumes after export review; it retains images and shared resources.

Historical stable-binding wins, the qualified integrated dense FAIL, exhausted Recording A and physical HOLD remain. The earlier authored-lifecycle extra checker audit stays INCOMPLETE; this gate does not relabel it. Cold/retained-memory budgets, broader async UX, physical-input/presentation and independent-device finish-line gates remain open. Human participants remain 0 and no maintenance advantage is claimed. The full-plan first-pass goal remains active.

## Finalization

Both runs' owned volumes were finalized only after preservation checks. The v2 [final scoped inventory](verification/linux-v2/final-scoped-inventory.json) records 838/838 current host/archive matches, 829/829 unchanged gate inputs, 488 package entries, 132 fixture entries, 40/40 proof files and 788/788 raw exports matching their originals. The notebook has 204 cells with the prior 203-cell prefix and all root metadata unchanged. Git reports no tracked root `.cache` changes. The exact v2 ownership label has zero containers/volumes; the existing Colima daemon and all 25 shared images, including the pinned Node image, remain. No gate, build pair or browser workload was repeated during closeout.
