const cwd = Deno.cwd();
const command = new Deno.Command("cargo", {
  args: [
    "run",
    "--locked",
    "--manifest-path",
    "compiler/oxc-spike/Cargo.toml",
    "--",
    "compiler/fixtures/component_state_structural.tsx",
    "--component-state-sites", "--trusted-runtime-module", "react",
    "--transform-component-state",
    "--out",
    "results/compiler-component-state-structural.json",
    "--emit",
    "src/browser/generated_component_state_structural.ts",
    "--runtime-import",
    "../component_state_runtime.ts",
    "--jsx-import",
    "../jsx_binding_runtime.ts",
    "--emit-transform",
    "src/browser/generated_component_state_structural_transform.tsx",
  ],
  cwd,
  env: { CARGO_HOME: `${cwd}/.cache/cargo` },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});
const status = await command.spawn().status;
if (!status.success) Deno.exit(status.code || 1);
