# React mechanism research and Astra handoff

Implementation remains frozen under the human's 22 October direction. This research reads the pinned React Compiler implementation, actual emitted components, React reconciler, R 3 F host path and the corresponding Native public-frame path. Production code and frozen consumer/build assets remain unchanged. The only altered runtime bytes are a deliberately unsound disposable diagnostic copy, never a product candidate.

## What React actually does

The installed Compiler 1.0.0 infers reactive scopes and emits fixed per-component cache slots and dependency guards. React 19.3's memo-cache hook owns those slots per Fiber. Position/Rotation still execute their hooks and three changing scalar expressions; the emitted cache retains stable children and effect inputs, recreating the motion element when its outputs change. Compiler caching is not shared computation across 256 owners. [Compiler implementation trace](compiler-internals.md).

The clock has 257 subscribers. React external-store notifications mark SyncLane work; one flushSync executes the synchronous root work. Runtime child-lane bailouts retain unaffected descendants. App itself is not a clock subscriber, so skipping App on these updates is not a demonstrated benefit of its Compiler cache. R 3 F still performs commitUpdate, prop diff, dashed-property resolution and up to 769 changed assignments. Its component commit is inside the timed update. The separate useFrame scheduler/ref-mutation arm has different obligations. [React execution trace](react-path.md).

Both fixed all-changing paths are linear in affected owners plus writes. Big-O does not explain this gap. Native retains static children/resources too and already executes compiled numeric output. The interesting difference is surrounding preparation, validation and accepted-history work, not absent arithmetic compilation or a secret React numeric writer. [Native trace](r3act-path.md).

## Current Native route and measured localization

The public frame controller runs enqueueStores→prepareStores with internalCellCapture=false. Public group admission and posthost validation remain conservative. Earlier terminal counters belong to a later epoch 73 direct flush, so they cannot prove the 72 public frames' batch or sweep counts. The new profiles positively sample owned batch execution beneath public update ancestry, but still do not count exact calls/rows per frame.

The single episode with eight profiling-on/off contexts passes all frame, value/pixel, retained-identity,512 exactdisposal and cleanup controls.585 product source rows,16 consumer/asset rows, frozen build/input locks and browser/tool hashes match. Primary independently recomputes raw profile ancestry and compares all 72 frame sequences across 8 contexts. [Raw receipt](runs-diagnostic-v1/receipt.json), [analysis](runs-diagnostic-v1/analysis.json), [primary review](primary-diagnostic-review.json).

CPU sampling uses exact generated update URL/line ancestry, covering 72 calls including 12 warmups. No profiler-clock mapping to page timestamps is established. Native has 1350/1365 update-ancestry samples; React 211/171. Native's largest exclusive leaf is closedNumericPrototypeIsCanonical,260/249 samples.250/245 of those occur under postpublication notification acknowledgement. React's largest exclusive leaves include applyProps 27/19 and diffProps 15/14. Inclusive ancestry counts overlap and are not additive. Samples are neither wall milliseconds nor a removable fraction.

Source resolves the Native duplicate: for 257 current clock readers, acknowledgement captures and immediately inspects each receipt. Both operations audit the entire Store prototype/instance, yielding 514 full audits and 257 temporary frozen receipts in a successful pass. Reader membership, accepted-history stamps and notification generation checks are necessary; repeating the same canonical shape audit within a proven callback-free scope is a separate mechanism. [Primary source review](primary-source-review.md).

Profiler controls have large signed Native drift: off medians 8.35/6.95 ms, on 3.90/3.90; React off 0.70/0.70, on 0.70/0.65. This prevents causal overhead or wall-phase attribution. It does not erase either the source repetition or the sampled localization.

## Sole isolated removal discriminator

Astra requested one final discriminator. The episode with six contexts and no profiler serves unchanged original Native and React assets, plus a disposable Native bundle with only closedNumericPrototypeIsCanonical's body replaced by return true. All outside bytes, total length and line-break positions remain exact. This removes all helper effects, including protections, and may alter JIT behavior. It is not a semantics-preserving implementation or a rigorous speed bound for the proposed replacement.

| Context | Variant | Update median/p 95 ms | Through common draw/readback median/p 95 ms |
| --- | --- | --- | --- |
|1|Native original|8.40/10.10|11.80/13.80|
|2|React|0.70/1.80|3.50/5.50|
|3|Native audit disabled|3.55/8.00|6.90/11.70|
|4|Native audit disabled|6.05/7.90|9.55/11.30|
|5|React|0.70/1.70|3.60/5.30|
|6|Native original|6.85/10.30|9.80/13.60|

Every context passes the same 72 frame outputs and 512 exactresource releases. The original source and disposable copy match their before/after hashes; primary independently verifies the exact body-only rewrite, all 72 cross-context value/pixel sequences, raw statistics,585 product source rows and 16 consumer/asset rows. [Raw receipt](runs-prototype-ablation-v1/receipt.json), [primary review](primary-ablation-review.json).

The treatment supports the audit helper as a material contributor in this episode, including any induced optimization effects. Control drift is substantial, and even the unsound removal remains far slower than React. Do not assign a production saving, claim a full speed-gap explanation, or broaden this into more ablations. No further workload was run.

## Handoff and limits

Astra high received the pinned source traces/manifests, raw profiles, both complete studies and primary reviews. Its [solve](astra-solve.md) must distinguish repairing this identified duplicate work from closing the full performance gap. The architectural target is Store-owned cohort acknowledgement: one fresh canonical audit per eligible exact Store within a proved callback-free scope, followed by direct checks of existing accepted reader history; Root still validates membership, subscriptions and generation before advancing its existing acknowledgement. Unsupported/custom shapes retain defensive fallback. No new identity/version registry or audit token surviving callbacks is permitted.

Any Sol-medium packets in Astra's report are dormant recommendations. No implementation is dispatched. Full parity remains unproved, as do cold/retained-memory acceptance and independent-device qualification. The old v3 descriptive parity failure, including its disclosed concurrent Git activity, is unchanged. These new diagnostics do not replace qualification. Historical stable-binding wins, dense loss and exhausted Recording A keep their own source/workload scope.
