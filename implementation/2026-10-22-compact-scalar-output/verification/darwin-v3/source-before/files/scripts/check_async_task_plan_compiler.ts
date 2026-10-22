const cwd = Deno.cwd();
const tempDir = await Deno.makeTempDir({
  dir: `${cwd}/.cache`,
  prefix: "async-plan-check-",
});
const runCompiler = async (fixture: string, output: string, emitted: string) =>
  await new Deno.Command("cargo", {
    args: [
      "run",
      "--quiet",
      "--locked",
      "--manifest-path",
      "compiler/oxc-spike/Cargo.toml",
      "--",
      fixture,
      "--async-task-plan",
      "--out",
      output,
      "--emit",
      emitted,
    ],
    cwd,
    env: { CARGO_HOME: `${cwd}/.cache/cargo` },
    stdout: "piped",
    stderr: "piped",
  }).output();

try {
  const jsonPath = `${tempDir}/plan.json`;
  const modulePath = `${tempDir}/plan.ts`;
  const compile = await runCompiler(
    "compiler/fixtures/async_vdom_transition.ts",
    jsonPath,
    modulePath,
  );
  if (!compile.success) {
    throw new Error(
      `OXC failed to compile async tasks:\n${
        new TextDecoder().decode(compile.stderr)
      }`,
    );
  }
  const plan = JSON.parse(await Deno.readTextFile(jsonPath));
  const dashboardSource = await Deno.readTextFile(
    "compiler/fixtures/async_vdom_transition.ts",
  );
  if (!dashboardSource.includes('asyncTask("page-model", async')) {
    throw new Error(
      "Dashboard fixture must infer task edges from callback reads without a dependency array",
    );
  }
  const expected = [
    ["page-model", "header|feed"],
    ["profile", ""],
    ["feed", ""],
    ["header", "profile"],
  ];
  if (
    plan.schema_version !== 1 ||
    plan.source_file !== "compiler/fixtures/async_vdom_transition.ts" ||
    plan.tasks?.length !== 4 ||
    plan.tasks.some((task: any, index: number) =>
      task.id !== expected[index][0] ||
      task.depends_on.join("|") !== expected[index][1] ||
      task.site_id !== `${plan.source_file}#async-task:${task.id}` ||
      !Number.isInteger(task.call.start) || task.call.end <= task.call.start
    ) || plan.task_order?.join(",") !== "1,2,3,0"
  ) {
    throw new Error(`Unexpected OXC async task graph: ${JSON.stringify(plan)}`);
  }

  const checkedInModule = await Deno.readTextFile(
    "src/browser/generated_async_task_plan.ts",
  );
  const emittedModule = await Deno.readTextFile(modulePath);
  if (checkedInModule !== emittedModule) {
    throw new Error(
      "Checked-in async task plan is stale; run deno task compiler:async:plan",
    );
  }

  const stateInputJsonPath = `${tempDir}/state-input-plan.json`;
  const stateInputModulePath = `${tempDir}/state-input-plan.ts`;
  const stateInputCompile = await runCompiler(
    "compiler/fixtures/async_task_state_input.ts",
    stateInputJsonPath,
    stateInputModulePath,
  );
  if (!stateInputCompile.success) {
    throw new Error(
      `OXC failed to compile state input dependencies:\n${
        new TextDecoder().decode(stateInputCompile.stderr)
      }`,
    );
  }
  const stateInputPlan = JSON.parse(
    await Deno.readTextFile(stateInputJsonPath),
  );
  const stateInputSource = await Deno.readTextFile(
    "compiler/fixtures/async_task_state_input.ts",
  );
  const { componentStateSitesPlan } = await import(
    "../src/browser/generated_component_state_sites.ts"
  );
  const counterCountSite = componentStateSitesPlan.components.find(
    (component: any) => component.name === "Counter",
  )?.state_sites[0]?.site_id;
  if (
    !counterCountSite ||
    !stateInputSource.includes('asyncTask("search", async') ||
    stateInputSource.includes("$compiler/fixtures/component_state_sites.tsx") ||
    stateInputPlan.tasks?.length !== 3 ||
    stateInputPlan.tasks[0].id !== "search" ||
    stateInputPlan.tasks[0].depends_on.join("|") !== "$" + counterCountSite ||
    stateInputPlan.tasks[1].id !== "catalog" ||
    stateInputPlan.tasks[1].depends_on.length !== 0 ||
    stateInputPlan.tasks[2].depends_on.join("|") !== "search|catalog" ||
    stateInputPlan.task_order?.join(",") !== "0,1,2"
  ) {
    throw new Error(
      `Unexpected state input task graph: ${JSON.stringify(stateInputPlan)}`,
    );
  }
  const checkedInStateInputModule = await Deno.readTextFile(
    "src/browser/generated_async_task_state_input_plan.ts",
  );
  const emittedStateInputModule = await Deno.readTextFile(stateInputModulePath);
  if (checkedInStateInputModule !== emittedStateInputModule) {
    throw new Error(
      "Checked-in state input plan is stale; run deno task compiler:async:plan",
    );
  }

  for (
    const [fixture, expectedMessage] of [
      ["compiler/fixtures/async_task_cycle.ts", "dependency cycle"],
      ["compiler/fixtures/async_task_unknown_dependency.ts", "unknown task"],
      ["compiler/fixtures/async_task_dynamic_dependencies.ts", "literal array"],
      [
        "compiler/fixtures/async_task_dynamic_read.ts",
        "literal Map.get keys",
      ],
      [
        "compiler/fixtures/async_task_empty_state_input.ts",
        "empty state input",
      ],
    ]
  ) {
    const result = await new Deno.Command("cargo", {
      args: [
        "run",
        "--quiet",
        "--locked",
        "--manifest-path",
        "compiler/oxc-spike/Cargo.toml",
        "--",
        fixture,
        "--async-task-plan",
      ],
      cwd,
      env: { CARGO_HOME: `${cwd}/.cache/cargo` },
      stdout: "piped",
      stderr: "piped",
    }).output();
    const diagnostic = new TextDecoder().decode(result.stderr);
    if (result.success || !diagnostic.includes(expectedMessage)) {
      throw new Error(
        `Expected ${fixture} to fail with ${
          JSON.stringify(expectedMessage)
        }, got ${JSON.stringify(diagnostic)}`,
      );
    }
  }
} finally {
  await Deno.remove(tempDir, { recursive: true });
}
console.log(
  "OXC async task plan emits stable DAG metadata and rejects invalid dependencies.",
);
