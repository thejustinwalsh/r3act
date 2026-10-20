const cwd = Deno.cwd();
const source = Deno.args[0] ?? "src/browser/jsx_binding_view.tsx";
const output = Deno.args[1] ?? "results/compiler-oxc-binding-ir.json";
const emittedModule = Deno.args[2] ??
  "src/browser/generated_binding_particles.ts";

const command = new Deno.Command("cargo", {
  args: [
    "run",
    "--locked",
    "--manifest-path",
    "compiler/oxc-spike/Cargo.toml",
    "--",
    source,
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

const multiSourceCommand = new Deno.Command("cargo", {
  args: [
    "run",
    "--locked",
    "--manifest-path",
    "compiler/oxc-spike/Cargo.toml",
    "--",
    "compiler/fixtures/multi_trait_scene.tsx",
    "--out",
    "results/compiler-multi-trait-ir.json",
    "--emit",
    "src/browser/generated_multi_trait_plan.ts",
  ],
  cwd,
  env: { CARGO_HOME: `${cwd}/.cache/cargo` },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const multiSourceStatus = await multiSourceCommand.spawn().status;
if (!multiSourceStatus.success) Deno.exit(multiSourceStatus.code || 1);

const sharedSourceCommand = new Deno.Command("cargo", {
  args: [
    "run",
    "--locked",
    "--manifest-path",
    "compiler/oxc-spike/Cargo.toml",
    "--",
    "compiler/fixtures/shared_source_scene.tsx",
    "--out",
    "results/compiler-shared-source-ir.json",
    "--emit",
    "src/browser/generated_shared_source_plan.ts",
  ],
  cwd,
  env: { CARGO_HOME: `${cwd}/.cache/cargo` },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const sharedSourceStatus = await sharedSourceCommand.spawn().status;
if (!sharedSourceStatus.success) Deno.exit(sharedSourceStatus.code || 1);

const snakeFrameCommand = new Deno.Command("cargo", {
  args: [
    "run",
    "--locked",
    "--manifest-path",
    "compiler/oxc-spike/Cargo.toml",
    "--",
    "compiler/fixtures/snake_frame_scene.tsx",
    "--out",
    "results/compiler-snake-frame-ir.json",
    "--emit",
    "src/browser/generated_snake_frame_plan.ts",
  ],
  cwd,
  env: { CARGO_HOME: `${cwd}/.cache/cargo` },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const snakeFrameStatus = await snakeFrameCommand.spawn().status;
if (!snakeFrameStatus.success) Deno.exit(snakeFrameStatus.code || 1);
