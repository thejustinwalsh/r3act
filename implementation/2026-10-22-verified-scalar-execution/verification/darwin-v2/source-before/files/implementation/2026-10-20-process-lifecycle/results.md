# Fresh-process startup and lifecycle observations

Basis: main `918e7537b0470eec1b2d22472cd08b412630f542`, MIT. [Design](design.md), [pre-execution review](source-review.md), [protocol](protocol.md), [execution summary](verification/final-summary.json). Two Sol medium agents implemented disjoint consumer/preparation and collector files; the primary reviewed and Luna executed. No product runtime/compiler, physical layout or publication mechanism changes.

The complete installed application retains 256 keyed stateful rows, sixty Store updates, declarative text/styles, generic remove/insert/move, independent detail/health resources and disposal. Native and contract bytes match the frozen application. React keeps only the prior exact JSX-pragma/type-comment adaptation. This replaces the earlier module-loaded/shared-browser evaluation route for these observations; [the old results](../2026-10-19-installed-lifecycle/results.md) remain unchanged.

## Correctness and installation

[Darwin-v1](verification/darwin-v1/receipt.json) passes 63/63 phases: 1093 frozen Deno tests, 84 Rust tests, 44 compiled fixtures, twenty Three cases, three retention checks and package validation. The supervisor exits 0 in 50.891 seconds. All 1432 runner inputs match, with 1442 source/context files and 244 fixture artifacts archived. Syntax-v1 passes before the independent review's Selenium-environment correction; syntax-v2 and the gate cover corrected source. No failed gate or browser startup is hidden.

[Fresh preparation](proof-v1/build-proof.json) exits 0 in 4.732 seconds, with ten build assertions, five package tarballs, 38 authored/external rows, 3173 selected installed files and 1442 staged files. Actual Native registration/hook lowering and ReactRow CompileSuccess with `_c(13)` pass. JavaScript graphs are 744401/579434 bytes, with different feature coverage. The Darwin ARM64 compiler hash is `6370807ec45ce8525430e8cf485c40e33fd584bd3bdcfcc488b462e96a03ddcd`.

Thirteen browser dependency files and the 52112-byte Chromium main launcher are locked. This does not archive or hash the complete browser frameworks/OS. Playwright's Selenium redirect is rejected, its canonical executable path is checked, and its Node harness import occurs before either startup interval. Local Chromium 153.0.8010.12 runs headless/GPU-off, with exact offline synthetic HTTPS asset replay and no server.

The [untimed proof](proof-v1/proof-pair-one-shot.json) exits 0 in 7.955 seconds. Both arms pass all 67 stages, all row/order/style/text checks, retained row-zero host/local state, independent reveals, 257/257 row setup/cleanup, balanced fallbacks and empty exposed application interests. Duplicate mount and wrong-arm-after-release controls pass. The proof, startup and heap phases each match all 9395 hashes before and after, with no request/page/console/cleanup errors. Every arm closes its context/browser and verifies its distinct browser PID has exited before another arm starts.

## Sole startup comparison

| Host interval, ms | Native | React |
| --- | ---: | ---: |
| Chromium launch | 627.204 | 141.780 |
| Context and page creation | 711.342 | 652.244 |
| Route installation, navigation, modules and matching mounted output | 99.286 | 71.360 |
| Launch through matching ready output | 1437.831 | 865.384 |

[Startup](proof-v1/startup-pair-one-shot.json) exits 0 in 7.465 seconds. This is one fixed Native-first pair, without warmup or favourable retry. Browser entry-body-to-mounted marks are 15.6/7.6 ms and exclude static dependency evaluation; the host interval includes it. Launch spans differ substantially, so this pair cannot attribute the 572.448 ms total difference to application execution. No startup median/p95 or population claim is available.

The host interval includes browser, driver and observer scheduling. OS/filesystem caches are uncontrolled and source hashing primes caches. This is not an OS-cold, compiler-install, live-network, CPU or paint measurement. No forced GC or profiler calls run in startup; natural engine GC absence was not measured. Existing warm-update timings do not qualify this changed source.

## Separate forced-GC lifecycle observations

[Heap collection](proof-v1/heap-pair-one-shot.json) exits 0 in 7.619 seconds. Each process starts with a blank-page baseline before application modules: used heap 590868 bytes, one document, four DOM nodes and zero listeners.

