# World journal allocation diagnostic

13 October 2026. The new candidate has lower sampled allocation totals than the
matched React Compiler arm in this one registered diagnostic. It has no latency
verdict. The preceding candidate's speed failure remains unchanged.

| Rows | React tree self bytes | Native tree self bytes | Native/React |
| --- | ---: | ---: | ---: |
| 128 | 47,047,416 | 30,767,144 | 0.653960 |
| 512 | 161,488,748 | 95,080,600 | 0.588775 |
| 1,024 | 304,143,252 | 166,124,384 | 0.546204 |

These are sums of stopped CDP sampling-tree node self sizes, counted once per
node. Flat sample totals are preserved separately. There is one React/native
pair per size, six serial pages total, with 32 KiB sampling that includes minor
and major collected objects. Scope includes module import, mount, 60 warmup and
240 measured frames, inspection and disposal. This is a probabilistic full-page
allocation estimate, not an exact allocation count or an update-only comparison.

## Verification repair

All six collector records pass and all frozen input locks match. The original
registered verifier crashed before writing its result because
`candidateSourceBuildHashes` was referenced before initialization. Its frozen
bytes and first failure log are preserved. The separately named V2 verifier
changes declaration order, records both verifier hashes and the failure-log
hash, then validates the existing collection: **126 checks pass, zero fail**.
No page was rerun, replaced, excluded or changed. Two groups of flat sample IDs
absent from the stopped tree and unresolved attribution rows remain diagnostics.

## Current allocation contexts

At 1,024 rows, verified emitted positions identify approximately 35.6 MB under
the common harness inspector, 30.1 MB under the World committed setter, 27.0 MB
across the three authored CSS projectors, and 7.7 MB under the numeric-program
execution closure. Generic `setSources` contributes approximately 2.9 MB of
sampled self allocation; the workload still has eight structural frames using
the mixed path. These are contexts, not exact statement or phase attribution.
The older large recurring dirty-Set context is no longer prominent here. Source
inspection establishes that the new journal reuses its entries; comparing this
run to the historical profile does not provide an isolated causal estimate.

After disposal and forced GC, native used about 2.74–2.80 MB of JavaScript heap
versus React's 2.27–2.34 MB. The allocation result is therefore not a lower
retained-heap claim. This is neither mounted metadata measurement nor a general
leak proof; DOM and GPU memory are outside the JS heap reading.

## Decision

Use the separately registered current CPU diagnostic to rank execution costs
before another storage change. Object state cells, repeated identity/version
resolution and mixed source batching remain candidates. The allocation ratios
alone do not choose among them, justify a B+ tree or Wasm backend, or close the
integrated speed, independent-device or comparative maintenance gates.

Raw evidence is in `results/product-mixed-world-journal-memory/`; the recomputed
ledger and SVG are in `results/product-mixed-world-journal-memory-analysis/`.
The source/build candidate archive SHA-256 is
`262914378f2cebb79d77805e7dda341d6b9c58b00de9c9a7eba801d621202468`.
