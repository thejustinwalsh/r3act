import { asyncTask } from "@runtime/tasks";

export function build() {
  return asyncTask("hidden", async (input) => input.get("$request"));
}
