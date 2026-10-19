import { asyncTask } from "../../src/async_task_plan.ts";

type Profile = Readonly<{ name: string }>;
type FeedItem = Readonly<{ id: string; label: string }>;

// The final page model is declared first on purpose. OXC emits a stable
// topological execution order while preserving these authored task IDs.
export const dashboardTasks = [
  asyncTask("page-model", async (values) => ({
    title: values.get("header") as string,
    items: values.get("feed") as readonly FeedItem[],
  })),
  asyncTask("profile", async (): Promise<Profile> => ({ name: "Ada" })),
  asyncTask("feed", async (): Promise<readonly FeedItem[]> => [
    { id: "one", label: "First item" },
  ]),
  asyncTask("header", async (values) => {
    const profile = values.get("profile") as Profile;
    return `Hello, ${profile.name}`;
  }),
];
