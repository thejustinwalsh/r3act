import { runAsyncTaskSchedulerExperiment } from "./src/async_task_scheduler_experiment.ts";

const asyncSchedulingResult = await runAsyncTaskSchedulerExperiment();
if (
  asyncSchedulingResult.status !== "PASS" ||
  !asyncSchedulingResult.contractsPass
) {
  throw new Error("Async task scheduling event-order contract failed");
}
console.log(JSON.stringify(asyncSchedulingResult, null, 2));

const asyncSvg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="350" viewBox="0 0 900 350" role="img" aria-labelledby="async-dag-title async-dag-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="async-dag-title">Async task-plan readiness trace</title>`,
  `<desc id="async-dag-desc">A profile task and feed task start independently. The personalized header starts when profile resolves, while the page model waits for both profile and feed. This is an event-order diagram with no timing scale.</desc>`,
  `<defs><marker id="async-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#64748b"/></marker></defs>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="24" y="30" font-size="17" font-weight="700">Async task plan · readiness, not elapsed time</text>`,
  `<text x="24" y="51" font-size="10" fill="#555">maxConcurrency = 2 · independent resources start together · ready branches continue without unrelated dependencies</text>`,
  `<path d="M 215 120 C 270 120, 285 112, 345 112" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#async-arrow)"/>`,
  `<path d="M 215 120 C 370 120, 440 220, 565 220" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#async-arrow)"/>`,
  `<path d="M 215 250 C 345 250, 430 220, 565 220" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#async-arrow)"/>`,
  `<rect x="48" y="88" width="167" height="64" rx="8" fill="#dbeafe" stroke="#2563eb"/><text x="131" y="114" text-anchor="middle" font-size="13" font-weight="700">profile resource</text><text x="131" y="133" text-anchor="middle" font-size="10">starts at step 1</text>`,
  `<rect x="48" y="218" width="167" height="64" rx="8" fill="#dbeafe" stroke="#2563eb"/><text x="131" y="244" text-anchor="middle" font-size="13" font-weight="700">feed resource</text><text x="131" y="263" text-anchor="middle" font-size="10">starts at step 1</text>`,
  `<rect x="345" y="80" width="190" height="64" rx="8" fill="#dcfce7" stroke="#15803d"/><text x="440" y="106" text-anchor="middle" font-size="13" font-weight="700">personalized header</text><text x="440" y="125" text-anchor="middle" font-size="10">ready after profile only</text>`,
  `<rect x="565" y="188" width="190" height="64" rx="8" fill="#fef3c7" stroke="#b45309"/><text x="660" y="214" text-anchor="middle" font-size="13" font-weight="700">page model</text><text x="660" y="233" text-anchor="middle" font-size="10">waits for profile + feed</text>`,
  `<text x="24" y="316" font-size="10" fill="#555">Observed event order: profile + feed start → header starts when profile resolves → page model starts after feed resolves.</text>`,
  `<text x="24" y="334" font-size="9" fill="#777">Deferred-promise contract fixture; no duration, React comparison, DOM commit, or worker parallelism measured.</text>`,
  `</svg>`,
];
Deno.jupyter.svg`${asyncSvg.join("")}`;
