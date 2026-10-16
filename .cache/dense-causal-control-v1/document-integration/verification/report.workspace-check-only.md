# Document integration verification

## Result

Document structure and frozen identity checks pass. The extracted SVG cell was not type-checked: `/opt/homebrew/bin/deno check --frozen` exited 1 during workspace lock validation, before TypeScript checking, reporting that the lockfile is out of date and listing workspace package dependencies. Per the stop-on-first-failure instruction, the SVG runner was not invoked, so no SVG or PNG artifact was generated. No lockfile update, notebook execution, network access, or source fix was attempted.

## Verified document invariants

- Archive hashes match: paper `286f8535c4cf41ecae6fb44a084e6164fd0e0a19123bd1889c560d0785d41941`; notebook `9d1a71eb7e5f375e75f74f17968008ff944312d12c08e1ee473226d52b39a82a`. Current hashes match: paper `513602e6564ebb07b7dae43f860645caacd162034a4b0364bcbfa7d079f6df96`; notebook `adf08213cae574810eb5eb2138c38a6617619f9d024f67354f635a51b35e6c8a`.
- Notebook has 187 archived cells and 189 current cells. Old cells 1–185 are identical; only source cells 0 and 186 changed among the existing cells. Notebook metadata is unchanged. Two appended cells are a markdown cell and an empty, unexecuted code cell (no outputs, execution count null).
- Paper content beginning with section 1 is byte-for-byte unchanged from the archived paper.
- All 78 local Markdown links checked in current paper and changed/appended notebook markdown cells resolve relative to the project root.

## Deno gate and artifacts

Extracted cell 188 to `control-svg.ts` in this directory. Exact command: `/opt/homebrew/bin/deno check --frozen <absolute path to control-svg.ts>`. Exit 1; stdout empty. Stderr is preserved in `deno-check.stderr.log`; the failure says the lockfile is out of date and shows a workspace package dependency-list diff. This is a project configuration gate failure, not a reported `Deno.jupyter` type error. `deno run --frozen ... --svg-stdout` and rendering were stopped. The SVG cell remains unexecuted in the notebook.

The analysis, report, manuscript, notebook, analyzer tool, extracted cell, and available Deno config/lock inputs were hash-checked after the gate. Original frozen document and analysis hashes remain unchanged; detailed before/after values are in `verification.json` and `preflight.json`.
