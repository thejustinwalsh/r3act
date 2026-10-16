# Compiler-proven unary bindings

12 October 2026. First bounded M3 change after the independently verified M1
CPU diagnostic. The derived reader's full-scope sampled self frame was 20.868 ms;
source normalization and acknowledgement frames cost substantially more.

## Implementation

Rust/OXC lowers an already-proven pure numeric JSX expression with exactly one
distinct state dependency to `bindStatePropAt(siteId, value => expression)`.
Repeated reads of that same state remain unary. Compound numeric expressions
keep `bindStatePropsAt`; unsupported, mutable, shadowed or nonnumeric cases keep
the existing general behavior. Helper aliases and source-map edit spans remain
hygienic. Authors use normal TSX and `useState`, without a marker or manual binding.

The runtime resolves the source at activation, captures it through the existing
owner protocol, and reads it without constructing an input array on each update.
One-element source/site arrays still exist at activation. The bound source array
participates in canonicalization after candidate publication. Derived `.read`
semantics remain, so stable mutable object projections conservatively write while
unchanged primitives are suppressed. No separate scheduler or publication path
was added.

## Verification

465 Deno runtime tests, 28 Rust tests, 47 integration commands and six production
pilot pages pass. Coverage includes ordinary authored TSX, emitted singular and
compound calls, source maps, retained rows/effects, conditional owner lifetimes,
reentrant newer state, Three hosts, browser input/HMR, async stores, and a freshly
installed package. Five served production files match the built bytes at
`https://compiled-unary.localhost:1355/product-mixed-v2.html`.

Root review caught a stale-source reader: the first helper draft captured a
source array without attaching it to `binding.sources`, so publication could not
canonicalize the reader. This was fixed and a structural-candidate/new-owner
regression added. A stricter emitted-call count initially counted duplicate code
inside the exported diagnostic plan string. The check now scopes executable
output before that plan, retaining exact two unary/one compound expectations.
The failed integration record and log are preserved in this checkpoint.

The source/build and verification checkpoint is
`implementation/2026-10-12-unary-bindings`. It preserves all previous production
builds, evidence archives and the notebook. This candidate has correctness
evidence only: no new latency/allocation/device/maintenance verdict. Its private
package remains a platform-limited alpha. The full-library goal remains active.

## Next cut

Use stable committed-cell identities to avoid repeatedly resolving owner/site
addresses in notifications and acknowledgements. Keep captured versions immutable
so reentrant changes survive. Eligibility and source history are root-local even
when worlds are shared; candidate snapshots remain isolated. Stage the identity
surface and its lifecycle tests before replacing dirty storage or numeric batch
normalization. Coherent numeric/structural candidates and current allocation/phase
instrumentation remain outstanding. The Sol review retains its prerequisite hold.
