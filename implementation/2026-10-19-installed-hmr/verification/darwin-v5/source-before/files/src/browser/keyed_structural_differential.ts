import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { jsx } from "../jsx_binding_runtime.ts";
import { DOMVDOMHost, VDOMSnapshotRoot } from "../vdom_snapshot_runtime.ts";

type Row = { key: string; label: string; revision: number };
type PhaseResult = {
  phase: string;
  domParity: boolean;
  reactHTML: string;
  vdomHTML: string;
  identityParity: Record<string, boolean>;
  removedKeyDetached?: { react: boolean; vdom: boolean };
};

const reactContainer = document.querySelector("#react-root");
const vdomContainer = document.querySelector("#vdom-root");
const resultNode = document.querySelector("#result");
if (!(reactContainer instanceof HTMLElement) || !(vdomContainer instanceof HTMLElement) || !(resultNode instanceof HTMLElement)) {
  throw new Error("Differential page is missing a required container");
}

const reactRoot = createRoot(reactContainer);
const vdomRoot = new VDOMSnapshotRoot(new DOMVDOMHost(), vdomContainer);

const makeReactTree = (rows: readonly Row[]) => createElement(
  "ul",
  { "data-scenario": "keyed-structural" },
  ...rows.map((row) => createElement(
    "li",
    { key: row.key, "data-key": row.key, "data-revision": row.revision },
    row.label,
  )),
);

const makeVDOMTree = (rows: readonly Row[]) => jsx(
  "ul",
  { "data-scenario": "keyed-structural" },
  rows.map((row) => jsx("li", {
    key: row.key,
    "data-key": row.key,
    "data-revision": row.revision,
  }, row.label)),
);

const render = (rows: readonly Row[]) => {
  flushSync(() => reactRoot.render(makeReactTree(rows)));
  vdomRoot.commit(makeVDOMTree(rows));
};

const listHTML = (container: HTMLElement) => container.querySelector("ul")?.innerHTML ?? "<missing-ul>";
const getRows = (container: HTMLElement) => new Map(
  [...container.querySelectorAll<HTMLLIElement>("li[data-key]")].map((node) => [node.dataset.key!, node]),
);
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const phases: PhaseResult[] = [];
const compare = (phase: string, expectedIdentity: Readonly<Record<string, boolean>> = {}): PhaseResult => {
  const reactHTML = listHTML(reactContainer);
  const vdomHTML = listHTML(vdomContainer);
  const domParity = reactHTML === vdomHTML;
  const reactRows = getRows(reactContainer);
  const vdomRows = getRows(vdomContainer);
  const identityParity: Record<string, boolean> = {};
  for (const [key, expected] of Object.entries(expectedIdentity)) {
    const reactSame = reactRows.get(key) === originalReactRows.get(key);
    const vdomSame = vdomRows.get(key) === originalVDOMRows.get(key);
    identityParity[key] = reactSame === expected && vdomSame === expected;
  }
  const result = { phase, domParity, reactHTML, vdomHTML, identityParity };
  phases.push(result);
  assert(domParity, `${phase}: React and retained VDOM DOM output diverged`);
  for (const [key, passed] of Object.entries(identityParity)) {
    assert(passed, `${phase}: retained identity for key ${key} did not match the expected behavior`);
  }
  return result;
};

const initialRows: Row[] = [
  { key: "a", label: "Alpha", revision: 1 },
  { key: "b", label: "Beta", revision: 1 },
  { key: "c", label: "Gamma", revision: 1 },
];
render(initialRows);
const originalReactRows = getRows(reactContainer);
const originalVDOMRows = getRows(vdomContainer);
compare("initial mount");

render([
  { key: "c", label: "Gamma", revision: 1 },
  { key: "a", label: "Alpha updated", revision: 2 },
  { key: "b", label: "Beta", revision: 1 },
]);
compare("prop update + keyed reorder", { a: true, b: true, c: true });

render([
  { key: "c", label: "Gamma", revision: 1 },
  { key: "a", label: "Alpha updated", revision: 2 },
]);
const removedKeyDetached = {
  react: !originalReactRows.get("b")!.isConnected,
  vdom: !originalVDOMRows.get("b")!.isConnected,
};
assert(removedKeyDetached.react, "React did not detach removed key b");
assert(removedKeyDetached.vdom, "VDOM did not detach removed key b");
compare("remove key", { a: true, c: true }).removedKeyDetached = removedKeyDetached;

render([
  { key: "b", label: "Beta reinserted", revision: 2 },
  { key: "a", label: "Alpha updated", revision: 2 },
  { key: "c", label: "Gamma", revision: 1 },
]);
compare("reinsert removed key", { a: true, c: true });
const reinsertedKeyIdentity = {
  reactFresh: getRows(reactContainer).get("b") !== originalReactRows.get("b"),
  vdomFresh: getRows(vdomContainer).get("b") !== originalVDOMRows.get("b"),
};
assert(reinsertedKeyIdentity.reactFresh, "React reused the removed host node");
assert(reinsertedKeyIdentity.vdomFresh, "VDOM reused the removed host node");

