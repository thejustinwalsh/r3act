# World journal CPU diagnosis and next change

13 October 2026. Both registered 1,024-row pages pass collection. Independent
verification of the preserved profiles passes 39 checks after a named verifier
repair. This is sampled whole-page CPU evidence, not a latency verdict.

## Ranked native contexts

At a 1,000-microsecond requested sampling interval, native has 710.378 ms of
weighted sampled self time attributed by URL to its combined application/runtime
bundle. React has 317.321 ms in its combined bundle. These include import, mount,
60 warmup frames, 240 measured frames and disposal; they are not update-only
times, paired estimates or a speed-gate result. Idle, program, GC and common
harness samples remain separately reported, not deleted from the profile.

Verified emitted-source positions identify these native self contexts:

| Context identified from emitted source | Sampled self ms |
| --- | ---: |
| `writeStyle` helper (`ke`, offset 78565) | 140.089 |
| Numeric-program execution closure (offset 60999) | 81.770 |
| Root native cell-cut path (`#We`, offset 136279) | 69.840 |
| DOM `setStyleProp` (offset 80340) | 45.193 |
| Committed state forwarding closure (offset 28045) | 39.370 |
| `scalarSourceForCell` (offset 30912) | 33.983 |
| Bound output equality helper (`re`, offset 38091) | 23.646 |
| `versionForCell` (offset 31360) | 21.517 |
| World journal `mark` (offset 19650) | 20.831 |
| Root pending journal `setCell` (offset 15722) | 19.682 |

The method interpretation is based on the hash-verified surrounding emitted
text and current source inspection. Samples can include browser native work
charged to their JS caller; these figures cannot isolate property setter engine
cost from JS dispatch or assign every inlined instruction to a source method.
They are self samples, not inclusive call-tree totals. The large shared harness
inspector is outside the arm-bundle ranking and remains in the full ledger.

## Preserve the verifier failure

The registered verifier produced a preserved 38/39 result: its native lifecycle
assertion incorrectly expected two collection notifications from a pilot, while
the confirm workload performs eight edits. It also compared collection version
and retained-batch fields at locations absent from the public harness schema.
Source inspection confirms the version is exposed at `active.extra.collectionVersion`
and retained batches at `active.extra.collection.retainedBatches`.

`verify_product_mixed_world_journal_cpu_v2.mjs` corrects only those assertions to
the eight scheduled structural frames and actual diagnostics schema, records
the original verifier/result/failure-log hashes, and validates the same raw
records: 39/39 pass. The original verifier, failed verification result, and raw
data are unchanged. No page was rerun, replaced or excluded.

## Bounded implementation decision

First add an optional public host capability for preparing a style-field writer
at binding activation. The DOM host can resolve element eligibility, capture its
style object and select custom-property versus ordinary-property behavior once.
Retained writer groups then call that writer with staged next/previous values.
Hosts without the capability or which decline it keep the existing field writer;
hosts without field-writing support keep the existing whole-style fallback.

Use the same retained ownership, equality, coherent projection staging, guarded
host phase, terminal error policy, ref/effect order and teardown. Resolve/release
the writer with group lifetime, preserve keyed moves, and cover source switches,
binding refresh, mutable values, CSS variables, SVG and host failures. Do not add
an author flag, manual mutations, a runtime backend or a new storage family.

This targets measured repeated host dispatch, but the profile does not prove
that preparing writers removes browser CSS setter cost. It cannot be claimed
to recover the whole gap. A separately archived candidate and unchanged speed
gate must decide the result. Executable-program selection and repeated cell
lookup remain the next ranked kernel questions; typed columns require their own
integrated source/storage contract and attribution before adoption.

## Evidence

Raw profiles, frozen registration, postlock and both verification results:
`results/product-mixed-world-journal-cpu/`. Separate allocation diagnostic:
`world-journal-allocation-findings.md`. Source/build candidate archive SHA-256:
`262914378f2cebb79d77805e7dda341d6b9c58b00de9c9a7eba801d621202468`.
The previous speed failure remains archived. Independent-device and comparative
human maintenance gates remain open; the goal remains active.
