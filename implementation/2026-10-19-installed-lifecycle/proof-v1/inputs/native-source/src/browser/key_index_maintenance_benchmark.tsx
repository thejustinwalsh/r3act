import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { jsx } from "../jsx_binding_runtime.ts";
import {
  DOMVDOMHost,
  type VDOMKeyIndexMaintenance,
  VDOMSnapshotRoot,
} from "../vdom_snapshot_runtime.ts";

type Arm = "react" | "rebuild" | "delta";
type Operation = "rotate" | "replace-edge" | "filter";
type Direction = "rotate" | "replace-edge" | "shrink" | "restore";
type Sample = {
  pair: number;
  direction: Direction;
  order: Arm[];
  milliseconds: Record<Arm, number>;
  outputParity: boolean;
  identity: Record<Arm, boolean>;
};
type Scenario = {
  operation: Operation;
  samples: Sample[];
  updateMedianMs: Record<Arm, number>;
  updateP95Ms: Record<Arm, number>;
  mountMs: Record<Arm, number>;
  teardownMs: Record<Arm, number>;
  outputParity: boolean;
  stableIdentity: boolean;
  teardownEmpty: boolean;
};
type RecordResult = {
  schemaVersion: "key-index-maintenance-browser-v1";
  status: "PASS" | "FAIL";
  collectedAt: string;
  seed: number;
  count: number;
  warmupPairs: number;
  measuredPairs: number;
  browser: {
    userAgent: string;
    platform: string;
    hardwareConcurrency: number | null;
    devicePixelRatio: number;
    visibilityState: DocumentVisibilityState;
    viewport: { width: number; height: number };
  };
  arms: Record<Arm, string>;
  scenarios: Scenario[];
  limitations: string[];
};

const count = 10_000;
const warmupPairs = 8;
const measuredPairs = 24;
const operations: Operation[] = ["rotate", "replace-edge", "filter"];
const arms: Arm[] = ["react", "rebuild", "delta"];
const seedNode = document.querySelector<HTMLInputElement>("#seed")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const statusNode = document.querySelector<HTMLElement>("#status")!;
const recordNode = document.querySelector<HTMLElement>("#record")!;
const containers: Record<Arm, HTMLElement> = {
  react: document.querySelector<HTMLElement>("#react-root")!,
  rebuild: document.querySelector<HTMLElement>("#rebuild-root")!,
  delta: document.querySelector<HTMLElement>("#delta-root")!,
};

const makeIds = () => Array.from({ length: count }, (_, id) => `row-${id}`);
const makeRandom = (initial: number) => {
  let state = initial >>> 0 || 1;
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
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const makeOrders = (seed: number) => {
  const permutations: Arm[][] = [
    ["react", "rebuild", "delta"],
    ["react", "delta", "rebuild"],
    ["rebuild", "react", "delta"],
    ["rebuild", "delta", "react"],
    ["delta", "react", "rebuild"],
    ["delta", "rebuild", "react"],
  ];
  const pairs = Array.from(
    { length: warmupPairs + measuredPairs },
    (_, pair) => ({
      pair,
      order: permutations[pair % permutations.length],
    }),
  );
  return shuffle(pairs, makeRandom(seed));
};
const applyOperation = (
  ids: readonly string[],
  operation: Operation,
  token: string,
) => {
  if (operation === "rotate") {
    return ids.length > 1 ? [...ids.slice(1), ids[0]] : [...ids];
  }
  if (operation === "replace-edge") {
    return [`new-${token}`, ...ids.slice(0, -1)];
  }
  return ids.length > count / 2
    ? ids.filter((id) => id.startsWith("row-") && Number(id.slice(4)) % 2 === 0)
    : makeIds();
};
const reactTree = (ids: readonly string[]) => (
  <ul key="list" data-list="rows">
    {ids.map((id) => <li key={id} data-id={id}>{id}</li>)}
  </ul>
);
const vdomTree = (ids: readonly string[]) =>
  jsx(
    "ul",
    { key: "list", "data-list": "rows" },
    ids.map((id) => jsx("li", { key: id, "data-id": id }, id)),
  );
const nodesById = (container: HTMLElement) =>
  new Map(
    [...container.querySelectorAll<HTMLElement>("li[data-id]")].map((node) => [
      node.dataset.id!,
      node,
    ]),
  );
const readIds = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>("li[data-id]")].map((node) =>
    node.dataset.id!
  );
const signature = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>("li[data-id]")].map((node) =>
    `${node.dataset.id}:${node.textContent}`
  ).join("\n");
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

let reactRoot: Root | null = null;
let rebuildRoot: VDOMSnapshotRoot<Node, Node> | null = null;
let deltaRoot: VDOMSnapshotRoot<Node, Node> | null = null;
const reactIds = { value: [] as string[] };
const runtimeRoots: Record<
  Exclude<Arm, "react">,
  () => VDOMSnapshotRoot<Node, Node> | null
