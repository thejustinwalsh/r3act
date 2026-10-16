import { runAsyncTransitionExperiment } from "./src/async_transition_experiment.ts";

const asyncTransitionResult = await runAsyncTransitionExperiment();
if (
  asyncTransitionResult.status !== "PASS" ||
  !asyncTransitionResult.contractsPass
) {
  throw new Error("Async transition integration contract failed");
}
console.log(JSON.stringify(asyncTransitionResult, null, 2));

const transitionSvg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="430" viewBox="0 0 980 430" role="img" aria-labelledby="async-transition-title async-transition-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="async-transition-title">Async DAG preparation with atomic root publication</title>`,
  `<desc id="async-transition-desc">Independent profile and feed tasks start together. A header task runs as soon as profile resolves. The old scene and HUD remain visible until feed resolves, then both prepared root snapshots commit in one batch.</desc>`,
  `<defs><marker id="async-transition-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#64748b"/></marker></defs>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="24" y="30" font-size="17" font-weight="700">Async transition · dependency readiness + synchronized publication</text>`,
  `<text x="24" y="51" font-size="10" fill="#555">Event order only · no elapsed-time scale · main-thread JavaScript task scheduling</text>`,
  `<path d="M 202 119 C 270 119, 285 112, 350 112" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#async-transition-arrow)"/>`,
  `<path d="M 202 119 C 420 119, 440 260, 540 260" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#async-transition-arrow)"/>`,
  `<path d="M 202 249 C 350 249, 405 260, 540 260" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#async-transition-arrow)"/>`,
  `<path d="M 735 260 C 785 260, 800 195, 838 195" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#async-transition-arrow)"/>`,
  `<path d="M 735 260 C 785 260, 800 305, 838 305" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#async-transition-arrow)"/>`,
  `<rect x="34" y="86" width="168" height="66" rx="8" fill="#dbeafe" stroke="#2563eb"/><text x="118" y="112" text-anchor="middle" font-size="13" font-weight="700">profile task</text><text x="118" y="132" text-anchor="middle" font-size="10">starts independently</text>`,
  `<rect x="34" y="216" width="168" height="66" rx="8" fill="#dbeafe" stroke="#2563eb"/><text x="118" y="242" text-anchor="middle" font-size="13" font-weight="700">feed task</text><text x="118" y="262" text-anchor="middle" font-size="10">starts independently</text>`,
  `<rect x="350" y="80" width="190" height="66" rx="8" fill="#dcfce7" stroke="#15803d"/><text x="445" y="106" text-anchor="middle" font-size="13" font-weight="700">derive header</text><text x="445" y="126" text-anchor="middle" font-size="10">needs profile only</text>`,
  `<rect x="540" y="227" width="195" height="66" rx="8" fill="#fef3c7" stroke="#b45309"/><text x="637" y="253" text-anchor="middle" font-size="13" font-weight="700">prepare root snapshots</text><text x="637" y="273" text-anchor="middle" font-size="10">after all planned tasks finish</text>`,
  `<rect x="838" y="163" width="112" height="64" rx="8" fill="#ede9fe" stroke="#6d28d9"/><text x="894" y="188" text-anchor="middle" font-size="12" font-weight="700">scene root</text><text x="894" y="207" text-anchor="middle" font-size="10">version 2</text>`,
  `<rect x="838" y="273" width="112" height="64" rx="8" fill="#ede9fe" stroke="#6d28d9"/><text x="894" y="298" text-anchor="middle" font-size="12" font-weight="700">HUD root</text><text x="894" y="317" text-anchor="middle" font-size="10">version 2</text>`,
  `<rect x="255" y="340" width="470" height="46" rx="7" fill="#f1f5f9" stroke="#94a3b8"/><text x="490" y="360" text-anchor="middle" font-size="11" font-weight="700">Old committed roots stay visible during pending work</text><text x="490" y="376" text-anchor="middle" font-size="10">One synchronous commit publishes both new snapshots after preparation</text>`,
  `<text x="24" y="414" font-size="9" fill="#777">Prototype evidence: deterministic deferred-promise contracts only; no latency, browser rendering, progressive reveal, or worker CPU parallelism measured.</text>`,
  `</svg>`,
];
Deno.jupyter.svg`${transitionSvg.join("")}`;
