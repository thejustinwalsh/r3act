import { createGateAStudySchedule } from "../src/keyed_filter_protocol.ts";

const origin = (Deno.args[0] ?? "").replace(/\/$/, "");
const schedule = createGateAStudySchedule(["gate-a-session-1", "gate-a-session-2"], 610001);

for (const run of schedule) {
  console.log(`${run.sessionId}\tblock ${run.block}\t${run.count} rows\tseed ${run.seed}\t${origin}${origin ? "/" : ""}${run.url}`);
}
