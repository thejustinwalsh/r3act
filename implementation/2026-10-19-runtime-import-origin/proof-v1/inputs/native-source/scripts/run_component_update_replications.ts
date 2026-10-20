const seeds = [1_610_091_001, 1_610_091_102, 1_610_091_203];
for (let index = 0; index < seeds.length; index++) {
  const output = `results/component-update-ablation-v1-process-${index + 1}.json`;
  const child = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-write=results", "scripts/run_component_update_experiment.ts", output, String(seeds[index])],
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
  const status = await child.status;
  if (!status.success) throw new Error(`Component update process replication ${index + 1} failed`);
}
const summary = new Deno.Command(Deno.execPath(), {
  args: ["run", "--allow-read=results", "--allow-write=results", "scripts/summarize_component_update_experiment.ts"],
  stdout: "inherit",
  stderr: "inherit",
}).spawn();
if (!(await summary.status).success) throw new Error("Component update replication summary failed");
