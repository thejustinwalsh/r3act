# Primary source review

Base: `44437ebd4c8f0bda58bc3ef2a7bdf14b2e7d708b`, local main, MIT. Source was authored by Sol medium agents with disjoint JSX/root, VDOM and fixture/test ownership. Luna alone runs consolidated verification and the installed comparison after primary release.

## Authority and behavior

World's monotonically allocated OwnerId remains the incarnation authority. Managed component output carries that scalar in frozen runtime-owned props; VDOM text/element records retain it in compatibility and candidate/copy checks. All four `carryHostKeys` callers and the closed Store/resource output builders use it. Existing explicit key strings and collection reincarnation scoping remain unchanged. Primitive wrappers retain generated keys, including keyed text movement. No alternate owner or source version registry was introduced.

Normalization reads private metadata only after the existing runtime-owned brand. It has no inherited owner context that could conflict with its element-keyed normalization cache. Unowned descriptions retain their old VNode shape. Snapshot constructors preserve the owner scalar; ordinary spread copies preserve it. Owner mismatch uses existing structural replacement and host failure quarantine.

The initial gate caught an integration error in initial Suspense reveal. A bare intrinsic fallback has no component owner and historically supports matching-key host adoption. A component-authored fallback has an owner and must remount. The correction uses explicit, private, directional candidate permission in both generic and scoped reconciliation; global compatibility, cache header and accepted-copy identity checks stay strict. Accepted nodes take the actual content owner. Candidate-only marks are absent from accepted snapshots and retained output caches. Whole-tree/cache candidates retain their root guards; scoped candidates retain exact mounted footprints and private live validation.

Generic reveal uses lazy candidate-local clean-counterpart scratch as existing expansion unwinds, with sparse array replacements and marked-path copies. It does not rescan or copy the whole tree. Clean intrinsic copies read already assembled runtime-owned data, avoiding a second caller property access. Nested mappings are flattened; scratch clears after synchronous VDOM preparation, including failure. The implementation adds a small per-array replacement holder to generic expansion and conditional marked-path copies; it claims no free or faster identity path.

## Verification scope

The actual Rust/OXC namespace fixture restores the original constant-key failure and covers owner key/type changes, same-owner retention, primitive outputs/moves, Fragment roots, refs/effects, owned Three resources, stale/discarded candidates, independent accepted roots and host-create failure. Independent roots are not an additional fork/graft proof. Existing fork/graft, mixed collection/store and partial-failure suites retain their own scope. New root-level Suspense cases cover string/numeric fallback keys, adoption followed by same-owner updates and later key/type replacement, and real fallback-component remounting.

The first full gate fails and remains preserved. Passing new cases does not override its ten existing async reveal failures. The corrected slice requires a fresh consolidated receipt before installed browser proof or timing. The unchanged twelve-file canvas authoring compares current installed Native, React Compiler and an imperative floor; it does not measure replacement latency or causal old/new Native improvement. No current timing is inferred from older evidence, and no R3F, presentation, CPU, cold/memory, independent-device or maintenance advantage is established.

HMR delivery remains unresolved and browser diagnostics remain stopped. This slice closes neither the full product goal nor its remaining performance and release requirements.
