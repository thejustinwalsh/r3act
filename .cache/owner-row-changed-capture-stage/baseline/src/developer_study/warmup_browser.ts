import { jsx } from "../jsx_binding_runtime.ts";
import { ComponentStateRoot } from "../component_state_runtime.ts";
import { DOMVDOMHost } from "../vdom_snapshot_runtime.ts";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

const params = new URLSearchParams(location.search);
const arm = params.get("arm");
const result = document.querySelector<HTMLElement>("#result")!;
const mount = document.querySelector<HTMLElement>("#counter")!;
const checkButton = document.querySelector<HTMLButtonElement>("#check")!;
const instructions = document.querySelector<HTMLElement>("#instructions")!;

if (arm !== "react" && arm !== "runtime") {
  throw new Error("Choose one study arm with ?arm=react or ?arm=runtime");
}
document.body.dataset.arm = arm;
instructions.textContent = arm === "react"
  ? "React arm: add decrement and reset controls in the React starter. Keep the output and data-count synchronized; decrement must stop at zero."
  : "Runtime arm: add decrement and reset controls in the runtime starter. Keep the output and data-count synchronized; decrement must stop at zero. Run the OXC warm-up compile task after editing.";

const count = () => {
  const output = mount.querySelector<HTMLOutputElement>("output[data-count]");
  if (!output) throw new Error("Counter must render output[data-count]");
  const property = Number(output.dataset.count);
  const visible = Number(output.textContent);
  if (property !== visible) throw new Error(`Counter output ${visible} differs from data-count ${property}`);
  return property;
};
const press = (action: string) => {
  const button = mount.querySelector<HTMLButtonElement>(`button[data-action="${action}"]`);
  if (!button) throw new Error(`Missing button[data-action="${action}"]`);
  if (arm === "react") flushSync(() => button.click());
  else {
    button.click();
    runtimeRoot?.flush();
  }
};

let runtimeRoot: ComponentStateRoot<Node, Node> | null = null;
let reactRoot: ReturnType<typeof createRoot> | null = null;

if (arm === "react") {
  const { WarmupCounter } = await import("../../developer-study/starter/react/counter.tsx");
  reactRoot = createRoot(mount);
  flushSync(() => reactRoot!.render(createElement(WarmupCounter)));
} else {
  const { WarmupCounter } = await import("./generated_warmup_runtime.tsx");
  runtimeRoot = new ComponentStateRoot(new DOMVDOMHost(), mount);
  runtimeRoot.mount(jsx(WarmupCounter, {}));
}

checkButton.addEventListener("click", () => {
  checkButton.disabled = true;
  try {
    const observations: Array<[string, number]> = [];
    const expect = (step: string, expected: number) => {
      const actual = count();
      if (actual !== expected) throw new Error(`${step}: expected ${expected}, got ${actual}`);
      observations.push([step, actual]);
    };
    expect("initial", 0);
    press("decrement");
    expect("decrement at zero", 0);
    press("increment");
    press("increment");
    press("increment");
    expect("three increments", 3);
    press("decrement");
    expect("decrement", 2);
    press("reset");
    expect("reset", 0);
    result.dataset.status = "PASS";
    result.textContent = JSON.stringify({ status: "PASS", arm, observations }, null, 2);
  } catch (error) {
    result.dataset.status = "FAIL";
    result.textContent = error instanceof Error ? error.stack ?? error.message : String(error);
    checkButton.disabled = false;
  }
});

if (params.get("check") === "1") checkButton.click();
