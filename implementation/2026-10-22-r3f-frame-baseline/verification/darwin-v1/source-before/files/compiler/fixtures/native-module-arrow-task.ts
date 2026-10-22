import { asyncTask } from "@runtime/tasks";

export const build = () => asyncTask("hidden", async (input) => input.get("$request"));
