const {
  runAsyncVDOMUrgentRebaseExperiment,
  runAsyncVDOMDependencyInvalidationExperiment,
  runAsyncVDOMInputRestartExperiment,
} = await import("./src/async_vdom_urgent_rebase_experiment.ts");
const urgentRebaseRun = await runAsyncVDOMUrgentRebaseExperiment();
const dependencyInvalidationRun =
  await runAsyncVDOMDependencyInvalidationExperiment();
const inputRestartRun = await runAsyncVDOMInputRestartExperiment();
if (
  !urgentRebaseRun.contractsPass || !dependencyInvalidationRun.contractsPass ||
  !inputRestartRun.contractsPass
) {
  throw new Error("Urgent rebase, invalidation, or restart contract failed");
}
const urgentWorkPlanningRun = {
  schemaVersion: "async-vdom-urgent-work-planning-v2",
  status: "PASS",
  cases: {
    independentAsyncWorkRebase: urgentRebaseRun,
    changedTaskDependencyInvalidation: dependencyInvalidationRun,
    changedTaskDependencyRestart: inputRestartRun,
  },
  timingMeasured: false,
};
await Deno.writeTextFile(
  "results/async-vdom-urgent-work-planning-v2.json",
  JSON.stringify(urgentWorkPlanningRun, null, 2) + String.fromCharCode(10),
);
console.log(JSON.stringify(urgentWorkPlanningRun, null, 2));

const urgentWorkPlanningSvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="700" viewBox="0 0 820 700" role="img" aria-labelledby="rebase-title rebase-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">',
  '<title id="rebase-title">Urgent state rebased, invalidated, or restarted during pending async UI</title>',
  '<desc id="rebase-desc">An urgent same-root write is immediately committed. Independent pending work is rebased. Dependent work can be canceled or restarted with refreshed inputs; stale results never publish.</desc>',
  '<rect width="100%" height="100%" fill="white"/>',
  '<text x="24" y="30" font-size="17" font-weight="700">Urgent updates during async work: rebase, invalidate, or restart</text>',
  '<text x="24" y="52" font-size="11" fill="#555">Deterministic in-memory contracts · no latency measurement</text>',
  '<text x="24" y="85" font-size="13" font-weight="700">A · Independent async task: keep work and rebase the candidate</text>',
  '<g font-size="12" text-anchor="middle">',
  '<rect x="25" y="105" width="170" height="90" rx="8" fill="#edf1fa" stroke="#4f76c8"/><text x="110" y="132" font-weight="700">Pending</text><text x="110" y="154">old count +</text><text x="110" y="173">old result visible</text>',
  '<path d="M198 150h30m-8-7 8 7-8 7" fill="none" stroke="#555" stroke-width="2"/>',
  '<rect x="235" y="105" width="170" height="90" rx="8" fill="#e6f4ee" stroke="#57a887"/><text x="320" y="132" font-weight="700">Urgent commit</text><text x="320" y="154">new count visible</text><text x="320" y="173">old result retained</text>',
  '<path d="M408 150h30m-8-7 8 7-8 7" fill="none" stroke="#555" stroke-width="2"/>',
  '<rect x="445" y="105" width="170" height="90" rx="8" fill="#fff2dc" stroke="#d59235"/><text x="530" y="132" font-weight="700">Data ready</text><text x="530" y="154">rebuild from latest</text><text x="530" y="173">state + task result</text>',
  '<path d="M618 150h30m-8-7 8 7-8 7" fill="none" stroke="#555" stroke-width="2"/>',
  '<rect x="655" y="105" width="150" height="90" rx="8" fill="#e6f4ee" stroke="#57a887"/><text x="730" y="132" font-weight="700">Final commit</text><text x="730" y="154">new count + fresh</text><text x="730" y="173">result; keys retained</text>',
  "</g>",
  '<text x="24" y="224" font-size="11">Passes: urgent visibility · pending result retention · latest state included · keyed identity</text>',
  '<text x="24" y="258" font-size="13" font-weight="700">B · Changed task input: abort work that would produce a stale result</text>',
  '<g font-size="12" text-anchor="middle">',
  '<rect x="80" y="280" width="190" height="90" rx="8" fill="#edf1fa" stroke="#4f76c8"/><text x="175" y="308" font-weight="700">Pending search task</text><text x="175" y="332">declares input query</text><text x="175" y="351">count = 0</text>',
  '<path d="M275 325h90m-8-7 8 7-8 7" fill="none" stroke="#555" stroke-width="2"/>',
  '<rect x="370" y="280" width="190" height="90" rx="8" fill="#fff2dc" stroke="#d59235"/><text x="465" y="308" font-weight="700">Urgent write</text><text x="465" y="332">count = 1</text><text x="465" y="351">root commits now</text>',
  '<path d="M565 325h90m-8-7 8 7-8 7" fill="none" stroke="#555" stroke-width="2"/>',
  '<rect x="660" y="280" width="120" height="90" rx="8" fill="#f8e6e6" stroke="#c45e5e"/><text x="720" y="308" font-weight="700">Abort</text><text x="720" y="332">stale plan</text><text x="720" y="351">old result stays</text>',
  "</g>",
  '<text x="24" y="405" font-size="11">Passes: compiler input edge bound · task signal aborted · stale candidate rejected · urgent value retained</text>',
  '<text x="24" y="438" font-size="10" fill="#555">OXC infers literal task/input reads; watchStateWorld observes ECS writes.</text>',
  '<text x="24" y="480" font-size="13" font-weight="700">C · Restart from refreshed inputs when the product opts into retry</text>',
  '<g font-size="12" text-anchor="middle">',
  '<rect x="20" y="500" width="180" height="90" rx="8" fill="#edf1fa" stroke="#4f76c8"/><text x="110" y="528" font-weight="700">Attempt 1</text><text x="110" y="552">query = 0</text><text x="110" y="571">slow task pending</text>',
  '<path d="M202 545h18m-8-7 8 7-8 7" fill="none" stroke="#555" stroke-width="2"/>',
  '<rect x="225" y="500" width="180" height="90" rx="8" fill="#fff2dc" stroke="#d59235"/><text x="315" y="528" font-weight="700">Urgent write</text><text x="315" y="552">query = 1</text><text x="315" y="571">attempt 1 aborted</text>',
  '<path d="M407 545h18m-8-7 8 7-8 7" fill="none" stroke="#555" stroke-width="2"/>',
  '<rect x="430" y="500" width="180" height="90" rx="8" fill="#edf1fa" stroke="#4f76c8"/><text x="520" y="528" font-weight="700">Attempt 2</text><text x="520" y="552">refresh input = 1</text><text x="520" y="571">rerun affected; reuse catalog</text>',
  '<path d="M612 545h18m-8-7 8 7-8 7" fill="none" stroke="#555" stroke-width="2"/>',
  '<rect x="635" y="500" width="165" height="90" rx="8" fill="#e6f4ee" stroke="#57a887"/><text x="717" y="528" font-weight="700">Commit</text><text x="717" y="552">fresh result</text><text x="717" y="571">late result ignored</text>',
  "</g>",
  '<text x="24" y="620" font-size="11">Passes: restart count · latest input read · stale completion ignored · previous UI retained · final commit</text>',
  '<text x="24" y="650" font-size="10" fill="#555">Completed independent outputs are reused; preserving independent in-flight work remains open.</text>',
  "</svg>",
];
Deno.jupyter.svg`${urgentWorkPlanningSvg.join("")}`;
