# Owner-row fusion: allocation diagnostic

Six fixed profiles and 85 independent integrity checks pass. Each page covers import, mount, 60 warmup frames, 240 measured frames, correctness inspection and disposal. CDP sampling uses a 32,768-byte interval and includes objects collected by minor and major GC. This is one pair per size on one device; sampled amounts are estimates, not exact allocation totals or update-only costs.

| Rows | React tree selfSize (MB) | Native tree selfSize (MB) | Native/React estimate |
|---:|---:|---:|---:|
| 128 | 46.9 | 38.2 | 0.815 |
| 512 | 160.5 | 99.6 | 0.620 |
| 1024 | 313.7 | 181.4 | 0.578 |

The native arm has lower sampled whole-page allocation in these profiles, while the separate unprofiled timing study remains 25–39% slower than React Compiler. The allocation diagnostic cannot reverse that speed failure or establish a release allocation advantage. Flat sample totals are reported separately and need not equal tree selfSize. Heap readings exclude DOM, GPU and presentation memory; post-GC readings follow disposal and do not prove universal leak freedom.

At 1,024 native rows, ranked sampled locations include the harness (33.2 MB), World dispatch (29.8 MB), the prepared row executor (15.1 MB), and authored CSS string projectors. Function-entry attribution does not identify individual allocation expressions or prove their cause. Anonymous/iterator frames are retained rather than assigned to framework work without evidence.

## Verifier correction

The original verifier incorrectly used the two-edit pilot lifecycle expectation for the eight-edit confirmation workload. The locked harness inserts/removes eight rows on each structural frame, so confirmation mounts are size + 64 and pre-disposal cleanups are 64. Versioned verifier V2 applies those counts to the same six profiles, preserving the original failed verification and log. No profiles were rerun, replaced or excluded.

## Next implementation

Review the staged direct pending-key acknowledgment and compiler-emitted primitive sink program. Keep full-cut validation, exact version acknowledgment, first-touch ordering, cancellation, and all projections before host writes. Neither staged design is a measured speed improvement. Independent-device, human-maintenance and broad allocation claims remain open.
