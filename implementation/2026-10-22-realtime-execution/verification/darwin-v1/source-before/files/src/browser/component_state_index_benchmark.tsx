import { createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { ComponentStateRoot } from "../component_state_runtime.ts";
import { jsx } from "../jsx_binding_runtime.ts";
import {
  DOMVDOMHost,
  type VDOMKeyIndexMaintenance,
} from "../vdom_snapshot_runtime.ts";
import { componentStateSitesPlan } from "./generated_component_state_structural.ts";
import { StructuralApp } from "./generated_component_state_structural_transform.tsx";

type Operation = "rotate" | "replace-edge" | "filter-half";
type Arm = "react" | "rebuild" | "delta";
type Sample = {
  pair: number;
  order: Arm[];
  direction: "shrink" | "restore" | null;
  milliseconds: Record<Arm, number>;
  outputParity: boolean;
  identity: Record<Arm, boolean>;
  retainedState: Record<Arm, boolean>;
};
type Scenario = {
  operation: Operation;
  samples: Sample[];
  medianMs: Record<Arm, number>;
  p95Ms: Record<Arm, number>;
  mountMs: Record<Arm, number>;
  teardownMs: Record<Arm, number>;
  outputParity: boolean;
  identity: boolean;
  retainedState: boolean;
};
type RecordResult = {
  schemaVersion: "component-state-structural-index-browser-v1";
  status: "PASS" | "FAIL";
  collectedAt: string;
  seed: number;
  count: number;
  warmupPairs: number;
  measuredPairs: number;
  browser: {
    userAgent: string;
    platform: string;
    hardwareConcurrency: number;
    devicePixelRatio: number;
    visibilityState: DocumentVisibilityState;
  };
  reactBaseline: string;
  causalContrast: string;
  scenarios: Scenario[];
  archiveFile: string | null;
  limitations: string[];
};

const countNode = document.querySelector<HTMLSelectElement>("#count")!;
const seedNode = document.querySelector<HTMLInputElement>("#seed")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export")!;
const resultNode = document.querySelector<HTMLElement>("#result")!;
const recordNode = document.querySelector<HTMLElement>("#record")!;
const fields: Record<Arm, HTMLElement> = {
  react: document.querySelector<HTMLElement>("#react-root")!,
  rebuild: document.querySelector<HTMLElement>("#rebuild-root")!,
  delta: document.querySelector<HTMLElement>("#delta-root")!,
};
const arms: Arm[] = ["react", "rebuild", "delta"];
const keyedModes: Record<Exclude<Arm, "react">, VDOMKeyIndexMaintenance> = {
  rebuild: "rebuild",
  delta: "delta",
};
const warmupPairs = 8;
const measuredPairs = 24;
const operations: Operation[] = ["rotate", "replace-edge", "filter-half"];
let activeOperation: Operation = "rotate";
let activeToken = "";
let reactRoot: Root | null = null;
let keyedRoots: Partial<
  Record<Exclude<Arm, "react">, ComponentStateRoot<Node, Node>>
> = {};
let latest: RecordResult | null = null;

const makeIds = (count: number) =>
  Array.from({ length: count }, (_, id) => `row-${id}`);
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
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.max(0, Math.ceil(p * ordered.length) - 1)];
};
const applyOperation = (
  ids: readonly string[],
  operation: Operation,
  token: string,
  count: number,
): string[] => {
  if (operation === "rotate") {
    return ids.length > 1 ? [...ids.slice(1), ids[0]] : [...ids];
  }
  if (operation === "replace-edge") {
    return [`new-${token}`, ...ids.slice(0, -1)];
  }
  return ids.length > count / 2
    ? ids.filter((id) => id.startsWith("row-") && Number(id.slice(4)) % 2 === 0)
    : makeIds(count);
};

