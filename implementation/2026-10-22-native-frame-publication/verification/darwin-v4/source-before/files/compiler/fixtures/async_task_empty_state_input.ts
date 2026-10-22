import { asyncTask } from "../../src/async_task_plan.ts";

export const invalidTasks = [
  asyncTask("search", ["$"], async () => "results"),
];
