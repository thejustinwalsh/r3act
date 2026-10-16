# Developer Feature-Authoring and Comprehension Study

**Protocol v0.3 · pre-data study design · not yet preregistered**

This protocol tests whether developers can implement and explain two UI features more easily in the prototype than in optimized React. It is a design artifact, not evidence that the prototype is easier to use. The exact participant-facing instructions are in the [v0.3 participant packet](./developer-study/participant-packet-v0.3.md); each arm also has a local API/build guide ([React 19.3 + Compiler](./developer-study/docs/react-19.3-compiler.md), [compiled runtime](./developer-study/docs/runtime.md)). Freeze the task fixtures, source revisions, React/compiler versions, participant packet, both guides, rubric, and analysis script before recruiting participants or collecting timings. Amend the protocol before data collection if the prototype cannot express a required behavior.

**Scope limit:** these tasks measure feature authoring and comprehension for conditional state/lifecycle and shared-source derived regions. They do not ask participants to extend a host adapter, write a new renderer, or add a compiler optimization. Passing this pilot would support only the tested feature tasks; adapter and compiler extensibility require separate evidence.

## Question

For the same small UI changes and observable contracts, can developers complete and explain the data-oriented JSX runtime tasks at least as reliably as equivalent React 19.3 + React Compiler tasks, with less time or less reasoning effort?

The study compares authoring and comprehension. It does not test performance, framework feature coverage, or whether the prototype is a React-compatible replacement.

## Participants and design

- Recruit eight developers who have at least one year of React/TypeScript experience and have not worked on this runtime or compiler.
- Treat eight participants as an exploratory pilot. If fewer than six complete both sessions, report only raw case studies and make no comparative simplicity claim.
- Each participant implements both tasks in both systems. This gives a paired comparison while exposing each participant to the same contracts.
- Run two sessions, one per system, with equal time limits. Assign participants to the next unused slot in the machine-readable [eight-slot schedule](./results/developer-study-v1-design.json); do not let participants choose their order. The schedule contains each of the four sequences `React→Runtime / A→B`, `React→Runtime / B→A`, `Runtime→React / A→B`, and `Runtime→React / B→A` twice.
- Give each system the same 10-minute warm-up on an unrelated counter fixture. Do not score the warm-up.
- Provide local documentation, editor setup, and tests for both systems. Do not provide solution code. Ask participants not to use AI code-generation tools or outside help; record any protocol deviation without discarding the participant post hoc.

## Tasks

The matching counter warm-up starter files are [`developer-study/starter/react/counter.tsx`](./developer-study/starter/react/counter.tsx) and [`developer-study/starter/runtime/counter.tsx`](./developer-study/starter/runtime/counter.tsx). In ten minutes, add decrement and reset controls, keep the visible count and `data-count` synchronized, and clamp decrement at zero. Open `developer-study-warmup.html?arm=react` or `?arm=runtime`; add `&check=1` to run the same browser contract on load. Recompile the runtime starter after editing with `deno task developer-study:warmup:compile`, then rebuild with `deno task developer-study:warmup:build`. The warm-up remains unscored and does not reuse either scored task's behavior.

Both systems start from frozen, visually equivalent keyed-list fixtures. Each task has an objective test suite and a 40-minute limit in each system.

### A. Conditional stateful region

Add an optional settings region with a draft value and an effect that subscribes to a mock external resource. When hidden and shown again, the draft value must persist. The effect must clean up while the site is inactive and set up again when reactivated. Removing the owning keyed row must dispose its state and effect exactly once.

This task probes hook-site identity, conditional behavior, owner/key lifetime, and lifecycle rules. React implementations may use any documented public pattern that satisfies the same output and lifetime contract; the runtime implementation may use its native call-site semantics. The test judges behavior, not syntactic similarity.

### B. Shared source and two derived regions

Add a query field that derives two independently keyed result regions from a shared row source. Changing one query must update its region, preserve the other region's host identity, and keep both outputs correct when the shared row source changes. Add a new `data-query` DOM attribute used by both regions and keep it synchronized with the query result.

