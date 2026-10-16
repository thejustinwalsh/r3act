import { runCompiledAsyncTaskPlanExperiment } from "./src/async_task_plan_experiment.ts";

const compiledAsyncTaskResult = await runCompiledAsyncTaskPlanExperiment();
if (
  compiledAsyncTaskResult.status !== "PASS" ||
  !compiledAsyncTaskResult.contractsPass
) {
  throw new Error("Compiled async task-plan integration contract failed");
}
console.log(JSON.stringify(compiledAsyncTaskResult, null, 2));

const compiledAsyncSvg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="360" viewBox="0 0 930 360" role="img" aria-labelledby="compiled-async-title compiled-async-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="compiled-async-title">OXC-emitted async dependency plan runs through VDOM commit</title>`,
  `<desc id="compiled-async-desc">The source declares page-model first, but OXC emits a topological order in which profile and feed start first, header follows profile, and page-model follows header and feed. The task functions build one VDOM candidate that commits to a retained root.</desc>`,
  `<defs><marker id="compiled-async-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#64748b"/></marker></defs>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="22" y="27" font-size="16" font-weight="700">OXC-emitted task graph → authored callbacks → retained VDOM update</text>`,
  `<text x="22" y="47" font-size="10" fill="#555">Compiler order: ${
    compiledAsyncTaskResult.compilerOrder.join(" → ")
  } · event order, not elapsed time</text>`,
  `<path d="M 205 118 C 285 118, 310 115, 380 115" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#compiled-async-arrow)"/>`,
  `<path d="M 205 232 C 435 232, 510 192, 600 192" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#compiled-async-arrow)"/>`,
  `<path d="M 555 115 C 585 115, 585 174, 600 174" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#compiled-async-arrow)"/>`,
  `<path d="M 770 192 C 812 192, 815 148, 844 148" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#compiled-async-arrow)"/>`,
  `<rect x="35" y="86" width="170" height="64" rx="8" fill="#dbeafe" stroke="#2563eb"/><text x="120" y="111" text-anchor="middle" font-size="12" font-weight="700">profile</text><text x="120" y="130" text-anchor="middle" font-size="10">no prerequisites</text>`,
  `<rect x="35" y="200" width="170" height="64" rx="8" fill="#dbeafe" stroke="#2563eb"/><text x="120" y="225" text-anchor="middle" font-size="12" font-weight="700">feed</text><text x="120" y="244" text-anchor="middle" font-size="10">no prerequisites</text>`,
  `<rect x="380" y="83" width="175" height="64" rx="8" fill="#dcfce7" stroke="#15803d"/><text x="467" y="108" text-anchor="middle" font-size="12" font-weight="700">header</text><text x="467" y="127" text-anchor="middle" font-size="10">depends on profile</text>`,
  `<rect x="600" y="159" width="170" height="64" rx="8" fill="#fef3c7" stroke="#b45309"/><text x="685" y="184" text-anchor="middle" font-size="12" font-weight="700">page-model</text><text x="685" y="203" text-anchor="middle" font-size="10">header + feed</text>`,
  `<rect x="844" y="116" width="70" height="64" rx="8" fill="#ede9fe" stroke="#6d28d9"/><text x="879" y="141" text-anchor="middle" font-size="10" font-weight="700">VDOM</text><text x="879" y="158" text-anchor="middle" font-size="9">commit</text>`,
  `<text x="22" y="310" font-size="10" fill="#555">Source declares page-model first; the compiler emits the runnable topological order.</text>`,
  `<text x="22" y="330" font-size="9" fill="#777">Deno contract uses an in-memory host. No browser timing, progressive reveal, or React comparison.</text>`,
  `</svg>`,
];
Deno.jupyter.svg`${compiledAsyncSvg.join("")}`;
