import { asyncTask } from "../../src/async_task_plan.ts";

const sourceId =
  "compiler/fixtures/component_state_sites.tsx#component:Counter#state:0";

export const invalidTasks = [
  asyncTask("search", async (values) => values.get(sourceId)),
];
