# Scoped structural/cache slice — verification v1

Status: **correctness gates passed; no source fixes/retries; benchmark build and browser pair not run.** Inputs were frozen in `source-lock-v1.json` before gates and rechecked in `source-audit-after-v1.json`; all ten entries match. Rust/OXC sources are byte-identical to the prior retained-delta gate, and the executable hash matches the previously recorded compiler binary, so Cargo's 42-pass receipt was reused rather than rerun.

## Correctness results

- Full browser-configured frozen Deno suite: **787 passed, 0 failed**, exit 0. Raw output: `deno-src-gate-v1.log`; command: `/opt/homebrew/bin/deno test --config deno.browser.json --frozen --lock=implementation/2026-10-16-publication/verification/deno-runtime.lock src`.
- `pnpm check:native-tooling`: exit 0. Raw output: `pnpm-native-tooling-v1.log`; executable `/Users/mini/.local/share/mise/installs/node/26/bin/pnpm`.
- Compiled scoped collection fixture: exit 0, `compiled_scoped_collection_test-v1.log`.
- Compiled retained-transaction fixture: exit 0, `compiled_retained_transaction_test-v1.log`.
- Compiled owner-row DOM fixture: exit 0, `compiled_owner_row_execution_test-v1.log`.
- Compiled owner-row Three fixture: exit 0, `compiled_owner_row_three_execution_test-v1.log`.

The four fixtures ran sequentially with `/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node --experimental-transform-types`; each exact command's exit is in its matching `.exit` file. Rust/Cargo reuse is supported by the unchanged source hashes in the new source lock, prior **42/42** Cargo receipt `implementation/2026-10-17-retained-deltas/verification/cargo-test-v1.log`, and exact compiler binary SHA match `0ff0c694f860da2a2321f4b7521c78dc4c63d3e68a0a6494587220525d56e50f`.

Fixture-generated, UUID-scoped assets remain under `.cache/compiled-owner-proof/`, `.cache/compiled-owner-three-proof/`, `.cache/compiled-retained-transaction/`, and `.cache/compiled-scoped-collection/`. `git status --short -- .cache` shows only those new outputs; no tracked cache evidence was modified.

## Portless preflight incident

Pinned Portless 0.15.8 was installed under task-owned prefix `/private/tmp/r3act-portless-tools`; version and read-only `doctor` receipts are in `benchmark/portless-preflight/`. The install output says “added 1 package”; the shell wrapper then failed to store its exit because it used zsh's readonly `status` variable, so `install.exit=1` is the wrapper's exit and does not establish the npm subprocess exit independently. The installed CLI version was separately recorded as 0.15.8.

A mistaken `portless trust --help` invocation did not display help: it generated local CA files in default `~/.portless` and launched `security add-trusted-cert`. The owned `portless trust` and `security` processes were sent SIGTERM; `trust-help.exit` is 143 and `trust-help-termination.json` records the exact interruption. The keychain outcome is **unknown**. No proxy, project server, browser, route or `/etc/hosts` sync was started. The agent did not observe an authorization prompt. The default CA files were left intact for primary handling; no further keychain/Portless trust command was run.

## Structural pair tooling

The new benchmark fixture, build gate and collector are in `implementation/2026-10-17-scoped-structure/benchmark/`. They are authored only and **unexecuted**, pending primary review. The existing numeric high-frequency collector was not substituted for a structural workload. No server, preview build, page, timing, or performance conclusion exists for this slice.
