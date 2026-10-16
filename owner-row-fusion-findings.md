# Owner row executor simplification

The integrated executor combines dependency validation and value capture in one scratch-only pass and reuses validated row records when collecting sink fanouts. The full runtime suite passes 695 tests. Authored compiler and actual Three proofs pass, including 240 Three update batches with stable objects and resource cleanup. The production build passes with both native compilation and React Compiler memo caches verified.

## Preserved behavior and costs

All participating dependencies are validated and captured before source mirrors, projectors or host writes. Dirty input order still determines first-touch sink order. Untouched leases, duplicate conflicts, lazy first execution, reentry, cancellation and terminal host failures retain their checks. Scratch references are cleared in `finally`, including partially validated cuts; an invalid first input does not clear entries for the full supplied batch.

The one-thousand-row test checks one token-map lookup per dirty input instead of two. Its existing work-visit diagnostic reports 6,000 rather than 7,000 visits. That counter omits the new scratch reference writes and cleanup, so it does not establish reduced total work. The new reusable reference array also retains capacity after its entries are cleared. Latency and allocation measurements are required to decide whether this trade is worthwhile.

The new application bundles are 184.94 kB native and 221.03 kB React, with gzip sizes of 50.76 and 69.30 kB. These are application bundle sizes, not isolated runtime sizes. The fusion candidate has no qualified timing or allocation result yet. The preceding owner-row study remains the latest measured speed result and fails against React at all three sizes.

## Compiler and package boundary

The source also includes the verified Vite development fix that prevents the public native runtime from being optimized into an unrecognized dependency entry. The v2 installed package passed DOM, React adapter, Three and application-managed HMR tests before executor fusion. It contains the earlier executor, so its package evidence does not qualify a package of this new runtime revision. Runtime source-map packaging remains open.

## Next decision

Measure this frozen production candidate before combining another runtime change with it. The next architectural proposal targets Root-local dirty row/slot scheduling and capture, where the verified earlier CPU profile identified duplicate per-cell queue and acknowledgement work. Any implementation must preserve the existing ordered listener cuts, maximum-version coalescing during nested notifications, global first-dirty ordering across generic and numeric work, promotion handoff, independent Root acknowledgement, private candidates and store/collection/resource barriers.

The compiler, retained virtual DOM, ordinary declarative TSX and coherent async publication remain the direction. The performance gate, allocation gate, independent-device evidence and comparative human maintenance/adoption evidence remain acceptance requirements. The Sol review remains held.
