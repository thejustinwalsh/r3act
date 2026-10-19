import { asyncTask } from "@runtime/tasks";

export const tasks = [
  asyncTask("first", async (input) => input.get("$request")),
  asyncTask("second", async (input) => input.get("first")),
];
