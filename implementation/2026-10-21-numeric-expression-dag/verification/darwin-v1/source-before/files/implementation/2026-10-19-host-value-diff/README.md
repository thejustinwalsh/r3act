# Host value diff boundary

The replaced generic VDOM prop diff compares authored references with `Object.is`. A Three `Vector3` or numeric tuple reused after in-place mutation therefore looks unchanged even though the host owns a copied value. The invariant authority is the host's optional write-boundary capture for supported copy targets: it supplies an independent write value and a primitive comparison tuple. Captured values advance only with accepted host writes. A host that declines capture keeps reference semantics, including suppression of an unchanged custom payload. DOM style uses its existing accepted-copy path.

`compiler/fixtures/native-host-value-diff.tsx` is ordinary authored JSX compiled by the actual Rust/OXC binary. Its DOM and Three targets receive stable mutable style, Vector3 and tuple values through a state invalidation, alongside a scalar and custom-payload control. `compiler/compiled_host_value_diff_test.mjs` checks actual component registration, host writes and output, unchanged redraws, keyed move/remove/insert lifetimes, an independent suspended branch, a host-time newer value and a throwing writer's accepted history and terminal quarantine. `--baseline` loads the immutable runtime and compiler in this unit's `baseline/` archive and records raw observations. Baseline observation is diagnostic; fixed assertions run only against current source. Both modes write unique, hash-bound `.cache` artifacts, including failure receipts.

The installed consumer uses the five built tarballs and actual React Compiler. Its untimed browser proof compares output, retained identity, row effects, Three resource lifetime and pending independent work with a React implementation. It then permits one bounded ordinary-prop click-to-DOM-mutation comparison, Native first. This observation does not qualify CPU, paint, tail latency, memory or product performance. The browser uses offline HTTPS interception, headless GPU-off execution and a 90-second deadline; no server or VM is launched.

On Native startup, `consumer/copy-host.ts` also exercises the exported `@r3act/core` host extension with a plain consumer-owned host and public `createNativeRoot`/`jsx`. It freezes an independent sample write value and primitive comparison tuple, verifies a mutated same-reference sample writes once, an unchanged redraw and retained custom payload do not write, then disposes its container. The browser receipt requires this untimed public-contract result before measuring. This is a public package conformance check, not a React feature-equivalence claim.

After primary source review, Luna runs the consolidated boundary commands:

```sh
node scripts/verify_native_platform.mjs --execution-kind native-host --expected-platform darwin --expected-arch arm64 --output-dir /Volumes/Depot/Developer/r3act/.cache/host-value-native-gate-v1
node implementation/2026-10-19-host-value-diff/prepare.mjs --proof-dir implementation/2026-10-19-host-value-diff/proof-v1
node implementation/2026-10-19-host-value-diff/run-build-pair.mjs --proof-dir implementation/2026-10-19-host-value-diff/proof-v1
node implementation/2026-10-19-host-value-diff/verify-browser.mjs --proof-dir implementation/2026-10-19-host-value-diff/proof-v1 --phase proof
```

The primary binds a `proof-v1/run-authorization.json` to the passing untimed receipts before Luna runs one measurement:

```sh
node implementation/2026-10-19-host-value-diff/verify-browser.mjs --proof-dir implementation/2026-10-19-host-value-diff/proof-v1 --phase measure
```

Falsifiers include stale copied Three values, a missing DOM style deletion, duplicate unchanged copy or opaque writes, lost newer host-time work, resource or row lifetime drift, changed accepted history after a host exception, source/asset hash drift, or an unbounded browser. The separate physical layout selection remains on its previous evidence basis.