| Phase | Native used-heap delta B | React used-heap delta B |
| --- | ---: | ---: |
| Mounted | 2410800 | 1852148 |
| Updated, edited, revealed | 3684284 | 2462072 |
| Disposed, controller retained | 2941492 | 1865532 |
| Controller released | 2871620 | 1856376 |

Released-controller DOM-node deltas are +10/+11 and listener deltas +13/+15. Those residuals are unattributed; exposed application Store interests are zero. Raw total/embedder/backing-storage heap and DOM responses remain in the receipt. Navigation replaces the blank document, and the baseline includes neither loaded modules nor later injected driver state. Natural controller captures differ across arms. These whole-page observations establish neither isolated root retention, allocation rate, leak absence nor a memory-budget verdict. They are not directly comparable with the old module-loaded-baseline deltas.

## Allocation attempt remains incomplete

The [single allocation pair](proof-v1/allocation-pair-one-shot.json) exits 1 in 6.492 seconds. Both raw profiles survive. Native completes 67 stages, with all 8485 samples resolving to 468 captured tree nodes. React completes sixty updates and 62 recorded stages, then validation rejects one sample whose node is absent from its captured tree: sample index 0, nodeId 159, size 47908 bytes. Its other 2128 samples resolve across 158 nodes. Both processes exit, and cleanup reports no error.

The receipt remains **INCOMPLETE**, with 9395 matching source-before checks and no source-after sweep. No profiler/browser rerun occurs. [Offline disposition](verification/allocation-profile-disposition.json) preserves counts, raw-profile hashes and unresolved bytes without filtering the result into PASS. Native's 280926460 sampled bytes are an unpaired descriptive observation; no valid Native/React allocation comparison is claimed. Sampling includes inspection, serialization, RAF and driver work, not isolated dispatch allocation or exact counts/rates. The browser/protocol cause of the missing node remains unresolved.

## Integrity and remaining scope

Key receipt SHA-256 values:

- Build: `e40c68495817cf009e6ff17103a3a229c383c177343c5f2c243e4bf20268da12`.
- Input lock: `7261e302f8bfe62c2b94b378b4c93a10f676a3061ed209f62ef65754194ed441`.
- Untimed proof: `87b790ee8fd255a32711ef241f63455815d54db3b7682f8b9781de8448af06f4`.
- Startup: `9054f91d65cf0c0557f8f8ceeeefebd9672821ed2bfaed47c6da4fef514ed94c`.
- Heap: `4cf1b4b45c763b9cfeead6be803c74f005c5ab2a97cd09d268cb381241956d53`.
- Incomplete allocation: `e025652c3b5e6e651f91c32d5c57b51f08febf16a78b95d3731c33f7e03e7e1f`.

[Cache staging disposition](verification/cache-staging-disposition.json) corrects the original inventory's omission of 99 existing tracked symlinks. Their Git blobs remain unchanged. The actual new research set is 241 archive-hash-matching files and one checked case-9 symlink; original inventory/report bytes survive. Three generated tracked outputs are restored only after their new bytes are archived. Cargo's ignored dependency-cache database changes normally and is not staged as research evidence. Seven expected ignored installed executable wrappers are hash-bound and retained.

Documentation and notebook additions are post-run summaries; frozen pre-run context stays archived. The full-plan goal remains active. Frozen release median/p95, cold/memory acceptance, current other-platform and independent-device requirements remain open; this unit introduces no easier budget. Historic stable-binding wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain scope. Human participants remain zero with no maintenance advantage claim. Apple defaults remain one CPU, 256 MiB/container and 512 MiB/build on Depot, with startup permissions/effective caps unresolved. No VM, project server, administrator prompt or memory increase occurs.

The separate [final primary audit](verification/final-source-and-staging-audit.json) matches 1286 non-Markdown gate inputs and reviews all 9395 allocation source-before rows against current files. Only four recorded context documents changed after collection; every other recorded row matches. This does not manufacture the failed phase's missing source-after sweep or replace its INCOMPLETE status. Notebook cells 1–229 and root metadata remain equal, with 1841952 prefix bytes and 486 suffix bytes preserved around the sole appended cell.
