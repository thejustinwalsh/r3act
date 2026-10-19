const seeds = [1_610_091_001, 1_610_091_102, 1_610_091_203];
for (let index = 0; index < seeds.length; index++) {
  const output = `results/task-graph-dispatch-v5-process-${index + 1}.json`;
  const child = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-write=results", "scripts/run_task_graph_experiment.ts", output, String(seeds[index])],
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
  const status = await child.status;
  if (!status.success) throw new Error(`Task-graph process replication ${index + 1} failed`);
}
const summary = new Deno.Command(Deno.execPath(), {
  args: ["run", "--allow-read=results", "--allow-write=results", "scripts/summarize_task_graph_experiment.ts"],
  stdout: "inherit",
  stderr: "inherit",
}).spawn();
if (!(await summary.status).success) throw new Error("Task-graph replication summary failed");
