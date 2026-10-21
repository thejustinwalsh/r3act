# Primary integration review

Status: source review in progress; no current-slice execution result yet.

The replaced mechanism is the unscoped component site lookup beneath intrinsic parents. The existing World parent/site/key tuple remains authoritative. Structural scope augments the site; authored component keys and existing flat-list ordinals remain unchanged. Component and Suspense boundaries reset the scope, making partial expansion and retry independent of their diagnostic traversal prefixes.

The Root diff applies the same encoding to generic component and Suspense lookup, checked keyed reuse, collection row lookup/allocation and collection region cache keys. Collection caches carry structural scope. Multiple same-site collection regions under one component conservatively decline direct/mixed optimization because the existing single-region component cache cannot prove an unambiguous host target. Generic rendering retains separate region readers and owners.

Generated intrinsic keys use a private symbol on existing runtime-owned props. Canonical copies preserve the marker; host enumeration ignores it. Scope reads authored keys through own data descriptors on runtime-owned elements. Opaque host keys receive positional scope, avoiding a new key-getter invocation during expansion. Keyed-move preservation here covers normal runtime-owned JSX; no stronger opaque-input promise is inferred.

New authored coverage includes independent local state beneath equal component keys, keyed host movement, host key/type replacement, nested arrays and Fragments, positional host replacement and same-site collection updates. Fixture 49 compiles through Rust/OXC, verifies schema 6 metadata, and exercises repeated component and host keys, retained children/events, Three resources, fallback and per-root Store history. It is not evidence of execution until the consolidated gate actually runs it.

The installed consumer deliberately repeats component key `motion` beneath distinct keyed structural parents. Its fresh source lock and build proof must precede browser observations. The prior shared-clock loss supplies no timing for this source. A new bounded comparison will remain descriptive, with no causal old/new saving, R3F, GPU/presentation or release qualification inferred.

Partial-owner coverage now checks the actual partial publication path; separate same-site Suspense boundaries cover independent first reveal, retained accepted primary and retry. Closed first-reveal allocation accepts only a direct child/forward chain beneath the existing boundary owner, so its raw sites correctly agree with generic expansion after the boundary reset.

Independent Sol review found two issues before execution. First, a cached component can own multiple scoped collection regions while its optimization hint retains only the last region; synchronization would detach the others on unrelated sibling work. Complete membership must survive cached reuse, while rerender/removal must retire obsolete regions. Second, concatenating an unrestricted authored site with a scope suffix permits a crafted direct-site collision. The repair reserves NUL for runtime identity and encodes the complete scoped tuple in a separate runtime namespace. Ordinary direct component sites remain unchanged; generated compiler sites contain no NUL. Both repairs and regressions are pending source review before release to Luna.

Execution must inspect every gate result, because the runner continues after individual failures.

Primary also caught recursive string escaping in the initial structural scope encoding: serializing the previous encoded string as another JSON string repeatedly can expand exponentially with host depth. Segment framing must append only the new segment with an unambiguous length prefix; the complete scope is encoded with the base site once. A deep-host regression belongs in the consolidated suite. This finding was source-only, before any execution or timing.

The second independent source review accepts the collection carryover repair: capture existing region references only for unchanged parent cache identity (or owners outside a partial structural replacement), merge retained references before freshly collected regions, and clear the old optimization hint on structural rerender. Authored component and collection sites both reject NUL; the scoped namespace encodes the full base-site/scope tuple. No second mutable membership or identity authority is introduced.

It also confirms the single-reader validation rewrite is equivalent for admitted closed owners. Their definition/revision metadata and copied props have no user callbacks, and the relevant owner/reader Maps and membership Sets are private built-ins. Thus moving reader-prefix checks after all owner predicates changes only which false is observed first. Resources still validate last, preserving public/private variants. Canonical decimal prefixes must match exactly; pending readers retain selected-Store coverage checks, and the retired-pending waiver never waives direct owner coverage. Implementation and final review remain pending; no timing is attributed to this source finding.

## Integrated source freeze

Final independent review finds no remaining concrete bug in the implemented scope framing, namespace validation, collection carryover/retirement or single-reader validation. The latter builds a transient set of exact `String(owner)` prefixes after owner predicates, then scans current readers once. This avoids numeric coercion altogether and is rebuilt on every validation call; no persistent authority or cached admission exists. Input membership identity checks, direct-owner coverage, selected-Store/pending coverage and resource-last public/private variants remain.

The 64-level host regression includes escaped and separator-like keys. Same-owner uncovered-reader coverage declines a manually inconsistent closed proof; existing retained-child coverage retains newer host-time actions and checks post-host publication. Cached-region coverage explicitly identifies the full-reconcile route, while region-removal coverage identifies structural-owner publication. These are authored assertions pending execution, not passing results.

Source is being released for one consolidated gate. No helper tests, compiler builds, browser runs or timings occurred during implementation. Future repairs require fresh receipts and preserve the failed source lock.