> = {
  rebuild: () => rebuildRoot,
  delta: () => deltaRoot,
};

const mountArms = (seed: number) => {
  const mountMs: Record<Arm, number> = { react: 0, rebuild: 0, delta: 0 };
  const order = shuffle([...arms], makeRandom(seed ^ 0x4d4f554e));
  for (const arm of order) {
    const started = performance.now();
    if (arm === "react") {
      reactRoot = createRoot(containers.react);
      reactIds.value = makeIds();
      flushSync(() => reactRoot!.render(reactTree(reactIds.value)));
    } else {
      const strategy: VDOMKeyIndexMaintenance = arm;
      const root = new VDOMSnapshotRoot(
        new DOMVDOMHost(),
        containers[arm],
        undefined,
        undefined,
        strategy,
      );
      root.commit(vdomTree(makeIds()));
      if (arm === "rebuild") rebuildRoot = root;
      else deltaRoot = root;
    }
    mountMs[arm] = performance.now() - started;
  }
  return mountMs;
};

const runScenario = async (
  operation: Operation,
  seed: number,
): Promise<Scenario> => {
  const mountMs = mountArms(seed ^ operation.length);
  let expectedIds = makeIds();
  const retired: Record<Arm, Map<string, HTMLElement>> = {
    react: new Map(),
    rebuild: new Map(),
    delta: new Map(),
  };
  const random = makeRandom((seed ^ operation.length ^ 0x50414952) >>> 0);
  const orders = makeOrders((seed ^ operation.length) >>> 0);
  const shuffledOrders = shuffle(orders, random);
  const samples: Sample[] = [];
  let outputParity = true;
  let stableIdentity = true;
  let filterStep = 0;

  for (const [updateIndex, { pair, order }] of shuffledOrders.entries()) {
    const direction: Direction = operation === "filter"
      ? (expectedIds.length > count / 2 ? "shrink" : "restore")
      : operation;
    const nextIds = applyOperation(
      expectedIds,
      operation,
      `${operation}-${pair}`,
    );
    if (operation === "filter") filterStep++;
    const nextSet = new Set(nextIds);
    const milliseconds: Record<Arm, number> = {
      react: 0,
      rebuild: 0,
      delta: 0,
    };
    const identity: Record<Arm, boolean> = {
      react: true,
      rebuild: true,
      delta: true,
    };

    for (const arm of order) {
      const container = containers[arm];
      const before = nodesById(container);
      const started = performance.now();
      if (arm === "react") {
        reactIds.value = nextIds;
        flushSync(() => reactRoot!.render(reactTree(reactIds.value)));
      } else {
        const root = runtimeRoots[arm]();
        if (!root) throw new Error(`${arm} root missing before update`);
        assert(
          root.commitKeyedRegion("list", vdomTree(nextIds)),
          `${arm} root declined keyed list update`,
        );
      }
      milliseconds[arm] = performance.now() - started;
      const after = nodesById(container);
      identity[arm] &&=
        JSON.stringify(readIds(container)) === JSON.stringify(nextIds);
      for (const [id, oldNode] of before) {
        if (nextSet.has(id)) identity[arm] &&= after.get(id) === oldNode;
        else {
          identity[arm] &&= !oldNode.isConnected;
          retired[arm].set(id, oldNode);
        }
      }
      for (const [id, newNode] of after) {
        if (!before.has(id) && retired[arm].has(id)) {
          identity[arm] &&= retired[arm].get(id) !== newNode;
        }
      }
    }
    const signatures = arms.map((arm) => signature(containers[arm]));
    const pairParity = signatures.every((value) => value === signatures[0]);
    const pairIdentity = arms.every((arm) => identity[arm]);
    outputParity &&= pairParity;
    stableIdentity &&= pairIdentity;
    if (updateIndex >= warmupPairs) {
      samples.push({
        pair: updateIndex - warmupPairs,
        direction,
        order,
        milliseconds,
        outputParity: pairParity,
        identity,
      });
    }
    assert(pairParity, `${operation} pair ${pair}: output mismatch`);
    assert(pairIdentity, `${operation} pair ${pair}: host identity mismatch`);
    expectedIds = nextIds;
  }
  if (operation === "filter") {
    assert(
      filterStep === warmupPairs + measuredPairs,
      "Filter sample count mismatch",
    );
    assert(
      samples.filter((sample) => sample.direction === "shrink").length === 12,
      "Measured shrink direction is unbalanced",
    );
    assert(
      samples.filter((sample) => sample.direction === "restore").length === 12,
      "Measured restore direction is unbalanced",
    );
  }

  const teardownMs: Record<Arm, number> = { react: 0, rebuild: 0, delta: 0 };
  const teardownOrder = shuffle([...arms], makeRandom(seed ^ 0x54454152));
  for (const arm of teardownOrder) {
    const started = performance.now();
    if (arm === "react") {
      flushSync(() => reactRoot!.unmount());
      reactRoot = null;
    } else {
      runtimeRoots[arm]()!.dispose();
      if (arm === "rebuild") rebuildRoot = null;
      else deltaRoot = null;
    }
    teardownMs[arm] = performance.now() - started;
  }
  const teardownEmpty = arms.every((arm) =>
    containers[arm].childElementCount === 0
  );
  return {
    operation,
    samples,
    updateMedianMs: Object.fromEntries(arms.map((arm) => [
      arm,
      percentile(samples.map((sample) => sample.milliseconds[arm]), 0.5),
    ])) as Record<Arm, number>,
    updateP95Ms: Object.fromEntries(arms.map((arm) => [
      arm,
      percentile(samples.map((sample) => sample.milliseconds[arm]), 0.95),
    ])) as Record<Arm, number>,
    mountMs,
    teardownMs,
    outputParity,
    stableIdentity,
    teardownEmpty,
  };
};

