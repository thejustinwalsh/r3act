# Participant packet · developer study v0.3

This packet is the exact task wording and facilitator sequence for the pre-data study. The protocol, source lock, task checks, and rubric remain drafts until the scored study is preregistered. Do not use this packet as evidence of participant outcomes.

## Participant instructions

You will work in two UI implementations. The facilitator assigns the order. Each implementation session has one 10-minute unscored counter warm-up, followed by two tasks with a 40-minute limit each. The same task requirements and time limits apply in both implementations. For a session, use only its assigned starter and the matching local API guide: [React 19.3 + Compiler](./docs/react-19.3-compiler.md) or [compiled JSX runtime](./docs/runtime.md). Both guides describe the supported APIs and build/check workflow without providing task solutions.

You may read the local documentation and run the provided checks. Please do not use AI code-generation tools, ask another person for implementation help, or look at solution fixtures. Tell the facilitator if you do so by mistake; the session will be recorded with that deviation. You may stop at any time. Your participant ID is anonymous; do not put your name or employer in submitted code or notes.

For each task, start from the supplied starter. Run its check when you believe the task is complete. The facilitator records elapsed time at the first run that passes every assertion, along with failed runs and documentation lookups. A task that does not pass within 40 minutes is recorded as a timeout. After each task, answer the five questions without reopening the source.

## Warm-up · counter

In the supplied counter, add decrement and reset controls. Keep the displayed number and its `data-count` attribute synchronized. Decrement must stop at zero. You have 10 minutes. This exercise is not scored and is the same in both implementations.

## Task A · conditional settings region

The page has two keyed owners, A and B. Each starts with draft value 0 and a hidden settings region. Complete the starter so that:

- The active owner shows a settings region with an Increment button; the inactive owner does not.
- Incrementing A twice changes A's draft to 2. Hiding and showing A preserves that value.
- The mock subscription is set up when an owner's settings region becomes active and cleaned up when it becomes inactive. Removing an active owner also cleans up its subscription.
- Owner identity follows its key through reordering. Reordering to B,A leaves A at 3 and B at 0 after the specified increments.
- Removing A disposes its state and active subscription; B remains unchanged.
The check uses this sequence: show A; increment A twice; hide A; show A; increment A once; reorder to B,A; remove active A. It verifies the visible values and exact setup/cleanup counts. Keep the existing owner list and public prop types.

## Task B · two regions derived from shared rows

The supplied data starts as rows `[{id:1, group:1, score:60}, {id:2, group:2, score:80}, {id:3, group:1, score:95}]`, with `queryA="1"` and `queryB="75"`. Complete the starter so that:

- The groups region shows rows whose group equals `queryA`.
- The scores region shows rows whose score is at least `queryB`.
- Each region has a `data-query` attribute equal to its own current query.
- Changing one query updates its region while preserving the other region's root DOM identity.
- Appending `{id:4, group:2, score:90}` updates both regions. Existing rows that remain visible keep their DOM identity.

The check changes `queryA` to `"2"`, appends row 4, and changes `queryB` to `"90"`. It verifies the resulting row IDs, query attributes, region-root identity, and surviving keyed-item identity. Keep the existing public prop types and region structure.

## Facilitator sequence

1. Assign the next unused slot from `results/developer-study-v1-design.json`. Do not let participants choose system or task order.
2. Prepare a clean copy of the same revision for each system session. Give each participant only the selected system's starter and its matching guide in [`docs/`](./docs/). Keep the unselected arm and solution fixtures out of view.
3. Start the 10-minute counter warm-up, then administer Task A and Task B in the assigned order, with a separate 40-minute timer for each.
4. Record completion status, elapsed seconds, failed check runs, documentation lookups, changed files, changed concepts, and the 1–7 ease and predictability ratings. Record protocol deviations without silently excluding the session.
5. After each task, read only the matching five questions in `developer-study-rubric.md` verbatim. Do not show the score anchors or calibration notes, and do not let the participant reopen the source. Save answer text separately from the scorer worksheet.
6. Before scoring, remove participant IDs, session order, and system-order metadata from patch packets. Have two scorers independently score each answer and patch review; adjudicate disagreements before joining scores to order data.
7. Store only anonymous IDs P01–P08 in the study data. Keep contact or scheduling information, if any, outside this repository and outside the analysis file.

## Data capture

Use `developer-study-data-v1.schema.json` for the structured record. Preserve original answer text and both independent scorer worksheets as separate restricted study records; the repository schema stores the final score and a short rationale. Do not enter names, email addresses, employer, or other direct identifiers into the repository.
