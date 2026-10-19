# Closed const-arrow authoring source review

Source basis: clean main `4bc07ceff60cb787109faa84a6f208ca64df4e69`; actual remote main/HEAD still resolve to initial `a694d72959970eca750d2fa09c91d0b64ae5494a`. AGENTS, checkpoint, complete master guide, handoff, relevant research guide, paper/notebook and referenced arrow/held-reader evidence govern selection. The previous goal turn is progress. No new tests/builds/browser/measurement have run for this unit.

## Current source finding

Numeric certification in `compiler/oxc-spike/src/main.rs` explicitly requires `component.arrow_initializer.is_none()`. Closed Store/resource collectors implement `visit_function` and builders take `Function`; the forwarding proof also gets its own symbol from `node.id`, so merely adding an arrow visitor is insufficient. Existing component IR already records the accepted arrow declaration/initializer spans and lexical hooks. Use that same semantic identity rather than a second component registry or name-based match.

`closed_subtree_host` admits nested elements and expression containers only. Text children decline, including raw indentation; empty comment containers also have no expression and decline. Last unit's actual schema assertion failure and preserved transform establish that formatting case. Accepting arbitrary whitespace through `trim` or Unicode `is_whitespace` would be unsound: single-line spaces/tabs and non-ASCII characters can render text. The new helper must recognize only truly elided JSX output and retain meaningful output through generic rendering.

The previous arrow slice's paper/notebook/source review explicitly limits arrows to generic execution. Those records remain historical; this unit needs its own source/provenance/execution evidence and cannot inherit their timings. Existing strict proof requirements, parameter/statement checks, runtime-owned input capture, whole-tree guards and publication/lifetime authorities remain. A borrowed proof view must not change runtime arrow syntax or lexical semantics.

## Review and limits

Primary owns integration/documentation/gate registration; compiler and authoring Sol agents have disjoint file ownership and execute no gates. Actual generated metadata and compiled executions, not expected API shape, decide success. Luna runs consolidated checks and the sole bounded comparison after review. No speculative physical redesign is approved; Recording A stays exhausted/unresolved and physical selection HOLD.

Added compiler/metadata/runtime costs, current platform qualification, full authored lifecycle/cold/memory/presentation/independent-device requirements and human maintenance evidence remain open. Saved one-CPU 256/512 MiB Apple defaults remain unverified; no VM or project server starts for this work.

## Integrated source decisions

The numeric arrow gate is stricter than merely removing the old exclusion: eligible bodies contain only exact known state-site declarations with closed primitive initializers and a single intrinsic JSX return over those values. Setter destructuring, extra statements, event/ref/callback props, captures and hidden property reads decline. The source review caught an authored render-time setter capture that a broad gate could skip on update; it was removed from the pure numeric demonstration. The interactive dialog remains generic. Parenthesized numeric returns conservatively decline. The separate arrow `hostLeafOutput` hint stays false because its existing collector does not establish side-effect freedom.

Resource/Store/forwarding use a borrowed `ClosedCallable` view; runtime arrow initializers remain arrows. Exact accepted initializer spans and original const SymbolIds connect forwarding edges. Existing parameter, statement, expression, source/tuple-span, revision and metadata checks remain. The shared JSX helper requires raw ASCII indentation with a CR/LF and compatible cooked text, or an empty expression container; it does not trim Unicode or erase entities. Raw-child caps still apply before elision. Named-function proof behavior changes only by this deliberate empty-output handling.

Primary reviewed compiler changes, all new fixture/harness branches, installed preparation/capture/comparison code, browser teardown and locked source/asset checks. The authored proof checks schema-5 inputs, expression-arrow forwarding, numeric metadata/mount retention, generic significant text/callback/lexical behavior, held resources, independent updates, Store/local control invalidation, exact revision retirement and cleanup. The browser pair measures a generic authored local-state update while closed arrow resource branches remain held; it does not measure a closed numeric update or isolate compiler savings. No runtime mechanism or physical layout changes in this unit. Consolidated execution remains pending.

Darwin-v1 preserved a fixture failure after all earlier behavior assertions: the retirement call supplied the absolute transform path, but the actual compiler plan registers the repository-relative `source_file`. It returned false without retiring anything. The harness now reads and validates the exact emitted key, and uses it for retirement and cleanup. No product source changed for this repair. V1 passed 45/46 steps with matching 1077 runner inputs; its failure remains evidence, and corrected consolidated execution is pending.