const structuralSeed = 1592594996;
let randomState = structuralSeed;
const random = () => {
  randomState = (randomState + 0x6d2b79f5) | 0;
  let value = randomState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
};
const randomIndex = (length: number) => Math.floor(random() * length);
const itemKeys = Array.from({ length: 16 }, (_, index) => `item-${index}`);
let randomRows: Row[] = [
  { key: "b", label: "Beta reinserted", revision: 2 },
  { key: "a", label: "Alpha updated", revision: 2 },
  { key: "c", label: "Gamma", revision: 1 },
];
let lastReactNodeByKey = getRows(reactContainer);
let lastVDOMNodeByKey = getRows(vdomContainer);
const structuralOperations: Array<{ step: number; operation: string; count: number; parity: boolean; identity: boolean }> = [];
const operationCounts: Record<string, number> = { insert: 0, update: 0, reorder: 0, remove: 0 };

for (let step = 0; step < 128; step++) {
  const previousRows = randomRows;
  const previousReactNodes = getRows(reactContainer);
  const previousVDOMNodes = getRows(vdomContainer);
  const nextRows = previousRows.map((row) => ({ ...row }));
  const draw = randomIndex(10);
  let operation = draw < 4 ? "insert" : draw < 6 ? "update" : draw < 8 ? "reorder" : "remove";
  if (operation === "insert" && nextRows.length >= 12) operation = "remove";
  if (operation === "remove" && nextRows.length === 0) operation = "insert";
  if (operation === "reorder" && nextRows.length < 2) operation = "insert";
  if (operation === "update" && nextRows.length === 0) operation = "insert";

  if (operation === "insert") {
    const available = itemKeys.filter((key) => !nextRows.some((row) => row.key === key));
    assert(available.length > 0, `step ${step}: no available key to insert`);
    const key = available[randomIndex(available.length)];
    const index = randomIndex(nextRows.length + 1);
    nextRows.splice(index, 0, { key, label: `${key} initial`, revision: 1 });
  } else if (operation === "update") {
    const index = randomIndex(nextRows.length);
    const row = nextRows[index];
    row.revision++;
    row.label = `${row.key} revision ${row.revision}`;
  } else if (operation === "reorder") {
    const left = randomIndex(nextRows.length);
    const right = (left + 1 + randomIndex(nextRows.length - 1)) % nextRows.length;
    [nextRows[left], nextRows[right]] = [nextRows[right], nextRows[left]];
  } else {
    nextRows.splice(randomIndex(nextRows.length), 1);
  }
  operationCounts[operation]++;
  render(nextRows);

  const reactHTML = listHTML(reactContainer);
  const vdomHTML = listHTML(vdomContainer);
  const currentReactNodes = getRows(reactContainer);
  const currentVDOMNodes = getRows(vdomContainer);
  const parity = reactHTML === vdomHTML;
  let identity = true;
  for (const row of previousRows) {
    const reactNode = previousReactNodes.get(row.key)!;
    const vdomNode = previousVDOMNodes.get(row.key)!;
    if (nextRows.some((next) => next.key === row.key)) {
      identity &&= currentReactNodes.get(row.key) === reactNode && currentVDOMNodes.get(row.key) === vdomNode;
    } else {
      identity &&= !reactNode.isConnected && !vdomNode.isConnected;
    }
  }
  for (const row of nextRows) {
    if (previousReactNodes.has(row.key)) continue;
    const lastReactNode = lastReactNodeByKey.get(row.key);
    const lastVDOMNode = lastVDOMNodeByKey.get(row.key);
    if (lastReactNode) identity &&= currentReactNodes.get(row.key) !== lastReactNode;
    if (lastVDOMNode) identity &&= currentVDOMNodes.get(row.key) !== lastVDOMNode;
  }
  assert(parity, `seed ${structuralSeed}, step ${step}, ${operation}: React and retained VDOM output diverged`);
  assert(identity, `seed ${structuralSeed}, step ${step}, ${operation}: keyed host identity invariant failed`);
  structuralOperations.push({ step, operation, count: nextRows.length, parity, identity });
  randomRows = nextRows;
  for (const row of nextRows) {
    lastReactNodeByKey.set(row.key, currentReactNodes.get(row.key)!);
    lastVDOMNodeByKey.set(row.key, currentVDOMNodes.get(row.key)!);
  }
}
const structuralTrace = {
  seed: structuralSeed,
  steps: structuralOperations.length,
  generator: "Mulberry32, weighted insert/update/reorder/remove = 4/2/2/2, key pool 16, max rows 12",
  operationCounts,
  rowCountRange: {
    min: Math.min(...structuralOperations.map((operation) => operation.count)),
    max: Math.max(...structuralOperations.map((operation) => operation.count)),
  },
  allParity: structuralOperations.every((operation) => operation.parity),
  allIdentity: structuralOperations.every((operation) => operation.identity),
  operations: structuralOperations,
};

resultNode.className = "pass";
resultNode.textContent = JSON.stringify({
  status: "PASS",
  reactBaseline: "react/react-dom 19.3.0",
  collectedAt: new Date().toISOString(),
  browser: {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    devicePixelRatio: window.devicePixelRatio,
    viewport: { width: window.innerWidth, height: window.innerHeight },
  },
  contract: "DOM output parity, keyed retention through reorder, removal detachment, and fresh identity after reinsertion",
  reinsertedKeyIdentity,
  structuralTrace,
  phases,
}, null, 2);

reactRoot.unmount();
vdomRoot.dispose();
