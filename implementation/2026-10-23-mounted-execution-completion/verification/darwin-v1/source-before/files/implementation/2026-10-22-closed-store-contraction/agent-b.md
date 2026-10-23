# Agent B source handoff

Base: `ff95540a7188a4ff2f94ad9ef611b3fcc47b314a`. Owned files: `src/component_state_runtime.ts`, `src/jsx_binding_runtime.ts`, `src/component_state_runtime_test.ts`, this note. No tests, builds, benchmarks, browser, server or VM were run by B.

## Changed mechanism and authority

`ComponentCache.closedStoreOutputShape` is a frozen private receipt for schema 6/7 closed outputs. It records the normalized program reference, owner incarnation, cache props reference, authored and expanded element/props references, host key/tag and both child references. The first eligible cut still performs the full descriptor, key, symbol, owner-stamp and child checks. Later cuts use known data fields only when every recorded reference and owner/key/tag/program matches. Runtime-owned element membership and live `retainedStoreChildAdmitted`/child checks remain. Generic replacement, new props, program replacement, new result/expanded result, or owner retirement misses the receipt and rechecks the full shape. The receipt lives only with its existing cache record and is replaced with the next owned output on publication; it has no external map, registry, accepted mutation or numeric scratch.

The JSX entry builder copies iterable entries into newly allocated ordinary props and freezes props and element once. It preserves the owner stamp used by `copyRuntimeElement` and does not retain the external iterable or its tuples. `copyRuntimeElement` remains unchanged. Root uses it for the two distinct authored/expanded retained-child representations and for no-child scalar output. Schema 4/5 tree output still follows the existing generic copy path. Root asks C's `createOwnedScalarStorePropDelta(region)` for copied scalar data and passes the original region when C returns null.

Closed-cut publication updates each current touched owner cache and direct keyed output, collects lineage into a cut-local Set and invalidates each distinct current accepted ancestor cache once. Existing overlapping-owner rejection precedes this path. No captured whole-cache patch is installed. The immediate ordinary closed-Store flush uses `commitAdmittedNativeCandidate` after one public `validate`; the private receipt still executes `preHostPrivateCurrent` synchronously before host application. Explicit later `candidate.commitHost()` remains the public path with a fresh `candidate.validate()`.

| Old work | Retirement | Authority retained |
| --- | --- | --- |
| Per-frame authored/expanded descriptor maps, expected key Set, symbol arrays | Full check on first or invalidated shape; direct frozen owned fields on matching cache-local receipt | Current cache pointer, World owner, code, reader/source/state/resource checks |
| `Object.fromEntries` plus immediate `copyRuntimeElement` spread | One owned entry-copy allocation per final props object | Frozen runtime-owned element and owner stamp; separate child references |
| Repeated ancestor cache cloning for shared lineages | One cut-local Set and one replacement per distinct current ancestor | Current accepted cache; overlap rejection; direct keyed refresh |
| Second public validation through `commitHost()` on immediate Store flush | Existing private admitted commit after one public validation | Final private pre-host check, post-host checks and private publication check |

## Callback and failure boundary

Ordinary route: capture/stage, public `candidate.validate()` (callbacks may run), private `preHostPrivateCurrent()` through the receipt, claim/begin host application, admitted host program, public post-host validation and publication preparation, final private publication check, accepted Store/cache/VDOM and exact action acknowledgement, then effects/releases. The private pre-host check runs after the final public admission callbacks; neither a kernel nor a host writer is assumed pure. Explicit candidates still call public validation again when `commitHost()` is invoked later. Group acceptance remains in the existing all-member private receipt machinery. Partial host failure still quarantines through `failUnpublished`; no accepted history is advanced by the new receipt itself.

## Coverage and limits

Added a focused test in `component_state_runtime_test.ts` for repeated Store scalar cuts retaining the host/child, a no-op value update, then a generic child replacement followed by another closed cut. Existing retained-child, mixed-input, reentry, exact acknowledgement, explicit candidate, owner-scope and partial-failure suites remain required by the consolidated runner. The new test is authored but unexecuted. The source change does not claim a measured speed saving, whole-frame phase attribution, or that kernel callbacks can be reordered. Shape receipts add a bounded fixed record per eligible existing cache lifetime. Any ineligible scalar region uses C's generic VDOM route.

Luna commands after primary source review: run the single consolidated native platform gate from `orchestration.md`; its runner includes the runtime tests. Then use the unchanged installed consumer proof and one bounded timing phase at the integrated boundary. Do not run a separate B-only benchmark.
