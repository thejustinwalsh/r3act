type Profile = { query: string; accountId: string; name: string };
type Permissions = { query: string; level: string };
type Projects = { accountId: string; titles: readonly string[] };
type Recommendations = { query: string; label: string };

export type RouteController = {
  begin(query: string): unknown;
  resolveProfile(query: string, value: Profile): unknown;
  resolvePermissions(query: string, value: Permissions): unknown;
  resolveProjects(accountId: string, value: Projects): unknown;
  resolveRecommendations(query: string, value: Recommendations): unknown;
  urgent(): unknown;
  cancelPending(): unknown;
  snapshot(): unknown;
  acceptedUrgent(count: number): boolean;
  dispose(): unknown;
};

declare global {
  interface Window {
    __dependencyUX?: RouteController & { readonly selectedArm: "native" | "react" };
  }
}

export function installDependencyUX(arm: "native" | "react",
  mount: (host: HTMLElement) => RouteController): void {
  const host = document.querySelector<HTMLElement>("#mount");
  if (!host) throw new Error("Dependency UX mount host is missing");
  const controller = mount(host);
  const button = document.createElement("button");
  button.id = "urgent";
  button.type = "button";
  button.textContent = "Urgent";
  button.addEventListener("click", () => controller.urgent());
  host.before(button);
  let disposed = false;
  const dispose = () => {
    if (disposed) return controller.snapshot();
    disposed = true;
    button.remove();
    return controller.dispose();
  };
  window.__dependencyUX = { ...controller, selectedArm: arm, dispose };
  window.addEventListener("pagehide", dispose, { once: true });
}
