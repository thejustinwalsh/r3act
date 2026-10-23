# First-pass completion audit

Basis: main at `9759a0bb3e1214218f49f35542512f10357ee7ac`. This audit follows the completed native-frame boundary. It does not rerun or reinterpret its failed timing episode, authorize a physical redesign, or declare the full goal complete.

The prior question-answer turn changed no authoritative implementation state. This unit reads the complete master guide, checks current source and existing receipts, and replaces blanket remaining-work summaries with requirement-specific dispositions. Two Sol-medium source audits and one Luna receipt audit have disjoint artifact ownership. No product source, browser, server, VM, gate or benchmark is changed or run here.

## Compiler and frame contracts reviewed by primary

- `docs/native-authoring-reference.md` defines mandatory compilation, the native subset, conditional hook sites, unsupported cases, generic repeatability, transition replacement, closed input provenance and conservative HMR. It deliberately does not promise React hook or ecosystem equivalence.
- `compiler/vite_native_module.ts` verifies resolved runtime origins and compiler responses, registers code-associated semantic revisions, preflights edits, and sends exact previous revision/instance invalidation before full reload. `src/compiled_semantic_plan.ts` retains private current-plan identity; even re-registering the same revision string cannot revive an invalidated token. Inspection metadata alone grants no purity.
- `src/native_frame_loop.ts` publishes selected root/Store groups through the existing queue before draw. Delayed completion compares queue-accepted versions with actual roots; an intervening publication triggers fresh preparation without repeating the update. Terminal publication failure latches against replay. Root retirement, stop and disposal release owned work. The loop owns neither caller roots nor resources. Frame-time and scheduling contracts are covered by the last gate; no physical presentation claim follows.
- The latest actual compiled fixture is `compiler/compiled_native_frame_publication_test.mjs`; its scope includes DOM/Three/fork history, newer host-time actions, delayed publication, ordinary Studio progress, retirement, resource disposal and failure. It is bounded coverage, not a proof for arbitrary hosts or every async/structural combination.

## Decision rules

A missing release measurement is not an unimplemented feature. A conservative documented fallback is not automatically a defect. A passed receipt proves only its named source and assertions. The original realtime performance, cold/memory and independent-device requirements remain unmet unless current evidence proves them; historical wins, qualified dense loss and failed diagnostic controls remain unchanged.

Do not dispatch another compiler/helper/cache/writer/container series merely because parity failed. Any next source slice requires a precise remaining contract or demonstrable defect. Human maintenance superiority is not claimed, so zero participants cannot be converted into a requirement to invent study results. Optional workers/streams/CRDT remain separately gated.

## Integrated audit review

Primary reviewed both Sol reports and Luna's receipt audit, checked the finite resource-dependency scan, all-member admission entry, public VDOMHost/copy contract, and revision token identity against current source. The current frame and API source hashes match the audit binding. All new audit Markdown link targets exist and the JSON parses. `git diff --check` passes; product source has no diff.

Review corrected three overbroad audit inferences before acceptance: historical bottom-of-checkpoint “not implemented” text cannot establish a current source gap; lack of rollback or cross-renderer visual atomicity is an explicit exclusion; and the user's accepted quick Linux smoke does not require another OS/architecture matrix. The structural clause permits documented generic fallback. Human evidence is required for a maintenance advantage claim, which is not made. Registry publication is not a finish-line prerequisite.

Primary disposition for receipt-audit item (b), which Luna correctly leaves to source review: current code and finite regression coverage support the documented shared authority across numeric, keyed, Store and async paths. This does not certify every interleaving or arbitrary extension. Items (d) and broader qualification remain unachieved exactly as listed in `results.md`. No next runtime slice is selected without a concrete gap or supported budget.
