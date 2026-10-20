const cwd = Deno.cwd();
const command = new Deno.Command("cargo", {
  args: [
    "run", "--locked", "--manifest-path", "compiler/oxc-spike/Cargo.toml", "--",
    "developer-study/starter/runtime/counter.tsx",
    "--component-state-sites", "--trusted-runtime-module", "react",
    "--transform-component-state",
    "--out", "results/developer-study-warmup-sites.json",
    "--emit", "src/developer_study/generated_warmup_sites.ts",
    "--runtime-import", "../component_state_runtime.ts",
    "--jsx-import", "../jsx_binding_runtime.ts",
    "--emit-transform", "src/developer_study/generated_warmup_runtime.tsx",
  ],
  cwd,
  env: { CARGO_HOME: `${cwd}/.cache/cargo` },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const status = await command.spawn().status;
if (!status.success) Deno.exit(status.code || 1);
