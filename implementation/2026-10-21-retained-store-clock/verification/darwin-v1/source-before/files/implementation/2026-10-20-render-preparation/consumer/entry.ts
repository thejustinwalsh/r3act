type ActionName = "beginB" | "catchUpFork" | "beginC" | "resolveA" |
  "resolveB" | "resolveC" | "cancel" | "urgent";

type Controller = {
  beginB(): unknown;
  catchUpFork(): unknown;
  beginC(): unknown;
  resolveA(): unknown;
  resolveB(): unknown;
  resolveC(): unknown;
  cancel(): unknown;
  urgent(): unknown;
  snapshot(): unknown;
  dispose(): unknown;
};

export type ForkedUXDriver = {
  readonly selectedArm: "native" | "react";
  mount(): void;
  action(name: ActionName): Promise<unknown>;
  snapshot(): unknown;
  dispose(): unknown;
};

declare global {
  interface Window { __forkedUX?: ForkedUXDriver }
}

export function installForkedUX(
  selectedArm: ForkedUXDriver["selectedArm"],
  mountArm: (host: HTMLElement) => Controller,
): void {
  const host = document.querySelector<HTMLElement>("#mount");
  if (!host) throw new Error("Forked UX mount host is missing");
  let controller: Controller | undefined;
  let urgentButton: HTMLButtonElement | undefined;
  let disposed = false;

  const driver: ForkedUXDriver = {
    selectedArm,
    mount() {
      if (controller && !disposed) throw new Error("Forked UX arm is already mounted");
      host.replaceChildren();
      controller = mountArm(host);
      disposed = false;
      urgentButton = document.createElement("button");
      urgentButton.id = "urgent";
      urgentButton.type = "button";
      urgentButton.textContent = "Urgent";
      urgentButton.addEventListener("click", () => controller?.urgent());
      host.before(urgentButton);
    },
    async action(name) {
      if (!controller) throw new Error("Forked UX arm has not mounted");
      if (name === "urgent") {
        if (disposed || !urgentButton) throw new Error("Forked UX arm is disposed");
        urgentButton.click();
        return controller.snapshot();
      }
      return await controller[name]();
    },
    snapshot() {
      if (!controller) throw new Error("Forked UX arm has not mounted");
      return controller.snapshot();
    },
    dispose() {
      if (!controller) throw new Error("Forked UX arm has not mounted");
      urgentButton?.remove();
      urgentButton = undefined;
      disposed = true;
      return controller.dispose();
    },
  };
  window.__forkedUX = driver;
  window.addEventListener("pagehide", () => {
    if (controller && !disposed) driver.dispose();
  }, { once: true });
}
