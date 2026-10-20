import { asyncTask } from "@runtime/tasks";

export const value = asyncTask("$request", async (input) => input.get("$request"));
