import { asyncTask } from "@runtime/tasks";

const make = asyncTask;
export const value = make("value", async (input) => input.get("$request"));
