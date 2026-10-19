const cwd = Deno.cwd();
const compile = async (
  fixture: string,
  output: string,
  emittedModule: string,
) => {
  const command = new Deno.Command("cargo", {
    args: [
      "run",
      "--locked",
      "--manifest-path",
      "compiler/oxc-spike/Cargo.toml",
      "--",
      fixture,
      "--async-task-plan",
      "--out",
      output,
      "--emit",
      emittedModule,
    ],
    cwd,
    env: { CARGO_HOME: `${cwd}/.cache/cargo` },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const status = await command.spawn().status;
  if (!status.success) Deno.exit(status.code || 1);
};

await compile(
  "compiler/fixtures/async_vdom_transition.ts",
  Deno.args[0] ?? "results/compiler-async-task-plan.json",
  Deno.args[1] ?? "src/browser/generated_async_task_plan.ts",
);
await compile(
  "compiler/fixtures/async_task_state_input.ts",
  "results/compiler-async-task-state-input-plan.json",
  "src/browser/generated_async_task_state_input_plan.ts",
);
await compile(
  "compiler/fixtures/async_dag_frontier.ts",
  "results/compiler-async-dag-frontier-plan.json",
  "src/browser/generated_async_dag_frontier_plan.ts",
);
await compile(
  "compiler/fixtures/async_transition_stress.ts",
  "results/compiler-async-transition-stress-plan.json",
  "src/browser/generated_async_transition_stress_plan.ts",
);