This task probes dependency ownership, selective updates, VDOM/host boundaries, and whether a developer can trace data flow. Both implementations must use the same input data, output shape, keys, and interaction sequence. The React arm uses React 19.3 + React Compiler and public React APIs; the runtime arm uses the frozen native JSX/compiler/host APIs available at study time.

### Required interaction script and assertions

Use the same small fixture and action sequence in both arms. These values make the intended behavior concrete; the UI wording and visual styling may differ, but the observations below may not.

- **Task A:** Start with keyed owners A and B, both with an inactive settings region and draft value `0`, plus a mock subscription log. Show A, increment its draft twice, hide it, then show it again. Assert that A's draft remains `2`, its subscription cleans up once when hidden, and setup runs again when shown. Increment A once, reorder the owners to B then A, and assert A still shows `3` while B shows `0`. Remove A while its region is active and assert A's subscription has exactly two setups and two cleanups total; B's state and subscription remain unchanged.
- **Task B:** Start with rows `[{id:1, group:1, score:60}, {id:2, group:2, score:80}, {id:3, group:1, score:95}]`, `queryA="1"`, and `queryB="75"`. The group region shows IDs `[1,3]`; the score region shows `[2,3]`. Change only `queryA` to `"2"`; assert the group region shows `[2]`, the score region root is the same object, and its contents remain `[2,3]`. Append `{id:4, group:2, score:90}` to the shared rows; assert both outputs become `[2,4]` and `[2,3,4]`, respectively, and the existing group item for ID 2 keeps its DOM identity. Change only `queryB` to `"90"`; assert the score region shows `[3,4]`, both surviving score items keep their DOM identity, and the group region root remains the same object. Each region root's `data-query` attribute must equal its current query string after every action.
- Run every assertion from a clean page load and record action order, completion time, and failed assertion names. A task is correct only if all assertions pass. The test harness must expose the same actions to participants and must not require direct DOM mutation by the implementation.

These are protocol-level contracts, not completed participant fixtures. Before recruitment, implement the actions in both arms, verify the same DOM observations, and freeze the implementation, test, and prompt hashes.

## Current fixture feasibility

The prototype contains relevant primitives: [`component_state_sites.tsx`](./compiler/fixtures/component_state_sites.tsx) exercises conditional state and effect sites; [`component_state_runtime_test.ts`](./src/component_state_runtime_test.ts) checks skipped-site state retention and effect cleanup/reactivation; [`keyed_filter_regions.tsx`](./compiler/fixtures/keyed_filter_regions.tsx) describes two keyed regions over a shared row source; and [`derived_region_runtime_test.ts`](./src/derived_region_runtime_test.ts) checks output parity and preservation of an untouched region's identity. [`DOMVDOMHost`](./src/vdom_snapshot_runtime.ts) handles `data-*` attributes.

Task A has paired feasibility implementations and now has separate incomplete participant starters at [`starter/react/task-a.tsx`](./developer-study/starter/react/task-a.tsx) and [`starter/runtime/task-a.tsx`](./developer-study/starter/runtime/task-a.tsx). The OXC task `deno task developer-study:task-a:build` compiles the runtime starter and builds the standalone check page. Run `developer-study-task-a-check.html?arm=react&run=1` or `?arm=runtime&run=1` to exercise only the selected arm through the protocol's keyed-owner action sequence. The page reuses the same observable contract but imports neither frozen solution fixture. Both incomplete starters currently stop at the expected `show A` subscription assertion, so the harness detects missing behavior. The frozen feasibility pair remains [`task_a_react.tsx`](./src/developer_study/task_a_react.tsx) and [`task_a_runtime.tsx`](./src/developer_study/task_a_runtime.tsx), and the exact protocol sequence has passed for both. This is fixture-feasibility evidence, not participant data or evidence that either implementation is simpler.

