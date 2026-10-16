# Prepared style writers: integrated timing decision

13 October 2026. **Verified evidence; speed gate FAIL.** This is one named
confirmation, not a causal estimate of the style-writer change.

## Candidate and result

Frozen source archive SHA-256:
`093f7058977c0a1290ddcc3f27b7ee5cbda022e9e43a161be1b24b950c3c419b`.
593 runtime tests, 29 Rust tests, 12 final integration commands, six correctness
pilots qualified the candidate. All 30 fresh pages passed all five product
checks and lifecycle assertions, with 7,200 measured frames. All frozen input
and served build hashes matched before and after collection. Every pair resolved
under the fixed five-clock-tick rule.

| Rows | React median ms | Native median ms | Paired median ratio | Paired p95 ratio |
| --- | ---: | ---: | ---: | ---: |
| 128 | 0.180 | 0.280 | 1.599 | 1.623 |
| 512 | 0.570 | 1.025 | 1.770 | 2.248 |
| 1024 | 1.100 | 1.935 | 1.767 | 2.364 |

Arm medians are medians of five page medians. The median ratio is the geometric
mean of five paired native/React page-median ratios; the p95 ratio is the median
of five paired page-p95 ratios. Page loads are the replication unit. The fixed
requirements (.80 median ratio at two sizes; 1.10 p95 ratio at every size) fail
at all three sizes. The React baseline includes React Compiler.

## Analysis failures preserved and repaired

The frozen original analyzer compared an absolute protocol path with the
collector's project-relative input-lock key and reported INVALID despite all
30 pages being valid. Its original summary and verifier failure are preserved.
A separate v2 analyzer normalized that path, but its metadata allowlist failed
to allow the preserved original summary; that failure is preserved too. The
v3 analyzer fixes the allowlist, emits separate summary-v3 JSON/SVG, and records
original/v2 source and summary hashes. The separate v3 verifier recalculates all
page metrics and gates, checks the archive contents and all source/build and
verification locks, and passes with a FAIL speed decision. No raw page,
preregistration, workload, threshold, or frozen script was replaced or edited.

## Decision

Prepared style writers are a correctness-qualified public host capability, but
are insufficient to meet the integrated performance requirement. Keep the
supported fallback and lifecycle behavior. Proceed with M5's compiler-known
owner/site numeric state layout, reusing existing NumericColumn and row writers.
Start with stable column capacity, reusable VDOM row staging, and conservative
compiler metadata, then integrate World storage, binding, and Root capture.
The next candidate needs actual authored TSX execution proofs and the same
fixed integrated gate; reduced lookups or tests alone do not establish speed.

## Limits

This study measures synchronous frame step CPU, including component rendering,
with mount/disposal reported separately. Browser layout, paint, GPU presentation,
and perceived responsiveness are excluded. Headed Chromium has GPU disabled,
both arms use COOP/COEP, and there is one machine. There is no separate allocation
result for this candidate. Earlier allocation diagnostics and timing studies
cannot establish a causal improvement for this change. Independent-device and
human maintenance/adoption gates remain open. Workers, streaming, hydration,
and Wasm remain deferred.

Run ID: `80ee10a9-9c05-4b75-bd85-f37842289eea`.
