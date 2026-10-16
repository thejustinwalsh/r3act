# Compiled state-layout foundation

13 October 2026. **Correctness verified foundation; product routing pending.**

The prepared-style integrated timing gate failed at every size. Its evidence is
preserved in `implementation/2026-10-13-prepared-style-timing/evidence.tar.gz`,
SHA-256 `00b388eedeea2fa7e80b91e109e9c2dcbcf648db7c0aebaf352a9a4db118e5cd`.
M5 evaluates remaining state/address work using existing columns and retained
VDOM. It does not add a caller-visible mode or bypass ordinary TSX.

## Implemented and reviewed

- `NumericColumn.reserve` grows geometrically while preserving the column and
  source identities. Existing bindings read the replacement Float64Array.
  Capacity growth happens at activation, not per frame.
- `setColumnRows` now reuses root-owned staging buffers and numeric epoch
  deduplication. Every changed projection is computed before the first host
  write. Used references clear in `finally`; disposal releases capacity and
  cancels remaining writes. Existing numeric reentry guards remain authoritative.
- Rust/OXC emits optional state-layout metadata for existing compiler-proven
  prop-only state sites whose sinks are supported unary numeric projectors.
  Compound, repeated or unknown expressions conservatively exclude a site.
  Template CSS projectors qualify. Dense slots follow authored state-site order,
  including conditional hooks and sites beyond index nine. Empty layouts omit
  the metadata. Helper signatures and authored syntax are unchanged.
- `defineComponent` validates layout version, dense slots, site eligibility and
  duplicate addresses, then defensively copies and deeply freezes the metadata.
  Components without layouts preserve the previous metadata shape.

Three bounded Luna high agents implemented capacity, VDOM scratch and compiler
metadata separately. Primary reviewed their code, added runtime metadata
validation, and added projection-time disposal and mounted-row growth tests.

## Primary verification

- Complete Deno runtime suite: **606 passed, 0 failed**.
- Complete Rust compiler suite: **32 passed, 0 failed**.
- TypeScript native-tooling check: passed.
- Actual Rust/OXC product TSX metadata proof: three unary template state slots.
- Existing compiled style/numeric execution proof: passed (73 factory
  activations, 80 writes), including established fallback and lifecycle checks.
- Additional focused primary tests cover layout validation, defensive copying,
  disposal during projection, and column growth plus structural row activation.

Logs are preserved with the foundation checkpoint. No fresh product timing,
allocation qualification, package release matrix, or browser pilot is claimed
for this foundation. The served product build from the prior timing study remains
its own immutable candidate.

## Next integrated cut

Use the compiler descriptor to install World owner/site numeric lanes, with a
stable exact identity, version, row and generation address. Route ordinary
compiler-transformed state helpers and bindings to those lanes. Root captures
addresses and versions into reusable buffers, stages a multi-column row cut in
VDOM, and acknowledges only successful captured versions. Integrate candidate
private rows/overlays with the existing host-commit/publication boundary;
unsupported and promoted state retains the general path. Shared roots must
keep independent pending cuts. Refs and effects follow publication.

Begin with the three unary sinks already emitted for the real product workload.
Prove sparse/dense updates, owner insert/move/remove/replacement, sticky promotion,
stale/discarded candidates, host reentry/failure, shared roots, and effect ordering
through authored TSX. Then build and qualify a new complete product candidate and
run the unchanged registered comparison. Do not infer faster dispatch from a
column data structure alone. Worker execution, streaming, hydration and Wasm
remain deferred; human maintenance and independent-device gates remain open.
