# Three host maintenance baseline

Date: 2026-10-12

## Implemented host checkpoint (supersedes initial absence finding)

The current source now contains `src/three_host.ts`, consumed by the actual
Rust/OXC-compiled `src/browser/native_three_host.tsx` through the composed Vite
plugin. This is a host for the common retained VDOM, not a second reconciler.
`compiler/three_host_execution_test.mjs`, the separately authored
`compiler/three_host_extension_execution_test.mjs`, and
`scripts/verify_native_three_host.mjs` provide direct runtime evidence.

The real WebGL workbench has four roots sharing a world/store. Its frame test
checks advancing Three rotations and prop writes with unchanged scene/actor
render counts and stable object UUIDs. Native pointer raycasting, material
controls, keyed add/remove/reorder, owned-resource cleanup, borrowed resources,
reduced motion and accepted-HMR teardown/remount pass. These are correctness
observations, not a measured React latency comparison.

### Narrow adapter maintenance evidence

| Obligation | Native adapter | Pinned R3F custom renderer |
| --- | --- | --- |
| Renderer integration | Public create/text/prop/place/remove/dispose/public-instance operations; common VDOM handles reconciliation and staged refs | React custom host config plus Three instance descriptors, React priority/transition/fragment support and reconciler-version coordination |
| Private React coupling | No React, Fiber or React reconciler import in `three_host.ts` | `reconciler.tsx` imports React/reconciler constants, models Fiber refCleanup/alternate, handles Fiber refs and internal ReactContext casts |
| New constructor/property | Public factory/property registry; compiled ProbeGeometry extension passes without kernel or adapter edits | Public `extend` already makes constructors easy; generic prop application often needs no custom property writer |
| Feature breadth | Explicit supported properties, resource attachments, direct target events, native refs | Broader prop grammar, automatic args reconstruction, attachment functions/paths, hover/capture/missed events, React refs/portals and compatibility |
| Owned complexity | Native kernel, compiler, scheduler, ref publication and adapter all need maintenance | React supplies a mature generic reconciler; R3F maintains adapter, prop/event handling and its React integration |

This establishes a **smaller public integration protocol and removal of private
React coupling for host authors**. It does not establish lower total library
maintenance cost, feature parity, or a long-term human maintenance result.
Line counts are particularly misleading here: the native adapter has 734 lines;
the pinned R3F reconciler has 669, prop utilities 406 and event manager 797, while
the native common VDOM/owner/store/scheduler/compiler must also be counted.
Neither summing only R3F files nor comparing only adapter files is a matched
maintenance study.

The independent extension here was performed by an AI implementation agent and
then reviewed and rerun by the primary agent. It is public-only source evidence,
not the plan's independent human developer exercise. It found a genuine keyed
attachment replacement bug, fixed before acceptance. Documentation was missing
when the exercise began; `three-host-api.md` now documents the tested seam.

### Review prerequisite status

Working Three host, real WebGL behavior, independent public-only extension and a
concrete source comparison are available. The broader claim “easier to maintain
than R3F” remains unproven. A Sol review must check this prerequisite first,
without adopting the desired conclusion. If the evidence does not support the
user's maintenance gate, hold the full review and report the specific missing
proof. Do not treat green tests or fewer required callbacks as proof of lower
total maintenance burden.

## Initial inventory and scope

At the initial inventory, the checkout did **not** contain a Three.js host. It has a generic
`VDOMHost` boundary, an in-memory host, and a DOM host. Therefore there is no
implemented Three host to compare with React Three Fiber (R3F), and no evidence
yet that extending this runtime for Three is easier to maintain. Treat the
implementation-plan Phase 4 host/adoption gate as open. Do not send the Sol high
full review on a maintainability claim until a real Three host and the evidence
listed below are reviewed.

This is a source-and-contract comparison, not a maintainability result. It does
not infer maintenance cost from lines of code, architecture labels, or generated
code. The comparison is limited to one public rendering-host boundary and the
Three-specific behavior currently embodied by R3F. It excludes React hooks,
React scheduling/lanes, Suspense, portals, Canvas/WebGL setup, frame-loop
subscription, and React library compatibility from the proposed host-extension
exercise. Those are product features outside the narrow task; if they become
requirements, they need a separate capability comparison.