Reproduce Task A with `deno run -A scripts/run_developer_study_task_a_compiler.ts` followed by `deno test --config deno.browser.json src/developer_study/task_a_runtime_test.ts`. Reproduce Task B's OXC plan with `deno task compiler:study:task-b`; build the warm-up with `deno task developer-study:warmup:build`. Serve the build through Portless using `npx --yes portless run --name react-task pnpm exec vite preview --config vite.developer-study.config.ts` if Portless is not installed. Open `/developer-study-task-a.html`, `/developer-study-task-b.html?run=1`, or `/developer-study-warmup.html?arm=react&check=1` or `?arm=runtime&check=1` on the resulting HTTPS host. The standalone Vite config keeps these preflights separate from the frozen performance-study build inputs.

Task B has a matched author fixture in [`developer_study_task_b.tsx`](./compiler/fixtures/developer_study_task_b.tsx), an OXC-generated shared-source-to-region plan, public-API React components, and a retained-VDOM implementation exercised through the same browser action script. The graph distinguishes `queryA` and `queryB`, while shared `rows` invalidates both regions. The action script checks keyed IDs and `data-query` values after each update, identity of the untouched region root when only one query changes, and identity of surviving keyed items when rows are appended or filtered. Runtime TSX uses the classic `jsx` factory; allowing Vite's React automatic JSX transform to process it strips runtime `key` props and replaces retained list items. The study config now keeps OXC-generated/runtime TSX on the custom factory path, and the production browser check verifies identity parity. The React build applies React Compiler to the React arm. Separate incomplete participant starters now live at [`starter/react/task-b.tsx`](./developer-study/starter/react/task-b.tsx) and [`starter/runtime/task-b.tsx`](./developer-study/starter/runtime/task-b.tsx). Build/check with `deno task developer-study:task-b:build` and `developer-study-task-b-check.html?arm=react&run=1` or `?arm=runtime&run=1`; the runtime plan is generated from its starter source. The starters intentionally begin with inverted filters and omit `data-query`, so their first acceptance assertion should fail on the initial group IDs. A separate ten-minute counter warm-up is available in paired starter files; its browser contract passed in both arms after temporarily completing each starter, and the actual participant starters were restored to their incomplete state. These are fixture-feasibility checks, not evidence that either implementation is easier to write or understand.

## Measures

### Primary

- **Correct completion:** all task assertions pass before the time limit. Report completion by task and system.
- **Time to correct completion:** minutes from task start to the first final run where all assertions pass. A timeout is right-censored at 40 minutes; do not replace it with a fabricated exact time.
- **Comprehension:** after each task, answer five fixed questions about the submitted implementation. The [draft rubric](./developer-study-rubric.md) covers owner/key identity, state and effect lifetimes, update propagation, derived-region dependencies, and host-property flow; each answer scores 0–2, maximum 10 per task/system. Calibrate the scoring guide with two independent scorers and freeze it before scored sessions.

### Secondary

- Number of failed test runs before completion, help/documentation lookups, files and concepts changed, and participant-rated predictability/ease on a 7-point scale.
- A reviewer who does not know system order scores the submitted patch for contract coverage, unnecessary cross-module changes, and whether the dependency/lifecycle path is traceable from the code. Raw line count is descriptive only and is not a simplicity score.

Preserve per-participant rows and anonymize IDs. Publish the task prompts, frozen source revisions, score rubric, raw scores, deviations, and analysis script alongside any summary. Do not exclude outliers after looking at outcomes; label incomplete sessions and explain them. The machine-readable design and analysis script use the same 75%-of-scored-participants comprehension threshold so a six- or seven-person pilot has a defined rule.

## Analysis and decision rule

Report each participant/task pair, completion rates, median paired completion-time difference only for pairs where both systems complete, comprehension-score distributions, and ease ratings. Report timeouts separately as right-censored observations; do not impute their completion time. With this pilot sample, emphasize ranges and consistency across participants; do not treat repeated questions or tasks as independent participants or claim population-level statistical significance.

Call the prototype **simpler on these tasks** only if:

