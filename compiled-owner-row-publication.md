# Compiled owner row implementation and verification

The JavaScript runtime now executes compiler-certified numeric props through one prepared program per affected owner row. Ordinary TSX expressions such as `position={[x, y, z]}` and `data-repeat={x + x}` can use numeric column storage and update existing host objects without rerunning the component. This checkpoint establishes correctness and compiler integration. Its latency and allocation gates remain unmeasured.

## Compiler and runtime changes

Rust/OXC separates numeric storage eligibility from expression arity. Eligible states retain the existing conservative initializer, immutable-binding, and expression-purity restrictions. Uses outside certified intrinsic props take the ordinary render path. Layouts carry a component `programId`; version 2 binding descriptors identify that owner program and an ordered, unique source list. Legacy descriptors remain readable.

World resolves committed handles through a private, revocable cell capability. Copied handles with matching owner and site remain valid. Resolvers snapshot public fields before checking the capability, and destruction revokes the private cell pointer before releasing storage. Each allocated owner row has a distinct generation lease and cached views containing ordinary data properties. Promotion and destruction clear shared source slots; row reuse gets a new lease.

Root captures exact cell versions and values into reusable buffers, groups changes by row identity, and reuses prepared VDOM programs. The executor validates the entire cut and its shared dependency leases before mutating sources. It captures all participating inputs, selects fanouts in dirty-cell order, evaluates each affected expression once, and finishes every projection before writing hosts. Primitive equality suppression and mutable-output writes retain their prior behavior.

An executor decline cannot advance publication or acknowledge state. Root refreshes stale bindings once using the original captured values, then takes the existing fallback if preparation still declines. Newer writes remain pending after host reentry. Disposal cancels remaining work, and a failed host commit remains terminal.

## Verified results

| Check | Result |
| --- | --- |
| Integrated runtime suite with typechecking | 694 passed |
| Rust compiler suite | 33 passed |
| Native tooling typecheck | Passed |
| Dead handle retention proof with exposed GC | Passed |
| Actual Chromium cell storage checks | All ten scenarios retain fast properties |
| Compiled keyed TSX | Sparse one-cell and dense six-cell cuts use prepared rows, with no eligible component rerenders or generic captures |
| Actual Three.js host | 240 batches updating five state cells use one owner row, preserve objects and resources, and keep the component render count at one |
| Production build | Both native owner metadata and React Compiler memoization gates pass |

The Three proof updates real Vector3, Euler, geometry, and material objects and checks disposal. It is a headless host correctness proof; it does not establish GPU performance or presented frame smoothness.

The executor has a deterministic work-count regression covering 1,000 rows. Diagnostic counting is enabled explicitly for that check. Production execution contains no scan comparing each row with every prior row.

The matched production application bundles are 184.96 kB native and 221.03 kB React, with gzip sizes of 50.76 kB and 69.30 kB. These are application bundles, not isolated library sizes. The current native bundle is larger than the preceding native checkpoint.

## Review corrections and evidence

Primary review rejected a quadratic source-collision scan and an initial-value cache that could skip the first update when preparation occurred after setters changed columns. The revised executor uses activation-time source association and explicit dirty-slot fanouts. Review also corrected layout signature collisions, single-source derived projection capture, cancellation from the last projector, and standalone GC proof discovery.

The first authored proof failed because its assertion expected JSX after the plugin had lowered the module to JavaScript. The original proof scripts, failure record, and logs remain preserved. Revised assertions inspect lowered helper calls and retain the runtime value, ordering, identity, and execution-path checks.

Primary verification logs are under `.cache/compiled-owner-wave/`. The authored fixtures and results are under `.cache/compiled-owner-proof/` and `.cache/compiled-owner-three-proof/`. The browser diagnostic is `results/numeric-cell-storage-candidate-v5/diagnostic.json`. Historical protocols, raw measurements, archives, and `research.ipynb` remain unchanged.

## Next acceptance gates

Freeze this source and build checkpoint, qualify the production browser pages, and collect the registered matched latency study with the existing thresholds. Measure allocation on this revision before drawing an allocation conclusion. If latency still fails, attribute the current production workload before choosing another optimization.

The prior qualified timing checkpoint was 18–26 percent slower than React on paired median measurements and failed its speed gate. This revision does not supersede that performance finding until new measurements exist. Independent-device evidence, current-package verification, and comparative human maintenance evidence remain outstanding. The Sol review hold remains in force. Workers, streaming, hydration, and Wasm remain deferred.
