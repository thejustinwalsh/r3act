# Recording B structural-count leaf probe gates

## Commands and results

Both approved commands were issued once, sequentially, with `login:false` and `/opt/homebrew/bin/deno`. The Deno tool calls returned process exit codes directly; no shell status wrapper was used.

1. `deno check --frozen --no-config --no-lock --no-npm .cache/structural-locality-recording-v1/diagnostic-v1/snapshot/src/structural_count_probe.ts .cache/structural-locality-recording-v1/diagnostic-v1/self-check.ts` — exit 0. Deno checked the probe and self-check modules.
2. `deno test --frozen --no-config --no-lock --no-npm --fail-fast .cache/structural-locality-recording-v1/diagnostic-v1/self-check.ts` — exit 0; 4 passed, 0 failed. The cases cover units and explicit missing values; rejection of extra root, reentrancy, bail, error, and incomplete windows; mixed authority and invalid amounts; and disabled-gate/disposal registration cleanup.

The exact command strings, tool exit metadata, and captured tool `output` are preserved in `deno-check.initial.tool-result.json` and `deno-test.tool-result.json`. The `exec_command` result exposes one output string and no separate stdout/stderr fields; no stream split is inferred.

## Snapshot and preservation audit

The audit covered 1,910 file/hash entries spanning the live source basis, diagnostic snapshot/manifests/patch/docs/coverage/self-check, archived pre-full-patch-review draft, accepted model files and evidence, original 413-input and v2 424-input locks, original 126 evidence files, eligibility build/compiler/assets, and prior v1 failure and v2 pass page evidence. All expected hashes matched and all audited files remained unchanged.

All 258 current live `src` hashes matched the 258 prepatch snapshot hashes. The patched snapshot contains 259 files. Its only hash differences from prepatch were the five manifest-approved files—`component_state_runtime.ts`, `keyed_collection.ts`, `keyed_region_buckets.ts`, `owner_state_world.ts`, `vdom_snapshot_runtime.ts`—plus the new `structural_count_probe.ts`. This matches the probe manifest. Full per-file hashes are in `before.json` and `after.json`.

The diagnostic self-check is local and dependency-free. The command deliberately disabled workspace config/lock/npm discovery because the known workspace lock is stale; it is **not** a full snapshot/native-runtime TypeScript API typecheck. No dependencies, locks, live kernel/product source, compiler, frontend, or assets were changed. No build, server, browser, runtime page, counter workload, timing, or matrix was run.

## Audit receipt notes

The initial preservation script treated prepatch hash rows as if they should match the postpatch snapshot, producing five expected mismatches. The preserved `before-attempt-1-wrong-phase-map.json` records that false alarm. The corrected audit separately verified the prepatch hashes against live `src`, verified the patched manifest against the snapshot, and confirmed the exact six-file difference set.

A first after-audit command used a Deno eval with a Node `fs` method name and stopped before writing `after.json`. The corrected hash audit then completed successfully. Neither audit-script issue reran either approved Deno command or altered protected files.

These results establish only probe-leaf type/syntax checking and synthetic API behavior. They do not establish whole-snapshot type soundness, browser/runtime counts, production behavior, locality, performance, or matrix fit.
