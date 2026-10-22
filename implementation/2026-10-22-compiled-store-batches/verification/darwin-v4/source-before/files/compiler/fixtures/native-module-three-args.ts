import { asyncTask } from "@runtime/tasks";

export const task = asyncTask("task", [], async (input: Map<string, unknown>) => {
  // This body and comment remain byte-for-byte authored.
  return input.get("$source");
});
