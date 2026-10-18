# One descriptive joint transaction pair

Status: **ONE DESCRIPTIVE PAIR COMPLETED.** See [outcome.md](outcome.md) and the immutable [pair receipt](proof-v1/pair-one-shot.json).

The proposed page mounts 1,024 keyed rows in each arm. Every row has local numeric state rendered through its authored `data-value` binding. One combined interaction updates 64 distributed row setters and moves `row-0` to the tail. Native TSX passes through Rust/OXC; Native applies the keyed operation, calls `root.prepareTransaction({ cells, collections: [rows] })`, and completes the authentic candidate lifecycle. The React arm uses authored TSX through Vite and React Compiler, updating the matching row setters and order array in one `flushSync`. The Native operation log and React array replacement are different APIs, and the result will state that directly.

The page uses two warmups and eight measured interactions per arm. Each interaction contains the full native setter, collection apply, transaction preparation and candidate commit lifecycle, or the corresponding React setters and array replacement. Identity and value checks, counter capture, reset work, and timer-resolution sampling happen outside the timed interval. There are no per-frame profiles or counters. It captures row StateCellHandles once before samples, then checks final row order, values, keyed DOM identities and disposal. A single initial mount and final disposal duration are recorded separately. All samples, including pauses and GC, remain; the reported within-page p95 is the maximum of eight samples. Median ratios are null if either median is at or below twice that arm's smallest positive `performance.now()` step.

One headless Chromium pair, GPU disabled, 1200×900, hard 90-second interruptible deadline. The browser replays only exact source-locked production assets through Playwright routing at a synthetic HTTPS `.localhost` origin. It makes no network/TLS connection and starts no project server. This is DOM execution over offline production assets, not live Portless, transport, visual, or paint evidence. No trust-store changes or Portless commands are part of this plan.

This is one descriptive pair, not qualification. It cannot establish latency tails, speedup, locality, the full master-plan budget, GC/heap behavior, cold-mount repetition, or second-device results.

At the released boundary, run the consolidated gates in `../verification/preparation.md`, then build exactly once into a new proof directory. The executable source lock covers changed runtime/compiler/package sources, lock/config files, benchmark fixture/config/scripts and the rebuilt compiler binary; this README is protocol documentation and is excluded from that lock. The proof preserves compiler transforms, logs and all production assets with hashes. Assertions establish the actual Row hook/state lowering, keyed collection and closed numeric input program, plus React Compiler memo output. They do not require unrelated owner programs. Primary reviews the complete proof and writes an authorization bound to its hash. Only then may the collector run once with a unique synthetic origin. Preserve any incomplete receipt as the sole attempt.

After release and primary approval, use a new, nonexistent proof directory:

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node implementation/2026-10-18-first-pass/benchmark/build-gate.mjs --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-18-first-pass/benchmark/proof-v1
```

After primary writes `run-authorization.json` for that exact proof, one permitted collector invocation is:

```sh
/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node implementation/2026-10-18-first-pass/benchmark/run-pair.mjs --proof-dir /Volumes/Depot/Developer/r3act/implementation/2026-10-18-first-pass/benchmark/proof-v1 --origin https://r3act-joint-20261018.localhost
```
