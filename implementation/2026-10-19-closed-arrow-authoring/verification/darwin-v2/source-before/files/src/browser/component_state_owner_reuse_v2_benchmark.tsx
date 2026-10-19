import { createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { ComponentStateRoot } from "../component_state_runtime.ts";
import { createKeyedOwnerVersion, jsx } from "../jsx_binding_runtime.ts";
import { DOMVDOMHost } from "../vdom_snapshot_runtime.ts";
import { componentStateSitesPlan } from "./generated_component_state_structural.ts";
import { StructuralApp } from "./generated_component_state_structural_transform.tsx";

type Arm = "react" | "generic" | "reuse" | "token";
type Operation = "rotate" | "replace-edge" | "filter-half";
type Direction = "shrink" | "restore" | null;
type Counters = Record<string, number>;
type Sample = {
  pair: number;
  order: Arm[];
  direction: Direction;
  milliseconds: Record<Arm, number>;
  outputParity: boolean;
  identity: Record<Arm, boolean>;
  retainedState: Record<Arm, boolean>;
  diagnosticCounters?: Partial<Record<Arm, Counters>>;
};
type Scenario = {
  operation: Operation;
  samples: Sample[];
  pageMedianMs: Record<Arm, number>;
  pageP95Ms: Record<Arm, number>;
  pairedDifferenceMedianMs: { genericMinusReuse: number; genericMinusToken: number };
  pairedRatioMedian: { reuseOverGeneric: number; tokenOverGeneric: number; tokenOverReact: number };
  mountMs: Record<Arm, number>;
  teardownMs: Record<Arm, number>;
  outputParity: boolean;
  identity: boolean;
  retainedState: boolean;
  mechanismPass: boolean | null;
};
type RecordResult = {
  schemaVersion: "component-state-owner-reuse-browser-v2";
  status: "PASS" | "FAIL";
  mode: "latency" | "diagnostic";
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
  arms: string[];
  runtimeOptions: Record<string, unknown>;
  scenarios: Scenario[];
  archiveFile: string | null;
  limitations: string[];
};

const ARMS: Arm[] = ["react", "generic", "reuse", "token"];
const COUNT = 10_000;
const WARMUPS = 8;
const MEASURED = 24;
const OPERATIONS: Operation[] = ["rotate", "replace-edge", "filter-half"];
const params = new URLSearchParams(location.search);
const diagnosticMode = params.get("diagnostics") === "1";
let activeOperation: Operation = "rotate";
let activeToken = "";
let activeArm: Arm = "react";
let captureCounters = false;
let currentCounters: Counters | null = null;
let latest: RecordResult | null = null;

const seedNode = document.querySelector<HTMLInputElement>("#seed")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export")!;
const resultNode = document.querySelector<HTMLElement>("#result")!;
const recordNode = document.querySelector<HTMLElement>("#record")!;
const fields: Record<Arm, HTMLElement> = {
  react: document.querySelector<HTMLElement>("#react-root")!,
  generic: document.querySelector<HTMLElement>("#generic-root")!,
  reuse: document.querySelector<HTMLElement>("#reuse-root")!,
  token: document.querySelector<HTMLElement>("#token-root")!,
};

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
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const center = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[center]
    : (sorted[center - 1] + sorted[center]) / 2;
};
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const permutations = <T,>(values: T[]): T[][] => {
  if (values.length <= 1) return [values];
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map(
      (tail) => [value, ...tail],
    )
  );
};
const stableMeasuredOrders = (seed: number, operation: Operation) => {
  const random = makeRandom((seed ^ operation.length ^ 0x4f1bbcdc) >>> 0);
  const all = permutations(ARMS);
  const measured = shuffle(all.map((order) => ({ order, direction: null as Direction })), random);
  const warmupDirections: Direction[] = operation === "filter-half"
    ? ["shrink", "restore", "shrink", "restore", "shrink", "restore", "shrink", "restore"]
    : Array.from({ length: WARMUPS }, () => null);
  const warmups = warmupDirections.map((direction) => ({
    order: shuffle([...ARMS], random),
    direction,
  }));
  return [
    ...warmups,
    ...measured.map((entry, index) => ({
      order: entry.order,
      direction: operation === "filter-half"
        ? index % 2 === 0 ? "shrink" as const : "restore" as const
        : null,
    })),
  ];
};

