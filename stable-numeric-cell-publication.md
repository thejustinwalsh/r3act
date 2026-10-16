# Stable numeric cell representation

13 October 2026. Implemented by a bounded Luna high agent, audited independently by another, and reviewed and integrated by the primary. This is a correctness and engine-layout milestone; timing remains unmeasured for this candidate.

The preceding prepared-cell product comparison passed all 30 correctness pages but failed every speed target. See `prepared-cell-program-timing-findings.md`. Chromium inspection then showed that converting an own `value` data property to an accessor normalized actual World cells into dictionary property storage.

## Change

Compiler-eligible numeric cells now have the shared getter/setter on their prototype from construction. Their own field insertion order is fixed across direct and private candidate creation. Before publication they hold an independent boxed value. Lane attachment seeds the Float64Array row and clears the box; detachment saves the value before clearing/recycling the row. These cells never redefine their own `value` property.

Generic cells stay ordinary writable objects. A generic cell that receives layout metadata later uses the semantic compatibility path. Existing cell, handle, source and lane identities remain stable across candidate publication. Promotion is sticky; destruction clears the box, source and lane references. Root, VDOM, compiler, scheduler and adapter APIs are unchanged.

Primary review removed unnecessary getter/setter wrappers, checked explicit candidate copy paths, strengthened destruction with a still-present object payload, and added an existing-cell publication/rollback test for cell, lane and source identity. The representation distinction is private: eligible cells no longer have an own enumerable `value` property, and the audit found no consumer that enumerates or spreads a cell.

## Evidence

- Final primary runtime suite: **653/653**.
- Rust compiler suite: **32/32**.
- Ordinary OXC TSX prepared-cut proof: sparse/dense counts `[1, 6]`, zero generic snapshots or legacy numeric execution, retained keyed move/removal/reuse and candidate isolation assertions.
- Ordinary OXC TSX lifecycle proof: reentry, promotion/fallback, ref/effect ordering, terminal host error and cleanup.
- Separate production build: `dist-product-mixed-stable-cells`.
- Actual Chromium storage inspection: qualified `results/numeric-cell-storage-candidate-v3/diagnostic.json`, with matching script and bundle hashes and six local input hashes. CDP reaches the actual World owner/site cells without a source interceptor. Direct, private-publication, reentry, promotion, return-to-number, destruction and reuse snapshots retain fast properties. Lane-backed cells have no boxed value, and a retained destroyed cell explicitly reports cleared logical/boxed values and lane. Chrome 153 / V8 15.3.76.4, headless with the native-syntax inspection flag and GPU disabled.

The baseline inspection confirms dictionary properties on the frozen older cells. Candidate V1 preserved a harness failure on an uncaught expected dead-setter exception; V2 passed, and V3 added explicit flags so omitted JSON `undefined` fields cannot masquerade as a cleanup assertion. V3 is the qualified result. No source change was made to pass the diagnostic.

## Remaining gate

The actual representation issue is fixed, but its latency contribution has not been quantified. No speed or allocation claim follows from fast-properties inspection or test counts. New production correctness pilots and a separately frozen matched timing study are next. Keep the existing .80 median and 1.10 p95 targets, original workload and full correctness requirements.

The full library goal remains active, including async/store/transition behavior, compatibility, device replication and comparative maintenance gates. Sol remains held under its original prerequisites. Historical evidence, notebooks and protocols remain immutable.
