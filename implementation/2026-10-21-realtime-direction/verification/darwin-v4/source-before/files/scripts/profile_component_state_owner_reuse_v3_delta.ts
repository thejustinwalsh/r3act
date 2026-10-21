import {
  ComponentStateRoot,
  defineComponent,
  useStateAt,
} from "../src/component_state_runtime_owner_reuse_v3.ts";
import {
  createKeyedOwnerVersion,
  jsx,
  keyedOwnerChildren,
} from "../src/jsx_binding_runtime.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
} from "../src/vdom_snapshot_runtime.ts";

type Arm = "generic" | "token" | "token-delta";
type Stage = "edge" | "rotate";
type Sequence = {
  ids: string[];
  version: ReturnType<typeof createKeyedOwnerVersion>;
};
type Counters = Record<string, number>;
type PhaseTimes = Record<string, number>;
type StageData = {
  milliseconds: number;
  phases: PhaseTimes;
  counters: Counters;
};
type Sample = {
  pair: number;
  order: Arm[];
  stages: Record<Arm, Record<Stage, StageData>>;
  edgeParity: boolean;
  rotateParity: boolean;
  hostIdentity: boolean;
  childStateRetained: boolean;
};

const COUNT = 10_000;
const WARMUPS = 8;
const MEASURED = 12;
const ARMS: Arm[] = ["generic", "token", "token-delta"];
const replication = Number(Deno.args[0] ?? 1);
if (!Number.isInteger(replication) || replication < 1 || replication > 5) {
  throw new RangeError("Pass a replication number from 1 through 5");
}
const initialIds = () =>
  Array.from({ length: COUNT }, (_, index) => `row-${index}`);
const median = (values: number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const ids = (container: MemoryNode) =>
  container.children[0].children[0].children.map((node) =>
    node.props["data-id"]
  );
const rows = (container: MemoryNode) => [
  ...container.children[0].children[0].children,
];
const childStateRetained = (container: MemoryNode) =>
  rows(container).find((node) => node.props["data-id"] === "row-5000")
    ?.props["data-selected"] === "true";
const arrayEqual = (left: unknown[], right: unknown[]) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

let activeSetter:
  | ((update: (previous: Sequence) => Sequence) => boolean)
  | null = null;
const Row = defineComponent<{ id: string }>(
  "owner-reuse-v3.row",
  ({ id }) => {
    const [selected, setSelected] = useStateAt(
      "owner-reuse-v3.row.selected",
      false,
    );
    return jsx("li", {
      "data-id": id,
      "data-selected": String(selected),
      onClick: () => setSelected((previous) => !previous),
    }, id);
  },
);
const App = defineComponent<{ initial: Sequence }>(
  "owner-reuse-v3.app",
  ({ initial }) => {
    const [sequence, setSequence] = useStateAt(
      "owner-reuse-v3.app.sequence",
      initial,
    );
    activeSetter = setSequence;
    return jsx("section", {}, [
      jsx(
        "ul",
        {},
        keyedOwnerChildren(
          "owner-reuse-v3.row",
          sequence.ids.map((id) => jsx(Row, { key: id, id })),
          sequence.version,
        ),
      ),
    ]);
  },
);

const makeInstance = (arm: Arm) => {
  let stage: Stage | null = null;
  const phaseSamples: Record<Stage, PhaseTimes[]> = { edge: [], rotate: [] };
  const counterSamples: Record<Stage, Counters[]> = { edge: [], rotate: [] };
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    keyedOwnerReuse: arm !== "generic",
    keyedOwnerReuseMode: arm === "token-delta"
      ? "token-delta"
      : arm === "token"
      ? "token"
      : undefined,
    profile: (name, milliseconds) => {
      if (stage) {
        const current = phaseSamples[stage].at(-1);
        if (current) current[name] = (current[name] ?? 0) + milliseconds;
      }
    },
    profileCounter: (batch) => {
      if (!stage) return;
      const current = counterSamples[stage].at(-1);
      if (!current) return;
      for (const [name, value] of Object.entries(batch)) {
        current[name] = (current[name] ?? 0) + value;
      }
    },
  });
  root.mount(jsx(App, {
    initial: { ids: initialIds(), version: createKeyedOwnerVersion() },
  }));
  const setSequence = activeSetter;
  if (!setSequence) throw new Error("Sequence setter was not registered");
  const sentinel = rows(container).find((node) =>
    node.props["data-id"] === "row-5000"
  );
  const onClick = sentinel?.props.onClick;
  if (typeof onClick !== "function") {
    throw new Error("Missing row click action");
  }
  onClick();
  root.flush();

  const edge = (token: string) => {
    setSequence((previous) => ({
      ids: [...previous.ids.slice(0, -1), token],
      version: createKeyedOwnerVersion(),
    }));
    root.flush();
  };
  const rotate = () => {
    setSequence((previous) => ({
      ids: [...previous.ids.slice(1), previous.ids[0]],
      version: previous.version,
    }));
    root.flush();
  };
  const profileStage = (current: Stage, update: () => void): StageData => {
    stage = current;
    const phaseRow: PhaseTimes = {};
    const counterRow: Counters = {};
    phaseSamples[current].push(phaseRow);
    counterSamples[current].push(counterRow);
    const started = performance.now();
    update();
    const milliseconds = performance.now() - started;
    stage = null;
    return { milliseconds, phases: phaseRow, counters: counterRow };
  };
  return {
    container,
    edge,
    rotate,
    profileStage,
    dispose: () => root.dispose(),
  };
};

