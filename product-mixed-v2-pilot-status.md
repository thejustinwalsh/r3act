# Compiled product mixed V2: pilot, not collected evidence

12 October 2026. No confirmation pages have been collected. Historical mixed V1
records, notebook and verified sparse-candidate archive remain unchanged.

The new harness has separate authored native/React TSX modules, equal three-field
numeric state, identical DOM/CSS, synchronous lifecycle-inclusive commit timing,
retained-key identity/output/lifetime checks, and a production-only confirmation
schedule (five counterbalanced pairs at 128/512/1024, 60 warmup/240 measured
frames). The compiler proof must validate generated component bodies rather than
helper imports or embedded plan text.

Pilot review corrected mismatched classes, active versus cumulative writer counts,
duplicate/removed state updates, an unnecessarily quadratic edit planner, and
render/effect mutations that caused React Compiler to skip components. Direct
Babel inspection now reports CompileSuccess for ReactRow and ReactBoard. Native
row inspection proves three numeric writer calls and three prop-only state sites.

**Compiler prerequisite implemented:** an explicitly imported native
`KeyedCollection<T>` trait on required destructured component props now lowers
maps, including immutable aliases and parenthesized JSX callbacks. Semantic
symbol checks reject unrelated same-name types and reassignment. All eligible
props are tracked; a compiled two-source runtime fixture verifies second-source
notifications, identity and cleanup. The benchmark passes generated row-writer
and eligible collection-call checks, and ReactRow/ReactBoard memo-cache checks.
The six production browser pilot pages pass at 128/512/1024 for both arms, including output/order/identity/lifetime/teardown. No confirmatory pages collected.
Type annotations are optimization contracts; runtime source/key validation still
applies. RAF intervals precede their recorded update and must not be interpreted
as the response to the associated structural flag.

## User-directed adapter design review

The original Three proof host manually cataloged constructors and properties. This was a
bounded reference implementation, not evidence of the intended generic extension
architecture. Replace constructor-specific factories with a public namespace or
explicit constructor catalog, infer constructor args and instance data props from
TypeScript, and resolve/cache generic property writers once per binding. Keep
explicit policies for attachment, borrowed versus owned lifetime, prop removal,
constructor replacement, events and exceptional invalidation. These semantics
cannot be inferred solely from a class name. Generated static imports/writers
should be the mandatory compiler's optimized path; dynamic lookup provides the
extension fallback. Preserve existing correctness contracts during replacement.

Namespace construction and cached generic property writers have now replaced those
catalogs, with explicit lifecycle/projection policies preserved. Strict inferred
Three JSX types are packaged as an optional backend. The demo no longer repeats
IcosahedronGeometry construction. These changes do not establish total code-size,
maintenance or comparative performance improvement.

Pilot corrections also made CSS lengths explicit (``${x}px``/``${y}px`` in both arms); the native DOM backend does not currently emulate React numeric-length conversion. Cache lifetimes were corrected so remounted borrowed Three objects recapture current defaults.
