# Authored lifecycle verification

## Consolidated Darwin gate

Basis: `b5534eff25ef5f56b15f72badc1c4b187ee8e5f1`. The native-host Darwin arm64 run passed **34/34 steps**: 978 Deno runtime tests, 63 Rust tests, 24 artifact checks, 22 compiled fixtures including the authored lifecycle fixture, seven Three host cases, two retention checks, and a fresh five-package build and consumer check. The runner source audit matched all **828 inputs**.

The pre-runner archive contains exact copies and hashes of the 828 selected source inputs, a HEAD-derived manifest for **18,983 tracked `.cache` entries**, and fingerprints for **4,878 pre-existing fixture files**. The tracked cache matched HEAD before and after execution, so no tracked entries required restoration. The runner preserved **488 package archive files** and **132 new/changed fixture outputs**.

One initial runner launch exited 1 before any gate step because the output directory already existed: it contained the validated preflight archive. That archive and the launch failure are preserved under `preflight-v1`; the actual runner then used the required empty `darwin-v1` directory and passed. This was a runner setup error, not a product-gate failure.

## Production proof build

The v1 proof build exited 0 with eight passing assertions, but primary rejected its comparator proof after inspecting emitted code: the actual hot `ReactRow` had no React Compiler memo call. This is a proof-shape rejection, not a failed consolidated gate; no timing or browser run followed. The rejected proof remains preserved under `../workload/proof-v1/primary-rejection.json`.

The proof locked **754 source inputs** (source-lock SHA-256 `45053ed9a723ea47e43a9088beff295368817f2fb4b8be9984002efb438467a1`); every post-build source hash matched. Compiler SHA-256 remained `cee5598eaa612f76fe6b4717d3161333d30c5f4503430c3c448627e27b6d0fb0` before and after.

Transformed inputs:

- Native transform, 30,350 bytes: SHA-256 `dd4eff123b830d264c492ed979181e42f68addf92e38d5fa79d0920b443ad995`
- React transform, 6,669 bytes: SHA-256 `36f668ccd2fad0c18f9e1522a9cc75e72f7ff6849e17b8f701ac86d689237d40`

Three output assets total 2,853,272 bytes including the source map. The JavaScript payload is 499,459 bytes (SHA-256 `1705786873a69e8cce1f280fb0d7eb70be482a1f7751d0ac9a3298dff176a450`); its source map is 2,353,568 bytes (SHA-256 `8807350d14eeff5a09b8cba47fe12bf7acb7104f8bb87313ae71760c9bfaa035`); HTML is 245 bytes (SHA-256 `6a3b05aa92a911277f842c40866dcbb62fad4bf608477c1c8865a5bf25461219`). These are artifact integrity and byte counts, not a comparative size claim.


## Refreshed v2 consolidated gate and proof

The v2 Darwin gate passed **34/34 steps** on the declared HEAD. It included **978 Deno tests**, **63 Rust tests**, **24 artifact checks**, **22 compiled fixtures**, seven Three host cases, two retention checks, and a fresh five-package consumer. The source audit matched **828 inputs**. The pre-execution archive verified 18,983 HEAD-tracked cache entries and fingerprinted 5,010 pre-existing fixture files; post-run verification found no tracked-cache changes. The gate preserved 488 package files and 132 fixture outputs. Its receipt, step logs, hashes, and archive are in `darwin-v2` and `preflight-v2`.

The single v2 production proof build exited 0 with status `BUILD_CAPTURED_PENDING_PRIMARY_REVIEW`. All **nine** assertions passed, including the strengthened check that the actual compiled `ReactRow` body contains a React Compiler memo-runtime call. The emitted row call uses memo slot **13**. All 754 locked source hashes match after build. The source-lock SHA-256 is `90c236e8cd9919d2d20f20c7fe7ba993cadb053c3d8af23af4ce6fc53740ba25`; the compiler hash stayed `cee5598eaa612f76fe6b4717d3161333d30c5f4503430c3c448627e27b6d0fb0`.

Transforms:

- Native, 30,350 bytes: SHA-256 `dd4eff123b830d264c492ed979181e42f68addf92e38d5fa79d0920b443ad995`
- React, 7,848 bytes: SHA-256 `5f8ce2226c55370334cd54edce5ca4c0d45d5c896d5ca904d7dbdbcfb9d17aad`

