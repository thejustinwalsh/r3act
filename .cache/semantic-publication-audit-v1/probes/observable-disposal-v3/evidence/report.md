# Observable disposal during application: v3 semantic gate

**Type check PASS; one public-host probe PASS.** This result establishes the live runtime's behavior under the tested callback path; it is not a pass of the proposed deferred-teardown contract.

## Commands and actual results

Deno 2.6.3, using the already-approved `deno.browser.json` (strict TypeScript, DOM + Deno libs, JSX factories):

1. `/opt/homebrew/bin/deno check --config deno.browser.json --frozen --no-lock --no-npm .cache/semantic-publication-audit-v1/probes/observable-disposal-v3/disposal_probe_test.ts` — exit **0**.
2. `/opt/homebrew/bin/deno test --config deno.browser.json --frozen --no-lock --no-npm .cache/semantic-publication-audit-v1/probes/observable-disposal-v3/disposal_probe_test.ts` — exit **0**, one passed, zero failed.

Raw tool results are [`check.tool-result.json`](check.tool-result.json) and [`test.tool-result.json`](test.tool-result.json). No source or assertion changes, build, browser, server, timing workload, or dependency operation occurred.

## Observed contract behavior

Inside the armed public `MemoryVDOMHost.setProp` callback, the test dispatches a local setter and confirms it returns true; nested `root.flush()` returns false. It then calls `root.dispose()` and, before the host callback exits, observes `diagnostics().disposed === true`, `ownerCount === 0`, and `container.children.length === 0`. The host override observes `remove()` during that callback. Assertions establish that the host removal precedes `dispose()` returning, and disposal returns before `host-exit`; the prepared candidate then rejects. The final cleanup calls `dispose()` again without a cleanup failure.

This confirms current behavior against the proposed §5 deferred-teardown expectation: disposal and host removal complete inside an active writer. It documents a semantic gap; it does not demonstrate the proposed deferred behavior as passing. The probe covers this one public host callback path and makes no claim about arbitrary hosts, atomic paint, grouped publication, compiler lowering, or performance.

## Preservation

All 1064 protected files remained present and hash-identical. The eight-file semantic source lock, complete 413- and 424-entry eligibility inventories, and all 258 shared live `src/` entries matched before and after. The first no-config type-check failure, both configured v2 passing receipts, the archived unrun draft, and frozen structural evidence (including 2,181 prior evidence references and accepted N=128 count/off evidence) remain unchanged. See [`before.json`](before.json) and [`after.json`](after.json) for hashes.
