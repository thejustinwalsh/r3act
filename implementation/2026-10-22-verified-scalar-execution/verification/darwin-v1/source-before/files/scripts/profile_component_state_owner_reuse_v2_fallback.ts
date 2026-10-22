import {
  ComponentStateRoot,
  defineComponent,
  useStateAt,
} from "../src/component_state_runtime.ts";
import {
  createKeyedOwnerVersion,
  jsx,
  keyedOwnerChildren,
} from "../src/jsx_binding_runtime.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
} from "../src/vdom_snapshot_runtime.ts";

type Arm = "generic" | "checked" | "token";
type Sequence = {
  ids: string[];
  version: ReturnType<typeof createKeyedOwnerVersion>;
};
type Profile = Record<string, number[]>;
type Counters = Record<string, number>;
type Sample = {
  pair: number;
  order: Arm[];
  totalMs: Record<Arm, number>;
  phasesMs: Record<Arm, Record<string, number>>;
  counters: Record<Arm, Counters>;
  outputParity: boolean;
  hostIdentity: Record<Arm, boolean>;
  childStateRetained: Record<Arm, boolean>;
};

const COUNT = 10_000;
const WARMUPS = 8;
const MEASURED = 12;
const ARMS: Arm[] = ["generic", "checked", "token"];
const replication = Number(Deno.args[0] ?? 1);
if (!Number.isInteger(replication) || replication < 1 || replication > 5) {
  throw new RangeError("Pass a replication number from 1 through 5");
}
const ids = (count: number) =>
  Array.from({ length: count }, (_, index) => `row-${index}`);
const median = (values: number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const sameArray = (left: unknown[], right: unknown[]) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

let setSequence:
  | ((update: (previous: Sequence) => Sequence) => boolean)
  | null = null;
const Row = defineComponent<{ id: string }>(
  "fallback-profile.row",
  ({ id }) => {
    const [selected, setSelected] = useStateAt(
      "fallback-profile.row.selected",
      false,
    );
    return jsx("li", {
      "data-id": id,
      "data-selected": String(selected),
      onClick: () => setSelected((previous) => !previous),
    }, id);
  },
);
const App = defineComponent<{
  initial: Sequence;
}>("fallback-profile.app", ({ initial }) => {
  const [sequence, updateSequence] = useStateAt(
    "fallback-profile.app.sequence",
    initial,
  );
  setSequence = updateSequence;
  return jsx("section", {}, [
    jsx(
      "ul",
      { "data-list": "rows" },
      keyedOwnerChildren(
        "fallback-profile.row",
        sequence.ids.map((id) => jsx(Row, { key: id, id })),
        sequence.version,
      ),
    ),
  ]);
});

const readRows = (container: MemoryNode) => [
  ...container.children[0].children[0].children,
];
const readIds = (container: MemoryNode) =>
  readRows(container).map((row) => row.props["data-id"]);
const selected = (container: MemoryNode) =>
  readRows(container)[0]?.props["data-selected"] === "true";

const runArm = (arm: Arm) => {
  let measuring = false;
  const phases: Profile = {};
  const counters: Counters = {};
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    keyedOwnerReuse: arm !== "generic",
    keyedOwnerReuseMode: arm === "token" ? "token" : undefined,
    profile: (phase, milliseconds) => {
      if (!measuring) return;
      (phases[phase] ??= []).push(milliseconds);
    },
    profileCounter: (batch) => {
      if (!measuring) return;
      for (const [name, value] of Object.entries(batch)) {
        counters[name] = (counters[name] ?? 0) + value;
      }
    },
  });
  const initialIds = ids(COUNT);
  root.mount(jsx(App, {
    initial: { ids: initialIds, version: createKeyedOwnerVersion() },
  }));
  const localSetSequence = setSequence;
  const initialRows = readRows(container);
  const firstRow = initialRows[0];
  const updateChild = firstRow.props.onClick;
  if (typeof updateChild === "function") {
    updateChild();
    root.flush();
  }
  return {
    arm,
    root,
    container,
    phases,
    counters,
    set measuring(value: boolean) {
      measuring = value;
    },
    update(nextId: string) {
      if (!localSetSequence) {
        throw new Error("App state setter was not registered");
      }
      localSetSequence((previous) => ({
        ids: [...previous.ids.slice(0, -1), nextId],
        version: createKeyedOwnerVersion(),
      }));
      root.flush();
    },
    dispose() {
      root.dispose();
    },
  };
};

const instances = new Map<Arm, ReturnType<typeof runArm>>();

