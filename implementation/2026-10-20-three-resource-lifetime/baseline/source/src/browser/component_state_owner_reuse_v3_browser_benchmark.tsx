import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  ComponentStateRoot,
  defineComponent,
  useStateAt,
} from "../component_state_runtime_owner_reuse_v3.ts";
import {
  createKeyedOwnerVersion,
  jsx,
  keyedOwnerChildren,
  type KeyedOwnerVersion,
} from "../jsx_binding_runtime.ts";
import { DOMVDOMHost } from "../vdom_snapshot_runtime.ts";
import { componentStateSitesPlan } from "./generated_component_state_structural.ts";

type Arm = "react" | "generic" | "token" | "token-delta";
type Stage = "edge" | "rotate";
type Sequence = { ids: string[]; version: KeyedOwnerVersion };
type Command = {
  operation: Stage;
  replacementId: string;
  replacementIndex?: number;
};
type Sample = {
  pair: number;
  order: Arm[];
  milliseconds: Record<Arm, Record<Stage, number>>;
  parity: Record<Stage, boolean>;
  identity: Record<Arm, Record<Stage, boolean>>;
  retainedState: Record<Arm, Record<Stage, boolean>>;
};
type StageSummary = {
  medianMs: Record<Arm, number>;
  p95Ms: Record<Arm, number>;
  pairedRatioMedian: {
    tokenOverGeneric: number;
    deltaOverGeneric: number;
    deltaOverReact: number;
    deltaOverToken: number;
  };
};
type RecordResult = {
  schemaVersion: "component-state-owner-reuse-v3-browser-v1";
  status: "PASS" | "FAIL";
  collectedAt: string;
  seed: number;
  replication: number;
  count: number;
  warmupPairs: number;
  measuredPairs: number;
  browser: {
    userAgent: string;
    platform: string;
    hardwareConcurrency: number;
    devicePixelRatio: number;
    visibilityState: DocumentVisibilityState;
    buildMode: "production";
  };
  arms: Arm[];
  reactCompiler: {
    package: "babel-plugin-react-compiler";
    target: "19";
    buildGate: "memo-cache lowering asserted in the frozen production assets";
  };
  stages: Record<Stage, StageSummary>;
  samples: Sample[];
  integrity: {
    allEdgeParity: boolean;
    allRotationParity: boolean;
    allHostIdentity: boolean;
    allChildStateRetained: boolean;
  };
  archiveFile: string | null;
  limitations: string[];
};

const ARMS: Arm[] = ["react", "generic", "token", "token-delta"];
const COUNT = 10_000;
const WARMUPS = 8;
const MEASURED = 24;
const STAGES: Stage[] = ["edge", "rotate"];
const seedInput = document.querySelector<HTMLInputElement>("#seed")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export")!;
const resultNode = document.querySelector<HTMLElement>("#result")!;
const recordNode = document.querySelector<HTMLElement>("#record")!;
const fields: Record<Arm, HTMLElement> = {
  react: document.querySelector<HTMLElement>("#react-root")!,
  generic: document.querySelector<HTMLElement>("#generic-root")!,
  token: document.querySelector<HTMLElement>("#token-root")!,
  "token-delta": document.querySelector<HTMLElement>("#delta-root")!,
};
const urlParams = new URLSearchParams(location.search);
const dryRun = urlParams.get("dryrun") === "1";
const sequenceCommand = {
  current: { operation: "edge", replacementId: "" } as Command,
};
const mounted = new Map<Arm, {
  reactRoot?: Root;
  runtimeRoot?: ComponentStateRoot<Node, Node>;
}>();

const makeIds = (count: number) =>
  Array.from({ length: count }, (_, id) => `row-${id}`);
const initialSequence = (): Sequence => ({
  ids: makeIds(COUNT),
  version: createKeyedOwnerVersion(),
});
const applyCommand = (previous: Sequence, command: Command): Sequence =>
  command.operation === "edge"
    ? {
      ids: previous.ids.map((id, index) =>
        index === (command.replacementIndex ?? previous.ids.length - 1)
          ? command.replacementId
          : id
      ),
      version: createKeyedOwnerVersion(),
    }
    : {
      ids: [...previous.ids.slice(1), previous.ids[0]],
      version: previous.version,
    };

