# Developer Study Comprehension Rubric

**Rubric v0.2 · draft · pre-data**

Use the same five open-response questions after each task in both arms. Ask participants not to reopen the source while answering. Keep question order fixed. Score each answer from 0 to 2 using the shared anchors below, then apply the task-specific concepts. Maximum: 10 points per task and arm.

## Shared scoring anchors

- **0 — Incorrect or absent:** no answer, a materially incorrect explanation, or an explanation contradicted by the submitted implementation.
- **1 — Partial:** identifies a relevant state, source, function, or output but misses the causal path, ownership rule, or required edge case.
- **2 — Accurate causal explanation:** traces the triggering change through the implementation to the affected owner/region and observable result, including the relevant identity or lifecycle rule.

Accept equivalent explanations in React and the prototype. Do not award points for framework vocabulary by itself. Score only what the participant explains about their submitted code. Record a short reason for each score; adjudicate disagreements between two scorers before unblinding participant order.

## Task A: conditional state and lifecycle

1. **Where does owner A's draft value live, and what keeps it associated with A?** A full-credit answer identifies A's keyed owner and the state identity mechanism used by that implementation.
2. **Why does A's draft remain `2` while its settings region is hidden, and what happens to that value when A is shown again?** A full-credit answer distinguishes region visibility/effect lifetime from the state owner's lifetime.
3. **Trace the subscription setup and cleanup sequence for A through show, hide, show, and owner removal.** A full-credit answer gives two setups and two cleanups and associates each with the relevant visibility or disposal transition.
4. **What would go wrong if owner state followed each row's array position instead of its owner ID?** A full-credit answer predicts that reordering could associate A's draft with B or otherwise move state to the wrong owner, and connects the correct behavior to stable keyed identity.
5. **Why does clicking A's Increment button change A's draft without changing B's?** A full-credit answer identifies owner-local state and explains how the rendered button's update handler targets the state belonging to A's keyed owner.

## Task B: shared input and derived regions

1. **Which inputs determine the group region's rows, and what does changing `queryA` invalidate?** Full credit names the shared rows and `queryA`, the group predicate, and the group region output.
2. **Which inputs determine the score region's rows?** Full credit names the shared rows and `queryB` and explains the score threshold.
3. **Why does changing only `queryA` preserve the score region's root identity?** Full credit traces the update to the group region and explains why the score region has no dependency on `queryA`.
4. **Why does appending row 4 update both regions, and which outputs should contain row 4?** Full credit identifies the shared `rows` dependency and gives group `[2,4]` and score `[2,3,4]` at that point in the script.
5. **How does each region's `data-query` value stay synchronized when its query changes?** Full credit names the corresponding query as the source and traces it to the host attribute update for that region.

## Scorer calibration notes (not participant handout)

Use these causal concepts for the 2-point threshold. Accept different terminology when the participant traces the same mechanism. A 1-point answer names a relevant value or mechanism but omits one of the causal links below. A 0-point answer is absent, materially incorrect, or contradicted by the submitted code.

| Item | Full-credit causal chain |
|---|---|
| A1 | React: `draft` is local state in the `Owner` component instance; the owner is rendered with key `id`, so its state stays with that owner. Runtime: the compiler-generated state site belongs to the `Owner` component/entity instance; the owner's key/identity keeps the state associated with A. |
| A2 | Hiding makes `active` false, removing the settings region while the keyed `Owner` remains. The draft belongs to that still-mounted owner, so it remains 2 and is displayed again when the region returns. |
| A3 | Setup occurs on first activation; hiding causes one cleanup; showing again causes a second setup; removing the active owner causes the second cleanup. The answer must distinguish hide/deactivation from final owner removal. |
| A4 | State must be matched by owner ID/key, not array index. Moving A from slot 0 to slot 1 must leave A's 3 with A and B's 0 with B; positional state association can swap or misassign those values. |
| A5 | The click handler rendered for A dispatches an increment to A's owner-local draft state. B has a separate owner instance/state cell, so the event does not increment B. |
| B1 | The groups output reads the shared `rows` and `queryA`, filters with `row.group === Number(queryA)`, and changing `queryA` updates the groups result. React's group region receives that prop change; the runtime dependency graph links it to the group region. |
| B2 | The scores output reads `rows` and `queryB`, filtering with `row.score >= Number(queryB)`. A queryB or rows change can change this result. |
| B3 | With `queryA` changed, `rows` and `queryB` stay the same. React's memoized score region receives the same props; the runtime graph has no `queryA` edge to that region. Thus the score root keeps identity. |
| B4 | Appending row 4 changes shared `rows`, which both regions read. After queryA is 2 and queryB is 75, row 4 belongs in groups `[2,4]` and scores `[2,3,4]`; keyed rows that remain visible retain their DOM nodes. |
| B5 | Each section's `data-query` prop is read from its own query (`queryA` for groups, `queryB` for scores), then carried by JSX/VDOM reconciliation to the host attribute when that query changes. |

Before data collection, have two scorers independently apply this guide to the matched reference solutions and a small set of hypothetical partial answers. Resolve ambiguous wording and record the decision before the rubric is frozen. This calibration checks the scoring instructions; it does not count as participant data or establish comprehension reliability.

## Scorer worksheet

Record one row per participant, task, arm, and question:

| participant | task | arm | question | score (0–2) | short scoring rationale |
|---|---|---|---|---:|---|

This rubric is not frozen for data collection. Pilot it with the exact starter implementations, check that both arms can earn full credit without hidden assumptions, then date and hash the final rubric before recruitment. Do not revise scoring after looking at scored outcomes.
