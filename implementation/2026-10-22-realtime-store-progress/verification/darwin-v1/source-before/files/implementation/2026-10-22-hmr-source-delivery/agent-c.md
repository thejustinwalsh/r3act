# Packet C handoff — workbench host write instrumentation

Owned changes: `src/browser/native_three_host.tsx` and this note. No tests, builds, browser, server or Git commands were run.

The replaced mechanism was a `Proxy.get` facade around the workbench Three host. `hostPropWriter` in VDOM reads the `setProp` data descriptor directly, so Store scalar writes bypassed that trap. `createThreeHost` constructs a fresh object literal with its own `setProp` method, which is a writable data property. The workbench now captures that original method once, installs one stable own-data-method wrapper on the same host, counts all writes and rotation writes, and delegates through `originalSetProp.call(base, ...)`. The returned host and its diagnostics, other methods, resources and lifetime authority remain the same base object.

This changes demo instrumentation only. It does not alter product VDOM/Three execution, compiled arithmetic, output semantics or the benchmark workload. The existing bounded actual browser proof should validate frame epochs, rotations, write counters, identity and disposal after primary source review. Counter correction alone makes no performance claim.
