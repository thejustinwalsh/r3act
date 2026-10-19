const preregistration = JSON.parse(
  await Deno.readTextFile("results/snake-frame-phase-v1/preregistration.json"),
);
const path = "src/browser/snake_frame_phase_v1_schedule.ts";
const contents = `export const phasePages = () => ${JSON.stringify(preregistration.schedule, null, 2)} as const;\n`;
await Deno.writeTextFile(path, contents);
console.log(`Wrote ${preregistration.schedule.length} scheduled page descriptors.`);
