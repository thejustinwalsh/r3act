# Document integration verification

## Result

The requested archive/current document invariants pass. The first ordinary project command, `deno check --frozen`, remains preserved as a failure: Deno exited 1 during workspace lock validation before TypeScript checking because the lockfile omits the workspace `packageJson` dependency list. No project lock/config change was made.

A separately labeled standalone check and run pass with Deno's `--no-config --no-lock --no-npm` flags. This verifies the extracted, dependency-free SVG cell as a standalone script; it does **not** verify notebook/kernel execution under the project environment. The cell is still deliberately unexecuted in the notebook.

The emitted SVG is well-formed and has exactly 12 titled data points (two untitled circles are legend markers). Every block label, title/value, series color and plotted x/y coordinate matches the frozen 1,024-row analyzer's six `off − original` and six `on − off` median differences; the vertical zero axis maps to x=0. All coordinates are finite. The locally rendered PNG is valid RGBA, 860×430.

## Frozen document checks

- Archived paper SHA-256: `286f8535c4cf41ecae6fb44a084e6164fd0e0a19123bd1889c560d0785d41941`; archived notebook: `9d1a71eb7e5f375e75f74f17968008ff944312d12c08e1ee473226d52b39a82a`.
- Current paper SHA-256: `513602e6564ebb07b7dae43f860645caacd162034a4b0364bcbfa7d079f6df96`; current notebook: `adf08213cae574810eb5eb2138c38a6617619f9d024f67354f635a51b35e6c8a`.
- Notebook has 187 archived cells and 189 current cells. Old cells `[1:186]` match exactly. Among the previous cells, only source cells 0 and 186 changed; their non-source fields are unchanged. Notebook metadata is unchanged. Two cells were appended: markdown cell 187 and empty, unexecuted code cell 188 (`outputs: []`, `execution_count: null`).
- Paper content beginning at section 1 is unchanged from its archive. All 78 local Markdown links checked in the current paper and changed/appended notebook markdown cells resolve.

## Standalone commands and outputs

Check: `/opt/homebrew/bin/deno check --frozen --no-config --no-lock --no-npm <absolute control-svg.ts>` — exit 0.

Run: `/opt/homebrew/bin/deno run --frozen --no-config --no-lock --no-npm --allow-read=<absolute analysis-1024.json> <absolute control-svg.ts> --svg-stdout` — exit 0, stderr empty; stdout is preserved as [standalone-control.svg](./standalone-control.svg).

Validation: [svg-validation.json](./svg-validation.json), pass. Render: `/opt/homebrew/bin/rsvg-convert -o standalone-control.png standalone-control.svg` — exit 0, stdout/stderr empty. The output is [standalone-control.png](./standalone-control.png), verified by Pillow as PNG 860×430 RGBA. The renderer is the existing local `rsvg-convert` rsvg-convert version 2.62.1; nothing was installed or fetched.

Exact command stdout/stderr/exits and the original workspace lock failure are retained alongside the artifacts. The initial SVG audit helper's `KeyError` is also preserved; it counted the two untitled legend circles as data points. The corrected audit checks the 12 titled points. Frozen analysis, report, manuscript, notebook, analyzer, extracted source, Deno config and lock hashes are recorded in [verification.json](./verification.json); source/document/config/lock inputs are unchanged by the standalone attempt.

No notebook execution, benchmark, server, browser, network access, source edit, data update, lockfile update or dependency install was performed.
