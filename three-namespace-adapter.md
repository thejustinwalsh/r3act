# Namespace-based Three adapter checkpoint

12 October 2026. Implementation evidence, not a comparative maintenance verdict.

## What changed

The host resolves constructor names from a supplied public namespace, defaulting
to Three. It forwards constructor arguments through `Reflect.construct` and caches
resolution at mount. The demo's hand-written IcosahedronGeometry factory is gone.
Factory overrides remain available when a class needs custom construction.

Generic property writers replace the per-field catalog. They parse dash paths
once, update existing public fields, convert known mutable Three values in place,
and restore defaults on prop removal. Nested targets are resolved at each write
because attachments can change. Each handle owns its writer-cache lifetime;
remounting a borrowed instance captures the new lifetime's defaults. Projection
matrix invalidation and attachment/ownership semantics remain explicit policies.

`ThreeIntrinsicElements<typeof namespace>` derives tag names, constructor args,
instance data props and refs. Methods and readonly identity fields are excluded;
required constructor args stay required. The optional packaged Three JSX backend
checks real TSX and supports augmentation with inferred custom class props.

## Evidence and review corrections

The compiled namespace fixture uses PointLight, OrthographicCamera,
IcosahedronGeometry, MeshPhysicalMaterial and a custom ProbeGroup without a custom
factory or property writer. It checks prop updates/removal, indexed material
paths, retained identities, camera invalidation, malformed values, borrowed
instance remount and complete teardown. Existing Three execution, custom override
and live WebGL/HMR contracts are retained.

Primary review corrected malformed tuple acceptance, unknown/method properties,
per-write path parsing, ordinary data default identity and a cache that retained
old defaults across host lifetimes. The default Mesh constructor still uses
host-owned fallback geometry/material to avoid hidden untracked allocations;
explicit args follow Three construction semantics, including material arrays.

## Limits

The lifecycle currently covers Object3D, BufferGeometry and Material elements.
Texture, BufferAttribute and other non-scene resources require an additional
attachment/lifetime contract. The namespace fallback can retain more of Three
than a generated static catalog; no static catalog generation or bundle reduction
is claimed. Conversion still dispatches at runtime, and nested paths are not a
zero-cost operation. There is no measured adapter speed comparison.

Line counts include reusable writer/type code and lifecycle policy. Removing the
catalog does not prove smaller total implementation or easier maintenance than
R3F, which already supports public namespace extension. Independent human evidence
and Sol's held review remain separate gates.

## Compiler and integrated evidence preparation

Native KeyedCollection types can now identify required destructured component
props. Resolved import symbols and immutable aliases are recognized; unrelated
same-name types and reassignment are excluded. All eligible collection props are
tracked, including a verified two-source runtime case. Parenthesized JSX map
callbacks are accepted. Runtime validation checks the actual source and row keys.

The new authored-TSX mixed workload has matching three-field state and explicit
CSS length strings. The native row emits three prop-only writers and an eligible
collection region; ReactRow and ReactBoard emit React Compiler memo caches. Six
production correctness pilot pages pass. Confirmation results are not collected.
