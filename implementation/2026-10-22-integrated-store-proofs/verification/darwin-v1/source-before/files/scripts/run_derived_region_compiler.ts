const cwd = Deno.cwd();
const output = Deno.args[0] ?? "results/compiler-keyed-filter-regions.json";
const emittedModule = Deno.args[1] ?? "src/browser/generated_keyed_filter_regions.ts";

const command = new Deno.Command("cargo", {
  args: [
    "run", "--locked", "--manifest-path", "compiler/oxc-spike/Cargo.toml", "--",
    "compiler/fixtures/keyed_filter_regions.tsx",
    "--derived-keyed-regions",
    "--out", output,
    "--emit", emittedModule,
  ],
  cwd,
  env: { CARGO_HOME: `${cwd}/.cache/cargo` },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const status = await command.spawn().status;
if (!status.success) Deno.exit(status.code || 1);