const instances = new Map<Arm, ReturnType<typeof makeInstance>>();
for (const arm of ARMS) {
  const instance = makeInstance(arm);
  for (let warmup = 0; warmup < WARMUPS; warmup++) {
    instance.edge(`warm-${warmup}`);
    instance.rotate();
  }
  instances.set(arm, instance);
}

let expectedIds = ids(instances.get(ARMS[0])!.container);
const samples: Sample[] = [];
for (let pair = 0; pair < MEASURED; pair++) {
  const order = ARMS.map((_, index) => ARMS[(index + pair) % ARMS.length]);
  const stages = Object.fromEntries(ARMS.map((arm) => [arm, {
    edge: { milliseconds: 0, phases: {}, counters: {} },
    rotate: { milliseconds: 0, phases: {}, counters: {} },
  }])) as Record<Arm, Record<Stage, StageData>>;
  let edgeParity = true;
  let rotateParity = true;
  let hostIdentity = true;
  let retainedState = true;

  for (const arm of order) {
    const instance = instances.get(arm)!;
    const oldRows = rows(instance.container);
    const expectedEdge = [...expectedIds.slice(0, -1), `edge-${pair}`];
    stages[arm].edge = instance.profileStage(
      "edge",
      () => instance.edge(`edge-${pair}`),
    );
    const edgeRows = rows(instance.container);
    const edgeIds = ids(instance.container);
    edgeParity &&= arrayEqual(edgeIds, expectedEdge);
    hostIdentity &&= edgeRows.length === COUNT &&
      edgeRows.slice(0, -1).every((node, index) => node === oldRows[index]) &&
      edgeRows.at(-1) !== oldRows.at(-1);
    retainedState &&= childStateRetained(instance.container);

    const beforeRotate = new Map(edgeRows.map((node) => [
      String(node.props["data-id"]),
      node,
    ]));
    const expectedRotate = [...expectedEdge.slice(1), expectedEdge[0]];
    stages[arm].rotate = instance.profileStage(
      "rotate",
      () => instance.rotate(),
    );
    const rotatedRows = rows(instance.container);
    const rotatedIds = ids(instance.container);
    rotateParity &&= arrayEqual(rotatedIds, expectedRotate);
    hostIdentity &&= rotatedRows.length === COUNT &&
      rotatedRows.every((node) =>
        beforeRotate.get(String(node.props["data-id"])) === node
      );
    retainedState &&= childStateRetained(instance.container);
  }
  expectedIds = [...expectedIds.slice(0, -1), `edge-${pair}`];
  expectedIds = [...expectedIds.slice(1), expectedIds[0]];
  samples.push({
    pair,
    order,
    stages,
    edgeParity,
    rotateParity,
    hostIdentity,
    childStateRetained: retainedState,
  });
}

