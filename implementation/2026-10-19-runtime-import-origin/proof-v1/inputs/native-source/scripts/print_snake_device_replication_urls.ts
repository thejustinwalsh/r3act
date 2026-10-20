import { lifecyclePages } from "../src/browser/snake_lifecycle_v1_schedule.ts";
import { cadencePages } from "../src/browser/snake_frame_cadence_v1_schedule.ts";

const originArg = Deno.args.find((arg) => arg.startsWith("--origin="));
const origin = new URL(
  originArg?.slice("--origin=".length) ??
    "https://react-runtime-replication.localhost:1355",
);
if (origin.protocol !== "https:" || !origin.hostname.endsWith(".localhost")) {
  throw new Error("Origin must be an HTTPS Portless .localhost URL");
}

const scheduleHash = async (schedule: unknown) => {
  const bytes = new TextEncoder().encode(JSON.stringify(schedule));
  const digest = await crypto.subtle.digest("SHA-256", bytes.buffer);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
const absolute = (path: string) => new URL(path, origin).href;
const lifecycle = lifecyclePages();
const cadence = cadencePages();
const firstLifecycle = lifecycle[0];
const firstCadence = cadence[0];

const lifecycleQuery = new URLSearchParams({
  sequence: "0",
  replication: String(firstLifecycle.replication),
  arm: firstLifecycle.arm,
  segments: String(firstLifecycle.segmentCount),
  trial:
    `lifecycle-v1-s${firstLifecycle.segmentCount}-r${firstLifecycle.replication}-${firstLifecycle.arm}`,
  autorun: "1",
});
const cadenceQuery = new URLSearchParams({
  sequence: "0",
  replication: String(firstCadence.replication),
  arm: firstCadence.arm,
  segments: String(firstCadence.segmentCount),
  trial:
    `cadence-v1-s${firstCadence.segmentCount}-r${firstCadence.replication}-${firstCadence.arm}`,
  autorun: "1",
});

console.log(JSON.stringify(
  {
    origin: origin.origin,
    lifecycle: {
      pages: lifecycle.length,
      scheduleSha256: await scheduleHash(lifecycle),
      firstScheduledUrl: absolute(
        `/snake-lifecycle-v1-benchmark.html?${lifecycleQuery}`,
      ),
    },
    cadence: {
      pages: cadence.length,
      scheduleSha256: await scheduleHash(cadence),
      firstScheduledUrl: absolute(
        `/snake-frame-cadence-v1-benchmark.html?${cadenceQuery}`,
      ),
    },
  },
  null,
  2,
));
