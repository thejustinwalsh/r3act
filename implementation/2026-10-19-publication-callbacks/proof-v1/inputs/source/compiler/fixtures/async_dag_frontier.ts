import { asyncTask } from "../../src/async_task_plan.ts";

type Profile = Readonly<{ name: string }>;
type Feed = Readonly<{ label: string }>;
type Recommendations = Readonly<{ label: string }>;
type PageModel = Readonly<{ title: string; feedLabel: string; recommendation: string }>;

// The plan deliberately declares its join first; OXC must emit dependencies
// from literal values.get reads and generate a valid topological schedule.
export const frontierTasks = [
  asyncTask("page-model", async (values) => ({
    title: values.get("profile-summary") as string,
    feedLabel: values.get("feed-annotations") as string,
    recommendation: (values.get("recommendations") as Recommendations).label,
  } satisfies PageModel)),
  asyncTask("profile", async (): Promise<Profile> => ({ name: "Ada" })),
  asyncTask("feed", async (): Promise<Feed> => ({ label: "Latest item" })),
  asyncTask("recommendations", async (): Promise<Recommendations> => ({
    label: "Recommended for Ada",
  })),
  asyncTask("profile-summary", async (values) => {
    const profile = values.get("profile") as Profile;
    return `Hello, ${profile.name}`;
  }),
  asyncTask("feed-annotations", async (values) => {
    const profile = values.get("profile") as Profile;
    const feed = values.get("feed") as Feed;
    return `${feed.label} · for ${profile.name}`;
  }),
];
