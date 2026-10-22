const path = "results/snake-frame-cadence-v1/preregistration.json";
const prereg = JSON.parse(await Deno.readTextFile(path));
if (
  prereg.status !== "FROZEN_BEFORE_IMPLEMENTATION" ||
  prereg.schedule.length !== 45
) throw new Error("Cadence preregistration is incomplete or already amended");
const moduleSource = `// Generated from ${path}; do not edit by hand.\n` +
  `const pages = ${JSON.stringify(prereg.schedule, null, 2)} as const;\n` +
  `export const cadencePages = () => pages;\n`;
await Deno.writeTextFile(
  "src/browser/snake_frame_cadence_v1_schedule.ts",
  moduleSource,
);
console.log(`Generated frozen ${prereg.schedule.length}-page schedule.`);
