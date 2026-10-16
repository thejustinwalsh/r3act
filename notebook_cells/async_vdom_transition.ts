import { runAsyncVDOMTransitionExperiment } from "./src/async_vdom_transition_experiment.ts";

const asyncVDOMResult = await runAsyncVDOMTransitionExperiment();
if (asyncVDOMResult.status !== "PASS" || !asyncVDOMResult.contractsPass) {
  throw new Error("Async VDOM transition integration contract failed");
}
console.log(JSON.stringify(asyncVDOMResult, null, 2));

const asyncVDOMSvg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="400" viewBox="0 0 960 400" role="img" aria-labelledby="async-vdom-title async-vdom-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="async-vdom-title">Async task preparation connected to retained VDOM roots</title>`,
  `<desc id="async-vdom-desc">Profile and scene data tasks run independently. A header derives when profile resolves. Candidate VDOM trees are normalized and key-validated without host writes, then scene and HUD roots are patched in one synchronous commit.</desc>`,
  `<defs><marker id="async-vdom-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#64748b"/></marker></defs>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="22" y="28" font-size="16" font-weight="700">Async preparation → validated VDOM candidates → synchronized host commit</text>`,
  `<text x="22" y="48" font-size="10" fill="#555">Deterministic event order; no elapsed-time axis or browser rendering measurement</text>`,
  `<path d="M 185 116 C 240 116, 250 102, 310 102" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#async-vdom-arrow)"/>`,
  `<path d="M 185 116 C 260 116, 255 224, 310 224" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#async-vdom-arrow)"/>`,
  `<path d="M 185 224 C 390 224, 485 163, 600 163" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#async-vdom-arrow)"/>`,
  `<path d="M 475 102 C 530 102, 540 163, 600 163" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#async-vdom-arrow)"/>`,
  `<path d="M 770 163 C 815 163, 817 114, 850 114" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#async-vdom-arrow)"/>`,
  `<path d="M 770 163 C 815 163, 817 220, 850 220" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#async-vdom-arrow)"/>`,
  `<rect x="22" y="83" width="163" height="66" rx="8" fill="#dbeafe" stroke="#2563eb"/><text x="103" y="109" text-anchor="middle" font-size="12" font-weight="700">profile task</text><text x="103" y="128" text-anchor="middle" font-size="10">starts independently</text>`,
  `<rect x="22" y="191" width="163" height="66" rx="8" fill="#dbeafe" stroke="#2563eb"/><text x="103" y="217" text-anchor="middle" font-size="12" font-weight="700">scene-data task</text><text x="103" y="236" text-anchor="middle" font-size="10">starts independently</text>`,
  `<rect x="310" y="69" width="165" height="66" rx="8" fill="#dcfce7" stroke="#15803d"/><text x="392" y="95" text-anchor="middle" font-size="12" font-weight="700">derive header</text><text x="392" y="114" text-anchor="middle" font-size="10">needs profile only</text>`,
  `<rect x="600" y="130" width="170" height="66" rx="8" fill="#fef3c7" stroke="#b45309"/><text x="685" y="156" text-anchor="middle" font-size="12" font-weight="700">prepare VDOM roots</text><text x="685" y="175" text-anchor="middle" font-size="10">normalize + validate keys</text>`,
  `<rect x="850" y="83" width="95" height="62" rx="8" fill="#ede9fe" stroke="#6d28d9"/><text x="897" y="108" text-anchor="middle" font-size="11" font-weight="700">scene</text><text x="897" y="127" text-anchor="middle" font-size="9">root patch</text>`,
  `<rect x="850" y="191" width="95" height="62" rx="8" fill="#ede9fe" stroke="#6d28d9"/><text x="897" y="216" text-anchor="middle" font-size="11" font-weight="700">HUD</text><text x="897" y="235" text-anchor="middle" font-size="9">root patch</text>`,
  `<rect x="214" y="296" width="532" height="49" rx="7" fill="#f1f5f9" stroke="#94a3b8"/><text x="480" y="317" text-anchor="middle" font-size="11" font-weight="700">Committed keyed nodes stay mounted while work is pending</text><text x="480" y="334" text-anchor="middle" font-size="10">One synchronous commit preserves identity and publishes both roots</text>`,
  `<text x="22" y="378" font-size="9" fill="#777">In-memory host contract only. Progressive reveal, DOM paint, worker CPU execution, and React comparison remain untested.</text>`,
  `</svg>`,
];
Deno.jupyter.svg`${asyncVDOMSvg.join("")}`;
