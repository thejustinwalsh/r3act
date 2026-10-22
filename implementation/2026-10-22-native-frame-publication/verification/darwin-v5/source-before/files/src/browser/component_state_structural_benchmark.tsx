import { createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { ComponentStateRoot } from "../component_state_runtime.ts";
import { jsx } from "../jsx_binding_runtime.ts";
import { DOMVDOMHost, type VDOMHost } from "../vdom_snapshot_runtime.ts";
import { componentStateSitesPlan } from "./generated_component_state_structural.ts";
import { StructuralApp } from "./generated_component_state_structural_transform.tsx";

type Operation = "rotate" | "replace-edge" | "filter-half";
type Arm = "react" | "runtime";
type Sample = {
  pair: number;
  order: readonly [Arm, Arm];
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
  outputParity: boolean;
  identity: boolean;
  retainedState: boolean;
};
type RecordResult = {
  schemaVersion: "component-state-structural-browser-v4";
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
  };
  reactBaseline: string;
  runtimeStrategy: string;
  scenarios: Scenario[];
  archiveFile: string | null;
  limitations: string[];
};
type PhaseSample = { pair: number; milliseconds: number };
type WorkCounts = Record<string, number>;

class StructuralCountingHost implements VDOMHost<Node, Node> {
  readonly delegate = new DOMVDOMHost();
  readonly counts: WorkCounts = {};
  active = false;

  reset() {
    for (const key of Object.keys(this.counts)) delete this.counts[key];
  }

  snapshot(): WorkCounts {
    return { ...this.counts };
  }

  createElement(tag: string) {
    this.#count("create-elements");
    return this.delegate.createElement(tag);
  }

  createText(text: string) {
    this.#count("create-text-nodes");
    return this.delegate.createText(text);
  }

  setText(node: Node, text: string) {
    this.#count("set-text");
    this.delegate.setText(node, text);
  }

  setProp(node: Node, name: string, value: unknown, previous: unknown) {
    this.#count("set-props");
    this.delegate.setProp(node, name, value, previous);
  }

  setStyleProp(node: Node, name: string, value: unknown) {
    this.#count("set-style-props");
    this.delegate.setStyleProp(node, name, value);
  }

  place(parent: Node, node: Node, before: Node | null) {
    const noOp = node.parentNode === parent &&
      (node.nextSibling === before ||
        (before === null && parent.lastChild === node));
    if (!noOp) {
      this.#count(node.parentNode === null ? "insertions" : "moves");
    }
    this.delegate.place(parent, node, before);
  }

  remove(parent: Node, node: Node) {
    if (node.parentNode === parent) this.#count("removals");
    this.delegate.remove(parent, node);
  }

  #count(name: string) {
    if (!this.active) return;
    this.counts[name] = (this.counts[name] ?? 0) + 1;
  }
}

const countNode = document.querySelector<HTMLSelectElement>("#count")!;
const seedNode = document.querySelector<HTMLInputElement>("#seed")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const exportButton = document.querySelector<HTMLButtonElement>("#export")!;
const resultNode = document.querySelector<HTMLElement>("#result")!;
const recordNode = document.querySelector<HTMLElement>("#record")!;
const reactField = document.querySelector<HTMLElement>("#react-root")!;
const runtimeField = document.querySelector<HTMLElement>("#runtime-root")!;
const warmupPairs = 8;
const measuredPairs = 24;
const operations: Operation[] = ["rotate", "replace-edge", "filter-half"];
const diagnosticsEnabled = new URLSearchParams(location.search).get(
  "diagnostics",
) === "1";
const phaseSamples = new Map<Operation, Map<string, PhaseSample[]>>();
const counterSamples = new Map<Operation, Map<number, WorkCounts>>();
let captureProfile = false;
let activeProfilePair = -1;
let latest: RecordResult | null = null;
let runtimeHostCounters: StructuralCountingHost | null = null;

const recordCounters = (counts: Readonly<Record<string, number>>) => {
  if (!captureProfile) return;
  let byPair = counterSamples.get(activeOperation);
  if (!byPair) counterSamples.set(activeOperation, byPair = new Map());
  let sample = byPair.get(activeProfilePair);
  if (!sample) byPair.set(activeProfilePair, sample = {});
  for (const [name, count] of Object.entries(counts)) {
    sample[name] = (sample[name] ?? 0) + count;
  }
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
const percentile = (values: number[], p: number) => {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.max(0, Math.ceil(p * ordered.length) - 1)];
};
const settleRuntime = () =>
  new Promise<void>((resolve) => queueMicrotask(resolve));

