const schedule = JSON.parse(
  await Deno.readTextFile(
    "results/browser-component-state-tree-shape-schedule-v1.json",
  ),
);
if (
  schedule.status !== "PLANNED" || schedule.runs.length !== 12 ||
  new Set(schedule.runs.map((run: any) => run.order)).size !== 12 ||
  new Set(schedule.runs.map((run: any) => run.seed)).size !== 12 ||
  [1, 2, 3].some((round) => {
    const roundGroups = schedule.runs.filter((run: any) => run.round === round)
      .map((run: any) => run.groupCount);
    return roundGroups.length !== 4 ||
      JSON.stringify([...roundGroups].sort((a, b) => a - b)) !==
        JSON.stringify([0, 10, 100, 1_000]);
  }) ||
  JSON.stringify(
      schedule.runs.map((run: any) => run.order).sort((a: number, b: number) =>
        a - b
      ),
    ) !==
    JSON.stringify(Array.from({ length: 12 }, (_, index) => index + 1))
) {
  throw new Error("Invalid fixed-DOM tree-shape run schedule");
}
for (const run of schedule.runs) {
  const url = new URL(schedule.benchmarkUrl);
  url.search = new URLSearchParams({
    autorun: "1",
    study: "tree-shape",
    count: "10000",
    groups: String(run.groupCount),
    seed: String(run.seed),
  }).toString();
  console.log(
    `${String(run.order).padStart(2, "0")} [round ${run.round}] ${url.href}`,
  );
}