const stageSummary = Object.fromEntries(ARMS.map((arm) => [
  arm,
  Object.fromEntries(([["edge", "edge"], ["rotate", "rotate"]] as const).map(
    ([stageName, key]) => {
      const phases = new Set(
        samples.flatMap((sample) =>
          Object.keys(sample.stages[arm][key].phases)
        ),
      );
      return [stageName, {
        totalMedianMs: median(
          samples.map((sample) => sample.stages[arm][key].milliseconds),
        ),
        phases: Object.fromEntries([...phases].map((phase) => [
          phase,
          median(
            samples.map((sample) => sample.stages[arm][key].phases[phase] ?? 0),
          ),
        ])),
      }];
    },
  )),
]));
const counterSummary = Object.fromEntries(ARMS.map((arm) => [
  arm,
  Object.fromEntries(([["edge", "edge"], ["rotate", "rotate"]] as const).map(
    ([stageName, key]) => {
      const names = new Set(
        samples.flatMap((sample) =>
          Object.keys(sample.stages[arm][key].counters)
        ),
      );
      return [
        stageName,
        Object.fromEntries([...names].map((name) => [
          name,
          samples.reduce(
            (sum, sample) =>
              sum + (sample.stages[arm][key].counters[name] ?? 0),
            0,
          ),
        ])),
      ];
    },
  )),
]));
const result = {
  schemaVersion: "component-state-owner-reuse-v3-delta-profile-v1",
  createdAt: new Date().toISOString(),
  replication,
  execution: "fresh Deno process; MemoryVDOMHost; diagnostic only",
  count: COUNT,
  warmupPairsPerArm: WARMUPS,
  measuredPairs: MEASURED,
  arms: ARMS,
  stageSummary,
  counterSummary,
  integrity: {
    allEdgeParity: samples.every((sample) => sample.edgeParity),
    allRotationParity: samples.every((sample) => sample.rotateParity),
    allHostIdentity: samples.every((sample) => sample.hostIdentity),
    allChildStateRetained: samples.every((sample) => sample.childStateRetained),
  },
  samples,
  limitations: [
    "Memory-host mechanism profile only; it does not compare React or browser DOM latency.",
    "Runtime profiling callbacks add overhead and phases are not guaranteed additive.",
    "Each process contains three arms on one host/runtime environment.",
    "The sequence covers edge replacement followed by one same-key rotation; filtering remains untested.",
  ],
};
if (
  !result.integrity.allEdgeParity || !result.integrity.allRotationParity ||
  !result.integrity.allHostIdentity || !result.integrity.allChildStateRetained
) {
  throw new Error(
    `V3 delta profile correctness failed: ${
      JSON.stringify({
        integrity: result.integrity,
        currentRow0: Object.fromEntries(ARMS.map((arm) => {
          const row = rows(instances.get(arm)!.container).find((node) =>
            node.props["data-id"] === "row-5000"
          );
          return [arm, row?.props["data-selected"]];
        })),
        failingPairs: samples.filter((sample) => !sample.childStateRetained)
          .map((sample) => ({
            pair: sample.pair,
            order: sample.order,
          })).slice(0, 3),
      })
    }`,
  );
}

const outputPath =
  `results/component-state-owner-reuse-v3/delta-profile-${replication}.json`;
await Deno.mkdir("results/component-state-owner-reuse-v3", { recursive: true });
await Deno.writeTextFile(outputPath, JSON.stringify(result, null, 2) + "\n");
for (const instance of instances.values()) instance.dispose();
console.log(JSON.stringify(
  {
    replication,
    stageSummary,
    counterSummary,
    integrity: result.integrity,
  },
  null,
  2,
));
