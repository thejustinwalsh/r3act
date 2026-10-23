export function installDependencyUX(arm, mount) {
	const host = document.querySelector("#mount");
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
	window.__dependencyUX = {
		...controller,
		selectedArm: arm,
		dispose
	};
	window.addEventListener("pagehide", dispose, { once: true });
}
