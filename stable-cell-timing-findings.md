# Stable numeric-cell confirmation

## Decision

The stable-cell candidate preserves the tested behavior but fails the preregistered speed gate. It is not a demonstrated faster replacement for React on this workload. The next optimization requires attribution of the current build, rather than assuming old profile costs remain unchanged.

| Rows | React median ms | Candidate median ms | Paired median geometric mean ratio | Paired p95 median ratio |
| --- | ---: | ---: | ---: | ---: |
| 128 | 0.180 | 0.225 | 1.2736 | 1.4902 |
| 512 | 0.580 | 0.790 | 1.3620 | 1.2715 |
| 1024 | 1.105 | 1.600 | 1.4355 | 1.5551 |

The fixed study comprises 30 pages, five alternating pairs per size and 7,200 measured frames. All pages pass the locked harness's value/order/identity checks. Independent verification checks 989 checkpoint archive members and 1,007 input locks. Raw records contain checks and errors, not complete DOM snapshots, so independent verification does not reconstruct every row value from the records.

The median gate requires a paired ratio at most 0.80 at two sizes; the p95 gate requires at most 1.10 at every size. Both fail. Structural median costs also remain higher: candidate 1.500/3.245/5.330 ms versus React 0.380/0.920/1.620 ms. Initial mount and disposal also lose in this bounded workload. Measurements are from this machine and browser, not an independent-device result.

## Interpretation

Shared prototype accessors preserve fast V8 properties in the qualified Chromium diagnostic, and lifecycle/publication tests pass. That representation fact does not itself prove a latency win. Historical prepared-cell results were slower still, but separate runs are not a randomized causal estimate of savings from this change. No allocation result was collected for this candidate.

## Evidence repairs

All original raw records, protocols, scripts, failed reports and source checkpoints remain unchanged. V2 analysis fixes an Array.every callback accidentally receiving its array index as a generation argument. V2 verification fixes a diagnostic source-path expectation while separately checking the archived script's bytes. It also distinguishes a destroyed cell's explicitly undefined box from the non-undefined promoted payload checked by the original laneOff helper. These repairs change evidence validation, not workload behavior or acceptance thresholds. The original verifier stopped at the path assertion; the destroyed-cell contradiction was discovered during repair. V2 files record provenance.

The authoritative derived reports are results/product-mixed-stable-cells-confirmation/summary-v2.json and verification.json. The source checkpoint is implementation/2026-10-13-stable-numeric-cells/source-and-evidence.tar.gz, SHA-256 11b0c553b021e4ca96cdcc75f71babf3cdc9e7aaf19f49699c55a7b0ba7fc0d6.

## Bounded next step

Profile one current 1024-row React/candidate pair with locked production assets. Separate sampled runtime categories from harness/browser/startup work and state the limits of sampling. A read-only architecture audit will identify repeated checks and the proof obligations for any compiler batching. Choose one implementation from the current attribution; retain ordinary declarative TSX, source/state observability, private async candidates, generation safety, coherent publication and retained VDOM.
