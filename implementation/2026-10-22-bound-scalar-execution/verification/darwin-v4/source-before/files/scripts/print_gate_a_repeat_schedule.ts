const origin = (Deno.args[0] ?? "").replace(/\/$/, "");
const sessionId = "gate-a-chrome-repeat";
const runs = [
  [1000, 610019], [5000, 610020], [10000, 610021],
  [5000, 610022], [10000, 610023], [1000, 610024],
  [10000, 610025], [1000, 610026], [5000, 610027],
] as const;

for (let index = 0; index < runs.length; index++) {
  const [count, seed] = runs[index];
  const block = Math.floor(index / 3) + 1;
  const params = new URLSearchParams({
    autorun: "1",
    count: String(count),
    seed: String(seed),
    session: sessionId,
  });
  console.log(`${sessionId}\tblock ${block}\t${count} rows\tseed ${seed}\t${origin}${origin ? "/" : ""}keyed-filter-benchmark.html?${params}`);
}
