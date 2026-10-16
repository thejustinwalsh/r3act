# Observable disposal during application: one public-host probe

This one-case source probe is **unrun**. It uses the current live `ComponentStateRoot` and the public `MemoryVDOMHost.setProp`/`remove` extension methods. It follows the first passed v2 probe but observes state immediately after `root.dispose()` returns **inside** the armed host setter. The v2 files and their result receipts remain unchanged.

The current-source trace asserted here is: nested `flush()` defers; `dispose()` invokes `host.remove` before it returns; at that same point `diagnostics().disposed === true`, `ownerCount === 0`, and the container has no mounted child; only afterward does the host setter exit. The proposed §5 deferred-teardown contract would keep the active host batch's owner and host removal pending until that callback exits. It may mark disposal requested, but would not report completed disposal with zero owners and run `host.remove` inside the active writer. These assertions test an observable contract difference, not whether a method merely returns synchronously. A later run may falsify this static source reading; preserve its actual failure rather than editing expectations to pass.

After primary review, Luna can record Deno version, verify [input hashes](input-manifest.json), then run from the project root:

```sh
deno check --config deno.browser.json --frozen --no-lock --no-npm .cache/semantic-publication-audit-v1/probes/observable-disposal-v3/disposal_probe_test.ts
deno test --config deno.browser.json --frozen --no-lock --no-npm .cache/semantic-publication-audit-v1/probes/observable-disposal-v3/disposal_probe_test.ts
```

The test uses `finally` cleanup and preserves a primary assertion failure if cleanup also fails. The test is a semantic diagnostic only: it does not prove compiler lowering, the separate serial-publish gap, performance, or atomic paint across hosts.
