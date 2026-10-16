# Compiler-guided sparse store publication — 12 October 2026

## Decision

Use the compiler's conservative `hostLeafOutput` metadata to prepare independent store-reader host regions without reconstructing unrelated owner/cache/effect maps. Share the candidate lifecycle with full-tree publication. Keep full candidates for unhinted, nested, resource, boundary, collection and unsupported host footprints.

This closes the measured traversal seam for supported leaf readers. It does not establish bounded traversal for arbitrary component trees or async candidates.

## Compiler work

Rust/OXC emits the optional hint when supported own-body returns share one intrinsic host root tag and static key identity, children are intrinsic or statically primitive, and own native `use`/`useStore` calls have recognized store sources. Local primitive `createStore`/`use` and numeric state reads, primitive expressions and conditional store alternatives support the proof. Unknown UI-producing calls, component children, fragments, spreads/children props, nullable or changing root shapes/keys, and unknown/resource reads remain generic. Nested function/arrow callback returns do not describe rendered output.

Authors use ordinary TSX; they do not write the metadata. Runtime validation still checks actual output, disjoint targets and indexes. Compiler metadata is a conservative optimization eligibility result over supported syntax, not a whole-program type or purity proof. Violating data/type assumptions does not confer arbitrary JSX compatibility.

## Runtime work

Every live reader owner refreshes in one store transaction, including readers whose store did not change. The source/selector history and subscription footprint therefore remain coherent; source switching forgets old dependencies only on publication. A leaf reader's own state/source switch can use the same path without a store notification. Numeric-only updates keep their existing fast path.

Eligible owners execute using their exact existing owner IDs with OwnerPreparation and the shared store transaction. The VDOM prepares all disjoint keyed regions before host writes, validates target ownership/version again at commit, updates binding/key indexes incrementally and stages refs. Canonical bindings commit first, then numeric writes, then publication, refs and effects. Removed sinks do not receive staged numeric writes. Cached numeric source history advances selectively, allowing a mixed 0→8 update followed by numeric-only 8→0.

Sparse publication patches only affected reader caches and ancestor lineage metadata. It releases obsolete expanded ancestor output and marks the authored ancestor result for later re-expansion. Existing keyed output edges update directly; owner/state/effect membership stays intact. A subsequent generic or structural update cannot overwrite the sparse result with an old ancestor snapshot.

The full and sparse paths now use one candidate lifecycle factory for phases, freshness checks, publication barriers, store holds, terminal host failures, discard/fail-group behavior and closed-handle cleanup. Artifact-specific preparation and publication stay separate; sparse work does not allocate full candidate maps.

## Review corrections

Independent review added stale rejection for root changes during region normalization and disposal before region commit. It required host mutation before numeric batching, complete artifact release, original render-error propagation, and removal of stale numeric sink history.

The first complete run found one regression: a previously leaf-shaped reader conditionally returned a nested component, causing a speculative selector evaluation followed by a second generic evaluation (history expected 2, observed 3). The existing assertion remains unchanged. Requiring the compiler hint before executing the reader avoids that speculative probe for unhinted/known structural components. The compiler also excludes conditional resource reads and ignores nested callback return statements. The final suite passes the original regression.

## Evidence

Real Rust/OXC-authored TSX with two leaf readers yields the following counts at each of 1k/10k/50k unrelated rows:

| Work per supported store/source-switch/mixed update | Count |
| --- | ---: |
| Reader selection, eligibility checks and component executions | 2 each |
| Reader cache writes, source-history owners and effect owners | 2 each |
| Reader publication map visits | 4 |
| Subscription reader visits | 2 |
| Ancestor lineage visits | 4 |
| Candidate output-tree visits | 8 |
| VDOM old-subtree, validation and candidate-key visits | 3 each |
| Unrelated row component executions | 0 |
| Full key/binding-index rebuilds | 0 |

These counters measure actual eligibility, target inspection and publication work, not just render bodies. Work remains proportional to reader, target-output, effect, ancestor and dependency footprints. All store readers still refresh, so a root with 50k actual readers has 50k relevant readers; no constant-work claim covers that case.

A structural nested-reader mount deliberately falls back, visiting 1,004 / 10,004 / 50,004 owners. Its new effect sees current sibling numeric/ref values. Subsequent row insertion/removal preserves projection, surviving identity/local state and balanced cleanup. The older one-reader fixture now visits one owner on store-only updates; its mixed collection insert retains the generic traversal. Historical results use different fixture versions and are not a matched latency comparison.

Independent runtime cases cover new refs/conditional effects reading current numeric props, numeric history returning to its initial value, an urgent commit invalidating an older prepared candidate, original throw-once errors without hidden retries, and removed numeric sinks. A controlled Node GC probe releases obsolete sparse-reader callback payloads while the source, root and same host remain mounted. Existing candidate/queue/resource/collection/selector and retained-handle probes run against the shared lifecycle.

## Verification and remaining gates

The checkpoint passed 38 maintained commands: 425 runtime tests, 24 Rust tests, authored compiler execution, production/type checks, controlled retention, Portless browser/HMR/input/resource/Three checks, rebuilt private package and external consumer. The installed core, VDOM reconciler and compiler code match the packed build. Source/build and package artifacts are archived in `implementation/2026-10-12-sparse-candidate` after hash verification. Historical notebook and earlier checkpoints remain unchanged.

Resource/boundary eligibility is conservative and sticky for the root's lifetime. Async public preparation and nested/unhinted readers retain generic traversal. Compiled CSR/column graph changes remain on their existing rebuild path. Arbitrary host mutations cannot roll back; post-host invalidation is terminal.

The next decision gate is the prescribed integrated mixed-workload latency/allocation comparison against verified React Compiler, followed by independent-device evidence. Work counts alone do not prove a faster or smaller overall runtime. Comparative maintenance and Sol's full original-goal review remain held; shared lifecycle extraction improves code structure but does not replace that evidence.