1. Across the `2N` task pairs from `N` complete crossovers, runtime correctness has at most one net additional failure versus React, and no runtime-only lifecycle or identity defect remains unresolved.
2. The median per-participant mean comprehension score is at least two points higher out of 10, with the direction favoring the runtime for at least 75% of fully scored participants (rounded up; minimum six paired participants).
3. Across task pairs where both arms complete correctly, the median runtime/React completion-time ratio is at most 1.10, and the runtime does not have more timeouts.
4. Reviewer and participant secondary measures do not reveal a compensating increase in hidden concepts, cross-module edits, or unpredictability.

If correctness or timing fails these gates, report the result as mixed or inconclusive even if comprehension scores favor the runtime. If comprehension does not improve, do not claim that the runtime is easier to reason about. Any claim remains limited to these tasks and this pilot; a larger independent replication is needed before a broad maintainability claim.

### Raw data and analysis

[`developer-study-data-v1.schema.json`](./developer-study-data-v1.schema.json) defines the anonymized row format; [`results/developer-study-v1-raw.json`](./results/developer-study-v1-raw.json) is the empty collection file, not participant data. The Deno summarizer validates assignments against the frozen eight-slot schedule, preserves timeouts as right-censored, reports task-level and paired summaries, and computes the quantitative gates. Run it with `deno task developer-study:summarize` or pass input/output paths to `scripts/summarize_developer_study.ts`; the default workflow writes [`results/developer-study-v1-summary.json`](./results/developer-study-v1-summary.json). An empty participant file is reported as `NO_PARTICIPANT_DATA`, not as case-study evidence. The analysis does not convert qualitative reviewer judgments into a claim; a human must adjudicate runtime-only defects and the blinded patch review before any simplicity conclusion.

## Freeze checklist before data collection

- Pin React, React DOM, React Compiler, TypeScript, OXC, and browser versions.
- Save a revision/hash for both starter fixtures, the participant packet, tests, warm-up, documentation, and scoring rubric.
- Verify that both arms can express every required behavior and produce equivalent visible output.
- Freeze session order assignment and raw-data schema.
- Pilot only for task clarity and runtime feasibility. Do not include pilot data in the scored sample; update and date the protocol before recruiting the scored sample.

### Current preflight lock

[`developer-study-v1-preflight-source-lock.json`](./results/developer-study-v1-preflight-source-lock.json) records hashes for the Task A/B feasibility fixtures, both participant starter pairs and check harnesses, counter warm-up starter/build, and compiler/runtime dependencies. Regenerate it with `deno task developer-study:preflight-lock`. Its status is explicitly preflight-only: it does not freeze the recruitment prompts, scoring, or browser environment. Generate a separate final lock only after both scored starter workspaces, the blinded scoring process, and the raw-data schema are complete.

Current status: protocol v0.3 makes the order assignment, interaction contracts, and quantitative thresholds explicit. The v0.3 participant packet now gives exact task wording and facilitator steps; rubric v0.2 removes a Task A question that had no matching task requirement. Task A and Task B have separate React/runtime participant starters and selected-arm browser acceptance checks. Both OXC builds and the combined production build succeed. After temporarily completing the starter TODOs, all four selected-arm checks passed; the deliberately incomplete starters were restored, rebuilt, and each now fails at its intended behavior gap. The corrected Task B feasibility page passes all four checkpoints in both arms, including surviving item identity, and its graph has separate `queryA`, `queryB`, and shared `rows` sources. Before these corrections, the graph merged both queries and Vite transformed runtime JSX as React elements, which caused the keyed-item assertion to fail. Both defects now have targeted regressions. The Task A feasibility page also passes its full lifecycle sequence after generated JSX was switched to the custom factory. The counter warm-up contract passed in React and compiled-runtime production browser builds, then both participant starters were restored with decrement/reset TODOs. The raw-data schema and Deno analysis script are in place, and a deterministic preflight source lock is available. The participant packet and rubric are still drafts; rubric pilot, final source hashes, and participant sessions remain unfinished or uncollected. These checks establish fixture feasibility only and must not be cited as maintainability evidence.
