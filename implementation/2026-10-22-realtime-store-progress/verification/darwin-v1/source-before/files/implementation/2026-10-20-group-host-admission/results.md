# Group host admission: source and results

Basis: local main `33209ecef0e50114b01edd3618b20e99ef4287ac`, MIT, origin https://github.com/thejustinwalsh/r3act.git. Remote main remains the initial published commit `a694d72959970eca750d2fa09c91d0b64ae5494a`; no push or PR occurs. The gate's basis SHA plus immutable dirty-source archives identify tested source. See [design](design.md), [primary review](source-review.md), [protocol](protocol.md) and [receipt summary](verification/final-summary.json).

## Changed contract

The previous group validated publicly, then repeated callback-bearing validation as each member applied. A real Proxy host descriptor trap could revoke a later member before the first writer, yet an earlier member still wrote. Existing accepted pointers stayed old, but the avoidable physical prefix quarantined the group.

Groups now claim every existing host domain, finish every public member/work preflight, sweep all private prepared receipts and enter admitted application. Exact Store root epochs/versions replace overridable method calls in that sweep; posthost lineage remains deliberately weaker. Private World calls, branded scalar data and owned binding descriptors preserve live owner/source/cell/writer checks. Whole-tree/cache bases remain. Newer actions, exact acknowledgements, fork histories, resource ownership and healthy prewrite rejection remain under existing authority.

Captured host callable targets avoid dynamic redirection during admitted writes. Actual copy-capture callbacks still run inside application with their original before/after writer checks. Arbitrary adapter mutations and hidden wrapper reads remain opaque effects; there is no rollback or cross-renderer visual atomicity. Observing canonical resource reads through a bound wrapper records actual dependencies without proving that wrapper pure. Missing canonical freshness declines grouped work before writes. Standalone opaque behavior and repeatable generic manual binding fallback remain.

Existing binding capabilities own provenance and controlled rebinding, including ordinary commits. Frozen closed bindings retain passive proof. Source-list equivalence requires exact source identities, not array object identity. Temporary admitted binding lists clear on release. No second mutable identity/version registry, eager snapshot copying, physical storage change or new compiler purity grant is introduced.

## Preserved failures and correctness

[Baseline-v1](verification/baseline-v1-supervisor.json) fails before admission because its intrinsic collection rows are ineligible for the intended scoped move. The original script and 328-source archive remain unchanged. [Baseline-v2](verification/baseline-v2-supervisor.json), a distinct component-row fixture, reproduces one first-member placement after one peer revocation, with no peer writer and both accepted versions old. Both integrity receipts match all source rows and script hashes.

| Consolidated run | Result | Finding |
| --- | --- | --- |
| [Darwin-v1](verification/darwin-v1/receipt.json) | 10 pass / 51 fail / 1 skip | Missing VDOM parenthesis prevents parsing; no semantic pass is inferred. |
| [Darwin-v2](verification/darwin-v2/receipt.json) | 59/62 pass | Three compiled regressions expose ordinary rebinding missing the capability update. |
| [Darwin-v3](verification/darwin-v3/receipt.json) | 61/62 pass | Compiled joint input cut declines on array object identity. |
| [Darwin-v4](verification/darwin-v4/receipt.json) | 62/62 pass | Corrected final executable source. |

Numeric supervisors exit 1/1/1/0 in 23.343/51.812/51.302/51.782 seconds, with no deadline stops. Final source passes **1087 runtime tests, 83 Rust tests, 43 compiled fixtures, twenty actual Three cases, three retention checks and thirteen package checks**. All 1377 runner inputs match before/after each run; each archives 1387 source/context rows. V4 preserves 237 fixture artifacts. Original assertions remain; added cases cover real claimed-domain descriptor revocation, both member orders, strict Store versions/newer actions, overridable World methods, scalar accessor replacement, copy-capture writer revocation, opaque resources and generic manual binding fallback.

One [isolated diagnosis](evidence-diagnostic-v1/README.md) preserves two command outcomes: the first Node selection fails before loading the fixture; the corrected absolute pinned Node executes the fixture once and identifies `retained.sources`, propagating to composite and root admission. All 335 production and 335 snapshot hashes match before/after. The source correction compares exact list contents and keeps the remaining guards. Diagnostic timings are not performance evidence, and no production instrumentation remains. Its failed preparation and first command remain preserved.

