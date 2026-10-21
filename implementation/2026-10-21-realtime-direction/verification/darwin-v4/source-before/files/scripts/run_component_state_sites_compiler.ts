const cwd = Deno.cwd();
const output = Deno.args[0] ?? "results/compiler-component-state-sites.json";
const emittedModule = Deno.args[1] ?? "src/browser/generated_component_state_sites.ts";

const command = new Deno.Command("cargo", {
  args: [
    "run", "--locked", "--manifest-path", "compiler/oxc-spike/Cargo.toml", "--",
    "compiler/fixtures/component_state_sites.tsx", "--component-state-sites", "--trusted-runtime-module", "react", "--transform-component-state",
    "--out", output,
    "--emit", emittedModule,
    "--runtime-import", "../component_state_runtime.ts",
    "--jsx-import", "../jsx_binding_runtime.ts",
    "--emit-transform", "src/browser/generated_component_state_transform.tsx",
  ],
  cwd,
  env: { CARGO_HOME: `${cwd}/.cache/cargo` },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const status = await command.spawn().status;
if (!status.success) Deno.exit(status.code || 1);
