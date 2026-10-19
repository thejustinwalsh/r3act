const cwd = Deno.cwd();
const command = new Deno.Command("cargo", {
  args: [
    "run", "--locked", "--manifest-path", "compiler/oxc-spike/Cargo.toml", "--",
    "compiler/fixtures/developer_study_task_b.tsx",
    "--derived-keyed-regions",
    "--out", "results/developer-study-task-b-regions.json",
    "--emit", "src/developer_study/generated_task_b_regions.ts",
  ],
  cwd,
  env: { CARGO_HOME: `${cwd}/.cache/cargo` },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const status = await command.spawn().status;
if (!status.success) Deno.exit(status.code || 1);