function ReactRow({ id }: { id: string }) {
  const [selected, setSelected] = React.useState(id === "row-0");
  return (
    <li
      data-id={id}
      data-selected={String(selected)}
      onClick={() => setSelected((previous) => !previous)}
    >
      {id}
    </li>
  );
}

function ReactApp({ initial, command }: {
  initial: Sequence;
  command: typeof sequenceCommand;
}) {
  const [sequence, setSequence] = React.useState(initial);
  return (
    <section data-app="structural">
      <button
        data-action="apply-update"
        onClick={() =>
          setSequence((previous) => applyCommand(previous, command.current))}
      >
        Apply update
      </button>
      <ul data-list="rows">
        {sequence.ids.map((id) => <ReactRow key={id} id={id} />)}
      </ul>
    </section>
  );
}

const ROW_SITE =
  "compiler/fixtures/component_state_structural.tsx#component:StructuralRow";
const APP_SITE =
  "compiler/fixtures/component_state_structural.tsx#component:StructuralApp";
const RuntimeRow = defineComponent<{ id: string }>(ROW_SITE, ({ id }) => {
  const [selected, setSelected] = useStateAt(
    "compiler/fixtures/component_state_structural.tsx#component:StructuralRow#state:0",
    id === "row-0",
  );
  return jsx("li", {
    "data-id": id,
    "data-selected": String(selected),
    onClick: () => setSelected((previous) => !previous),
  }, id);
});
const RuntimeApp = defineComponent<{
  initial: Sequence;
  command: typeof sequenceCommand;
}>(APP_SITE, ({ initial, command }) => {
  const [sequence, setSequence] = useStateAt(
    "compiler/fixtures/component_state_structural.tsx#component:StructuralApp#state:0",
    initial,
  );
  return jsx("section", { "data-app": "structural" }, [
    jsx("button", {
      "data-action": "apply-update",
      onClick: () =>
        setSequence((previous) => applyCommand(previous, command.current)),
    }, "Apply update"),
    jsx(
      "ul",
      { "data-list": "rows" },
      keyedOwnerChildren(
        ROW_SITE,
        sequence.ids.map((id) => jsx(RuntimeRow, { key: id, id })),
        sequence.version,
      ),
    ),
  ]);
});

const randomFor = (seed: number) => {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
};
const shuffle = <T,>(values: T[], random: () => number) => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};
const permutations = <T,>(values: T[]): T[][] => {
  if (values.length <= 1) return [values];
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map(
      (tail) => [value, ...tail],
    )
  );
};
const scheduledOrders = (seed: number) => {
  const random = randomFor(seed ^ 0x4f1bbcdc);
  return {
    warmups: Array.from({ length: WARMUPS }, () => shuffle([...ARMS], random)),
    measured: shuffle(permutations(ARMS), random),
  };
};
const median = (values: number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const p95 = (values: number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(0.95 * sorted.length) - 1)];
};
const idsIn = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>("li[data-id]")].map((node) =>
    node.dataset.id!
  );
const nodesById = (container: HTMLElement) =>
  new Map(
    [...container.querySelectorAll<HTMLElement>("li[data-id]")].map((node) => [
      node.dataset.id!,
      node,
    ]),
  );
const signature = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>("li[data-id]")].map((node) =>
    `${node.dataset.id}:${node.dataset.selected}:${node.textContent}`
  ).join("\n");
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const settleRuntime = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve));

const mountAll = async () => {
  for (const arm of ARMS) {
    const old = mounted.get(arm);
    if (old?.reactRoot) flushSync(() => old.reactRoot!.unmount());
    old?.runtimeRoot?.dispose();
    fields[arm].replaceChildren();
  }
  mounted.clear();
  const initial = initialSequence();
  for (const arm of ARMS) {
    if (arm === "react") {
      const reactRoot = createRoot(fields.react);
      flushSync(() =>
        reactRoot.render(
          <ReactApp initial={initial} command={sequenceCommand} />,
        )
      );
      mounted.set(arm, { reactRoot });
      continue;
    }
    const runtimeRoot = new ComponentStateRoot(
      new DOMVDOMHost(),
      fields[arm],
      {
        invalidationPlan: componentStateSitesPlan.invalidation_graph,
        keyedOwnerReuse: arm !== "generic",
        keyedOwnerReuseMode: arm === "token-delta"
          ? "token-delta"
          : arm === "token"
          ? "token"
          : undefined,
      },
    );
    runtimeRoot.mount(jsx(RuntimeApp, { initial, command: sequenceCommand }));
    mounted.set(arm, { runtimeRoot });
  }
};