const applyOperation = (
  ids: readonly string[],
  operation: Operation,
  token: string,
  direction: Direction,
) => {
  if (operation === "rotate") {
    return ids.length > 1 ? [...ids.slice(1), ids[0]] : [...ids];
  }
  if (operation === "replace-edge") {
    return [...ids.slice(0, -1), `new-${token}`];
  }
  if (direction === "shrink") {
    return ids.filter((id) => id.startsWith("row-") && Number(id.slice(4)) % 2 === 0);
  }
  if (direction === "restore") return makeIds(COUNT);
  throw new Error("Filter operation needs an explicit direction");
};

function ReactApp({ initialIds, initialVersion }: {
  initialIds: string[];
  initialVersion: ReturnType<typeof createKeyedOwnerVersion>;
}) {
  const [sequence, setSequence] = useState({ ids: initialIds, version: initialVersion });
  return createElement(
    "section",
    { "data-app": "structural" },
    createElement("button", {
      "data-action": "toggle-structure",
      onClick: () =>
        setSequence((previous) => ({
          ids: applyOperation(
            previous.ids,
            activeOperation,
            activeToken,
            activeOperation === "filter-half"
              ? previous.ids.length > COUNT / 2 ? "shrink" : "restore"
              : null,
          ),
          version: activeOperation === "rotate" ? previous.version : createKeyedOwnerVersion(),
        })),
    }, "Apply structural update"),
    createElement(
      "ul",
      { "data-list": "rows" },
      ...sequence.ids.map((id) => createElement(ReactRow, { key: id, id })),
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

const settleRuntime = () => new Promise<void>((resolve) => queueMicrotask(resolve));
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
    `${node.dataset.id}:${node.dataset.selected}:${node.textContent}`
  ).join("\n");
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

type MountedArm = {
  reactRoot?: Root;
  runtimeRoot?: ComponentStateRoot<Node, Node>;
  mountMs: number;
};
const mounted = new Map<Arm, MountedArm>();
const mountAll = async (
  count: number,
  initialVersion: ReturnType<typeof createKeyedOwnerVersion>,
): Promise<Record<Arm, number>> => {
  for (const arm of ARMS) {
    const old = mounted.get(arm);
    if (old?.reactRoot) flushSync(() => old.reactRoot!.unmount());
    old?.runtimeRoot?.dispose();
    fields[arm].replaceChildren();
  }
  mounted.clear();
  const initialIds = makeIds(count);
  const mountTimes = {} as Record<Arm, number>;
  for (const arm of ARMS) {
    const started = performance.now();
    if (arm === "react") {
      const reactRoot = createRoot(fields.react);
      flushSync(() => reactRoot.render(createElement(ReactApp, { initialIds, initialVersion })));
      mounted.set(arm, { reactRoot, mountMs: performance.now() - started });
    } else {
      const runtimeRoot = new ComponentStateRoot(
        new DOMVDOMHost(),
        fields[arm],
        {
          invalidationPlan: componentStateSitesPlan.invalidation_graph,
          keyedOwnerReuse: arm === "reuse" || arm === "token",
          keyedOwnerReuseMode: arm === "token" ? "token" : undefined,
          profileCounter: diagnosticMode
            ? (counts) => {
              if (!captureCounters || !currentCounters || activeArm !== arm) return;
              for (const [name, value] of Object.entries(counts)) {
                currentCounters[name] = (currentCounters[name] ?? 0) + value;
              }
            }
            : undefined,
        },
      );
      const applyNext = (
        previous: string[],
        previousVersion?: ReturnType<typeof createKeyedOwnerVersion>,
      ) => ({
        ids: applyOperation(
          previous,
          activeOperation,
          activeToken,
          activeOperation === "filter-half"
            ? previous.length > count / 2 ? "shrink" : "restore"
            : null,
        ),
        version: activeOperation === "rotate"
          ? previousVersion
          : createKeyedOwnerVersion(),
      });
      runtimeRoot.mount(jsx(StructuralApp, { initialIds, applyNext, initialVersion }));
      mounted.set(arm, { runtimeRoot, mountMs: performance.now() - started });
    }
    mountTimes[arm] = mounted.get(arm)!.mountMs;
  }
  // Seed one keyed state value identically before timing any list changes.
  for (const arm of ARMS) {
    const selected = fields[arm].querySelector<HTMLElement>('[data-id="row-0"]')!;
    if (arm === "react") flushSync(() => selected.click());
    else {
      selected.click();
      await settleRuntime();
    }
  }
  return mountTimes;
};

const teardownAll = () => {
  const times = {} as Record<Arm, number>;
  for (const arm of ARMS) {
    const entry = mounted.get(arm)!;
    const started = performance.now();
    if (entry.reactRoot) flushSync(() => entry.reactRoot!.unmount());
    entry.runtimeRoot?.dispose();
    fields[arm].replaceChildren();
    times[arm] = performance.now() - started;
  }
  mounted.clear();
  return times;
};

const runScenario = async (operation: Operation, seed: number): Promise<Scenario> => {
  const currentVersion = createKeyedOwnerVersion();
  const mountMs = await mountAll(COUNT, currentVersion);
  let expectedIds = makeIds(COUNT);
  const retired: Record<Arm, Map<string, HTMLElement>> = {
    react: new Map(),
    generic: new Map(),
    reuse: new Map(),
    token: new Map(),
  };
  const orders = stableMeasuredOrders(seed, operation);
  const samples: Sample[] = [];
  let allOutputParity = true;
  let allIdentity = true;
  let allRetainedState = true;

  for (const [index, { order, direction }] of orders.entries()) {
    const measured = index >= WARMUPS;
    const pair = measured ? index - WARMUPS : index;
    activeOperation = operation;
    activeToken = `${operation}-${seed}-${index}`;
    const nextIds = applyOperation(expectedIds, operation, activeToken, direction);
    const nextSet = new Set(nextIds);
    const milliseconds = { react: 0, generic: 0, reuse: 0, token: 0 };
    const identity = { react: true, generic: true, reuse: true, token: true };
    const retainedState = { react: true, generic: true, reuse: true, token: true };
    const sampleCounters: Partial<Record<Arm, Counters>> = {};

    for (const arm of order) {
      const field = fields[arm];
      const before = nodesById(field);
      const button = field.querySelector<HTMLButtonElement>("[data-action='toggle-structure']")!;
      const started = performance.now();
      activeArm = arm;
      currentCounters = diagnosticMode && measured && arm !== "react" ? {} : null;
      captureCounters = currentCounters !== null;
      if (arm === "react") flushSync(() => button.click());
      else {
        button.click();
        await settleRuntime();
      }
      captureCounters = false;
      milliseconds[arm] = performance.now() - started;
      if (currentCounters) sampleCounters[arm] = currentCounters;
      currentCounters = null;

      const after = nodesById(field);
      if (JSON.stringify(readIds(field)) !== JSON.stringify(nextIds)) {
        throw new Error(`${operation} pair ${pair} ${arm}: order or membership diverged`);
      }
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
      const sentinel = after.get("row-0");
      retainedState[arm] = !!sentinel &&
        sentinel.dataset.selected === "true" && sentinel.textContent === "row-0";
      if (operation === "filter-half" && direction === "restore") {
        const reinserted = after.get("row-1");
        retainedState[arm] &&= !!reinserted &&
          reinserted.dataset.selected === "false";
      }
    }
    const outputParity = signature(fields.react) === signature(fields.generic) &&
      signature(fields.generic) === signature(fields.reuse) &&
      signature(fields.reuse) === signature(fields.token);
    allOutputParity &&= outputParity;
    allIdentity &&= identity.react && identity.generic && identity.reuse && identity.token;
    allRetainedState &&= retainedState.react && retainedState.generic &&
      retainedState.reuse && retainedState.token;
    const sample: Sample = {
      pair,
      order,
      direction,
      milliseconds,
      outputParity,
      identity,
      retainedState,
      ...(diagnosticMode ? { diagnosticCounters: sampleCounters } : {}),
    };
    if (measured) samples.push(sample);
    assert(outputParity, `${operation} pair ${pair}: output parity failed`);
    assert(
      identity.react && identity.generic && identity.reuse && identity.token,
      `${operation} pair ${pair}: retained keyed host identity failed`,
    );
    assert(
      retainedState.react && retainedState.generic && retainedState.reuse && retainedState.token,
      `${operation} pair ${pair}: keyed state or reinserted-state contract failed`,
    );
    expectedIds = nextIds;
  }
  const teardownMs = teardownAll();
  const pageMedianMs = Object.fromEntries(ARMS.map((arm) => [
    arm,
    median(samples.map((sample) => sample.milliseconds[arm])),
  ])) as Record<Arm, number>;
  const pageP95Ms = Object.fromEntries(ARMS.map((arm) => [
    arm,
    percentile(samples.map((sample) => sample.milliseconds[arm]), 0.95),
  ])) as Record<Arm, number>;
  const pairedDifferenceMedianMs = {
    genericMinusReuse: median(samples.map((sample) =>
      sample.milliseconds.generic - sample.milliseconds.reuse
    )),
    genericMinusToken: median(samples.map((sample) =>
      sample.milliseconds.generic - sample.milliseconds.token
    )),
  };
  const pairedRatioMedian = {
    reuseOverGeneric: median(samples.map((sample) =>
      sample.milliseconds.reuse / Math.max(sample.milliseconds.generic, 0.001)
    )),
    tokenOverGeneric: median(samples.map((sample) =>
      sample.milliseconds.token / Math.max(sample.milliseconds.generic, 0.001)
    )),
    tokenOverReact: median(samples.map((sample) =>
      sample.milliseconds.token / Math.max(sample.milliseconds.react, 0.001)
    )),
  };
  const mechanismPass = diagnosticMode
    ? samples.every((sample) => {
      const counters = sample.diagnosticCounters?.token ?? {};
      const count = (name: string) => counters[name] ?? 0;
      if (operation === "rotate") {
        return count("owner.keyed-region.token-hits") === COUNT &&
          count("owner.keyed-region.token-output-reuses") === COUNT &&
          count("owner.keyed-region.token-mismatches") === 0 &&
          count("owner.keyed-region.eligibility-visits") === 0 &&
          count("owner.keyed-region.fallback") === 0;
      }
      return count("owner.keyed-region.token-mismatches") === 1 &&
        count("owner.keyed-region.token-eligibility-visits") === 0 &&
        count("owner.keyed-region.eligibility-visits") === 0;
    })
    : null;
  return {
    operation,
    samples,
    pageMedianMs,
    pageP95Ms,
    pairedDifferenceMedianMs,
    pairedRatioMedian,
    mountMs,
    teardownMs,
    outputParity: allOutputParity,
    identity: allIdentity,
    retainedState: allRetainedState,
    mechanismPass,
  };
};

const run = async () => {
  runButton.disabled = true;
  exportButton.disabled = true;
  resultNode.className = "";
  try {
    if (document.visibilityState !== "visible") {
      throw new Error("Open this page in a visible browser tab before collecting");
    }
    const seed = Number(seedNode.value) >>> 0;
    if (seed === 0 || !Number.isSafeInteger(seedNode.valueAsNumber)) {
      throw new RangeError("Use a nonzero uint32 seed");
    }
    const scenarios: Scenario[] = [];
    for (const operation of OPERATIONS) {
      resultNode.textContent = `Running ${operation} · ${diagnosticMode ? "diagnostic" : "latency"}…`;
      scenarios.push(await runScenario(operation, seed));
    }
    const status = scenarios.every((scenario) =>
      scenario.samples.length === MEASURED && scenario.outputParity &&
      scenario.identity && scenario.retainedState &&
      (!diagnosticMode || scenario.mechanismPass === true)
    ) ? "PASS" : "FAIL";
    latest = {
      schemaVersion: "component-state-owner-reuse-browser-v2",
      status,
      mode: diagnosticMode ? "diagnostic" : "latency",
      collectedAt: new Date().toISOString(),
      seed,
      count: COUNT,
      warmupPairs: WARMUPS,
      measuredPairs: MEASURED,
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
        devicePixelRatio: window.devicePixelRatio,
        visibilityState: document.visibilityState,
      },
      arms: ARMS,
      runtimeOptions: {
        generic: { keyedOwnerReuse: false, keyIndexMaintenance: "delta" },
        reuse: { keyedOwnerReuse: true, keyIndexMaintenance: "delta" },
        token: { keyedOwnerReuseMode: "token", keyIndexMaintenance: "delta" },
        react: "React 19.3 + React Compiler contextual arm",
      },
      scenarios,
      archiveFile: null,
      limitations: [
        "One Chrome profile and physical device; fresh page load is the replication unit.",
        "Update-to-host-commit omits layout, paint, and display presentation.",
        "The diagnostic mode includes counters and is excluded from latency claims.",
        "Effects and lifecycle parity are verified by the companion deterministic runtime contract tests; browser timing samples measure structural updates only.",
      ],
    };
    recordNode.textContent = JSON.stringify(latest, null, 2);
    resultNode.className = status === "PASS" ? "pass" : "fail";
    resultNode.textContent = JSON.stringify({
      status,
      mode: latest.mode,
      seed,
      scenarios: scenarios.map((scenario) => ({
        operation: scenario.operation,
        pageMedianMs: scenario.pageMedianMs,
        pairedRatioMedian: scenario.pairedRatioMedian,
        mountMs: scenario.mountMs,
        teardownMs: scenario.teardownMs,
        outputParity: scenario.outputParity,
        identity: scenario.identity,
        retainedState: scenario.retainedState,
        mechanismPass: scenario.mechanismPass,
        ...(diagnosticMode
          ? {
            tokenMechanism: Object.fromEntries(
              ["token-hits", "token-output-reuses", "token-mismatches", "fallback", "eligibility-visits", "token-eligibility-visits", "component-visits"].map((suffix) => [
                suffix,
                scenario.samples.reduce((sum, sample) =>
                  sum + (sample.diagnosticCounters?.token?.[`owner.keyed-region.${suffix}`] ??
                    sample.diagnosticCounters?.token?.[`owner.${suffix}`] ?? 0), 0),
              ]),
            ),
          }
          : {}),
      })),
    }, null, 2);
    const response = await fetch(
      "/__benchmark/save-component-state-owner-reuse-v2",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(latest),
      },
    );
    if (response.ok) {
      latest.archiveFile = (await response.json()).filename ?? null;
      recordNode.textContent = JSON.stringify(latest, null, 2);
    } else {
      latest.archiveFile = `archive failed: HTTP ${response.status} ${await response.text()}`;
      recordNode.textContent = JSON.stringify(latest, null, 2);
    }
    const summary = JSON.parse(resultNode.textContent);
    summary.archiveFile = latest.archiveFile;
    resultNode.textContent = JSON.stringify(summary, null, 2);
    exportButton.disabled = false;
    if (status !== "PASS") throw new Error("One or more scenario contracts failed; the complete record was archived");
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
  anchor.download = `component-state-owner-reuse-v2-${latest.mode}-${latest.seed}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
runButton.addEventListener("click", () =>
  void run().catch((error) => {
    resultNode.className = "fail";
    const message = error instanceof Error ? error.message : String(error);
    const summary = resultNode.textContent;
    resultNode.textContent = summary.startsWith("{")
      ? `${summary}\n\n${message}`
      : error instanceof Error ? error.stack ?? message : message;
    runButton.disabled = false;
  })
);
exportButton.addEventListener("click", exportRecord);
const autoSeed = Number(params.get("seed"));
if (
  params.get("autorun") === "1" && Number.isSafeInteger(autoSeed) && autoSeed > 0
) {
  seedNode.value = String(autoSeed);
  setTimeout(() => runButton.click(), 0);
}
