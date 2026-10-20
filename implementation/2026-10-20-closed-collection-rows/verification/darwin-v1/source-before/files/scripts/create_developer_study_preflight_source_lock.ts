const files = [
  "README.md",
  "compiler/fixtures/developer_study_task_a.tsx",
  "compiler/fixtures/developer_study_task_b.tsx",
  "compiler/oxc-spike/Cargo.toml",
  "compiler/oxc-spike/Cargo.lock",
  "compiler/oxc-spike/src/main.rs",
  "developer-study-protocol.md",
  "developer-study-rubric.md",
  "developer-study-data-v1.schema.json",
  "developer-study/docs/react-19.3-compiler.md",
  "developer-study/docs/runtime.md",
  "developer-study/participant-packet-v0.3.md",
  "notebook_cells/developer_study_status.ts",
  "developer-study-task-a.html",
  "developer-study-task-a-check.html",
  "developer-study-task-b.html",
  "developer-study-task-b-check.html",
  "developer-study-warmup.html",
  "developer-study/starter/react/counter.tsx",
  "developer-study/starter/react/task-a.tsx",
  "developer-study/starter/runtime/counter.tsx",
  "developer-study/starter/runtime/task-a.tsx",
  "developer-study/starter/react/task-b.tsx",
  "developer-study/starter/runtime/task-b.tsx",
  "deno.browser.json",
  "deno.json",
  "package.json",
  "pnpm-lock.yaml",
  "research.ipynb",
  "results/developer-study-v1-design.json",
  "results/developer-study-v1-raw.json",
  "results/developer-study-task-a-participant-sites.json",
  "results/developer-study-task-a-component-state.json",
  "results/developer-study-task-b-participant-regions.json",
  "results/developer-study-task-b-regions.json",
  "results/developer-study-warmup-sites.json",
  "scripts/run_developer_study_task_a_compiler.ts",
  "scripts/run_developer_study_task_a_participant_compiler.ts",
  "scripts/run_developer_study_task_b_participant_compiler.ts",
  "scripts/run_developer_study_task_b_compiler.ts",
  "scripts/run_developer_study_warmup_compiler.ts",
  "scripts/create_developer_study_preflight_source_lock.ts",
  "scripts/check_developer_study_design.ts",
  "scripts/update_research_notebook_developer_study.ts",
  "scripts/summarize_developer_study.ts",
  "src/component_state_runtime.ts",
  "src/developer_study/generated_task_a_runtime.tsx",
  "src/developer_study/generated_task_a_sites.ts",
  "src/developer_study/generated_participant_task_a_runtime.tsx",
  "src/developer_study/generated_participant_task_a_sites.ts",
  "src/developer_study/generated_participant_task_b_regions.ts",
  "src/developer_study/generated_task_b_regions.ts",
  "src/developer_study/generated_warmup_sites.ts",
  "src/developer_study/generated_warmup_runtime.tsx",
  "src/developer_study/task_a_browser.tsx",
  "src/developer_study/participant_task_a_browser.tsx",
  "src/developer_study/participant_task_b_browser.tsx",
  "src/developer_study/task_a_react.tsx",
  "src/developer_study/task_a_runtime.tsx",
  "src/developer_study/task_a_runtime_test.ts",
  "src/developer_study/task_b_browser.tsx",
  "src/developer_study/task_b_plan_test.ts",
  "src/developer_study/task_b_react.tsx",
  "src/developer_study/task_b_runtime.tsx",
  "src/developer_study/warmup_browser.ts",
  "src/derived_region_runtime.ts",
  "src/jsx_binding_runtime.ts",
  "src/vdom_snapshot_runtime.ts",
  "vite.developer-study.config.ts",
];

const hex = (bytes: ArrayBuffer) =>
  Array.from(
    new Uint8Array(bytes),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");

const entries = [];
for (const path of files.sort()) {
  const contents = await Deno.readFile(path);
  entries.push({
    path,
    sha256: hex(await crypto.subtle.digest("SHA-256", contents)),
  });
}

const lock = {
  schemaVersion: "developer-study-preflight-source-lock-v1",
  status: "PREFLIGHT_ONLY_NOT_FROZEN_FOR_PARTICIPANT_DATA",
  purpose:
    "Reproduce Task A and Task B fixture feasibility checks, the incomplete participant starter checks, and the unscored counter warm-up contract. This preflight lock does not freeze scored starter projects, prompts, scoring, or browser environment.",
  toolchain: {
    deno: Deno.version.deno,
    v8: Deno.version.v8,
    typescript: Deno.version.typescript,
    react: "19.3.0",
    reactCompiler: "1.0.0",
    oxc: "Rust compiler source pinned by compiler/oxc-spike/Cargo.lock",
  },
  files: entries,
};

await Deno.writeTextFile(
  "results/developer-study-v1-preflight-source-lock.json",
  `${JSON.stringify(lock, null, 2)}\n`,
);
console.log(`Wrote preflight source lock for ${entries.length} files.`);