const teardownAll = () => {
  for (const arm of ARMS) {
    const entry = mounted.get(arm)!;
    if (entry.reactRoot) flushSync(() => entry.reactRoot!.unmount());
    entry.runtimeRoot?.dispose();
    fields[arm].replaceChildren();
  }
  mounted.clear();
};

const update = async (arm: Arm, command: Command) => {
  sequenceCommand.current = command;
  const button = fields[arm].querySelector<HTMLButtonElement>(
    "button[data-action='apply-update']",
  )!;
  const started = performance.now();
  if (arm === "react") flushSync(() => button.click());
  else {
    button.click();
    await settleRuntime();
  }
  return performance.now() - started;
};

const run = async (seed: number): Promise<RecordResult> => {
  if (document.visibilityState !== "visible") {
    throw new Error(
      "Open this page in a visible browser tab before collecting",
    );
  }
  await mountAll();
  assert(
    ARMS.every((arm) =>
      fields[arm].querySelector<HTMLElement>('[data-id="row-0"]')?.dataset
        .selected === "true"
    ),
    `Initial selected state was not seeded: ${
      JSON.stringify(Object.fromEntries(
        ARMS.map((arm) => [
          arm,
          fields[arm].querySelector<HTMLElement>('[data-id="row-0"]')?.dataset
            .selected,
        ]),
      ))
    }`,
  );
  const schedule = scheduledOrders(seed);
  let expectedIds = makeIds(COUNT);
  const samples: Sample[] = [];
  const allEdgeIdentity = Object.fromEntries(
    ARMS.map((arm) => [arm, true]),
  ) as Record<Arm, boolean>;
  const allRotateIdentity = Object.fromEntries(
    ARMS.map((arm) => [arm, true]),
  ) as Record<Arm, boolean>;
  let allEdgeParity = true;
  let allRotationParity = true;
  let allChildState = true;
  const runPair = async (pair: number, order: Arm[], measured: boolean) => {
    const replacementId = `new-${seed}-${pair}`;
    const replacementIndex = expectedIds.at(-1) === "row-0"
      ? expectedIds.length - 2
      : expectedIds.length - 1;
    const removedId = expectedIds[replacementIndex];
    const edgeIds = [...expectedIds];
    edgeIds[replacementIndex] = replacementId;
    const rotateIds = [...edgeIds.slice(1), edgeIds[0]];
    const milliseconds = Object.fromEntries(ARMS.map((arm) => [
      arm,
      { edge: 0, rotate: 0 },
    ])) as Record<Arm, Record<Stage, number>>;
    const identity = Object.fromEntries(ARMS.map((arm) => [
      arm,
      { edge: true, rotate: true },
    ])) as Record<Arm, Record<Stage, boolean>>;
    const retainedState = Object.fromEntries(ARMS.map((arm) => [
      arm,
      { edge: true, rotate: true },
    ])) as Record<Arm, Record<Stage, boolean>>;
    const parity = { edge: true, rotate: true };
    const stageSignatures: Record<Stage, Partial<Record<Arm, string>>> = {
      edge: {},
      rotate: {},
    };

    for (const arm of order) {
      const beforeEdge = nodesById(fields[arm]);
      milliseconds[arm].edge = await update(arm, {
        operation: "edge",
        replacementId,
        replacementIndex,
      });
      const afterEdge = nodesById(fields[arm]);
      identity[arm].edge = afterEdge.size === COUNT &&
        [...beforeEdge].every(([id, oldNode]) =>
          id === removedId
            ? !oldNode.isConnected && afterEdge.get(replacementId) !== oldNode
            : afterEdge.get(id) === oldNode
        );
      const currentEdgeIds = idsIn(fields[arm]);
      stageSignatures.edge[arm] = signature(fields[arm]);
      parity.edge &&= currentEdgeIds.length === edgeIds.length &&
        currentEdgeIds.every((id, index) => id === edgeIds[index]);
      retainedState[arm].edge =
        afterEdge.get("row-0")?.dataset.selected === "true" &&
        afterEdge.get(replacementId)?.dataset.selected === "false";

      const beforeRotate = afterEdge;
      milliseconds[arm].rotate = await update(arm, {
        operation: "rotate",
        replacementId,
      });
      const afterRotate = nodesById(fields[arm]);
      identity[arm].rotate = afterRotate.size === COUNT &&
        [...beforeRotate].every(([id, oldNode]) =>
          afterRotate.get(id) === oldNode
        );
      const currentRotateIds = idsIn(fields[arm]);
      stageSignatures.rotate[arm] = signature(fields[arm]);
      parity.rotate &&= currentRotateIds.length === rotateIds.length &&
        currentRotateIds.every((id, index) => id === rotateIds[index]);
      retainedState[arm].rotate =
        afterRotate.get("row-0")?.dataset.selected === "true" &&
        afterRotate.get(replacementId)?.dataset.selected === "false";
    }

    const edgeSignature = stageSignatures.edge.react;
    const rotateSignature = stageSignatures.rotate.react;
    parity.edge &&= !!edgeSignature &&
      ARMS.slice(1).every((arm) => stageSignatures.edge[arm] === edgeSignature);
    parity.rotate &&= !!rotateSignature &&
      ARMS.slice(1).every((arm) =>
        stageSignatures.rotate[arm] === rotateSignature
      );
    for (const arm of ARMS) {
      allEdgeIdentity[arm] &&= identity[arm].edge;
      allRotateIdentity[arm] &&= identity[arm].rotate;
      allChildState &&= retainedState[arm].edge && retainedState[arm].rotate;
    }
    allEdgeParity &&= parity.edge;
    allRotationParity &&= parity.rotate;
    if (measured) {
      samples.push({
        pair,
        order,
        milliseconds,
        parity,
        identity,
        retainedState,
      });
    }
    assert(parity.edge && parity.rotate, `Pair ${pair}: output parity failed`);
    assert(
      ARMS.every((arm) => identity[arm].edge && identity[arm].rotate),
      `Pair ${pair}: keyed host identity failed`,
    );
    assert(
      ARMS.every((arm) => retainedState[arm].edge && retainedState[arm].rotate),
      `Pair ${pair}: retained state failed: ${JSON.stringify(retainedState)}`,
    );
    expectedIds = rotateIds;
  };

  try {
    for (let warmup = 0; warmup < WARMUPS; warmup++) {
      await runPair(warmup, schedule.warmups[warmup], false);
    }
    for (let pair = 0; pair < MEASURED; pair++) {
      await runPair(WARMUPS + pair, schedule.measured[pair], true);
    }
  } finally {
    teardownAll();
  }

  const stageSummary = Object.fromEntries(STAGES.map((stage) => {
    const values = Object.fromEntries(ARMS.map((arm) => [
      arm,
      samples.map((sample) => sample.milliseconds[arm][stage]),
    ])) as Record<Arm, number[]>;
    return [
      stage,
      {
        medianMs: Object.fromEntries(
          ARMS.map((arm) => [arm, median(values[arm])]),
        ) as Record<Arm, number>,
        p95Ms: Object.fromEntries(
          ARMS.map((arm) => [arm, p95(values[arm])]),
        ) as Record<Arm, number>,
        pairedRatioMedian: {
          tokenOverGeneric: median(
            samples.map((sample) =>
              sample.milliseconds.token[stage] /
              Math.max(sample.milliseconds.generic[stage], 0.001)
            ),
          ),
          deltaOverGeneric: median(
            samples.map((sample) =>
              sample.milliseconds["token-delta"][stage] /
              Math.max(sample.milliseconds.generic[stage], 0.001)
            ),
          ),
          deltaOverReact: median(
            samples.map((sample) =>
              sample.milliseconds["token-delta"][stage] /
              Math.max(sample.milliseconds.react[stage], 0.001)
            ),
          ),
          deltaOverToken: median(
            samples.map((sample) =>
              sample.milliseconds["token-delta"][stage] /
              Math.max(sample.milliseconds.token[stage], 0.001)
            ),
          ),
        },
      } satisfies StageSummary,
    ];
  })) as Record<Stage, StageSummary>;

  const integrity = {
    allEdgeParity,
    allRotationParity,
    allHostIdentity: ARMS.every((arm) =>
      allEdgeIdentity[arm] && allRotateIdentity[arm]
    ),
    allChildStateRetained: allChildState,
  };
  return {
    schemaVersion: "component-state-owner-reuse-v3-browser-v1",
    status:
      Object.values(integrity).every(Boolean) && samples.length === MEASURED
        ? "PASS"
        : "FAIL",
    collectedAt: new Date().toISOString(),
    seed,
    replication: seed - 83_005_300,
    count: COUNT,
    warmupPairs: WARMUPS,
    measuredPairs: MEASURED,
    browser: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      devicePixelRatio: window.devicePixelRatio,
      visibilityState: document.visibilityState,
      buildMode: "production",
    },
    arms: ARMS,
    reactCompiler: {
      package: "babel-plugin-react-compiler",
      target: "19",
      buildGate: "memo-cache lowering asserted in the frozen production assets",
    },
    stages: stageSummary,
    samples,
    integrity,
    archiveFile: null,
    limitations: [
      "Five page replications share one Chrome profile/device; within-page samples are repeated measures.",
      "Update-to-host-commit excludes layout, paint, and display presentation.",
      "This tests one edge replacement followed by same-membership rotation; filtering and multi-key edits are untested.",
      "The custom runtime uses the compiler-emitted dependency graph for the keyed stateful row fixture; React uses a verified React Compiler production transform.",
    ],
  };
};