const run = async () => {
  runButton.disabled = true;
  try {
    const seed = seedNode.valueAsNumber >>> 0;
    assert(
      Number.isSafeInteger(seedNode.valueAsNumber) && seed > 0,
      "Seed must be a nonzero uint32",
    );
    statusNode.textContent = "Running paired 10,000-row updates…";
    const scenarios: Scenario[] = [];
    for (const [index, operation] of operations.entries()) {
      statusNode.textContent = `Running ${operation} (${
        index + 1
      }/${operations.length})…`;
      scenarios.push(await runScenario(operation, seed));
    }
    const passed = scenarios.every((scenario) =>
      scenario.samples.length === measuredPairs && scenario.outputParity &&
      scenario.stableIdentity && scenario.teardownEmpty
    );
    const record: RecordResult = {
      schemaVersion: "key-index-maintenance-browser-v1",
      status: passed ? "PASS" : "FAIL",
      collectedAt: new Date().toISOString(),
      seed,
      count,
      warmupPairs,
      measuredPairs,
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency ?? null,
        devicePixelRatio,
        visibilityState: document.visibilityState,
        viewport: { width: innerWidth, height: innerHeight },
      },
      arms: {
        react:
          "React 19 + Compiler; keyed li tree; flushSync render and unmount.",
        rebuild:
          "Same VDOMSnapshotRoot and keyed region reconciler; remove prior keyed-subtree entries and walk the updated subtree to restore index entries after every partial commit.",
        delta:
          "Same VDOMSnapshotRoot and keyed region reconciler; maintain global key index from subtree attach/detach events.",
      },
      scenarios,
      limitations: [
        "One page contains 24 paired measured updates per operation; the browser page load is the replication unit.",
        "The React arm is contextual; the rebuild-vs-delta runtime arms isolate key-index maintenance within the same VDOM implementation.",
        "No component-local state, layout, paint, or display-presentation measurement; list rows are keyed leaf hosts.",
        "Mount and teardown are single per-operation timings per page and should be summarized across page replications, not treated as stable per-call distributions.",
      ],
    };
    recordNode.textContent = JSON.stringify(record, null, 2);
    statusNode.textContent = JSON.stringify(
      {
        status: record.status,
        scenarios: scenarios.map((scenario) => ({
          operation: scenario.operation,
          updateMedianMs: scenario.updateMedianMs,
          updateP95Ms: scenario.updateP95Ms,
          mountMs: scenario.mountMs,
          teardownMs: scenario.teardownMs,
        })),
      },
      null,
      2,
    );
    if (passed) {
      const response = await fetch("/__benchmark/save-key-index-maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      if (!response.ok) {
        throw new Error(
          `Archive failed: HTTP ${response.status} ${await response.text()}`,
        );
      }
      statusNode.textContent += `\nSaved: ${(await response.json()).filename}`;
    }
    (window as any).__keyIndexMaintenanceV1 = record;
  } catch (error) {
    statusNode.textContent = error instanceof Error
      ? error.stack ?? error.message
      : String(error);
  } finally {
    runButton.disabled = false;
  }
};

runButton.addEventListener("click", () => void run());
const params = new URLSearchParams(location.search);
if (params.get("autorun") === "1") {
  const seed = Number(params.get("seed"));
  if (Number.isSafeInteger(seed) && seed > 0 && seed <= 0xffff_ffff) {
    seedNode.value = String(seed);
    setTimeout(() => void run(), 0);
  }
}
