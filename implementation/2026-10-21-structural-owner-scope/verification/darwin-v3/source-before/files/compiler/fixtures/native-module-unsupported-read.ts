import { asyncTask } from "@runtime/tasks";

export const value = asyncTask("value", async (input) => {
  const alias = input;
  return alias.get("$request");
});