let latest: RecordResult | null = null;
const runButtonHandler = async () => {
  runButton.disabled = true;
  exportButton.disabled = true;
  resultNode.className = "";
  try {
    const seed = Number(seedInput.value);
    const validSeed = dryRun
      ? seed === 83_005_300
      : seed >= 83_005_301 && seed <= 83_005_305;
    if (!Number.isSafeInteger(seed) || !validSeed) {
      throw new RangeError(
        dryRun
          ? "The excluded smoke uses seed 83005300"
          : "Use one preregistered seed from 83005301 through 83005305",
      );
    }
    resultNode.textContent = `Running production page replication ${seed}…`;
    latest = await run(seed);
    recordNode.textContent = JSON.stringify(latest, null, 2);
    resultNode.className = latest.status === "PASS" ? "pass" : "fail";
    resultNode.textContent = JSON.stringify(
      {
        status: latest.status,
        seed,
        stages: latest.stages,
        integrity: latest.integrity,
      },
      null,
      2,
    );
    if (latest.status !== "PASS") {
      throw new Error("A browser correctness contract failed");
    }
    if (dryRun) {
      latest.archiveFile = "excluded implementation smoke; not archived";
      recordNode.textContent = JSON.stringify(latest, null, 2);
      resultNode.textContent +=
        "\nExcluded implementation smoke; no result archived.";
      return;
    }
    const response = await fetch(
      "/__benchmark/save-component-state-owner-reuse-v3",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(latest),
      },
    );
    if (!response.ok) {
      throw new Error(
        `Record archive failed: HTTP ${response.status} ${await response
          .text()}`,
      );
    }
    latest.archiveFile = (await response.json()).filename ?? null;
    recordNode.textContent = JSON.stringify(latest, null, 2);
    exportButton.disabled = false;
  } catch (error) {
    resultNode.className = "fail";
    resultNode.textContent = error instanceof Error
      ? error.stack ?? error.message
      : String(error);
    throw error;
  } finally {
    runButton.disabled = false;
  }
};
runButton.addEventListener(
  "click",
  () => void runButtonHandler().catch(() => {}),
);
exportButton.addEventListener("click", () => {
  if (!latest) return;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(latest, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    `component-state-owner-reuse-v3-browser-${latest.seed}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
const autoSeed = Number(urlParams.get("seed"));
if (
  urlParams.get("autorun") === "1" &&
  Number.isSafeInteger(autoSeed) &&
  (dryRun
    ? autoSeed === 83_005_300
    : autoSeed >= 83_005_301 && autoSeed <= 83_005_305)
) {
  seedInput.value = String(autoSeed);
  setTimeout(() => runButton.click(), 0);
}