function ReactApp({ initialIds }: { initialIds: string[] }) {
  const [ids, setIds] = useState(initialIds);
  return createElement(
    "section",
    { "data-app": "structural" },
    createElement("button", {
      "data-action": "toggle-structure",
      onClick: () =>
        setIds((previous) =>
          applyOperation(
            previous,
            activeOperation,
            activeToken,
            initialIds.length,
          )
        ),
    }, "Apply structural update"),
    createElement(
      "ul",
      { "data-list": "rows" },
      ...ids.map((id) => createElement(ReactRow, { key: id, id })),
    ),
  );
}

function ReactRow({ id }: { id: string }) {
  const [selected, setSelected] = useState(false);
  return createElement("li", {
    "data-id": id,
    "data-selected": String(selected),
    onClick: () => setSelected((previous) => !previous),
  }, id);
}

const nodesById = (container: HTMLElement) =>
  new Map(
    [...container.querySelectorAll<HTMLElement>("li[data-id]")].map((
      node,
    ) => [node.dataset.id!, node]),
  );
const signature = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>("li[data-id]")]
    .map((node) =>
      `${node.dataset.id}:${node.dataset.selected}:${node.textContent}`
    )
    .join("\n");
const readIds = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>("li[data-id]")]
    .map((node) => node.dataset.id!);
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const settleRuntime = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve));
const button = (arm: Arm) =>
  fields[arm].querySelector<HTMLButtonElement>(
    "[data-action='toggle-structure']",
  )!;
const unmountAll = () => {
  if (reactRoot) flushSync(() => reactRoot!.unmount());
  reactRoot = null;
  keyedRoots.rebuild?.dispose();
  keyedRoots.delta?.dispose();
  keyedRoots = {};
  for (const field of Object.values(fields)) field.replaceChildren();
};

const mountScenario = async (count: number) => {
  unmountAll();
  const initialIds = makeIds(count);
  const mountMs: Record<Arm, number> = { react: 0, rebuild: 0, delta: 0 };
  let started = performance.now();
  reactRoot = createRoot(fields.react);
  flushSync(() => reactRoot!.render(createElement(ReactApp, { initialIds })));
  mountMs.react = performance.now() - started;
  const applyNext = (previous: string[]) =>
    applyOperation(previous, activeOperation, activeToken, count);
  for (const arm of ["rebuild", "delta"] as const) {
    started = performance.now();
    keyedRoots[arm] = new ComponentStateRoot(
      new DOMVDOMHost(),
      fields[arm],
      {
        invalidationPlan: componentStateSitesPlan.invalidation_graph,
        keyIndexMaintenance: keyedModes[arm],
      },
    );
    keyedRoots[arm]!.mount(jsx(StructuralApp, { initialIds, applyNext }));
    mountMs[arm] = performance.now() - started;
  }
  for (const arm of arms) {
    fields[arm].querySelector<HTMLElement>('[data-id="row-0"]')!.click();
  }
  await settleRuntime();
  return { initialIds, mountMs };
};

