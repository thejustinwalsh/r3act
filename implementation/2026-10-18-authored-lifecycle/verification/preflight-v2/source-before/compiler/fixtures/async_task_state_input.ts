import { asyncTask } from "../../src/async_task_plan.ts";

export const searchTasks = [
  asyncTask("search", async (values) => ({
    count: values.get(
      "compiler/fixtures/component_state_sites.tsx#component:Counter#state:0",
    ) as number,
    result: "results for count " + values.get(
      "compiler/fixtures/component_state_sites.tsx#component:Counter#state:0",
    ),
  })),
  asyncTask("catalog", async () => "catalog"),
  asyncTask("page-model", async (values) => ({
    result: values.get("search"),
    catalog: values.get("catalog"),
  })),
];