let activeOperation: Operation = "rotate";
let activeToken = "";
let reactRoot: Root | null = null;
let runtimeRoot: ComponentStateRoot<Node, Node> | null = null;

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
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const readIds = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>("li[data-id]")]
    .map((node) => node.dataset.id!);

const mountScenario = async (count: number) => {
  if (reactRoot) flushSync(() => reactRoot!.unmount());
  runtimeRoot?.dispose();
  reactField.replaceChildren();
  runtimeField.replaceChildren();
  const initialIds = makeIds(count);
  const reactStarted = performance.now();
  reactRoot = createRoot(reactField);
  flushSync(() => reactRoot!.render(createElement(ReactApp, { initialIds })));
  const reactMountMs = performance.now() - reactStarted;
  const runtimeStarted = performance.now();
  runtimeHostCounters = diagnosticsEnabled
    ? new StructuralCountingHost()
    : null;
  const runtimeHost: VDOMHost<Node, Node> = runtimeHostCounters ??
    new DOMVDOMHost();
  runtimeRoot = new ComponentStateRoot(runtimeHost, runtimeField, {
    invalidationPlan: componentStateSitesPlan.invalidation_graph,
    profile: diagnosticsEnabled
      ? (phase, milliseconds) => {
        if (!captureProfile) return;
        let phases = phaseSamples.get(activeOperation);
        if (!phases) phaseSamples.set(activeOperation, phases = new Map());
        let values = phases.get(phase);
        if (!values) phases.set(phase, values = []);
        values.push({ pair: activeProfilePair, milliseconds });
      }
      : undefined,
    profileCounter: diagnosticsEnabled ? recordCounters : undefined,
  });
  const applyNext = (previous: string[]) =>
    applyOperation(previous, activeOperation, activeToken, count);
  runtimeRoot.mount(jsx(StructuralApp, { initialIds, applyNext }));
  const runtimeMountMs = performance.now() - runtimeStarted;
  const reactSentinel = reactField.querySelector<HTMLElement>(
    '[data-id="row-0"]',
  )!;
  const runtimeSentinel = runtimeField.querySelector<HTMLElement>(
    '[data-id="row-0"]',
  )!;
  reactSentinel.click();
  runtimeSentinel.click();
  // The runtime schedules state commits in a microtask. Drain the retained
  // row-selection setup before structural measurements so it cannot batch
  // with the first (randomly ordered) list update.
  await settleRuntime();
  return {
    initialIds,
    mountMs: { react: reactMountMs, runtime: runtimeMountMs },
  };
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
    runtime: new Map(),
  };
  const random = makeRandom((seed ^ operation.length) >>> 0);
  const orders = shuffle(
    Array.from({ length: warmupPairs + measuredPairs }, (_, pair) => ({
      pair,
      order: (pair % 2 === 0 ? ["react", "runtime"] : ["runtime", "react"]) as [
        Arm,
        Arm,
      ],
    })),
    random,
  );
  const samples: Sample[] = [];
  let allOutputParity = true;
  let allIdentity = true;
  let allRetainedState = true;
  const button = (arm: Arm) =>
    (arm === "react" ? reactField : runtimeField)
      .querySelector<HTMLButtonElement>("[data-action='toggle-structure']")!;

  for (const { pair, order } of orders) {
    activeOperation = operation;
    activeToken = `${operation}-${pair}`;
    const nextIds = applyOperation(expectedIds, operation, activeToken, count);
    const nextSet = new Set(nextIds);
    const milliseconds: Record<Arm, number> = { react: 0, runtime: 0 };
    const identities: Record<Arm, boolean> = { react: true, runtime: true };
    const states: Record<Arm, boolean> = { react: true, runtime: true };
    for (const arm of order) {
      const field = arm === "react" ? reactField : runtimeField;
      const before = nodesById(field);
      const started = performance.now();
      captureProfile = arm === "runtime" && diagnosticsEnabled &&
        pair >= warmupPairs;
      activeProfilePair = pair;
      runtimeHostCounters?.reset();
      runtimeHostCounters && (runtimeHostCounters.active = captureProfile);
      if (arm === "react") flushSync(() => button(arm).click());
      else {
        button(arm).click();
        await settleRuntime();
        runtimeHostCounters && (runtimeHostCounters.active = false);
        if (captureProfile && runtimeHostCounters) {
          recordCounters(
            Object.fromEntries(
              Object.entries(runtimeHostCounters.snapshot()).map((
                [name, value],
              ) => [`host.${name}`, value]),
            ),
          );
        }
      }
      captureProfile = false;
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
    const outputParity = signature(reactField) === signature(runtimeField);
    allOutputParity &&= outputParity;
    allIdentity &&= identities.react && identities.runtime;
    allRetainedState &&= states.react && states.runtime;
    const sample = {
      pair,
      order,
      milliseconds,
      outputParity,
      identity: identities,
      retainedState: states,
    };
    if (pair >= warmupPairs) {
      samples.push({ ...sample, pair: pair - warmupPairs });
    }
    assert(
      outputParity,
      `${operation} pair ${pair}: React/runtime output mismatch`,
    );
    assert(
      identities.react && identities.runtime,
      `${operation} pair ${pair}: keyed node identity contract failed`,
    );
    assert(
      states.react && states.runtime,
      `${operation} pair ${pair}: retained/reinserted local state contract failed`,
    );
    expectedIds = nextIds;
  }
  return {
    operation,
    samples,
    medianMs: {
      react: percentile(
        samples.map((sample) => sample.milliseconds.react),
        0.5,
      ),
      runtime: percentile(
        samples.map((sample) => sample.milliseconds.runtime),
        0.5,
      ),
    },
    p95Ms: {
      react: percentile(
        samples.map((sample) => sample.milliseconds.react),
        0.95,
      ),
      runtime: percentile(
        samples.map((sample) => sample.milliseconds.runtime),
        0.95,
      ),
    },
    mountMs,
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
    phaseSamples.clear();
    counterSamples.clear();
    const scenarios: Scenario[] = [];
    for (const operation of operations) {
      resultNode.textContent = `Running ${operation}…`;
      scenarios.push(await runScenario(operation, count, seed));
    }
    if (diagnosticsEnabled) {
      const profileSummary = operations.map((operation) => {
        const phases = phaseSamples.get(operation) ?? new Map();
        const flushValues = phases.get("root.flush") ?? [];
        const scenario = scenarios.find((item) =>
          item.operation === operation
        )!;
        const totalByPair = new Map(scenario.samples.map((sample) => [
          sample.pair + warmupPairs,
          sample.milliseconds.runtime,
        ]));
        const phaseSummaries = Object.fromEntries(
          [...phases.entries()].map(([phase, values]) => [phase, {
            calls: values.length,
            medianMs: percentile(
              values.map((sample) => sample.milliseconds),
              0.5,
            ),
            p95Ms: percentile(
              values.map((sample) => sample.milliseconds),
              0.95,
            ),
          }]),
        );
        const otherPhaseTotals = new Map<number, number>();
        for (const [phase, values] of phases) {
          if (phase === "root.flush") continue;
          for (const sample of values) {
            otherPhaseTotals.set(
              sample.pair,
              (otherPhaseTotals.get(sample.pair) ?? 0) + sample.milliseconds,
            );
          }
        }
        const residuals = flushValues.map((sample) =>
          sample.milliseconds - (otherPhaseTotals.get(sample.pair) ?? 0)
        );
        const negativeResidualCount = residuals.filter((value) =>
          value < 0
        ).length;
        const outsideFlush = flushValues.flatMap((sample) => {
          const total = totalByPair.get(sample.pair);
          return total === undefined ? [] : [total - sample.milliseconds];
        });
        const rawSamples = flushValues.flatMap((sample) => {
          const total = totalByPair.get(sample.pair);
          if (total === undefined) return [];
          const phaseCalls = Object.fromEntries(
            [...phases.entries()].filter(([phase]) => phase !== "root.flush")
              .map(([phase, values]) => [
                phase,
                values.filter((entry) => entry.pair === sample.pair).map(
                  (entry) => entry.milliseconds,
                ),
              ]),
          );
          const insidePhaseTotal = Object.values(phaseCalls).flat().reduce(
            (sum, milliseconds) => sum + milliseconds,
            0,
          );
          return [{
            pair: sample.pair - warmupPairs,
            totalUpdateMs: total,
            rootFlushMs: sample.milliseconds,
            outsideRootFlushMs: total - sample.milliseconds,
            phaseCalls,
            workCounts: counterSamples.get(operation)?.get(sample.pair) ?? {},
            unattributedWithinFlushMs: sample.milliseconds - insidePhaseTotal,
          }];
        }).sort((left, right) => left.pair - right.pair);
        const workCountNames = new Set(
          rawSamples.flatMap((sample) => Object.keys(sample.workCounts)),
        );
        const workCountMedians = Object.fromEntries(
          [...workCountNames].sort().map((name) => [
            name,
            percentile(
              rawSamples.map((sample) => sample.workCounts[name] ?? 0),
              0.5,
            ),
          ]),
        );
        return {
          operation,
          measuredUpdates: new Set(flushValues.map((sample) =>
            sample.pair
          )).size,
          totalUpdateMedianMs: percentile(
            scenario.samples.map((sample) => sample.milliseconds.runtime),
            0.5,
          ),
          outsideRootFlushMedianMs: percentile(outsideFlush, 0.5),
          pairedTotalFlushSamples: outsideFlush.length,
          phaseSummaries,
          workCountMedians,
          samples: rawSamples,
          unattributedWithinFlushMedianMs: negativeResidualCount === 0
            ? percentile(residuals, 0.5)
            : null,
          negativeResidualCount,
        };
      });
      (window as any).__structuralProfileV1 = {
        schemaVersion: "component-state-structural-browser-phase-profile-v8",
        note:
          "Diagnostic timings add callback overhead and are not comparable with primary latency samples. Work counts are collected separately from phase timing: owner visits/renders/cache reuse, key-index nodes attached/detached by reconciliation, and DOM host method calls. The key-index visit counters now measure only the delta walks needed for inserted or removed mounted subtrees. totalUpdateMedianMs reuses the matching benchmark sample (programmatic click through microtask settle); outsideRootFlushMedianMs is the paired total minus root.flush. Dispatch path markers and structural gate/bail reasons cover the full-reconcile fallback as well as the keyed-owner path. mountScenario drains the initial row-selection update before the timed loop so it cannot batch with a structural update.",
        seed,
        count,
        collectedAt: new Date().toISOString(),
        browser: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          hardwareConcurrency: navigator.hardwareConcurrency,
          devicePixelRatio: window.devicePixelRatio,
          visibilityState: document.visibilityState,
        },
        operations: profileSummary,
      };
    }
    const status = scenarios.every((scenario) =>
        scenario.outputParity && scenario.identity && scenario.retainedState
      )
      ? "PASS"
      : "FAIL";
    latest = {
      schemaVersion: "component-state-structural-browser-v4",
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
      },
      reactBaseline:
        "React 19.3 + React Compiler; keyed row components own independent useState values; parent state changes list structure.",
      runtimeStrategy:
        "OXC-emitted keyed row component/state site plus a parent owner using explicit state-site API; structural parent updates render that owner and expand only its keyed subtree; retained keyed VDOM uses a linear last-placed-index move plan while reusing unchanged child component outputs.",
      scenarios,
      archiveFile: null,
      limitations: [
        "Three structural workloads share one flat 10,000-row tree; the page-load replication unit is a fresh browser page.",
        "React Compiler is enabled but source-level render counters are omitted so instrumentation does not suppress compiler memoization.",
        "One Chrome profile/device, programmatic click events, and synchronous DOM commit only; layout, paint, and display presentation are excluded.",
        "Both the structural list owner and keyed row state sites are lowered by OXC from the checked-in TSX fixture; the operation callback itself is supplied by the benchmark harness.",
      ],
    };
    recordNode.textContent = JSON.stringify(latest, null, 2);
    resultNode.className = status === "PASS" ? "pass" : "fail";
    resultNode.textContent = JSON.stringify(
      {
        status,
        scenarios: scenarios.map((scenario) => ({
          operation: scenario.operation,
          medianMs: scenario.medianMs,
          p95Ms: scenario.p95Ms,
          mountMs: scenario.mountMs,
          outputParity: scenario.outputParity,
          identity: scenario.identity,
          retainedState: scenario.retainedState,
        })),
      },
      null,
      2,
    );
    exportButton.disabled = false;
    if (status === "PASS") {
      const response = await fetch(
        "/__benchmark/save-component-state-structural",
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
        latest.archiveFile =
          `archive failed: HTTP ${response.status} ${await response.text()}`;
        recordNode.textContent = JSON.stringify(latest, null, 2);
      }
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
  anchor.download = `component-state-structural-${latest.seed}.json`;
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
const autoSeed = Number(new URLSearchParams(location.search).get("seed"));
if (
  new URLSearchParams(location.search).get("autorun") === "1" &&
  Number.isSafeInteger(autoSeed) && autoSeed > 0
) {
  seedNode.value = String(autoSeed);
  setTimeout(() => runButton.click(), 0);
}