Three assets total 2,855,369 bytes including the source map. The JavaScript payload is 500,092 bytes (SHA-256 `63e030cad65f5b2624b9b0d654a9d5d97beaded59112166d38398a739321bfdb`); the source map is 2,355,032 bytes (SHA-256 `128f031f63f0c0d0b799117ab85cb0d903a3574f5b27ed2124bd11bbd75b985c`); HTML is 245 bytes (SHA-256 `df96144edc6cd11586c7e0c0f551a303deb6e5a4f23ead56ee6e1f02de97d3e8`). These counts describe the proof output only.

The v2 proof, actual transforms, asset hashes, and builder logs are in `../workload/proof-v2`; the invocation and raw stdout/stderr are in `benchmark-build-v2`. It awaits primary review. No browser or timing work was run.

## Authorized v2 timing pair

Primary approved one Native-first, fresh-context timing pair bound to proof SHA-256 `1c0d8a3aa7bfefc452e0c74cf20069ddee2abb46cbebb48af8ffbb61b1cd183b` and source-lock SHA-256 `90c236e8cd9919d2d20f20c7fe7ba993cadb053c3d8af23af4ce6fc53740ba25`. The pair completed once in **8.4 seconds**, exit 0, with status `PASS_DESCRIPTIVE_TIMING_PAIR`. It replayed only the exact build assets over the synthetic HTTPS origin; no server or live network was used. The browser reported timer quantum about **0.1 ms**. Before and after checks each matched all **760 source/compiler/transform/asset hashes**.

| Arm | First update | Median update | p95 update | 60-update sum | Mount | Keyed edit | Disposal | Measured subtotal |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Native | 5.2 ms | 2.6 ms | 3.9 ms | 167.1 ms | 11.3 ms | 3.4 ms | 1.5 ms | 183.3 ms |
| React | 1.8 ms | 0.5 ms | 0.8 ms | 35.1 ms | 6.5 ms | 1.0 ms | 0.7 ms | 43.3 ms |

The measured subtotal is mount + all update intervals + keyed edit + disposal. Each update interval covers dispatch through synchronous commit; DOM inspection and RAF waits are outside the intervals. Row 0 remains in the same host position after the edit, carries local state 1, and ends with text `0:60:1`. Each final view contains all 256 expected ordered rows with matching step, state, transform, opacity, and text in both arms. Both resources reveal independently with matching `detail ready` and `health ready` output. Row setups/cleanups finish at 257/257; fallback setups/cleanups finish at 1/1; disposal leaves zero rows, store listeners, Native readers, Native owners, and pending changes. All row, order, state, resource, and lifetime assertions passed. There were no blocked requests, request failures, page or console errors, or cleanup errors.

This is one fixed-order diagnostic on one browser, not a replicated population tail or a performance qualification. The within-page p95 does not estimate a population p95; the 0.1 ms timer quantum limits interpretation of the smaller intervals. Mount starts after modules load and is not a cold-start measure. The subtotal excludes local click, resource waiting/reveal, and harness inspection, so it is not total episode CPU and does not provide CPU attribution. The shared bundle byte count is not a per-arm equivalent-feature size comparison. No existing performance budget, device-general result, or product speed claim follows. Heap work remains separate and awaits its own authorization.

The one-shot receipt is `../workload/proof-v2/timing-pair-one-shot.json`; the wrapper command, stdout, and stderr are in `benchmark-timing-v1`.

## Separately authorized v2 heap pair

The untimed Native-first heap pair completed once in **7.0 seconds**, exit 0, status `PASS_DESCRIPTIVE_HEAP_PAIR`. Its authorization bound proof SHA-256 `1c0d8a3aa7bfefc452e0c74cf20069ddee2abb46cbebb48af8ffbb61b1cd183b`, source-lock SHA-256 `90c236e8cd9919d2d20f20c7fe7ba993cadb053c3d8af23af4ce6fc53740ba25`, and timing receipt SHA-256 `5b2e0d0c55e16b74aee7fd13c28c3270974a16a5cd412e6e97064e7cf14d4c8b`. The current proof, lock, timing receipt, and heap authorization still match those hashes. Both before and after audits matched all **760 source/compiler/transform/asset inputs**.

Each phase forced garbage collection before collecting CDP `Runtime.getHeapUsage` and `Memory.getDOMCounters`. Values below are bytes except DOM counts. `Used / total` shows JavaScript heap sizes; the full raw responses, including embedder and backing-storage sizes, remain in the one-shot receipt.