## Pinned evidence

The local primary-source checkout `/Users/tjw/Developer/react-three-fiber` is
at commit `1b98c178f31ea1eb66eb3d19d265ed086e61d6a4`; its package version is
`@react-three/fiber 10.0.0-alpha.2`. The relevant reconciler, utility, and test
files have no local diff at this commit. The checkout has unrelated working-tree
changes in its lock/workspace/config files and NativeScript additions; this
baseline does not inspect those changes. Links below point to the pinned GitHub
revision, and line references refer to the corresponding local files.

- [R3F reconciler](https://github.com/pmndrs/react-three-fiber/blob/1b98c178f31ea1eb66eb3d19d265ed086e61d6a4/packages/fiber/src/core/reconciler.tsx)
- [R3F prop resolution/application](https://github.com/pmndrs/react-three-fiber/blob/1b98c178f31ea1eb66eb3d19d265ed086e61d6a4/packages/fiber/src/core/utils/props.ts)
- [R3F instance ownership/disposal](https://github.com/pmndrs/react-three-fiber/blob/1b98c178f31ea1eb66eb3d19d265ed086e61d6a4/packages/fiber/src/core/utils/instance.ts)
- [R3F event manager](https://github.com/pmndrs/react-three-fiber/blob/1b98c178f31ea1eb66eb3d19d265ed086e61d6a4/packages/fiber/src/core/events.ts)
- [R3F focused utility tests](https://github.com/pmndrs/react-three-fiber/blob/1b98c178f31ea1eb66eb3d19d265ed086e61d6a4/packages/fiber/tests/utils.test.ts)
- [R3F event tests](https://github.com/pmndrs/react-three-fiber/blob/1b98c178f31ea1eb66eb3d19d265ed086e61d6a4/packages/fiber/tests/events.test.tsx)
- [R3F mount-only/reconstruction tests](https://github.com/pmndrs/react-three-fiber/blob/1b98c178f31ea1eb66eb3d19d265ed086e61d6a4/packages/fiber/tests/once.test.tsx)

The project plan calls for a real Three scene, shared resources, events,
refs/effects, updates, teardown, and an independent extension task in
[`library-implementation-plan.md`](./library-implementation-plan.md#phase-4-hostadoption-validation-and-private-alpha).
That plan is a requirement, not evidence that the host exists.

## Existing native public host contract

[`VDOMHost<H, Parent>`](./src/vdom_snapshot_runtime.ts) is a small operation
interface used by `createNativeRoot`: element/text creation, text/property
writes, placement/removal, optional style-property writes, and optional node
disposal (source lines 61–78). `createNativeRoot` accepts a host and container
(`src/native_runtime_api.ts`, lines 126–140). The DOM implementation performs
DOM namespace selection, generic props/styles, and browser event listener
replacement (`src/vdom_snapshot_runtime.ts`, lines 2030–2075). The memory host
provides a test tree.

The VDOM owns normalized element nodes, keys, child ordering, and host handles;
the host receives generic tags and props. Existing tests prove memory-host
keyed reorder identity, detach/fresh reinsertion, host-type replacement, and
native event callback removal on node removal/root disposal
(`src/vdom_snapshot_runtime_test.ts`, tests named “keyed VDOM reorder preserves
host identity and only changes child order”, “removal detaches keyed nodes and
a later insertion creates fresh host identity”, “changing a key's host type
replaces the incompatible node”, and “removing and disposing keyed subtrees
releases native event props”). They do not instantiate Three objects. The
`VDOMHost` shape does not itself define constructor args, property piercing,
Three attachment semantics, raycasting, refs, scene ownership, or Three resource
disposal. Existing generic node disposal is not proof of correct Three resource
ownership.

## Parity map for a fair bounded comparison

| Capability | R3F behavior established by pinned source/tests | Current native runtime evidence | Evidence gap / comparison boundary |
|---|---|---|---|
| Constructor registry and `args` | Reconciler validates catalogue entries, creates `new target(...args)`, and reconstructs on `args` changes; primitive objects are handled separately (`reconciler.tsx` 103–132, 168–179, 474–490). `once.test.tsx` “should reapply when args change (reconstruction)” asserts a changed args tuple constructs a fresh instance path and reapplies a mount-only method. | Host receives a string tag and `createElement` does not receive args as a required contract; there is no Three constructor registry or instance type map. | A Three adapter plus public registration/type surface must be implemented and verified. Generic host node creation is not constructor parity. |
| Property application and prop removal | `applyProps` resolves direct and dashed/pierced properties; copies/sets Three math values; handles events, mount-only methods, refs, texture color space, and auto-attachment (`props.ts` 234–405). `diffProps` resets removed values for fast refresh (`props.ts` 180–220); utility tests assert changed props, pierced updates, reset, vector/color handling (`utils.test.ts` 316–365, 367–580). | Generic `setProp(node,name,value,previous)` is implemented for DOM attributes/events/styles; a Three-specific writer is absent. | For the bounded exercise compare one documented generic custom prop and one constructor; do not attribute R3F's whole property grammar to a scope that does not claim it. If parity claims include R3F props, add a separately enumerated tested subset. |
| Child containment / `attach` | R3F tracks instance children, reparents/reorders Object3D children, and supports string/function attach/detach with restore callbacks (`reconciler.tsx` 162–256, 275–320; `props.ts` 97–149). Utility tests assert old-value restoration, function cleanup, and indexed attachment (`utils.test.ts` 269–313). | Generic host `place/remove` and VDOM child-order logic exist. Memory host reorder tests verify order/identity. There is no attach field, child-vs-property distinction, or cleanup callback contract. | Verify Object3D parent/child add/remove and any intentionally supported attachments. Do not count generic VDOM reorder as Three attachment parity. |
| Resource ownership and disposal | R3F recursively unlinks, detaches, removes event interaction entries and schedules disposable objects on idle; primitive/Scene/`dispose={null}` exceptions are explicit (`reconciler.tsx` 258–320). `dispose` also visits disposable child properties and skips Scene (`instance.ts` 82–94); utility tests assert object/property disposal and Scene exclusion (`utils.test.ts` 138–160). | Generic VDOM supports optional `dispose(node)` after descendants; memory/DOM tests check structural teardown and callback release. No Three shared-resource ownership, opt-out, idle disposal, or exact-once disposal proof exists. | Define whether resources are node-owned or shared/user-owned before porting any policy. Prove remove, replacement, root teardown, and shared-resource non-double-disposal. |
| Events | R3F registers Object3D handlers in per-root raycast interaction state and implements hit ordering/propagation, pointer capture, missed events, hover, and cleanup (`props.ts` 245–260, 364–394; `events.ts`). Event tests exercise pointer hit/missed handling, stopPropagation, pointer capture and release after unmount (`events.test.tsx` 28–132, 354–423, 425–504). | DOM host installs/removes native DOM listeners when a callback changes; tests prove release on unmount/dispose. | DOM event listener behavior is not Three raycast event parity. Limit a host acceptance claim to whatever Three event behavior is actually implemented and tested. |
| `ref` and effects | React reconciler owns refs; R3F sets public instances and handles callback cleanup (`reconciler.tsx` 322–334); deferred cross-instance ref values are stored for commit (`props.ts` 265–269). | VDOM host props exclude `ref`; runtime has separate owner effects but no Three object-ref bridge. | Need public ref semantics and cleanup tests before claiming refs/effects from Phase 4. Reconciler refs and owner effects are different mechanisms. |
| Keyed reorder / identity | R3F maintains a parallel instance descriptor tree and performs Three child array insert/move while preserving object identity (`reconciler.tsx` 212–256, 181–203). | Memory VDOM tests assert keyed object identity and reorder order, with no unnecessary prop writes. | This is the strongest current semantic overlap, but host-specific Three insertion/removal still needs tests. |
| Root ownership | Every prepared R3F instance retains root store and parent; `findInitialRoot` handles portal root traversal (`instance.ts` 14–47, 123–145). Root container operations resolve scene/container and `__r3f` instance (`reconciler.tsx` 448–470). | `ComponentStateRoot` owns VDOM root state and disposes it. There is no Three scene/canvas root or cross-root object/resource contract. | Define scene/container lifetime and multi-root/portal exclusions explicitly. |
| React internals / prop filtering | R3F filters React `children`, `key`, `ref` from instance props (`instance.ts` 11, 97–110); it implements React's custom reconciler host config and uses Fiber data for ref cleanup/update operations (`reconciler.tsx` 30, 322–334, 422–437). | Native compilation emits supported components into the project's explicit owner/site APIs. This is not a React custom renderer or Fiber host config. | Do not compare private reconciler obligations as if they were required of the native runtime. Conversely, do not claim React component/library compatibility. |
| Prop updates / lifecycle commit | R3F diffs props, preserves equal values, resets removed values where possible, batches reconstructed object swap, and invalidates the frame (`reconciler.tsx` 474–510 and `props.ts` 180–220, 402–403). | VDOM diff compares prior/new generic props; native host candidate preparation/commit adds its own publication and cleanup phases. | Existing memory-host behavior establishes generic updates only. Three update failure/recovery and frame invalidation are unproven. |

## Bounded extension exercise for the next real Three-host slice

Run this only after a minimal public Three host exists. It is a small human
extension check, not a long-term maintainability study:

1. Give an independent developer only the public host API docs, a runnable
   Three example, and the documented extension mechanism. Freeze the baseline
   commit and acceptance cases first.
2. Ask them to register a small user-defined `ProbeGeometry` whose constructor
   takes one numeric arg, and make a custom public prop `probe-mode` update the
   geometry's `mode` property. The extension must use only documented public
   imports; no private kernel/VDOM imports or edits.
3. The authored TSX fixture mounts it under a mesh, updates the prop, changes
   the constructor arg (requiring replacement or the explicitly documented
   update behavior), removes it, and tears down the root. Assert the live scene
   tree/value at each step, the old object's detach, and exactly one cleanup
   call for the owned disposable resource. Include one sibling reorder to prove
   the extension did not break shared reconciliation.
4. Have the developer record elapsed hands-on time, clarification requests,
   files changed, test failures, and any undocumented decisions. A reviewer
   checks the public-only import boundary and that kernel/reconciler files have
   zero changes. Preserve the exact patch, test output, and a short developer
   explanation of how they found the extension points.

Success means this one extension task is discoverable and can be completed
without kernel changes, with all acceptance assertions passing and no hidden
private imports. Failure means the public seam or ownership contract needs work.
One pass cannot establish “easier to maintain than R3F”; repeat with multiple
developers/tasks and compare equivalent feature slices before making that
broader statement. Do not compare elapsed time until the extension brief,
starting context, feature scope, and developer experience are matched.

## Evidence required before Sol review dispatch

1. Root verifies the actual Three host exists in the current checkout and names
   its public entry point and source revision; the current finding is absence.
2. Root validates a host contract against the plan's requested slice: object
   creation/args, prop updates and resets, child insertion/reorder, resource
   ownership/disposal, events, refs/effects, and root teardown. Mark deliberate
   exclusions rather than implying parity.
3. Focused host tests assert visible scene state and cleanup on update,
   replacement, removal, keyed reorder, shared resource references, events,
   refs, and disposal. Source assertions alone are not runtime evidence.
4. Run the bounded independent extension exercise above and preserve its
   patch/protocol/output; verify no kernel/private imports or kernel changes.
5. Make a fair matched comparison: same supported feature set, separately
   attribute the native generic VDOM kernel, Three adapter/registry, compiler
   demo/API work, and R3F's generic React reconciler/event/prop machinery. Keep
   unsupported React features out of the comparison and disclose them.
6. Root reviews the source and evidence, then decides whether the review packet
   supports a narrow extension-cost observation. No current evidence supports
   the broad conclusion that this host is easier to maintain than R3F.
