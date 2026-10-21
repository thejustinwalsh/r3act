# Component output identity

Source basis: `44437ebd4c8f0bda58bc3ef2a7bdf14b2e7d708b`, local main, MIT. This is a semantic correctness slice of the master plan's identity, accepted-history and host-lifetime contract. It does not reopen the exhausted dense attribution recording or select a physical layout.

## Concrete failure and replacement

The previous unit's `evidence/namespace-three-v2` preserves an executed failure: replacing a component's key creates a new World owner, but its constant explicit mesh key allows the old mesh and resources to survive. Collection reincarnation already scopes explicit keys. Ordinary component output does not carry its owner into VDOM compatibility.

Replace tag/key-only host compatibility for managed component output with tag/key plus existing World owner identity. World allocates owner IDs monotonically, including private prepared incarnations; no parallel identity/version registry is needed. Keep public host keys and existing collection scoping unchanged. Same-owner updates and keyed moves must retain handles, resources, refs and effects; changed key/type or reincarnation must retire the old output lifetime.

## Integrated path

The existing component-output copy records a private scalar owner symbol in frozen runtime-owned props. The existing element ownership brand gates reads; no arbitrary object or Proxy is probed for this metadata. Intrinsic roots carry the stamp; function-component output delegates host identity to the resolved child owner. All generic, partial, closed Store and forwarded resource/Store output builders must preserve the same authority.

Primitive string and number roots use a runtime-owned Fragment containing their value, owner and normal generated host key. This keeps the public RuntimeNode union unchanged. VDOM converts that trusted primitive wrapper directly to a text node with its key and owner. Keyed text components therefore move without remounting. Ordinary unowned elements/text keep their previous snapshot shape.

Normalized element/text records retain optional `componentOwner`. Compatibility, accepted-copy/header checks and scoped snapshots preserve it. Existing spread-based cache, accepted and mounted clones retain it. Normalization has no inherited owner parameter: a cached element's identity depends only on its own stamped input, avoiding a second context-dependent identity cache.

The extra scalar is immutable derived identity, not a freshness substitute. Keep code/source versions, root bases, writer lifetime, exact acknowledgements and per-root accepted histories. A mismatch follows the existing incompatible-node application path and partial-failure quarantine. Do not promise rollback of arbitrary host effects.

## Budget and falsifiers

There is no measured performance saving budget. This change removes an invalid reuse decision. Its cost includes a scalar on managed output descriptions, a compatibility comparison and primitive-root wrappers; ordinary intrinsic stamping joins the existing root copy rather than adding a second copy pass. Generic subtree remount is required work when the owner changes. No eager whole-tree snapshot copy or new mutable registry is introduced.

Falsifiers include reuse after owner replacement, remount on same-owner update or keyed move, dropped owner/key in a candidate/snapshot/clone, new getter/Proxy callbacks, changed host keys, premature/double resource disposal, incorrect ref/effect lifetime, stale/discarded candidate acceptance, loss of independent-root history, or accepted-pointer/version advance after host failure. Text, number and multi-root Fragment outputs are required coverage, not optional exclusions.

The actual compiled namespace fixture restores the original constant-key case. It also covers key/type changes, same-owner retention, primitive roots and moves, multiple roots, exact ref detach/attach, owned resources, independent-root isolation, discarded/stale preparation and host-create failure. Existing full fork/graft and collection/mixed publication suites retain their own scope.

## Verification boundary

Sol medium authors disjoint root/JSX, VDOM and compiled-fixture slices. Primary reviews integration; Luna runs one consolidated frozen correctness gate after source freeze. Preserve failures. A necessary source correction gets a separate receipt; no favorable retry occurs.

The boundary comparison reuses all twelve authored files of the previous installed 256-object RAF/canvas harness byte-for-byte, with fresh current package tarballs and new source/asset locks. It compares Native, React Compiler and a separate imperative floor once after an untimed proof. This measures stable frame and mount cost for current source; it does not measure owner-replacement latency or establish a causal before/after saving. No R3F, physical presentation, CPU, cold/memory budget, population-tail or independent-device claim follows. Previous slower timing stays immutable.

HMR browser diagnostics remain stopped. Only a concrete source finding can reopen that work; this identity slice does not qualify HMR delivery or complete the product release requirements.
