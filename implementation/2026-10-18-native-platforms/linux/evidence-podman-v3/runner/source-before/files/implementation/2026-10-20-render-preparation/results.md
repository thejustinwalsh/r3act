# Explicit generic render preparation: source and results

Basis: local main f2f4eba8b56a5881b38cc8ef7504dcf295a39dd0, MIT. Origin remains https://github.com/thejustinwalsh/r3act.git. No push or PR occurs. See [design](design.md), [primary review](source-review.md), [authoring reference](../../docs/native-authoring-reference.md) and [installed comparison protocol](protocol.md).

The master plan excludes opaque work from retryable preparation without an explicit capability. An immutable old-source snapshot reproduces an unmarked preparation executing a component counter and a same-frontier stale queue retry executing it twice. Its [baseline receipt](verification/baseline-v1/receipt.json) passes two characterizations of the old defect, with all 324 source files unchanged; it is not acceptance of the new contract.

`renderPreparation: "repeatable"` now declares generic rendering safe to prepare, suspend, discard and repeat. It lives on existing root/call/work/task options; the root exposes an immutable getter. It grants no compiler purity, closed dependencies, owner skipping or rollback of escaped effects. Full-tree preparation checks before rendering, and task/queue checks precede providers and builders. Unmarked direct mount/update/flush render once per attempt; later source/resource notifications remain new invalidations. Opportunistic partial/sparse/structural/collection paths decline before unknown bodies. Closed scoped cuts retain their admission, and preparePending checks before generic fallback. Exact acknowledgements, newer actions, per-root histories, whole-tree guards, resource authority and host-failure rules remain. No new identity/version registry or physical layout is added.

Fixtures, live browser callers and examples declare intentional staged work. The private-candidate setter fixtures retain their original isolation and stale assertions. New negative cases cover pre-body/provider rejection, direct stale contrast, resource wake and keyed/collection fallback. Four previously omitted compiled fixtures enter the consolidated gate; its archive now preserves their fixed outputs and numeric-layout artifacts.

## Consolidated verification

[Darwin-v1](verification/darwin-v1/receipt.json) preserves 52/59 passing phases and seven failed phases: 27 Deno failures, scoped collection render count, three legacy JSX harness failures, an outdated numeric metadata assertion and undeclared direct-intent retention preparation. Three new Deno expectations confused private candidate setters with accepted setters or missed unchanged-row cache reuse; 24 existing cases needed explicit staging declarations. Harness repairs retain behavioral assertions. Supplemental fixed-path failure outputs are identified separately from the original runner archive.

[Darwin-v2](verification/darwin-v2/receipt.json) passes **59/59 phases**: **1066 runtime tests**, **83 Rust tests**, **40 compiled fixtures**, nine Three cases, three retention checks and thirteen package-consumer checks. All 1301 runner inputs match before/after; 1311 source/context files, 228 fixture artifacts and 530 fresh package files are archived. Numeric exits and UTC supervisor records are preserved; v1/v2 take 42.128/48.925 seconds. There is no favorable timing retry or additional diagnostic run.

## Installed application and one comparison

[Fresh installed proof](proof-v1/build-proof.json) passes seventeen assertions with five new tarballs, 24 authored input rows, four comparison sources, 3163 selected installed files and 1312 staged source/context rows. The application/scene and React comparator are byte-identical to the preceding installed async unit; the Native controller changes exactly two operation capability declarations. This precise delta is asserted before building. Native app/scene owner IDs, revisions native-v1-f202b4a94279cb6c / native-v1-7ef9e248f2166c23 and four/three lowered hook calls agree. They remain generic. React Projection/Result/App emit actual CompileSuccess and memo slots 14/14/23. Packaged Darwin ARM64 compiler SHA-256 is 458498f59bca4904718114168142a187ca2e48f85e4124bb63e08aa4e498933c.

[Untimed proof](proof-v1/proof-pair-one-shot.json) passes 27 main, four cancellation and three immediate-disposal stages per arm. Accepted A, divergent/converging fork B, catalog reuse, one Native B execution, late A/B rejection and final C across DOM/Three pass. Twenty real urgent button actions progress while B/C wait. All 26 main identity checks per arm retain nodes/resources; no startup fallback reappears. Native effects balance 2/2, React 4/4 under their own lifecycles. Host children, live resources/handles and exposed interests/listeners clean up.

The sole Native-first [timing pair](proof-v1/timing-pair-one-shot.json) observes:

| Interval | Native ms | React ms |
| --- | ---: | ---: |
| First urgent click to observer | 1.1 | 1.2 |
| Twenty-click median | 0.9 | 0.2 |
| Twenty-click p95 | 1.5 | 0.5 |
| Twenty interval sum | 20.9 | 5.9 |
| C settlement to observer | 1.7 | 0.7 |

Native's median/p95 are higher. About 0.1 ms timer quantum makes near-floor ratios unsuitable for decisions. Callback entry is timestamped before match inspection; observer delivery, earlier observer/harness work and scheduling are included. Fixed order, one dependent episode per arm and small samples give no population tail or significance claim. This is no CPU, physical input-to-presentation, paint, network/frontier, cold/memory, second-device or release-budget qualification. Providers are controlled deferred work, and Three is an object tree without WebGL. Separate JavaScript graphs are 2713570/1065024 bytes with unequal feature coverage.

Both browser phases match all 9092 hash rows before and after, serve exact offline synthetic HTTPS assets, have empty error arrays and close Chromium/contexts. They are bounded, headless, GPU-disabled and interruptible. Preparation/proof/timing take 4.846/6.527/6.467 seconds in external records. No duplicate integrity audit runs.

Receipt SHA-256 values:

- Build: d38d555902247c95b6936a76aeb9694e9c1ae2dd282b31cb4e93f9cfd1649277.
- Input lock: 27e72d9cb529ad1a2e0918a5d1467a327365824d69033fe5509459153a29c6a1.
- Untimed: e5ce68cb670f5c649a3955945dcd3739b9bab3440964a11f3161f32efe9f8d6b.
- Timing: cff39ed29fafc3757a68f4d5d917f905e439394f6c83d83bdeb7fa41e8149d8c.

The timing authorization binds the exact chain. Final reports/checkpoint/notebook/README updates are post-run documentation, not pre-execution inputs. Original archived sources and failed receipts remain unchanged.

## Remaining scope and machine limits

The full-plan first pass stays active. Release median/p95 and cold/setup/allocation/retained-memory budgets, current other-platform execution and independent-device qualification remain open. Human participants remain zero; no maintenance advantage is claimed. Historic stable-binding wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain scope. This semantic policy is not a performance optimization result.

Apple user/service defaults still save **one CPU, 256 MiB/container and 512 MiB/build**, with tooling, data and logs on Depot. Supplemental readiness records distinguish sandbox denial from the escalated result: the service is stopped/unregistered and sudo requires a password. Depot's startup permission prerequisite remains unresolved; effective VM limits and workload sufficiency are unverified. No VM/server, new administrator prompt or memory increase occurs.