const runScenario = async (
  operation: Operation,
  count: number,
  seed: number,
): Promise<Scenario> => {
  const { initialIds, mountMs } = await mountScenario(count);
  let expectedIds = initialIds;
  const retired: Record<Arm, Map<string, HTMLElement>> = {
    react: new Map(),
    rebuild: new Map(),
    delta: new Map(),
  };
  const random = makeRandom((seed ^ operation.length) >>> 0);
  const permutations = [
    ["react", "rebuild", "delta"],
    ["react", "delta", "rebuild"],
    ["rebuild", "react", "delta"],
    ["rebuild", "delta", "react"],
    ["delta", "react", "rebuild"],
    ["delta", "rebuild", "react"],
  ] as Arm[][];
  const warmupSchedule = shuffle(
    Array.from({ length: warmupPairs }, (_, pair) => ({
      pair,
      order: [...permutations[pair % permutations.length]],
    })),
    random,
  );
  const measuredSchedule = shuffle(
    Array.from({ length: measuredPairs }, (_, index) => {
      const pair = warmupPairs + index;
      return {
        pair,
        order: [...permutations[index % permutations.length]],
      };
    }),
    random,
  );
  const orders = [...warmupSchedule, ...measuredSchedule];
  const samples: Sample[] = [];
  let allOutputParity = true;
  let allIdentity = true;
  let allRetainedState = true;
  for (const { pair, order } of orders) {
    activeOperation = operation;
    activeToken = `${operation}-${pair}`;
    const direction = operation === "filter-half"
      ? expectedIds.length > count / 2 ? "shrink" : "restore"
      : null;
    const nextIds = applyOperation(expectedIds, operation, activeToken, count);
    const nextSet = new Set(nextIds);
    const milliseconds: Record<Arm, number> = {
      react: 0,
      rebuild: 0,
      delta: 0,
    };
    const identities: Record<Arm, boolean> = {
      react: true,
      rebuild: true,
      delta: true,
    };
    const states: Record<Arm, boolean> = {
      react: true,
      rebuild: true,
      delta: true,
    };
    for (const arm of order) {
      const field = fields[arm];
      const before = nodesById(field);
      const started = performance.now();
      if (arm === "react") flushSync(() => button(arm).click());
      else {
        button(arm).click();
        await settleRuntime();
      }
      milliseconds[arm] = performance.now() - started;
      const after = nodesById(field);
      if (JSON.stringify(readIds(field)) !== JSON.stringify(nextIds)) {
        throw new Error(
          `${operation} pair ${pair}: ${arm} list order/membership diverged`,
        );
      }
      for (const [id, oldNode] of before) {
        if (nextSet.has(id)) identities[arm] &&= after.get(id) === oldNode;
        else {
          identities[arm] &&= !oldNode.isConnected;
          retired[arm].set(id, oldNode);
        }
      }
      for (const [id, newNode] of after) {
        if (!before.has(id) && retired[arm].has(id)) {
          identities[arm] &&= retired[arm].get(id) !== newNode;
        }
      }
      const sentinel = after.get("row-0");
      states[arm] &&= !!sentinel && sentinel.dataset.selected === "true" &&
        sentinel.textContent === "row-0";
      if (operation === "filter-half" && nextIds.length === count && pair > 0) {
        const reinserted = after.get("row-1");
        states[arm] &&= !!reinserted && reinserted.dataset.selected === "false";
      }
    }
    const signatures = arms.map((arm) => signature(fields[arm]));
    const outputParity = signatures.every((value) => value === signatures[0]);
    allOutputParity &&= outputParity;
    allIdentity &&= arms.every((arm) => identities[arm]);
    allRetainedState &&= arms.every((arm) => states[arm]);
    const sample: Sample = {
      pair,
      order,
      direction,
      milliseconds,
      outputParity,
      identity: identities,
      retainedState: states,
    };
    if (pair >= warmupPairs) {
      samples.push({ ...sample, pair: pair - warmupPairs });
    }
    assert(outputParity, `${operation} pair ${pair}: arm output mismatch`);
    assert(
      arms.every((arm) => identities[arm]),
      `${operation} pair ${pair}: keyed identity failed`,
    );
    assert(
      arms.every((arm) => states[arm]),
      `${operation} pair ${pair}: retained/reinserted state failed`,
    );
    expectedIds = nextIds;
  }
  const teardownMs: Record<Arm, number> = { react: 0, rebuild: 0, delta: 0 };
  for (const arm of arms) {
    const started = performance.now();
    if (arm === "react") {
      if (reactRoot) flushSync(() => reactRoot!.unmount());
      reactRoot = null;
    } else {
      keyedRoots[arm]?.dispose();
      delete keyedRoots[arm];
    }
    fields[arm].replaceChildren();
    teardownMs[arm] = performance.now() - started;
  }
  const medianMs = Object.fromEntries(arms.map((arm) => [
    arm,
    percentile(samples.map((sample) => sample.milliseconds[arm]), 0.5),
  ])) as Record<Arm, number>;
  const p95Ms = Object.fromEntries(arms.map((arm) => [
    arm,
    percentile(samples.map((sample) => sample.milliseconds[arm]), 0.95),
  ])) as Record<Arm, number>;
  return {
    operation,
    samples,
    medianMs,
    p95Ms,
    mountMs,
    teardownMs,
    outputParity: allOutputParity,
    identity: allIdentity,
    retainedState: allRetainedState,
  };
};

