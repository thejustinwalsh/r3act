import { asyncTask } from "../../src/async_task_plan.ts";

type TransitionRequest = {
  id: string;
  target: "workspace" | "inspector" | "both";
  nextId: number;
  delayMs: number;
};
type TransitionContent = { text: string; nextId: number };

// The Rust compiler infers both request-input edges and the final join edge
// from these reads. The browser binds real task implementations to this plan.
export const transitionTasks = [
  asyncTask("load-content", async (values) => {
    const request = values.get("request") as TransitionRequest;
    return { text: `Background update ${request.nextId}`, nextId: request.nextId } satisfies TransitionContent;
  }),
  asyncTask("load-target", async (values) => {
    const request = values.get("request") as TransitionRequest;
    return request.target;
  }),
  asyncTask("compose-update", async (values) => {
    const content = values.get("load-content") as TransitionContent;
    const target = values.get("load-target") as TransitionRequest["target"];
    return { content, target };
  }),
];
