# Primary integration review

Source basis is local `449205a1c9e16df9f00fe073e4d74f102e9fc8e9`. Sol medium authors implementation; Luna executes gates. The primary reviews shared source and maintains the checkpoint. This review distinguishes source contracts from measured performance.

## Ordinary closed collection rows

`ComponentStateRoot` reuses the existing closed row program for ordinary mixed preparation. The collection-only route reads its existing delta once; an explicit `"closed-row"` result selects mixed preparation for eligible insert/replace. Move/remove retain the direct delta route, and unsupported rows retain generic rendering. No extra collection reader, source-version registry or eager tree copy is added. Existing ownership, exact captured acknowledgement, per-root accepted history and full-cache root guards remain.

The actual compiled fixture covers ordinary collection-only and mixed numeric/Store publication, retained/reincarnated identity, stale capture/newer actions and opaque controls. These are semantic coverage claims, not a dense speed claim.

## Heterogeneous numeric programs

The old executor required all reached rows to share one exact generated program object. The new executor keeps the uniform fast route and stages heterogeneous certified programs in contiguous original-input runs. All input mirrors precede program execution; every run output validates before any host write. One shared row `seenMask` deduplicates sinks across interleaved runs. Run-local staged indices map back to original inputs, preserving first-touch host order.

An uncertified row preserves whole-cut generic fallback. Missing staged outputs are detected with own-property checks, while explicitly staged `undefined` remains legal. Type narrowing proves a run record without allocating a wrapper. No new diagnostic callback is introduced inside the executor. Per-run arrays and remapping cost real work; no before/after Native comparison attributes a performance benefit to this extension.

Direct VDOM and actual-compiler fixtures cover interleaved programs, malformed late output before writes, generic differential output, reentry/newer actions, numeric edge values, retained identity and partial host quarantine. Existing broader fork/history tests retain their scope; the newly named independent-root case does not by itself prove shared-cell fork semantics.

## Retained scene children

The actual workbench's structural component is not declared pure. It retains branches, resource inputs and pointer handling. Separate `SharedMotion` and `OwnedMotion` components own numeric state and literal-rate rotations, returning an intrinsic Group around direct `props.children`. Group position and rotations preserve the original transform composition; meshes/resources stay retained inside the group.

Rust/OXC permits the child reference only directly in JSX child position, once, with an identifier props parameter and an actual emittable numeric owner kernel. Derived, computed, aliased, attribute, duplicate and effect child reads decline. Direct primitive fields used by the activation effect join primitive prop guards; escaping the props object or reading reserved fields declines. A failed kernel emission clears the owner's prop-only certification.

Runtime admission checks frozen runtime-owned parent props and an own data descriptor containing one frozen runtime-owned child element. It checks the brand before `Object.isFrozen`; arbitrary Proxy children are not probed for purity. It never inspects child contents. Existing child source/cache updates and structural replacement remain authoritative.

Owner-update program schema 3 requires this retained-child guard. Schema 2 stays supported for existing numeric owners; binding descriptors and state layout schemas stay unchanged. Registration validates the metadata/program pairing. Older cores reject schema 3 instead of silently omitting its guard. This is not a general core/compiler version handshake.

The namespace fixture checks actual workbench metadata and executed numeric cuts, including zero component-render increments, nested state, changing host-key replacement, owned resources, outer removal, final disposal and Proxy generic fallback. It was absent from the old 44-fixture runner. The integrated runner now executes it as fixture 45; do not attribute it to the earlier 44-fixture receipts.

## Frame and observation boundaries

One application RAF advances registered setters, flushes the scene and checks its declarative epoch before drawing. DOM roots retain independent cadence. Deferred publication skips the draw. Registration cleanup and the one RAF follow owner/application lifetime. Observed epoch agreement does not certify physical presentation, arbitrary pending-resource completion or cross-renderer atomicity.

The browser's second failure exposed a diagnostic race: its shape list reflected the Store head before the manually scheduled scene publication. `sceneObjects` and `actualSceneOrder` now enumerate mounted motion groups independently; domain `sceneOrder` remains separate. No disposal assertion is relaxed. The earlier failure alone does not establish a resource leak.

## Open generic identity finding

The failed `namespace-three-v2` supplement preserves a distinct issue. Replacing a component key creates a new World owner, but a constant explicit host key can survive ordinary `carryHostKeys`, allowing VDOM to reuse the host and resources. Collection reincarnation already scopes explicit keys; ordinary replacement does not. The master plan's identity/lifetime requirement does not establish this as intentional.

The corrected fixture explicitly changes its host key to test retained-child subtree replacement and disposal. It does **not** fix or qualify constant-key cross-owner behavior. A later generic identity slice should use existing owner incarnation as immutable VDOM identity, preserve public keys and account for every accepted/scoped clone; no parallel registry is justified. Text-root behavior also needs a stated contract. This remains a product gap, with its failing source archived.

## Performance and remaining scope

The one installed comparison is slower for Native publication. Its source predates the retained-child correction; the correction inherits no timing. Main-thread batching, loop fusion and affected-work selection remain the human's intended computation-DAG direction. Async wait overlap is separate, and no worker or R3F speed claim follows.

Release performance/cold/memory and independent-device requirements remain open. Historical narrow wins and the qualified dense loss retain their original scope. No maintenance advantage is claimed; participant count remains zero. Correctness receipts and all failures are recorded in [results](results.md).
