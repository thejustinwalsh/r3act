# Declarative copied host values: verified boundary

Source basis: main `a47df85cc28acb04119a6d9c09fe52ea6ac07a33`. The full-plan first pass remains active. This closes a concrete declarative host-value correctness gap; it does not qualify the added cost or complete the product release gates.

## Behavior and authority

The immutable committed-runtime/compiler [baseline](baseline/provenance.json) reproduces stale Three position [1,2,3] and rotation [0,0,0] after mutating reused authored inputs and invalidating their components. The corrected actual compiled fixture updates position to [4,5,6] and rotation to [0,0.5,0], suppresses unchanged copy and retained-payload writes, removes old DOM opacity, and retains scalar, keyed incarnation, independent resource, newer reentrant-action and partial-failure semantics. The baseline is diagnostic, not a frozen timing/product baseline.

The optional public `VDOMHost.capturePropertyValue` produces an independent stable write input and primitive comparison tuple. The runtime privately owns comparison history in existing mounted VNodes and binding/pending-publication records. This replaces raw-reference accepted equality only for participating copy writers; distinct authored references still reach the writer. Public structural snapshots exclude private copy records. Known Three capture is isolated from the generic property writer and Deno boundary. Its finite built-in shapes include vectors, Quaternion, Euler, Color and matrices; unknown/custom/retaining shapes keep generic reference semantics.

Capture is fallible callback-bearing host application, not a compiler purity capability. Method/writer identities are checked after normalization; bound groups retain canonical live-membership checks. Scoped replacement allows only the private accepted-copy wrapper relative to its candidate, then validates exact actual mounted identity, handle/parent/key, version and publication token. Exact acknowledgements, newer work, fork histories, resource ownership and whole-tree replacement guards remain. Partial physical host changes cannot generally roll back; managed accepted history stays old and failed application quarantines as before. Cross-renderer visual atomicity is not established. See [design](design.md) and [primary source review](source-review.md).

## Consolidated correctness and preserved failures

[Darwin-v4](verification/darwin-v4/receipt.json) passes all 52 steps, with [actual supervisor exit 0](verification/supervisor-darwin-v4/result.json). It passes 1043 Deno tests under the frozen lock, 80 Rust tests, 34 actual Rust/OXC compiled fixtures, nine concrete Three cases, three retention checks and thirteen fresh-package checks. The 1319 runner inputs match before/after; [1328 raw/context files](verification/darwin-v4/source-archive.json) were archived before commands. Node24.18.0/Deno2.9.7/Rust1.97.1/pnpm11.25 execute on Darwin ARM64, with one Cargo job. This is not current other-platform proof.

All earlier failures remain:

- [V1](verification/darwin-v1/receipt.json): 42/52 pass, nine fail and one dependency skips. Array-descriptor typing and a Three import crossing into generic Deno code fail tooling/package checks; six compiled fixtures reject a valid private copy wrapper. A compiled fixture also records cleanup EPERM.
- [V2](verification/darwin-v2/receipt.json): 50/52 pass; resource fixtures 16 and 23 expose a second strict candidate-identity comparison in final post-host validation. The same narrow private-packet match fixes it, retaining exact actual receipt checks.
- [V3](verification/darwin-v3/receipt.json): 51/52 pass, all compiled fixtures pass; the newly added direct regression supplies mutable tuples to a scoped API that intentionally declines them. Only that test input changes to frozen tuples before v4, preserving its preparation/publication/value assertions.

Each run has adjacent supervisor commands, UTC start/end, numeric exit and original output. No favorable timing retries occurred. Existing lifecycle/GC checks establish their named collection/cleanup observations, not a retained-heap budget.

## Installed proof and single observation

