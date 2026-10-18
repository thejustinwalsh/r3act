# Authored lifecycle cost reference

This reference identifies what the current application-level timing and heap fields mean. It describes one Darwin ARM64 observation; it does not define a release budget or a general runtime performance claim.

The [Native application](../implementation/2026-10-18-authored-lifecycle/workload/native_arm.tsx) imports the public @r3act/core surface, resolved explicitly to checkout source for this evaluation. It renders 256 keyed stateful buttons from an ordinary array Store, reads a shared numeric step Store, updates declarative style/text, and mounts two independent resource boundaries. The [React comparator](../implementation/2026-10-18-authored-lifecycle/workload/react_arm.tsx) uses external-store subscriptions and React Compiler, including memo output in the actual row. Native activation effects and React layout effects retain their documented meanings. This checkout resolution is separate from installed-package evidence.

| Field | Interval / interpretation |
| --- | --- |
| mountDurationMs | Fresh application/controller/container setup and mount after modules load; not browser, filesystem, network or compiler cold start. |
| updateMs |60 dispatch-through-synchronous-commit calls; Native dispatch+flush, React publish within flushSync. Complete DOM inspection and RAF waits occur afterward. |
| firstMs / medianMs / p95Ms | First observation and nearest-rank quantiles within one page, not independent replications or population tail estimates. |
| editDurationMs | One array Store replacement removing 1, inserting 256 and moving 0 to the end through generic keyed reconciliation. |
| measuredLifecycleSubtotalMs | Mount+60-update sum+array edit+disposal; excludes local click, resource waiting/reveal and harness work, so it is not total episode CPU. |
| heap observations | Raw CDP heap usage and DOM counters after forced GC in separately authorized fresh untimed pages. Signed deltas use that page’s baseline. |

Observed update median/p95 is 2.6/3.9 ms Native and 0.5/0.8 ms React; the measured subtotal is 183.3/43.3 ms. Native is slower for this authored workload. Timer quantum is approximately 0.1 ms. Both arms preserve row 0 state/identity, complete all values/order/style/text checks, reveal detail beside waiting health, retire fallback effects once, run257 row setups/cleanups and dispose with no application Store listeners. Native also reports no readers, owners or pending changes.

The heap phases are baseline, mounted, updated/edited/revealed, disposed-controller-retained and released-controller. Retaining a controller keeps its natural captures: Native retains a disposed root object; React releases its React root during disposal. Released-controller used-heap deltas are 1,459,444/933,636 bytes Native/React, DOM node deltas 0/0 and event-listener deltas 0/+1. These readings include engine/module/application costs and neither attribute the remaining storage/listener nor establish allocations, leak absence or memory budgets. Combined JavaScript500,092 bytes includes both arms; it is not equivalent-feature per-arm size evidence.

See [full source and results](../implementation/2026-10-18-authored-lifecycle/results.md) for exact hashes, rejected first proof and timing/heap receipts, or the [reproduction protocol](../implementation/2026-10-18-authored-lifecycle/workload/README.md) for the bounded commands. Historic wins, dense FAIL, cold/memory, async UX and independent-device gates retain their separate scope. No general speed, presentation or maintenance advantage follows.
