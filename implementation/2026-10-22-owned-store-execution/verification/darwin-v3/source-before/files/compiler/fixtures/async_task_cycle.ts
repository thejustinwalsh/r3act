import { asyncTask } from "../../src/async_task_plan.ts";

export const cyclicTasks = [
  asyncTask("left", ["right"], async () => "left"),
  asyncTask("right", ["left"], async () => "right"),
];
