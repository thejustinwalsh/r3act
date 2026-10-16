# Semantic publication probes: browser-config verification

**Configured type check PASS; both probe tests PASS.** This is a finite source-level adversarial check using the existing live runtime and public extension APIs. It does not prove the full proposed publication contract or authorize performance conclusions.

## Commands and results

Deno 2.6.3 (stable, aarch64-apple-darwin; V8 14.2.231.17-rusty; TypeScript 5.9.2), pinned config SHA-256 `556b7e5f74aa1c7c1508131b21f2b3ba91b21e9c87e8a9b3cebea9a12a9c8b8d`, strict mode, DOM and Deno libs, JSX factory `jsx`, fragment factory `Fragment`:

1. `/opt/homebrew/bin/deno check --frozen --no-lock --no-npm --config deno.browser.json .cache/semantic-publication-audit-v1/probes/publication_probe_test.ts` — exit **0**.
2. `/opt/homebrew/bin/deno test --frozen --no-lock --no-npm --config deno.browser.json .cache/semantic-publication-audit-v1/probes/publication_probe_test.ts` — exit **0**, two passed, zero failed.

The first invocation used the one authorized browser-config attempt after the earlier no-config check failed on missing DOM declarations. That original failed receipt remains unchanged at `../evidence/check.tool-result.json`; the configured gate did not edit its source, test, manifest, or lock.

The passing cases were:

- **Public host setter dispatches and disposes during candidate application.** The host setter callback dispatches a newer value, calls nested flush, and disposes through public APIs. The test asserts the actual callback order, deferred nested flush, failed candidate application, and final disposal. The README’s boundary applies: this does not establish atomic paint or retention of a pending cut after deliberate disposal.
- **Public task validation fails group after both hosts applied.** Both roots’ public hosts receive their writes; a post-host task validation change then fails the group before either candidate’s publication. The test asserts the group handle reports `failed`, host-write trace order is left then right, both physical host texts are `new`, and each root publication version remains at its captured value. Cleanup disposes the queue and roots in `finally`; the test does not assert later automatic replay or an explicit remount. It does not exercise a first-root publish followed by a second-root publish throw, nor prove a callback-free atomic group publication point.

Exact tool results are preserved in [`check.tool-result.json`](check.tool-result.json) and [`test.tool-result.json`](test.tool-result.json). The test output reports per-test durations; they are ordinary test-run output, not a performance measurement.

## Preservation

Before and after, all 1058 finite protected files remained present and hash-identical, including the initial failed gate receipt, strict browser config, semantic probe manifest/test, source/audit files, archived unrun draft, and structural evidence. The eight-file semantic source lock and both independent 413/424 eligibility inventories were rechecked; all 258 shared live `src/` files match both locks. The structural evidence set covers 2181 prior evidence references and the accepted N=128 count/off material. No browser, server, build, timing workload, dependency change, or source/lock edit occurred.

See [`before.json`](before.json) and [`after.json`](after.json) for hashes and inventories. The original failed check and the new configured PASS are separate preserved attempts, not a replacement of the failure.
