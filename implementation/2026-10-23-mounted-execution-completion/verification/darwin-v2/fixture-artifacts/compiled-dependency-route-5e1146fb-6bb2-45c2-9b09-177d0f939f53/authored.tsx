/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { asyncTask, jsx, Suspense, use } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import type { AsyncResource, StoreSource } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";

export type Profile = Readonly<{ query: string; accountId: string; name: string }>;
export type Permissions = Readonly<{ query: string; level: string }>;
export type Projects = Readonly<{ accountId: string; titles: readonly string[] }>;
export type Navigation = Readonly<{
  query: string; label: string; projectCount: number;
}>;
export type Recommendations = Readonly<{ query: string; label: string }>;

export type RouteProvider = Readonly<{
  profile(query: string, signal: AbortSignal): Promise<Profile>;
  permissions(query: string, signal: AbortSignal): Promise<Permissions>;
  projects(accountId: string, signal: AbortSignal): Promise<Projects>;
  recommendations(query: string, signal: AbortSignal): Promise<Recommendations>;
}>;

export const deriveNavigation = (profile: Profile, permissions: Permissions,
  projects: Projects): Navigation => Object.freeze({
  query: profile.query,
  label: `${profile.name} · ${permissions.level}`,
  projectCount: projects.titles.length,
});

export const profileTask = asyncTask("profile", async (values, signal) => {
  const query = String(values.get("$query"));
  const provider = values.get("$provider") as RouteProvider;
  return provider.profile(query, signal);
});

export const permissionsTask = asyncTask("permissions", async (values, signal) => {
  const query = String(values.get("$query"));
  const provider = values.get("$provider") as RouteProvider;
  return provider.permissions(query, signal);
});

export const projectsTask = asyncTask("projects", async (values, signal) => {
  const profile = values.get("profile") as Profile;
  const provider = values.get("$provider") as RouteProvider;
  return provider.projects(profile.accountId, signal);
});

export const navigationTask = asyncTask("navigation", (values) => {
  const profile = values.get("profile") as Profile;
  const permissions = values.get("permissions") as Permissions;
  const projects = values.get("projects") as Projects;
  return deriveNavigation(profile, permissions, projects);
});

export const recommendationsTask = asyncTask("recommendations", async (values, signal) => {
  const query = String(values.get("$query"));
  const provider = values.get("$provider") as RouteProvider;
  return provider.recommendations(query, signal);
});

export const routeTasks = [profileTask, permissionsTask, projectsTask,
  navigationTask, recommendationsTask] as const;

export function NavigationView(props: { resource: AsyncResource<Navigation> }) {
  const navigation = use(props.resource);
  return <output key="navigation" data-navigation={navigation.query}
    data-label={navigation.label} data-project-count={navigation.projectCount}>
    {navigation.label} · {navigation.projectCount} projects
  </output>;
}

export function NavigationApp(props: { resource: AsyncResource<Navigation>;
  urgent: StoreSource<number> }) {
  const urgent = use(props.urgent);
  return <section key="navigation-root" data-root="navigation">
    <output data-urgent={urgent}>{urgent}</output>
    <Suspense fallback={<output key="navigation" data-navigation="pending">Loading navigation</output>}>
      <NavigationView resource={props.resource} />
    </Suspense>
  </section>;
}

export function RecommendationsView(props: { resource: AsyncResource<Recommendations> }) {
  const recommendations = use(props.resource);
  return <output key="recommendations" data-recommendations={recommendations.query}
    data-recommendation-label={recommendations.label}>
    {recommendations.label}
  </output>;
}

export function RecommendationsApp(props: { resource: AsyncResource<Recommendations>;
  urgent: StoreSource<number> }) {
  const urgent = use(props.urgent);
  return <section key="recommendations-root" data-root="recommendations">
    <output data-urgent={urgent}>{urgent}</output>
    <Suspense fallback={<output key="recommendations" data-recommendations="pending">Loading recommendations</output>}>
      <RecommendationsView resource={props.resource} />
    </Suspense>
  </section>;
}

export function ThreeNavigation(props: { resource: AsyncResource<Navigation>;
  urgent: StoreSource<number> }) {
  const navigation = use(props.resource);
  const urgent = use(props.urgent);
  return jsx("group", { key: "three-navigation",
    name: `navigation-${navigation.query}-${navigation.projectCount}-urgent-${urgent}` });
}

export function ThreeApp(props: { resource: AsyncResource<Navigation>;
  urgent: StoreSource<number> }) {
  return jsx(Suspense, { fallback: jsx("group", { key: "three-navigation",
    name: "navigation-pending" }),
    children: jsx(ThreeNavigation, props) });
}
