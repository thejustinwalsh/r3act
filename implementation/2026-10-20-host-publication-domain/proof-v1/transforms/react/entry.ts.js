export function installForkedUX(selectedArm, mountArm) {
	const host = document.querySelector("#mount");
	if (!host) throw new Error("Forked UX mount host is missing");
	let controller;
	let urgentButton;
	let disposed = false;
	const driver = {
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
		}
	};
	window.__forkedUX = driver;
	window.addEventListener("pagehide", () => {
		if (controller && !disposed) driver.dispose();
	}, { once: true });
}
