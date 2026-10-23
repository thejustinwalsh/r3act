import { type asyncTask } from "@runtime/tasks";

export const value = asyncTask("value", async (input) => input.get("$request"));
