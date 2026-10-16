# Automatic direct writers checkpoint

12 October 2026. Correctness verified; no new latency claim.

Native roots select the existing direct binding writer mode from their first
commit. The compiler emits tagged source/prop bindings from ordinary TSX.
Direct style fields require host `setStyleProp`; other hosts receive whole style
values, preserving static fields and the ordinary `setProp` contract.

Ordinary direct groups support keyed deltas and prepared indexed-region commits.
CSR/column metadata retains its fallback, including malformed inserted metadata.
Each style field has its own writer group: two style bindings and a bound data
attribute now own three groups. Unsupported cases retain explicit fallback.

A shared equality predicate suppresses Object.is-equal primitive results even
for derived bindings. Stable mutable object/function identities retain the
conservative forced-write behavior. Source, column, dirty-row and adaptive-row
updates use it. Invalidations still evaluate affected projections; source changes
and actual host writes are distinct. Dense workload props still write when all
three projected values change every frame.

Primary review corrected three integration defects: automatic direct mode had
disabled existing indexed owner paths, missing style-field capability could lose
static styles, and direct registration had omitted CSR/column ineligibility.
Indexed routes now use the existing prepared-region mechanism. The failed full
suite log is retained. An execution fixture's removal assertion now counts three
real field groups instead of two aggregate groups; no-rebuild, identity,
source-switch, detached-sink and cleanup checks remain intact.

An empty collection discovers its row schema on the first nonempty rendering.
Tests retain that fallback and require later eligible edits to use deltas. The
actual Rust/OXC fixture mounts empty, seeds rows, reaches three style writers
without row re-execution, verifies numeric props before a same-commit observer,
then checks insert/move/remove deltas and complete store/collection/ref cleanup.
It does not assert first insertion was already a delta.

## Verification

- 458 runtime tests and 25 Rust tests pass.
- 47 integration commands pass, including actual compilation, sparse/full/async
  publication, input/caret/composition simulation, HMR, Three, installed packaging
  and both generated JSX type backends.
- Seeded scalar/style deltas match full recomputation with direct mode on and off.
- Six production pilot pages pass at 128/512/1,024 rows for both arms.

The candidate build is `dist-product-mixed-direct-writers`. V2 and identity-V3
bundles, protocols, records and notebook remain unchanged. Pilots are correctness
preparation, excluded from confirmation. The renewed goal follows the
[performance plan](./performance-implementation-plan.md): attribute this compiled
pipeline, emit executable update programs, unify mixed candidates, then integrate
sparse/dense storage where evidence supports it. Timing/allocation, independent
device, comparative maintenance and Sol gates remain open.
