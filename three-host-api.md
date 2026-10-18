# Public Three host (private alpha)

All authored native TSX requires `nativeModulePlugin()` from
`compiler/vite_native_plugin.ts`. It discovers native runtime imports and emits
owner/source plans and JavaScript. See `src/browser/native_three_host.tsx` for
an actual scene and `native-three-host.html` for its page.

## Root and ownership

```ts
import { Scene } from "three";
import { createWorld } from "./src/native_runtime_api.ts";
import { createThreeNativeRoot } from "./src/three_host.ts";

const scene = new Scene();
const world = createWorld();
const native = createThreeNativeRoot(scene, {
  rootOptions: { world, rootId: "my-scene" },
});
// In a compiled TSX module: native.root.mount(<MyScene />).
// Updates use ordinary JSX props and native state/store reads.
native.dispose();
```

The supplied Scene and renderer belong to the application. Root disposal releases
native owners, events, refs and host handles; full host disposal releases its
fallback assets as well. JSX-created geometry/material resources are owned and
disposed once. Resources passed in mesh args or primitive object props remain
borrowed. The caller disposes those assets when their shared lifetime ends.

Constructor `args`, primitive `object` and attachment identity are immutable for
a mounted element. Change its key to replace it. This deliberately differs from
R3F's automatic reconstruction. Resource children attach to geometry/material
(or the documented string `attach` property); replacement uses an attachment
stack so removing the previous child does not overwrite its replacement.

## Namespace constructors and inferred types

The default host resolves camelCase or PascalCase tags from the public Three
namespace and caches constructor resolution at mount. `Reflect.construct`
forwards `args`; no per-class factory list is maintained. A supplied `namespace`
replaces the default catalog. Legacy `registry` factory overrides remain supported.

```ts
class ProbeGroup extends THREE.Group {
  probeMode = 0;
  constructor(size: number) { super(); this.name = String(size); }
}
const native = createThreeNativeRoot(scene, {
  namespace: { ...THREE, ProbeGroup },
});
// Compiled TSX: <probeGroup args={[3]} probeMode={2} />
```

`ThreeIntrinsicElements<typeof catalog>` infers tags, constructor arguments,
instance data props and raw instance refs. Methods and readonly identity fields
are excluded. Required constructor arguments remain required. Use
`jsxImportSource: "@compiled-ui/runtime/three"` for the optional strict Three JSX
backend; custom namespaces can augment its `JSX.IntrinsicElements` with the
inferred map. The default cross-host JSX backend stays permissive.

The current lifecycle supports Object3D, BufferGeometry and Material instances;
textures, buffer attributes and other standalone resource classes need a further
attachment/lifetime contract. Namespace lookup does not promise every export is
renderable. Importing the full namespace may retain more of Three than generated
static imports. No static catalog generation or bundle improvement is claimed.

## Declarative frame props

Named native components can use numeric `useState` and ordinary intrinsic props
such as `rotation-y={phase * 0.42}`. Supported pure expressions compile to direct
writers. The workbench's KineticForm uses this path; its frame test asserts that
objects change while component render counts stay fixed. Unsupported expressions
may require an owner render. There is no blanket no-render promise.

Existing public data fields use generic writers. Dash paths traverse nested
objects, including indexed material arrays. Vector scalar/tuple/instance inputs,
Euler tuples/instances and Color representations preserve mutable value identity.
Removing a prop restores its captured default for the actual target. A replaced
material is resolved on subsequent writes, with separate defaults for each target.
Unknown fields, methods, unsafe paths and malformed numeric tuples are rejected.
Property paths are parsed once; nested target identity is resolved per write.

Projection-matrix invalidation remains an explicit camera policy. Constructor
replacement, attachment callbacks and full R3F event behavior remain unsupported.
The exported property registry contains reserved lifecycle policies; it is no
longer an exhaustive property inventory. Factory/property overrides are optional
escape hatches for custom semantics.

## Coherent dependent updates

The target contract uses dependencies to select consumers and explicit transactions to group outputs. For example, position can update a mesh and its outline together while an unrelated health resource remains pending. A consumer reading position and camera must validate both inputs. Sharing a parent or a store alone does not make every branch wait together.