for (const arm of ARMS) {
  const instance = runArm(arm);
  for (let warmup = 0; warmup < WARMUPS; warmup++) {
    instance.update(`warm-${warmup}`);
  }
  instance.measuring = true;
  instances.set(arm, instance);
}
const samples: Sample[] = [];
for (let pair = 0; pair < MEASURED; pair++) {
  const order = ARMS.map((_, index) => ARMS[(index + pair) % ARMS.length]);
  const before = new Map<Arm, MemoryNode[]>();
  const totalMs = { generic: 0, checked: 0, token: 0 };
  const phasesMs = { generic: {}, checked: {}, token: {} } as Record<
    Arm,
    Record<string, number>
  >;
  const sampleCounters = { generic: {}, checked: {}, token: {} } as Record<
    Arm,
    Counters
  >;
  const hostIdentity = { generic: true, checked: true, token: true };
  const childStateRetained = { generic: true, checked: true, token: true };
  for (const arm of order) {
    const instance = instances.get(arm)!;
    before.set(arm, readRows(instance.container));
    const oldPhases = Object.fromEntries(
      Object.entries(instance.phases).map((
        [name, values],
      ) => [name, values.length]),
    );
    const oldCounters = { ...instance.counters };
    const start = performance.now();
    instance.update(`edge-${pair}`);
    totalMs[arm] = performance.now() - start;
    for (const [name, values] of Object.entries(instance.phases)) {
      const priorLength = oldPhases[name] ?? 0;
      phasesMs[arm][name] = values.slice(priorLength).reduce(
        (sum, value) => sum + value,
        0,
      );
    }
    for (const [name, value] of Object.entries(instance.counters)) {
      sampleCounters[arm][name] = value - (oldCounters[name] ?? 0);
    }
    const rows = readRows(instance.container);
    const oldRows = before.get(arm)!;
    hostIdentity[arm] = rows.length === COUNT &&
      rows.slice(0, -1).every((row, index) => row === oldRows[index]) &&
      rows.at(-1) !== oldRows.at(-1);
    childStateRetained[arm] = selected(instance.container);
  }
  const rowOrders = ARMS.map((arm) => readIds(instances.get(arm)!.container));
  const outputParity = rowOrders.every((rowOrder) =>
    sameArray(rowOrder, rowOrders[0])
  );
  samples.push({
    pair,
    order,
    totalMs,
    phasesMs,
    counters: sampleCounters,
    outputParity,
    hostIdentity,
    childStateRetained,
  });
}

const result = {
  schemaVersion: "component-state-owner-reuse-v2-fallback-phase-diagnostic-v1",
  createdAt: new Date().toISOString(),
  replication,
  execution:
    "single Deno process; independent memory-host roots; diagnostic only",
  count: COUNT,
  warmupUpdatesPerArm: WARMUPS,
  measuredPairedUpdates: MEASURED,
  arms: ARMS,
  phaseSummaryMs: Object.fromEntries(ARMS.map((arm) => {
    const names = new Set(
      samples.flatMap((sample) => Object.keys(sample.phasesMs[arm])),
    );
    return [
      arm,
      Object.fromEntries([...names].map((name) => [
        name,
        median(samples.map((sample) => sample.phasesMs[arm][name] ?? 0)),
      ])),
    ];
  })),
  totalSummaryMs: Object.fromEntries(ARMS.map((arm) => [
    arm,
    median(samples.map((sample) => sample.totalMs[arm])),
  ])),
  integrity: {
    allOutputParity: samples.every((sample) => sample.outputParity),
    allHostIdentity: samples.every((sample) =>
      ARMS.every((arm) => sample.hostIdentity[arm])
    ),
    allChildStateRetained: samples.every((sample) =>
      ARMS.every((arm) => sample.childStateRetained[arm])
    ),
  },
  diagnosticCounters: Object.fromEntries(ARMS.map((arm) => [
    arm,
    Object.fromEntries(
      new Set(samples.flatMap((sample) => Object.keys(sample.counters[arm])))
        .values().map((name) => [
          name,
          samples.reduce(
            (sum, sample) => sum + (sample.counters[arm][name] ?? 0),
            0,
          ),
        ]),
    ),
  ])),
  samples,
  limitations: [
    "This memory-host profile is mechanistic; it does not reproduce browser DOM or compare against React.",
    "Runtime profile callbacks add overhead; phase times are diagnostic only and are not latency claims.",
    "All roots run in one Deno process and share one runtime/host environment.",
    "The benchmark measures edge replacement only; filter and browser-phase attribution remain open.",
  ],
};

if (
  !result.integrity.allOutputParity || !result.integrity.allHostIdentity ||
  !result.integrity.allChildStateRetained
) {
  const failed = samples.filter((sample) =>
    !sample.outputParity ||
    !Object.values(sample.hostIdentity).every(Boolean) ||
    !Object.values(sample.childStateRetained).every(Boolean)
  );
  throw new Error(`Fallback profile correctness failed: ${
    JSON.stringify({
      integrity: result.integrity,
      firstFailedSamples: failed.slice(0, 3),
    })
  }`);
}

await Deno.mkdir("results/component-state-owner-reuse-v2", { recursive: true });
await Deno.writeTextFile(
  `results/component-state-owner-reuse-v2/fallback-phase-diagnostic-${replication}.json`,
  JSON.stringify(result, null, 2) + "\n",
);
for (const arm of ARMS) instances.get(arm)?.dispose();
console.log(JSON.stringify(
  {
    phaseSummaryMs: result.phaseSummaryMs,
    totalSummaryMs: result.totalSummaryMs,
    diagnosticCounters: result.diagnosticCounters,
    integrity: result.integrity,
  },
  null,
  2,
));