## Fresh installed product proof

[Build proof](proof-v1/build-proof.json) passes 20/20 assertions, four public admission controls, four domain controls and six resource lifetime controls from five fresh installed tarballs. It binds 27 authored rows, four frozen comparison sources, 3168 selected installed files and 1387 staged source/context rows. Native application, scene, controller and React comparator bytes retain the previous authored episode; controls are separate.

Actual Rust/OXC app/scene revisions are `native-v1-f202b4a94279cb6c` / `native-v1-7ef9e248f2166c23`, with matching owner metadata. React Projection/Result/App emit `_c(14)` / `_c(14)` / `_c(23)`. The packaged Darwin ARM64 compiler SHA-256 is `458498f59bca4904718114168142a187ca2e48f85e4124bb63e08aa4e498933c`.

[Untimed proof](proof-v1/proof-pair-one-shot.json) passes 27 main, four cancellation and three immediate-disposal stages per arm. Retained A, B/fork divergence and convergence, stale A/B rejection, C acceptance across DOM/Three, twenty urgent actions, identities and exposed cleanup pass. Both browser phases match all **9265 hash checks before and after**, with zero fallback additions, blocked/failed requests, page/console/proof/cleanup errors and closed contexts/browser. Prepare/proof supervisors exit 0 in 4.705/6.876 seconds. Finite exposed cleanup is not a universal leak-absence proof.

## Sole bounded comparison

[Timing](proof-v1/timing-pair-one-shot.json) runs once after final reviewed-source proof under immutable hash-bound authorization, fixed Native then React, and exits 0 in 6.513 seconds. No favorable retry or later executable correction occurs.

| Twenty urgent dispatch-to-observer intervals | Native ms | React ms |
| --- | ---: | ---: |
| First | 1.1 | 0.8 |
| Median | 0.9 | 0.3 |
| p95 | 1.5 | 0.5 |
| Sum | 20.5 | 7.4 |
| C settlement to observer | 1.4 | 0.6 |

Native is slower in this observation. Observed quantum is about 0.1 ms. Fixed order, twenty dependent near-floor observations, observer/harness work, controlled providers and unequal JS graphs (2761459/1065024 bytes) establish no CPU, population-tail, cold/setup/allocation/retained-memory, physical input/presentation, network-frontier, independent-device or release-budget qualification. The unchanged browser episode does not isolate admission/setup/retention cost. Exact offline synthetic HTTPS replay is headless, GPU-disabled, bounded and interruptible; no server or VM starts.

SHA-256 receipts:

- Build: `8598e8862257a4ccdec26f4a517a95f26dfcec97c423dbd69e5114ff903c1721`.
- Input lock: `b9fd510b65868ae050b6faf11f077185509c54c127219054b4f1d7966d0e4393`.
- Untimed proof: `f417ea19f099a72f9ffd68651da6446b3a6a6482747faab3bba131f0f0ed1069`.
- Timing: `eaa78843b4d015778d65a4f8552fc67f3a964e23d43ec3757677d20b4f7a50db`.

Reports, guide/checkpoint and notebook updates are post-run documentation. Fixed tracked generated cache files are restored only after their new outputs are archived; all 768 fresh cache evidence entries (764 hash-bound fixture files and four negative-fixture symlinks) remain tracked. A final post-report audit matches every one of 831 selected executable inputs to the passing v4 gate. No historical manifests or old timings are rewritten or inherited.

## Remaining scope and memory

The full-plan first pass remains active. Release performance, cold/memory, current other-platform and independent-device gates remain open; historic stable-binding wins, qualified dense FAIL, exhausted Recording A and physical HOLD retain their source scopes. Human participants remain zero and no maintenance advantage is claimed. No universal React superiority, compatibility, smoothness or absence of leaks is established.

Apple tooling/storage/logs remain on Depot. Saved user/service defaults remain one CPU, 256 MiB/container and 512 MiB/build. Startup permissions and effective VM caps remain unverified; no VM/server, administrator prompt or memory increase occurs in this slice.
