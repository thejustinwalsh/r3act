import { runComponentUpdateExperiment } from "../src/component_update_experiment.ts";

const destination = Deno.args[0] ?? "results/component-update-ablation-v1.json";
const seed = Deno.args[1] ? Number(Deno.args[1]) : undefined;
const result = runComponentUpdateExperiment(undefined, seed);
await Deno.writeTextFile(destination, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result.scenarios.map(({ size, medianMs, p95Ms, rendersPerUpdate, renderCountContract, finalOutputParity }) => ({
  size,
  ownerCacheMedianMs: medianMs.ownerCache,
  fullRenderMedianMs: medianMs.fullRender,
  ownerCacheP95Ms: p95Ms.ownerCache,
  fullRenderP95Ms: p95Ms.fullRender,
  rendersPerUpdate,
  renderCountContract,
  finalOutputParity,
})), null, 2));
console.log(`Saved paired component update ablation to ${destination}`);