const run = async () => {
  runButton.disabled = true;
  exportButton.disabled = true;
  resultNode.className = "";
  resultNode.textContent = "Mounting 10,000-row structural scenarios…";
  try {
    const count = Number(countNode.value);
    const seed = Number(seedNode.value) >>> 0;
    if (
      count !== 10_000 || seed === 0 ||
      !Number.isSafeInteger(seedNode.valueAsNumber)
    ) {
      throw new RangeError("Use 10,000 leaves and a nonzero uint32 seed");
    }
    const scenarios: Scenario[] = [];
    for (const operation of operations) {
      resultNode.textContent = `Running ${operation}…`;
      scenarios.push(await runScenario(operation, count, seed));
    }
    const status = scenarios.every((scenario) =>
        scenario.outputParity && scenario.identity && scenario.retainedState
      )
      ? "PASS"
      : "FAIL";
    latest = {
      schemaVersion: "component-state-structural-index-browser-v1",
      status,
      collectedAt: new Date().toISOString(),
      seed,
      count,
      warmupPairs,
      measuredPairs,
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
        devicePixelRatio: window.devicePixelRatio,
        visibilityState: document.visibilityState,
      },
      reactBaseline:
        "React 19.3 + React Compiler; keyed row components own independent useState values; parent state changes list structure.",
      causalContrast:
        "The rebuild and delta arms use the same OXC-lowered component-state runtime and differ only in VDOM keyed-index maintenance. React is contextual.",
      scenarios,
      archiveFile: null,
      limitations: [
        "One Chrome profile/device, visible page, synchronous DOM commit; layout, paint, and display presentation are excluded.",
        "Mount and teardown are single observations per arm and scenario; update pairs are nested within each fresh page.",
        "This isolates keyed-index algorithm effects in a stateful owner workload but does not represent a complete application.",
      ],
    };
    recordNode.textContent = JSON.stringify(latest, null, 2);
    resultNode.className = status === "PASS" ? "pass" : "fail";
    resultNode.textContent = JSON.stringify(
      {
        status,
        scenarios: scenarios.map((
          { operation, medianMs, p95Ms, mountMs, teardownMs },
        ) => ({ operation, medianMs, p95Ms, mountMs, teardownMs })),
      },
      null,
      2,
    );
    exportButton.disabled = false;
    if (status === "PASS") {
      const response = await fetch(
        "/__benchmark/save-component-state-index-v1",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(latest),
        },
      );
      if (response.ok) {
        latest.archiveFile = (await response.json()).filename ?? null;
      } else {
        latest.archiveFile =
          `archive failed: HTTP ${response.status} ${await response.text()}`;
      }
      resultNode.textContent += `\nArchive: ${latest.archiveFile ?? "saved"}`;
      recordNode.textContent = JSON.stringify(latest, null, 2);
    }
  } finally {
    runButton.disabled = false;
  }
};

const exportRecord = () => {
  if (!latest) return;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(latest, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `component-state-structural-index-${latest.seed}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
runButton.addEventListener("click", () =>
  void run().catch((error) => {
    resultNode.className = "fail";
    resultNode.textContent = error instanceof Error
      ? error.stack ?? error.message
      : String(error);
    runButton.disabled = false;
  }));
exportButton.addEventListener("click", exportRecord);
const params = new URLSearchParams(location.search);
const autoSeed = Number(params.get("seed"));
if (
  params.get("autorun") === "1" && Number.isSafeInteger(autoSeed) &&
  autoSeed > 0
) {
  seedNode.value = String(autoSeed);
  setTimeout(() => runButton.click(), 0);
}
