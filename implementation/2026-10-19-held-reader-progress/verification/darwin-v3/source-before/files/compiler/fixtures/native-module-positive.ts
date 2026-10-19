// 🧩 UTF-16 edit offset coverage.
import { asyncTask } from "@runtime/tasks";

export const content = asyncTask("load-content", async (input) => {
  const request = input.get("$request");
  return { request, value: await fetch(`/content/${request}`) };
});

export const view = asyncTask("compose-view", async (input) => {
  const content = input.get("load-content");
  const target = input.get("$target");
  return { content, target };
});
