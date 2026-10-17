# Retained-prop transaction slice gate plan

Status: **PREPARED — not executed; awaiting primary release.** Source is still changing. Do not use this plan to start a gate before the source slice is paused/released.

The repository is cleanly based at `b921555` with the retained-prop transaction changes currently uncommitted. The controlling contract is `final-master-plan.md` §5 and the finite acceptance slice described near its beginning: mergeable retained-prop deltas with exact read/control footprints, owner/code/writer validation and explicit transaction grouping. Keep the current source-version/publication authority; preserve generic reconciliation for opaque work. Relevant adversarial cases include sparse/dense nesting, disjoint transactions with independent pending work, joint reads, intervening unrelated commits, overlapping writes, replacement/removal/reinsert, stale code, fork history, partial host failure and disposal.

At release, first write `source-lock.json` in this directory with SHA-256 values for every changed live source file and new test. Then run each prescribed command once, in order, preserving combined stdout/stderr and exact exit status in the named log. Do not modify source or locks during the gate. Preserve any failure receipt; do not retry for a favorable result.

1. Full browser-configured Deno source gate:

   `/opt/homebrew/bin/deno test --config deno.browser.json --frozen --lock=implementation/2026-10-16-publication/verification/deno-runtime.lock src`

   Receipt: `deno-src-gate.log`.

2. Rust compiler tests:

   `/Users/mini/.cargo/bin/cargo test --locked --manifest-path compiler/oxc-spike/Cargo.toml`

   Receipt: `cargo-test.log`.

3. Native-tooling types:

   `/Users/mini/.local/share/mise/installs/node/24.18.0/bin/pnpm check:native-tooling`

   Receipt: `pnpm-check-native-tooling.log`.

4. Actual compiled DOM and Three owner-row runtime fixtures, using the supported Node v24.18.0 executable at `/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node` and the existing transform-types flag:

   `/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node --experimental-transform-types compiler/compiled_owner_row_execution_test.mjs`

   Receipt: `compiled-owner-row-dom.log`.

   `/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node --experimental-transform-types compiler/compiled_owner_row_three_execution_test.mjs`

   Receipt: `compiled-owner-row-three.log`.

These fixtures use unique UUID-backed output files and should run sequentially. Their reports establish compiler/runtime correctness for the authored DOM/Three cases only; they do not measure latency. The existing frozen production build from the preceding slice is not a substitute for reviewing this slice's source. No build, performance comparison, Portless setup, server, or browser session is part of this gate plan. The optional Portless comparison was explicitly skipped in `implementation/2026-10-17-publication-comparison/preflight.md`; it does not block this implementation slice.

Tool versions observed during read-only preparation: Deno 2.9.7, Cargo 1.97.1, pnpm 11.25.0, Node v24.18.0 at the executable path above (default `node` is v26.9.0). No gate command was executed while preparing this plan.
