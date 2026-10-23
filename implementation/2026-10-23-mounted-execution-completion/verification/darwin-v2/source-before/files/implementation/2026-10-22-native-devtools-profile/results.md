# Why the Native update still costs more

r3act already uses React's main retained-tree pattern. Its eligible compiled path skips motion component bodies, retains the static children/resources, batches numeric work and publishes before draw. The missing speed comes from work surrounding that batch: constructing and repeatedly proving a transaction over Store readers, owners, targets and accepted history. More JSX memoization does not remove those passes.

This conclusion now has an actual Chrome DevTools Performance capture, not just a source trace. One headless four-context episode ran Native → React → React → Native, preserving all four importable trace files. The original update windows are recorded as User Timing spans; analysis uses the same trace clock for V8 samples and confirms exact authored-update ancestry. The capture took 19.44 seconds. [Receipt](evidence/devtools-profile-v3/receipt.json), [full analysis](evidence/devtools-profile-v3/analysis-v2.json), [independent raw review](primary-review.json), [ancestry-filtered review](primary-ancestry-review.json).

## What the profiles show

For the 60 measured updates in each Native context, the following are **nonoverlapping sample-family shares**, restricted to samples whose entire preceding sampling interval fits inside the original update window and whose stack contains the exact authored update method. The two denominators are 1,649 and 1,123 samples. These are sampled execution distributions, not exact CPU times or removable latency budgets.

| Native work | First / last Native sample share |
| --- | ---: |
| Full Store prototype audit | 19.7% / 20.4% |
| Initial owner selection and retained-shape preparation | 16.7% / 13.2% |
| Repeated `current()` owner/reader coverage checks | 15.6% / 17.6% |
| Host application and its nested adapter work | 11.0% / 10.3% |
| Reader receipt methods, excluding the separately counted prototype audit | 6.0% / 6.1% |
| Batch schedule construction | 5.2% / 6.1% |
| Scalar row construction/adoption | 4.9% / 4.9% |
| VDOM target preparation | 3.9% / 3.6% |
| VDOM target validation | 2.8% / 2.8% |
| World input capture | 2.5% / 2.0% |
| Remaining work | Remainder, preserved in the complete table |

The largest exclusive leaf is `closedNumericPrototypeIsCanonical`: 325/229 samples. Of those, 316/221 have notification acknowledgement in their ancestry. The next exclusive leaf is the owner/reader `current` predicate, with 171/141 samples; its family includes additional nested checks. The verified final-frame kernel wrapper accounts for 1.4%/2.6% of filtered samples and includes validation/construction overhead, so this is not a pure arithmetic measurement. Both profiles positively observe compiled batch execution.

React's filtered update samples instead concentrate in ordinary `applyProps`, `diffProps` and `commitUpdate`. r3act also has real required host work; the profile does not label every write as overhead. The Native timing windows contain some GC/program/harness samples without exact update ancestry, which are excluded from this table rather than silently attributed to a phase. No allocated-byte or retained-heap measurement was made.

The traced update medians/p95s are Native **3.80/4.40 and 4.00/4.70 ms**, React **0.60/0.80 and 0.70/0.90 ms**. These are instrumentation-observed diagnostics. Earlier profiles showed material observer/control drift; this episode is not an untraced performance qualification or a budget for a future repair.

## The concrete difference from React

React replaces one snapshot, schedules the 257 subscribed leaves, performs one synchronous root render/commit, and applies the changed props. Its static parent is not scheduled. r3act already avoids those leaf body executions on its eligible path, but enters the general public publication route:

`frame.advance → enqueueStores → prepareStores → owner/reader capture → batch outputs → VDOM target preparation → admission/validation → host writes → posthost validation/publication → reader acknowledgement`.

This route preserves root-specific accepted history, captured action cutoffs, forks, explicit groups and reentrant/custom-host behavior. The benchmark has one root, yet it goes through the public grouped candidate protocol. The cost is not simply the queue wrapper: its validators trigger substantial Root/Store/VDOM work attributed to those functions in the profile. The internal immediate-flush shortcut is a different contract and cannot simply replace the public path.

Some of the extra work is duplicated proof. Acknowledgement captures and immediately inspects a receipt for each of 257 readers. Each operation audits the same Store's prototype and instance shape, yielding **514 full audits and 257 temporary frozen receipts** on the successful one-Store pass. If P is the prototype-key count and D the number of distinct Stores, sharing a fresh passive proof changes that audit work from roughly `2 × readers × P` to `D × P`, while retaining a currentness check for every reader. It does not make total update cost constant or eliminate mandatory writes.

