# Errata: N=128 measured move reindex range

This erratum corrects one cross-size sentence in `report.md`; the original report and page receipts remain unchanged.

The N=128 raw count page is `../../frontend/page-report-count.json`, SHA-256 `f73d0e52c1bf102d3044499be9bea67645ac86a1fd1027419696cd8248b62c2b`. Its status is `CORRECTNESS_AND_COUNT_PROTOCOL_PASS_SINGLE_N_128_COUNT`; analysis is PASS, size 128, and timings are ABSENT.

Filtering raw edits to `sampleKind == "measured"` gives eight rows per move kind:

- `move-head`: eight `bucket.reindex-loop-visits` values of 128
- `move-middle`: eight values of 192
- `move-tail`: eight values of 128
- `same-key-rotation`: eight values of 128

Therefore the measured move reindex range at N=128 is **128–192**, not **127–192** as stated in the N=10,000 report. Warmup rows were excluded. The `127` value does not occur in these four measured move groups.

The N=10,000 page report remains SHA-256 `f8bd48fdca42759f6a4a40fca46f048195f5e0829d2b23beba27d1a4e3494d92`; its N=128 range sentence is the sole correction documented here. This is a raw-count fact-check only and adds no workload or performance claim.
