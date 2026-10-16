# Recording B N=128 count page

## Outcome

The single authorized `MODE=count` page completed with exit code 0 and reported `CORRECTNESS_AND_COUNT_PROTOCOL_PASS_SINGLE_N_128_COUNT`. It recorded 120 scheduled edits (12 kinds × 10, with 2 warmups and 8 measured per kind), 121 trace entries including disposal, and all seven required counter sites. Timing collection was absent. The page reports no page, console, request, response, or cleanup errors. Reader count returned to 0, owner count to 0, and no children remained.

The browser was Chromium 153.0.8010.12, headless with GPU disabled, at 1200×900. The exact HTTPS origin was `https://structural-recording-diagnostic-v1.localhost:1355`. HTML, JavaScript, and source-map responses were all HTTP 200; the HTML and JavaScript hashes match the frozen build and the source map matched its expected hash. No favicon request was present. This is one count-protocol page, not timing evidence or a performance result.

## Measured counts

Each row below summarizes the eight measured edits of that kind. These are operation counters, not elapsed time or cost estimates. `Bucket reindex` is shown as a min–max range where reported; `unobserved` is retained as unknown, not zero.

| Kind | Delta operations | Owner find probes | Bucket reindex loop visits |
|---|---:|---:|---:|
| edge-replacement | 2 | 4 | 128 |
| insert-head | 1 | 3 | 65–129 |
| insert-middle | 1 | 3 | 65 |
| insert-tail | 1 | 2 | 1–65 |
| move-head | 1 | 2 | 128 |
| move-middle | 1 | 2 | 192 |
| move-tail | 1 | 1 | 128 |
| odd-key-filter | 64 | 64 | 4032–4095 |
| remove-head | 1 | 1 | 127–190 |
| remove-middle | 1 | 1 | 63 |
| remove-tail | 1 | 1 | unobserved |
| same-key-rotation | 1 | 1 | 128 |

All 120 edits passed the independent structural audit: one flush and one delta batch per edit; the five K-sites agreed with the edit's delta-operation count; no fallback or listener errors; and no retained batches. The filter case performs 64 public removals, so its higher counters are expected for that operation and are not a locality falsifier. Bucket reindex counts vary with the retained bucket shape under the same root. Do not aggregate the per-kind values into total costs or infer a speed/locality verdict from this page.

## Preservation and cleanup

The post-page audit confirms all 767 frozen frontend inputs and all 41 runner-lock entries still match their hashes. The runner-lock self hash is `6130af682618845cfbf821bd1e5df21235996ad498ce8483c3fb023798062735`; the frontend input-lock hash is `9e4de310288b4c342039a67b7e25fa32646dbf30f1ad2227828fc9aae99015ec`. All 2,181 pre-existing evidence entries were unchanged. The frozen build report remains `2b0012dc7d6345f16bcd54e320a37287e0a1cb8236a54dffd4f67c7665f7a7f4`, and the pinned compiler remains `74396ae694aa6203cc4d4b4900c3458ca31e25e9638c73160b51bcb4aede79c8`.

The collector session 14040 ended with exit 0. The owned preview session 9967 was stopped with Ctrl-C and ended with exit 130. Its Vite listener (PID 95856, port 4910) is no longer listening. Shared Portless proxy PID 43235 remains listening on port 1355. The post-stop route listing retains the three pre-existing yacht aliases and does not list the owned alias. No shared alias was removed.

The first default-sandbox Portless launch failed with an `EPERM` while accessing the Portless proxy log. The launch was then repeated once with command-scoped escalation, and succeeded; this was a startup permission failure before any collector page, not a collector retry. A preliminary `.localhost` resolver probe and a default-sandbox loopback HTTPS probe also failed under sandbox restrictions. The escalated HTTPS readiness probe used Portless' CA with certificate validation enabled and returned HTTP 200 before collection.

## Receipts

- Raw collector tool results: `collector.initial.tool-result.json` and `collector.terminal.tool-result.json`.
- Full generated page report: `../page-report-count.json`.
- Independent page audit: `page-audit.json`.
- Before/after frozen-input audit: `before.json` and `after.json`.
- Route and listener cleanup: `portless-before.json`, `cleanup.json`, and `cleanup.commands.json`.
- Readiness probe record: `readiness-probes.json`.

No off-mode page, additional count page, build, source edit, or performance measurement was run in this task.