| Phase | Native used / total | Native DOM nodes / listeners | React used / total | React DOM nodes / listeners |
| --- | ---: | ---: | ---: | ---: |
| Baseline | 1,157,908 / 1,835,008 | 15 / 1 | 1,157,908 / 1,835,008 | 15 / 1 |
| Mounted | 2,632,084 / 3,145,728 | 534 / 257 | 2,093,492 / 2,359,296 | 534 / 401 |
| Updated, edited, revealed | 3,447,896 / 4,194,304 | 534 / 257 | 2,692,548 / 3,145,728 | 534 / 401 |
| Disposed controller retained | 2,684,132 / 3,670,016 | 16 / 1 | 2,102,128 / 2,621,440 | 15 / 2 |
| Controller released | 2,617,352 / 3,145,728 | 15 / 1 | 2,091,544 / 2,621,440 | 15 / 2 |

Signed deltas from each arm's baseline (`used / total` bytes; DOM nodes / event listeners):

| Phase | Native delta | React delta |
| --- | ---: | ---: |
| Baseline | 0 / 0; 0 / 0 | 0 / 0; 0 / 0 |
| Mounted | +1,474,176 / +1,310,720; +519 / +256 | +935,584 / +524,288; +519 / +400 |
| Updated, edited, revealed | +2,289,988 / +2,359,296; +519 / +256 | +1,534,640 / +1,310,720; +519 / +400 |
| Disposed controller retained | +1,526,224 / +1,835,008; +1 / 0 | +944,220 / +786,432; 0 / +1 |
| Controller released | +1,459,444 / +1,310,720; 0 / 0 | +933,636 / +786,432; 0 / +1 |

Both arms retained the expected 256-row output, with row 0 at the end and local state 1, and independently revealed both resources. Each reported 257 row setups and 257 cleanups after disposal, one setup/cleanup for each fallback, zero remaining rows, and zero Store listeners; Native also reported zero readers, owners, and pending changes. The final output checks matched. There were no blocked or failed requests, page or console errors, cleanup errors, or stop reason.

These are descriptive whole-page snapshots after forced GC. They include browser engine, modules, application state, and collector effects; the disposed-controller phases also reflect each controller's natural retention behavior. They do not isolate per-row allocations, prove leak absence, or establish a memory budget. In particular, the observed post-disposal event-listener counts are retained as raw observations and are not attributed to application leaks. The receipt is `../workload/proof-v2/heap-pair-one-shot.json`; command and raw wrapper stdout/stderr are in `benchmark-heap-v1`.

## Final integrity audit

The single bounded audit is preserved in `final-audit-v1/`. It exited **1** with status `FAIL`; the raw wrapper metadata, stdout, stderr, and per-check report are retained. The declared Git basis matched. Both Darwin receipts independently passed the audit: each has 34/34 passing steps, 828 archived source inputs matching before/after, 488 identical package files before/after, and 132 hash-verified fixture outputs. The audit also verified the 18,983-entry tracked cache against HEAD and both preflight manifests, current v2 selected-source bytes, compiler hashes, proof and authorization provenance, rejected v1 provenance against its preflight archive, the separate pre-step `EEXIST` launch failure, the notebook's 202-cell HEAD prefix plus one append, and raw captures/whitespace. The initial `EEXIST` occurred before gate steps; the actual v1 gate receipt passed.

Two audit checks remain unresolved. The timing/heap receipt check raised an `AssertionError` without identifying its failed subcondition; this audit was not rerun. The document cross-check expected a wide timing table in `results.md`, while that file presents the same timing values as a row-oriented table, so its header-shape assertion failed before completing document/link validation. These audit failures do not change the separately preserved primary review of the timing and heap receipts, but the final integrity audit as a whole is **not a pass**. No gate, build, browser, or source work was repeated to address them.

### Supplemental audit attempt

A one-shot supplemental audit was authorized for the two unresolved check groups, bound to original report SHA-256 `d0f1ec620fdcb56800f80eab760a449cd0fe5f2cb3c102e5b5af1a435e11306a`. It stopped before running those groups: the supplemental helper's pre-check expected 11 original report entries, while the preserved report contains 12. The wrapper recorded exit 1 and preserved stdout/stderr under `final-audit-v1/supplemental-v1/`; no supplemental report was produced. Per the one-attempt limit, there was no retry. The original audit remains **FAIL**, and the two supplemental check groups remain unresolved.
