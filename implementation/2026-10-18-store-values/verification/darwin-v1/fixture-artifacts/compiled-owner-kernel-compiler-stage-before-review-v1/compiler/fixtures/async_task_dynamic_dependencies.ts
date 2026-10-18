import { asyncTask } from "../../src/async_task_plan.ts";

const dependencies = ["profile"];
export const invalidTasks = [
  asyncTask("header", dependencies, async () => "header"),
  asyncTask("profile", [], async () => "Ada"),
];