[Proof-v1](proof-v1/build-proof.json) fails consumer typechecking: a mutable rotation array needs its actual three-number tuple type. [Proof-v2](proof-v2/browser-untimed.json) builds but fails reveal identity: the manual React Three helper replaced the group that Native keyed reconciliation retained. The comparator now reuses its existing group. Assertions remain unchanged. These consumer-only follow-ons are separately source locked; product/compiler/fixed fixture remain v4-identical. The failed browser proof does not have final integrity qualification.

Fresh [proof-v3 build](proof-v3/build-proof.json), [production pair](proof-v3/pair-proof.json) and [untimed browser](proof-v3/browser-untimed.json) pass. Ten stages verify equal DOM/Three values, retained target/mesh/row identity, keyed effects, pending independent work, reveal and cleanup. The Native startup also passes the public custom-host protocol with public imports only. Eighteen local plus two external source rows, five tarballs, 1617 selected installed files/manifests, compiler, package report, transforms and served assets are bound. React Compiler emits actual CompileSuccess events for Row/PendingScene/PendingDom/Hot/App; the target Hot memo output is inspected. This is a selected installed graph, not every transitive dependency file.

After primary [hash-bound authorization](proof-v3/run-authorization.json), the [sole Native-first pair](proof-v3/browser-one-pair.json) passes with Native **5.300000004470348 ms** and React **2.100000001490116 ms**, Native slower in this observation. The interval starts before button click and ends at the DOM MutationObserver seeing blue color, removed opacity and second scalar. Matching Three output is then asserted. Twenty input rows and four assets match before/after; no errors occur and context/browser close. The actual measurement supervisor exits 0. Receipt SHA-256: `e5e0a2c64375db850b0b580e5626b56c59d3390aaefbb62dbe4f7eddcca77906`.

This is one prepaint observation, fixed order, with timer quantum unmeasured. It establishes no speed, CPU, p95, cold/setup, allocation, retained-memory, presentation or independent-device advantage. Unminified Native/React JavaScript is 2649710/1070577 bytes with unequal graphs; React drives Three through explicit layout effects. Neither those sizes nor this interval establish equivalent-feature cost or broad renderer performance. New capture/reflection/copy/freeze/comparison/validation/retention costs remain unqualified. Historic stable-binding wins and the later qualified dense FAIL retain their own source/workload scope. Recording A stays exhausted and physical selection HOLD.

## Memory and remaining scope

No project server or VM starts. Browsers are headless/GPU-off, offline exact HTTPS assets, bounded and interruptible. Saved Apple configuration remains one CPU, 256 MiB/container, 512 MiB/build, Rosetta off; a read-only inventory found no Apple VM, Colima, QEMU or vfkit process. Effective VM limits remain unverified behind the existing Depot service-start permissions. No memory setting increases.

Other-platform/package portability, the named authored realtime and async UX qualification, structural/lifecycle/cold/memory/performance budgets, physical presentation and independent-device requirements remain. Human participants remain zero; no maintenance superiority is claimed. Public extension now has this additional finite copy-protocol proof; it is not universal React/R3F compatibility. No worker/stream backend or physical storage redesign is justified by these results. The original full master-plan scope and active goal remain.

The notebook appends one cell after preserving all 218 existing cells and metadata. Final evidence audit is recorded in [verification/final-audit.json](verification/final-audit.json).

The final audit is bounded: it checks the gate receipt, authorization, notebook prefix, whitespace and memory/process state, and explicitly does not repeat every installed row, historical archive hash or documentation claim. Those omissions are not PASS results. The execution verifiers already check their locked inputs/assets before and after each passing phase. A separate [primary source-lock review](verification/primary-source-review.json) rehashes all 1319 v4 inputs against the final tree: only the two documented consumer follow-ons differ; every product/compiler/fixed-fixture input matches.

The final staged check passes for authored source/docs. Its all-artifact variant reports preserved generated declaration whitespace and CRLF fixtures (exit 2); [raw output and scoped result](verification/staged-whitespace.json) record that distinction. Frozen evidence is kept byte-for-byte rather than formatted to silence those warnings.
