# Structural owner scope and shared-clock validation

The semantic slice passes consolidated and installed verification. Its one current-source canvas comparison still loses to React Compiler. The full-plan goal remains active.

## Delivered behavior

The existing World parent/site/key tuple now includes canonical structural parent scope in its site. Equal component keys beneath separate host parents own independent state. Keyed host and Fragment moves retain descendants; host key/type changes, removal and reinsertion revoke the old incarnation. Unkeyed containers use position. Direct component tuples and native per-component-site list ordinals remain unchanged. Authored component and collection registration sites reserve NUL for internal identity; ordinary compiler sites are unaffected.

Scope encoding appends length-framed segments, avoiding recursive escaping at depth. Generated host-key provenance uses a private symbol on existing runtime-owned props. Opaque hosts receive positional scope without a new key-getter invocation. Generic, collection, partial and Suspense paths use the same identity. Full candidate and partial structural publication retain every collection region belonging to an unchanged cached component; removal retires obsolete readers and hints.

Flattened VDOM outputs qualify sibling keys by the existing componentOwner. Equal raw keys across different managed owners remain distinct; duplicates within one owner or among unowned siblings still reject. Raw-key-only fast paths decline ambiguous targets. Approved bare Suspense adoption remains gated and cannot steal a retained bare sibling. The accepted journal uses the captured child representation even when its old keyed bucket was absent. No second identity/version registry or eager whole-tree snapshot is introduced.

Closed Store validation now checks owners and then scans live readers once per validation. Exact owner prefixes, selected-Store coverage, retired pending-reader exceptions, input membership identities and public/private resource checks remain. Each validation reads fresh membership; admission is not cached. This retires a source-level nested scan without attributing any measured phase cost to it.

## Consolidated verification and preserved failures

All runs are bounded native Darwin ARM64 executions using the existing environment adaptations, one Cargo build job and frozen Deno lock. No VM, project server or helper benchmark ran.

| Receipt | Result | Material observation |
| --- | --- | --- |
| [Darwin-v1](verification/darwin-v1/receipt.json) | FAIL, 63/69 | Deno type checking stopped before tests: new insert omitted required beforeKey. Four compiled fixtures used obsolete unscoped World addresses; fixture 49 captured its event observer before an intentional local child rerender. |
| [Darwin-v2](verification/darwin-v2/receipt.json) | FAIL, 68/69 | All 49 compiled fixtures passed. Deno: 1121 pass, four fail. Flattened same-key outputs exposed the VDOM gap; two test setup assumptions were also corrected. |
| [Darwin-v3](verification/darwin-v3/receipt.json) | PASS, 69/69 | 1129 runtime tests, 93 Rust tests, all 49 compiled fixtures, package build/consumers, 20 Three host/property tests and three retention phases pass. |

All three source audits MATCH; v3 matches 1560 recorded input hashes. Supervisor exits are 1, 1 and 0 with no stop. Failures, exact sources and raw logs remain preserved. Corrected lookup assertions retain positive accepted-owner, lane, lineage and failed-owner checks; authored topology and equal component keys are unchanged. The partial-path test uses distinct host leaf keys while keeping equal component keys, so it can identify a unique optimized target. Source review caught and repaired collection carryover, namespace collision and exponential scope encoding before execution. The [primary review](source-review.md) records those decisions and the later journal repair.

The [final source audit](verification/final-source-audit.json) compares maintained code and installed inputs with their gate/build archives; post-gate documentation changes are reported separately. The [machine summary](verification/summary.json) links the gate, proof and sole timing rather than treating changed documentation as an unchanged full input set.

## Installed proof and sole timing

Fresh local core/Vite/Three tarballs install and type-check. Build capture verifies actual Rust/OXC schema 6 for Position and Rotation, with one projected Store input, three numeric sinks and retained children. React Compiler reports successful transforms. Twelve consumer source files, 52 package source files, three tarballs and 5663 installed files are locked and archived in [the proof directory](proof-canvas-v1/build-proof.json).

The headless, GPU-disabled browser uses offline intercepted HTTPS with no server. One shared Store drives 256 retained Three groups under keyed parents whose motion component keys deliberately repeat. The common Canvas2D draw inspects the Three graph; this is not a GPU renderer or R3F workload. All arms pass values, checksums, parent/child identities and exposed teardown. Native reports zero owner renders in the untimed proof. Each phase matches 11449 source/asset hashes before and after; all contexts and browser close with zero errors.

After the separate [untimed proof](proof-canvas-v1/canvas-proof-one-shot.json), one hash-authorized run executes Native, React Compiler and imperative in fixed order, with 12 warmups and 60 measured RAF callbacks per arm. Timing counters are disabled. Median / nearest-rank p95 milliseconds:

| Measure | Native | React Compiler | Imperative |
| --- | ---: | ---: | ---: |
| Store dispatch through publication | 3.10 / 3.80 | 0.20 / 0.20 | 0.10 / 0.20 |
| Update through common draw | 3.10 / 3.90 | 0.20 / 0.30 | 0.30 / 0.40 |
| State age at draw start | 3.10 / 3.90 | 0.20 / 0.30 | 0.15 / 0.30 |
| Callback including oracle/readback | 3.50 / 4.20 | 0.60 / 0.60 | 1.75 / 2.50 |
| RAF interval | 16.70 / 16.80 | 16.70 / 16.80 | 16.70 / 16.70 |

All measured callbacks report no 60 Hz reference deadline flag; that is a harness observation, not compositor presentation or smoothness evidence. Timer quantum is approximately 0.10 ms. [Raw timing](proof-canvas-v1/canvas-timing-one-shot.json) remains the authority; no favorable repeat occurred. The previous shared-clock 10.70/12.90 versus 0.60/0.90 ms result remains valid for its old source. Separate runs and the Native key-authoring correction do not establish a causal old/new saving or an attributed validation cost.

Observed setup is 13.1/3.8/2.8 ms and teardown 1.5/0.5/0.2 ms in arm order. Setup excludes different construction work across arms and is not matched cold mount. Native scene/setters/owners/pending and React scene/setters/host children reach zero; the imperative controller still references 256 objects after scene removal. These counters do not prove heap release, allocations, leaks or memory budgets.

## Evidence limits and continuation

Current source has no realtime speed win, R3F/direct-frame baseline, GPU/presentation qualification, matched cold/memory result or independent-device replication. Current workbench HMR delivery remains unresolved; it was not rerun here. Human maintenance participants remain zero and no advantage is claimed. Historical narrow stable-binding wins, qualified integrated dense loss, exhausted Recording A and physical HOLD retain their original scope.

The next source-backed implementation candidate is compiler-emitted numeric Store kernels using existing expression-DAG/ranged lowering, replacing recursive interpretation only for proven shapes while preserving Store reads, histories, exact acknowledgements and publication. This proposal has source basis, not a speed budget or implemented result. Broader fusion and all remaining full-plan requirements remain open.

Build proof SHA256: `23a27d5ddad15a25cf99059fa8ff2ff11030a52020ef4f64e0fafe9a9fdf149c`; input lock: `5c0195ad9213fdd0bd46ebacb17d26f8c790ca0182a2087abea70e8290386a3f`; untimed proof: `d73bb5ef1f811a0c44e069b215254cab0d5d2e78c4d471b6f7bd6eace2a4eb8d`; timing: `7ae67514a6953a8ce9a08156078e2401282bd12fd6395a948060dc6e14cdcf8a`.