`current()` also rebuilds owner-prefix metadata and spreads each reader membership into a fresh array each time it validates. The owners are candidate-owned, while live membership still needs checking. The public publication protocol repeatedly reaches target/reader validation around host and work callbacks. The useful optimization boundary is the callback-free part of each phase; a proof must expire before a callback can invalidate it. [Exact source and generated locations](native-cost-map.md).

## What to implement

[Astra's source-reviewed repair plan](astra-repair-plan.md) selects one integrated slice: carry proof work through the existing owned Store transaction instead of reconstructing it at each wrapper. It contains three connected changes:

1. **A passive Store cohort for acknowledgement.** Freshly audit the prototype and each distinct Store once, inspect existing private accepted reader histories directly, then let Root recheck its existing membership/subscription/generation authority. Retire the immediate per-reader receipt capture/inspection round trip on this path. Preserve the defensive route for custom, changed or unsupported objects; no canonicality cache survives a callback.
2. **Candidate-local coverage metadata.** Prepare owner prefixes and coverage descriptors once after owner selection. Avoid repeated membership-array normalization on the proven canonical route. Keep live reader sweeps, owner/input/code checks, resources and current/retained-history semantics. This does not invent an O(1) membership test or another version registry.
3. **Canonical posthost group preparation.** Use the existing private group publication receipts to join required posthost validation with publication preparation in a proven callback-free interval. Retire duplicate public validation wrappers only for that eligible group. Keep every per-write readiness check and the final all-member private target/currentness check. Custom callbacks or unproved passivity retain the conservative route; partial failure retains quarantine, not replay.

The concrete seams are `async_store_runtime.ts`, `component_state_runtime.ts`, `native_root_work_queue.ts` and the existing private VDOM phase operations. The plan supplies three disjoint Sol-medium packets, primary seam review/integration, and one consolidated Luna correctness/delivery/HMR boundary followed by one unprofiled matched comparison. No new compiler, numeric backend, writer, storage pool or whole-tree guard removal is selected.

This targets the large observed preparation/proof families while retaining the semantics they enforce. It does not promise a particular saving or React parity. The previous unsound prototype-audit removal already failed to close the whole gap. The intended duplicated work must actually retire on the public frame path, and the completed slice must pass the end-to-end comparison. Product implementation has not resumed.

## Inspect the captures

Load these JSON files in Chrome DevTools **Performance → Load profile**, then select a measured `r3act-devtools-native-13` through `-72` span and inspect Bottom-up or Call tree. The traces preserve setup, warmup, drawing and teardown, so those regions can also be inspected separately.

- [First Native trace](evidence/devtools-profile-v3/traces/01-native.trace.json)
- [First React trace](evidence/devtools-profile-v3/traces/02-react.trace.json)
- [Second React trace](evidence/devtools-profile-v3/traces/03-react.trace.json)
- [Last Native trace](evidence/devtools-profile-v3/traces/04-native.trace.json)

## Preservation and limits

All four full 72-frame value/pixel sequences match. Each context disposes its 512 original resources exactly once with empty scene/setters; contexts and browser close without cleanup errors. Primary independently rehashes all 13,004 source/input rows, reconstructs signed V8 sample timestamps, verifies every original update-duration bridge and exact method ancestry, and recomputes the cost partition.

Two attempts failed before any workload: CommonJS/ESM Playwright interop, then an overly strict check for an advertised hires category. Both failures remain preserved. Hires was requested but not listed; the observed chronological sampling cadence was approximately 130–163 microseconds. The first offline analyzer incorrectly rejected negative raw deltas. A new analyzer follows DevTools' signed accumulation and stable timestamp/sample sorting; no sample was clamped or dropped, and no browser workload was repeated. The old analyzer, its failed output and every raw trace remain unchanged. [Offline repair](analysis-repair.md).

The browser timer's roughly 0.10 ms quantum can include nearby harness samples at boundaries, particularly in React's short intervals. Exact update-ancestry filtering removes `tick`/`inspect` from the comparison above. Sampling weights and inclusive parents must not be added as exact phase costs. No JIT, allocation-rate, presentation, cross-device or full-parity claim follows. Product implementation remains unchanged.
