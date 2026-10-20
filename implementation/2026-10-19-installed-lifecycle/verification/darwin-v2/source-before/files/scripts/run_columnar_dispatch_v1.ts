const command = Deno.execPath();
for (let replication = 1; replication <= 5; replication++) {
  const process = new Deno.Command(command, {
    args: [
      "run",
      "--allow-read=src,results",
      "--allow-write=results",
      "scripts/benchmark_columnar_dispatch_v1.ts",
      String(replication),
    ],
    stdin: "null",
    stdout: "inherit",
    stderr: "inherit",
  });
  const result = await process.output();
  if (!result.success) throw new Error(`Replication ${replication} failed`);
}
