import { asyncTask } from "@runtime/tasks";

export const first = asyncTask("first", async (input) => input.get("second"));
export const second = asyncTask("second", async (input) => input.get("first"));
