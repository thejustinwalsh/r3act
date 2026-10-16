# Prepared style writers

13 October 2026. Implemented and correctness-verified following the World
journal CPU diagnosis. This candidate has no new latency verdict.

## Public host capability

```ts
prepareStyleProp?(
  node: H,
  name: string,
): ((next: unknown, previous: unknown) => void) | undefined;
```

The optional factory resolves a writer at binding activation. It must not mutate
the host, and its returned function must implement the existing `setStyleProp`
semantics. It may decline with `undefined`. Field splitting still requires
`setStyleProp`; a factory alone cannot replace the whole-style capability or
drop static fields on hosts whose `setProp` replaces the style value.

Retained binding groups reuse the resolved writer across updates, matching
source membership refreshes and keyed moves. Numeric programs, direct source
batches and column writes use one common group-writing helper. Removed or
replaced groups release their writer references. Existing equality, projection
staging, host guards, errors and publication order remain in control.

The DOM host checks element eligibility and captures its style object once. It
selects custom-property versus ordinary-property behavior once, preserving
nullish clearing and existing `String` coercion. Mutable custom-property methods
are still looked up with the style object as receiver on each call. The inherited
factory declines for hosts which override the established setter; a subclass can
provide an explicit factory when it wants that capability.

No author flag, ref mutation loop, JSX syntax change or compiler bypass is added.
Ordinary compiled TSX selects the capability through retained binding activation.

## Verification

- **593 Deno tests and 29 Rust tests pass**, plus native tooling type checking.
- The new execution wrapper runs two existing actual Rust/OXC TSX fixtures with
  a public host factory: 73 activations and 80 subsequent writes. Sparse/dense
  numeric cuts, unsupported/mixed fallbacks, keyed edits, retained identity and
  numeric values before an observer effect all pass their existing assertions.
- Focused real-browser DOM checks pass for HTML/SVG ordinary/custom properties,
  nullish clearing, coercion errors, activation-time style lookup and fallback.
- Two selected forced-GC lifetime probes pass: existing native-cut retention and
  prepared-writer removal/disposal during a write, while roots, hosts, containers,
  dead setters and stable handles remain retained.
- Private package build and fresh installed consumer checks pass; the installed
  compiler/JSX type generation still works without Cargo in the consumer.
- Separate production build and all six correctness browser pilots pass through
  Portless. These pilots are not timing evidence.

The first added primary regression run had an incorrect test import; its log is
preserved and the import was fixed before the final full suite. The first new
retention probe retained application data in a caller-owned collection after UI
disposal. The corrected probe explicitly removes that application data before
testing framework references, while keeping the collection itself retained.
Both failure logs are preserved. Disposal does not erase caller-owned data.

## Limits and next decision

The CPU profile identifies style application as a large sampled native context.
It cannot distinguish all browser setter work from JS work or predict how much
this factory removes. Extra per-group writer closures add activation allocations
and retained metadata until release. This is not zero allocation, a whole-library
size win, a universal maintenance result or a speed claim.

Archive this candidate, then collect one fixed confirmation under the existing
integrated thresholds. Do not tune the baseline, exclude pages, pool profiles
with timing, or replace the gate with fewer component executions. If it misses,
the ranked next questions are numeric-program planning and repeated native-cell
identity/version lookup; a broader storage path must address those measured
costs and retain ordinary TSX plus coherent publication.

See `world-journal-cpu-findings.md`, `world-journal-allocation-findings.md` and
`performance-implementation-plan.md`. The original async, host, compiler and
compatibility scope remains intact. Device and human maintenance gates remain
open, the full Sol review remains held, and the goal remains active.