Explicit `prepareRetained(cells)` / `enqueueRetained` transactions support closed primitive prop deltas with complete input coverage, owner/code identity and live writer validation. `prepareCollections(collections)` / `enqueueCollections` support existing-row moves and single-owner row removals. `prepareTransaction({ cells, collections, stores })` / `enqueueTransaction` combine selected closed local/Store prop writes and collection edits in one accepted publication; selected cells cannot belong to an owner removed by the same cut. Static intrinsic VDOM insert/replace can be prepared separately, while authored collection row callbacks still use the generic fallback. These cuts do not evaluate or advance unrelated Store/resource/Suspense work; such work can remain pending while an eligible cut publishes. Pure moves preserve Store-dependent rows without replay; Store-reading or nested-row removal/replacement retains generic reconciliation for reader and lifetime retirement. Full-tree/cache replacement candidates keep whole-root validation. A separate bounded reveal path drains supported compiler-proven closed resource leaves from accepted initial fallbacks beside an unrelated pending sibling; each requires a direct canonical `AsyncResource` and a fresh independent receipt. Broader resource/reveal shapes remain generic. See the [authoring subset](docs/native-authoring-reference.md#closed-resource-host-leaf) and [verification](implementation/2026-10-18-reveal-workset/verification/gate-results.md).

A Three transaction must finish its required writes before the application calls `renderer.render`. Custom property setters can observe intermediate writes, and a thrown setter may leave partial physical mutations. Accepted native history stays old and the affected root requires disposal/remount. DOM and Three roots can share state and native publication coordination; visually atomic presentation across those renderers or a React island is not established.

## Extension seam

```ts
const native = createThreeNativeRoot(scene, {
  registry: {
    probeGeometry(args) { return new ProbeGeometry(Number(args[0])); },
  },
  propertyWriters: {
    "probe-mode"(handle, value) {
      if (handle.kind !== "resource" || !(handle.resource instanceof ProbeGeometry)) {
        throw new TypeError("probe-mode requires ProbeGeometry");
      }
      handle.resource.mode = value == null ? "default" : String(value);
    },
  },
});
```

Factories return Object3D, BufferGeometry or Material. Custom writers own their
value validation and removal/reset behavior. Registration does not require
private reconciler access or a kernel edit. The exact compiled extension fixture
is `compiler/three_host_extension_execution_test.mjs`.

`describePropertyWrite(handle, name, next)` exposes the host's observed value
policy: `scalar`, `copy`, `borrow-call`, `retain`, or `unknown`. The description
separately names the actual `targetResource` and `valueResource`, when present,
with `owned`, `borrowed`, or `shared-owned` lifetime. For example, an opacity
write on an owned material identifies that material as the target; a mesh's
default geometry is a shared-owned value. The host still owns all disposal and
attachment behavior. Descriptions may read host properties and do not certify
callback purity, no-throw writes, cut admission, or a reusable scratch buffer.
Generic writes and current VDOM validation are unchanged.

The companion base DOM host describes copied style/string/attribute writes and
retained function event listeners while leaving generic property setters and
subclass or instance setter overrides `unknown`. It reports no resource
ownership. This DOM description and the independent ready-boundary drain await
the current consolidated gate; see the [native authoring reference](docs/native-authoring-reference.md).

Custom `propertyWriters` can declare a matching `propertyCapabilities` value
policy. Without that explicit declaration the observed policy is `unknown`.
Extensions must keep a `copy` tuple independent of the caller's array after the
write, while `retain` may keep that same array reference. A declaration does not
alter the custom writer or enable a fast path.

Refs expose raw Three instances after native publication, before effects;
unchanged refs stay attached. Callback cleanup and object.current are supported.
Animation in the example uses props, not ref mutations.

## Events and limits

The host stores handlers on explicit object targets. Pointer dispatch/raycast
helpers deliver intersection data and can carry a native event; there is no
ancestor bubbling. Hover/capture/missed-event policy and R3F event parity are not
claimed. The application owns DOM event listeners and renderer/camera bootstrap.

Host exceptions fail publication terminally; arbitrary GPU/object side effects
cannot be rolled back. Shared mutable Three resources are shared physical state:
writing their material props affects every consumer. Different root projections
cannot independently display contradictory values through the same mutable
material. Clone or independently own materials for that use; this is not a
proof of async isolation for arbitrary shared GPU resources.

React component/library compatibility, packaging, general performance superiority
and long-term maintenance results remain separate gates.

## Cleanup review follow-up — 12 October 2026

Sol's prerequisite review found that per-node cleanup discarded a caught Three
resource disposal exception. The current host surfaces those exceptions through
an `AggregateError`, while the native root continues attempting remaining
cleanup. A resource is marked released before calling its disposer, so repeated
root disposal does not retry a throwing disposer. Diagnostic disposal counts
measure attempts, not successful GPU resource release.

The actual Rust/OXC-compiled `CleanupScene` regression uses a throwing geometry
dispose listener and three other owned resources. It requires the original error
to reach the caller, all four disposal attempts, an empty scene, zero live handles,
resources and event registrations, and no repeated attempt on a second disposal.
The frozen Sol report and prior checkpoint describe the pre-fix source; this
follow-up does not change their observations or establish comparative maintenance.

Final current-source, compiler-binary, authored-fixture, new raw-result and production-asset hashes are recorded in `final-source-build-inventory.json`. It preserves separate v1–v3 gate source snapshots and does not rebind historical measurements.

Ordinary flush now admits complete compiler-closed primitive prop cuts beside unrelated observed pending resources. The actual compiled Three gate exercises scalar `position-x`, retained Mesh identity and shared fallback resource disposal. Unsupported mutable values and incomplete or opaque input batches remain generic. See the [urgent slice receipt](implementation/2026-10-18-urgent-retained/verification/gate-results.md); no GPU or visual qualification follows.

The shared Root now preserves latest suspended direct tree intent and Store dependency lifetime, with strict whole-tree validation and conservative scoped admission while replacement is pending. The new direct-intent fixture uses a memory host and the matched pair uses DOM; this adds no GPU, Three presentation or cross-host atomicity claim. [Core verification](implementation/2026-10-18-direct-intent/verification/gate-results.md) includes the existing authored Three and host conformance cases.

Closed direct numeric Store consumers can use `prepareStores(stores)` and grouped `enqueueStores`, or ordinary flush beside a pending resource. One to eight direct numeric `use(props.store)` statements can drive keyed primitive transform-axis/visibility props, stable position/rotation/scale tuple literals, or a fixed `group`/`mesh` subtree. A scene component may update mesh and outline together while an unrelated health resource remains pending. Every accepted reader of each selected Store must qualify. Joint position/camera consumers capture both inputs, while camera-only consumers remain outside a position cut. Mounted keys must resolve unambiguously; opaque selectors, callbacks, mutable captures and topology changes use generic preparation. Existing mounted handles and owned resources stay in place. See the [authoring reference](docs/native-authoring-reference.md#fixed-store-host-subtrees) and [compiled fixture](compiler/compiled_store_host_subtree_test.mjs). Declared DOM/Three groups coordinate managed accepted state; custom setters may observe intermediate writes and cross-renderer visual atomicity is not claimed.

Structured Store scene state can use compiler-proven static numeric paths through records constructed with `storeRecord`, including joint position/camera expressions and stable tuple literals. Construct each selected nested record explicitly; ordinary frozen objects and Proxy wrappers use generic rendering. The constructor makes a shallow owned immutable copy, while `use(store)` returns whole state and existing Store versions remain the conflict authority. Field paths do not create independent versions or infer transaction intent. See [structured Store projections](docs/native-authoring-reference.md#structured-store-projections) for limits and authoring rules.

The [joint-input continuation](implementation/2026-10-18-joint-inputs/results.md) passes 888 runtime tests and actual compiled Store/World/collection grouping across DOM and Three, preserving mounted geometry/material handles and balanced owned lifetime. The one headless browser transaction observation was slower for Native (6.7/0.6 ms); it includes scheduling and observer delivery before paint and does not establish presentation or cross-renderer visual atomicity.


### Compiled resource subtree reveal

One direct canonical `AsyncResource` input can drive a finite keyed `group`/`mesh` subtree with closed primitive `name`, visibility and transform-axis expressions. The compiler emits the subtree, resource-use site and module revision together. An accepted static fallback with the same logical root key may use a different host type and contain component state/activation effects. Accepted reveal retires fallback owners and owned host resources exactly once; stale setters are revoked and effects clean up after publication. Store-reading, nested-boundary/collection, bound/ref/event/style fallbacks and mutable resource values retain generic reconciliation. Shared resource ownership still follows the host contract.

The [actual compiled DOM/Three fixture](compiler/compiled_resource_subtree_reveal_test.mjs) verifies a ready nested Group beside an unrelated pending branch, immediate disposal of explicitly owned fallback geometry/material, stable later reveal identity and empty teardown. The [904-test boundary](implementation/2026-10-18-resource-subtree/results.md) preserves source locks and failed probes. Its browser comparison uses DOM and establishes no GPU, visual atomicity or general async UX qualification. Full-tree guards remain.

Joint closed scene components may read multiple direct canonical resources together with Stores. Numeric resource fields use the same explicit `storeRecord` ownership and lexical program as Store fields. Every required resource must be ready before the initial fallback reveals; unrelated boundaries can remain pending. Later live Store actions update retained fixed scene nodes through the existing scoped cut. The direct primary component, exact owner/code/writer footprint and resource lifetime remain required; opaque wrappers and unsupported shapes use generic preparation. See [joint inputs](docs/native-authoring-reference.md#joint-store-and-resource-inputs). The [consolidated boundary](implementation/2026-10-18-joint-async-inputs/verification/results.md) passes actual compiled DOM/Three/fork execution and resource disposal checks.
