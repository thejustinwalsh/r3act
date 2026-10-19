import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { ComponentStateRoot } from "../component_state_runtime.ts";
import { DOMVDOMHost } from "../vdom_snapshot_runtime.ts";
import { TaskAReactTree } from "./task_a_react.tsx";
import { taskATree, type TaskAOwner } from "./task_a_runtime.tsx";

type Log = { setup: string[]; cleanup: string[] };
type State = { order: string[]; drafts: Record<string, number>; setup: string[]; cleanup: string[] };

const result = document.querySelector<HTMLPreElement>("#result")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const reactMount = document.querySelector<HTMLDivElement>("#react-root")!;
const runtimeMount = document.querySelector<HTMLDivElement>("#runtime-root")!;

const life = (log: Log) => ({
  onSetup: (id: string) => log.setup.push(id),
  onCleanup: (id: string) => log.cleanup.push(id),
});
const settleEffects = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const capture = (mount: HTMLElement, log: Log): State => {
  const owners = [...mount.querySelectorAll<HTMLElement>("[data-owner]")];
  return {
    order: owners.map((owner) => owner.dataset.owner ?? ""),
    drafts: Object.fromEntries(owners.map((owner) => [
      owner.dataset.owner ?? "",
      Number(owner.querySelector("[data-draft]")?.getAttribute("data-draft")),
    ])),
    setup: [...log.setup],
    cleanup: [...log.cleanup],
  };
};

const assertState = (actual: State, expected: State, label: string) => {
  const canonical = (state: State) => JSON.stringify({
    ...state,
    drafts: Object.fromEntries(Object.entries(state.drafts).sort(([a], [b]) => a.localeCompare(b))),
  });
  if (canonical(actual) !== canonical(expected)) {
    throw new Error(
      `${label}: expected ${canonical(expected)}, got ${canonical(actual)}`,
    );
  }
};

runButton.addEventListener("click", async () => {
  runButton.disabled = true;
  const reactLog: Log = { setup: [], cleanup: [] };
  const runtimeLog: Log = { setup: [], cleanup: [] };
  const reactLifecycle = life(reactLog);
  const runtimeLifecycle = life(runtimeLog);
  let owners: TaskAOwner[] = [
    { id: "A", active: false },
    { id: "B", active: false },
  ];
  let reactRoot: Root | undefined;
  let runtimeRoot: ComponentStateRoot<Node, Node> | undefined;
  const steps: Array<{ action: string; state: State }> = [];

  const render = async () => {
    flushSync(() => reactRoot!.render(createElement(TaskAReactTree, {
      owners,
      lifecycle: reactLifecycle,
    })));
    runtimeRoot!.update(taskATree(owners, runtimeLifecycle));
    await settleEffects();
  };
  const check = (action: string, expected: State) => {
    const reactState = capture(reactMount, reactLog);
    const runtimeState = capture(runtimeMount, runtimeLog);
    assertState(reactState, expected, `${action} React`);
    assertState(runtimeState, expected, `${action} runtime`);
    steps.push({ action, state: reactState });
  };
  const click = async (mount: HTMLElement, id: string) => {
    const button = mount.querySelector<HTMLElement>(`[data-owner="${id}"] [data-action="increment"]`);
    if (!button) throw new Error(`Missing increment button for ${id}`);
    if (mount === reactMount) {
      flushSync(() => button.click());
      await settleEffects();
    } else {
      button.click();
      await Promise.resolve();
    }
  };
  const bothClick = async (id: string) => {
    await click(reactMount, id);
    await click(runtimeMount, id);
  };

  try {
    reactRoot = createRoot(reactMount);
    runtimeRoot = new ComponentStateRoot(new DOMVDOMHost(), runtimeMount);
    flushSync(() => reactRoot!.render(createElement(TaskAReactTree, {
      owners,
      lifecycle: reactLifecycle,
    })));
    runtimeRoot.mount(taskATree(owners, runtimeLifecycle));
    await settleEffects();
    check("initial inactive owners", {
      order: ["A", "B"],
      drafts: { A: 0, B: 0 },
      setup: [],
      cleanup: [],
    });

    owners = [{ id: "A", active: true }, { id: "B", active: false }];
    await render();
    check("show A", {
      order: ["A", "B"], drafts: { A: 0, B: 0 }, setup: ["A"], cleanup: [],
    });

    await bothClick("A");
    await bothClick("A");
    check("increment A twice", {
      order: ["A", "B"], drafts: { A: 2, B: 0 }, setup: ["A"], cleanup: [],
    });

    owners = [{ id: "A", active: false }, { id: "B", active: false }];
    await render();
    check("hide A", {
      order: ["A", "B"], drafts: { A: 2, B: 0 }, setup: ["A"], cleanup: ["A"],
    });

    owners = [{ id: "A", active: true }, { id: "B", active: false }];
    await render();
    check("show A again", {
      order: ["A", "B"], drafts: { A: 2, B: 0 }, setup: ["A", "A"], cleanup: ["A"],
    });

    await bothClick("A");
    check("increment A after restore", {
      order: ["A", "B"], drafts: { A: 3, B: 0 }, setup: ["A", "A"], cleanup: ["A"],
    });

    owners = [{ id: "B", active: false }, { id: "A", active: true }];
    await render();
    check("reorder B,A", {
      order: ["B", "A"], drafts: { A: 3, B: 0 }, setup: ["A", "A"], cleanup: ["A"],
    });

    owners = [{ id: "B", active: false }];
    await render();
    check("remove active A", {
      order: ["B"], drafts: { B: 0 }, setup: ["A", "A"], cleanup: ["A", "A"],
    });
    runtimeRoot.dispose();
    flushSync(() => reactRoot!.unmount());
    result.dataset.status = "PASS";
    result.textContent = JSON.stringify({ status: "PASS", steps }, null, 2);
  } catch (error) {
    result.dataset.status = "FAIL";
    result.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
    runtimeRoot?.dispose();
    if (reactRoot) flushSync(() => reactRoot!.unmount());
  }
});

if (new URLSearchParams(location.search).get("run") === "1") runButton.click();
