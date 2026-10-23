import { asyncTask as task } from "@runtime/tasks";

export const value = task("value", async (input) => input.get("$request"));
