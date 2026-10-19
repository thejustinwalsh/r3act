# React island integration review

Status: implementation and review in progress; no correctness or timing result for changed source.

The starting main commit is `fefd4a9c`. Primary regrounding inspected the full master guide, current checkpoint, handoff/research guide, paper/notebook bridge scope, current optional adapter, native ref lifecycle and group publication paths, package manifests/builders and installed consumer. Existing tests establish grouped native acceptance before ref delivery; they do not establish a real React island. The new compiled fixture will report source/AST proof separately from browser React DOM execution.

## Authority and reviewed risks

- A reverse adapter can use the existing owner-local state and accepted ref phase. It must not mutate renderer state during native preparation or introduce a publication subscriber/version cache.
- Ref callbacks run before new activation effect setup. Initial reentrant disposal therefore needs preactivation ref-detach cleanup; activation cleanup alone can leak the React root.
- Ref replacement on ordinary props must preserve the React root; owner retirement unmounts it. Creation/render callbacks cannot revive a disposed lifetime.
- Accepted native props and React commit are separate moments. Async React errors require React-owned handling; arbitrary host or React mutation is not rollbackable.
- Public DOM validation must respect iframe realms. Injected memory-host lifecycle tests are an internal seam and are not real React DOM evidence.
- The optional bridge module now imports React DOM. Both active package builders and installed consumers need matching peer/type declarations, while native-only core entrypoints remain independent of React.
- Existing generic and whole-tree guards remain. An opaque island is not a closed Store/resource program; no hidden callback is promoted to purity to make async tests pass.

The primary owns package peers, consumer typing/identity checks and the separate compiler-source gate registration. Sol agents own the runtime lifetime implementation and the real compiled fixture/workload. No source-only review is a passing execution receipt. Consolidated verification follows the completed integrated slice, with every failure preserved and one bounded matched observation only after actual transform review.

The primary source review also found the bootstrap's missing capitalized native component, pending resource use outside Suspense, literal lowered-name assumptions and missing Rust service cleanup in the new fixture. Source repairs keep the intended interaction and all assertions: a real native root wrapper, stable native/React Suspense, AST import alias lookup and explicit compiler shutdown. These are pre-execution reviews, not failed runtime observations. Package typing now covers both bridge directions, including invalid prop expectations, and import identity through core. Legacy builder peer declarations are updated in source, but its 176 tracked historical package artifacts will not be rebuilt or rewritten by this boundary; the five-package distribution is the installed-consumer target.

Final primary review retains the owner-local lifecycle and generic boundary. Tests now cover props after all accepted group records, the same adapter across roots, remove/reinsert, original error identities, reentrant initial disposal and an existing island across a partial native host failure. The public wrapper checks the container's own DOM realm. Compiler source proof uses the actual fixture source ID and requires named native helper imports before matching calls, avoiding an undefined-alias false positive. Build capture is idempotent so repeated close hooks cannot mask an original transform failure. Timings separate controller setup return from first matching mount output and capture the clock quantum; no cold/CPU claim follows. Source is frozen for the consolidated boundary; no execution result exists yet.
