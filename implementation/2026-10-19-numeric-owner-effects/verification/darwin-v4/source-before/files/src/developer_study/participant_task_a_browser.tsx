import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { ComponentStateRoot } from "../component_state_runtime.ts";
import { jsx } from "../jsx_binding_runtime.ts";
import { DOMVDOMHost } from "../vdom_snapshot_runtime.ts";
import {
  ParticipantTaskA as ReactParticipantTaskA,
  type TaskAOwner,
  type TaskALifecycle,
} from "../../developer-study/starter/react/task-a.tsx";

const params = new URLSearchParams(location.search);
const arm = params.get("arm");
const label = document.querySelector<HTMLElement>("#arm-label")!;
const result = document.querySelector<HTMLPreElement>("#result")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const mount = document.querySelector<HTMLDivElement>("#app-root")!;

if (arm !== "react" && arm !== "runtime") {
  result.dataset.status = "CONFIGURATION ERROR";
  result.textContent = "Choose one arm with ?arm=react or ?arm=runtime";
  runButton.disabled = true;
  throw new Error("Choose one study arm with ?arm=react or ?arm=runtime");
}
label.textContent = arm === "react"
  ? "React 19.3 + React Compiler starter"
  : "OXC + retained VDOM runtime starter";

type Log = { setup: string[]; cleanup: string[] };
type State = { order: string[]; drafts: Record<string, number>; setup: string[]; cleanup: string[] };

const life = (log: Log): TaskALifecycle => ({
  onSetup: (id) => log.setup.push(id),
  onCleanup: (id) => log.cleanup.push(id),
});
const settleEffects = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const capture = (log: Log): State => {
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

const assertState = (actual: State, expected: State, action: string) => {
  const canonical = (state: State) => JSON.stringify({
    ...state,
    drafts: Object.fromEntries(Object.entries(state.drafts).sort(([a], [b]) => a.localeCompare(b))),
  });
  if (canonical(actual) !== canonical(expected)) {
    throw new Error(`${action}: expected ${canonical(expected)}, got ${canonical(actual)}`);
  }
};

runButton.addEventListener("click", async () => {
  runButton.disabled = true;
  const log: Log = { setup: [], cleanup: [] };
  const lifecycle = life(log);
  let owners: TaskAOwner[] = [
    { id: "A", active: false },
    { id: "B", active: false },
  ];
  let reactRoot: Root | undefined;
  let runtimeRoot: ComponentStateRoot<Node, Node> | undefined;
  let mounted = false;
  const steps: Array<{ action: string; state: State }> = [];

  const render = async () => {
    const props = { owners, lifecycle };
    if (arm === "react") {
      flushSync(() => reactRoot!.render(createElement(ReactParticipantTaskA, props)));
    } else {
      const { ParticipantTaskA } = await import("./generated_participant_task_a_runtime.tsx");
      const tree = jsx(ParticipantTaskA, props);
      if (mounted) runtimeRoot!.update(tree);
      else {
        runtimeRoot!.mount(tree);
        mounted = true;
      }
    }
    await settleEffects();
  };
  const check = (action: string, expected: State) => {
    const state = capture(log);
    assertState(state, expected, action);
    steps.push({ action, state });
  };
  const increment = async () => {
    const button = mount.querySelector<HTMLButtonElement>('[data-owner="A"] [data-action="increment"]');
    if (!button) throw new Error("Missing increment button for A");
    if (arm === "react") flushSync(() => button.click());
    else {
      button.click();
      runtimeRoot?.flush();
    }
    await settleEffects();
  };

  try {
    if (arm === "react") reactRoot = createRoot(mount);
    else runtimeRoot = new ComponentStateRoot(new DOMVDOMHost(), mount);
    await render();
    check("initial inactive owners", { order: ["A", "B"], drafts: { A: 0, B: 0 }, setup: [], cleanup: [] });

    owners = [{ id: "A", active: true }, { id: "B", active: false }];
    await render();
    check("show A", { order: ["A", "B"], drafts: { A: 0, B: 0 }, setup: ["A"], cleanup: [] });

    await increment();
    await increment();
    check("increment A twice", { order: ["A", "B"], drafts: { A: 2, B: 0 }, setup: ["A"], cleanup: [] });

    owners = [{ id: "A", active: false }, { id: "B", active: false }];
    await render();
    check("hide A", { order: ["A", "B"], drafts: { A: 2, B: 0 }, setup: ["A"], cleanup: ["A"] });

    owners = [{ id: "A", active: true }, { id: "B", active: false }];
    await render();
    check("show A again", { order: ["A", "B"], drafts: { A: 2, B: 0 }, setup: ["A", "A"], cleanup: ["A"] });

    await increment();
    check("increment A after restore", { order: ["A", "B"], drafts: { A: 3, B: 0 }, setup: ["A", "A"], cleanup: ["A"] });

    owners = [{ id: "B", active: false }, { id: "A", active: true }];
    await render();
    check("reorder B,A", { order: ["B", "A"], drafts: { A: 3, B: 0 }, setup: ["A", "A"], cleanup: ["A"] });

    owners = [{ id: "B", active: false }];
    await render();
    check("remove active A", { order: ["B"], drafts: { B: 0 }, setup: ["A", "A"], cleanup: ["A", "A"] });
    if (runtimeRoot) runtimeRoot.dispose();
    if (reactRoot) flushSync(() => reactRoot!.unmount());
    result.dataset.status = "PASS";
    result.textContent = JSON.stringify({ status: "PASS", arm, steps }, null, 2);
  } catch (error) {
    result.dataset.status = "FAIL";
    result.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
    if (runtimeRoot) runtimeRoot.dispose();
    if (reactRoot) flushSync(() => reactRoot!.unmount());
  } finally {
    runButton.disabled = false;
  }
});

if (params.get("run") === "1") runButton.click();
