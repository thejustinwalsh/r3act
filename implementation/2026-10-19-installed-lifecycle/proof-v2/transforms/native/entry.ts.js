function createAuthoredLifecycleApi(selectedArm, mountScene) {
	let host = null;
	let controller = null;
	let retainedController = null;
	let row0 = null;
	let arm = null;
	let finalDiagnostics = null;
	function active() {
		if (!controller) throw new Error("scene is not mounted");
		return controller;
	}
	function resource(name) {
		if (!host) return {
			fallback: 0,
			ready: 0,
			text: null
		};
		const fallback = host.querySelectorAll(`[data-${name}="waiting"]`);
		const ready = host.querySelectorAll(`[data-${name}="ready"]`);
		const node = ready[0] ?? fallback[0];
		return {
			fallback: fallback.length,
			ready: ready.length,
			text: node?.textContent ?? null
		};
	}
	const api = {
		mount(nextArm) {
			if (host || controller || retainedController) throw new Error("previous scene must be released");
			if (nextArm !== selectedArm) throw new Error(`selected page only supports ${selectedArm}`);
			const element = document.createElement("section");
			element.dataset.arm = nextArm;
			document.body.append(element);
			try {
				const next = mountScene(element);
				host = element;
				controller = next;
				arm = nextArm;
				finalDiagnostics = null;
				row0 = null;
			} catch (error) {
				element.remove();
				throw error;
			}
		},
		clickRow() {
			const row = host?.querySelector("[data-row=\"0\"]");
			if (!row) throw new Error("row 0 missing");
			row0 ??= row;
			row.click();
		},
		update(step) {
			active().updateStep(step);
		},
		edit() {
			active().editRows();
		},
		settleDetail() {
			active().settleDetail();
		},
		settleHealth() {
			active().settleHealth();
		},
		inspect() {
			const rows = [...host?.querySelectorAll("[data-row]") ?? []].map((node) => ({
				id: Number(node.dataset.row),
				step: node.dataset.step ?? null,
				local: node.dataset.local ?? null,
				transform: node.style.transform,
				opacity: node.style.opacity,
				text: node.textContent ?? ""
			}));
			const currentRow0 = host?.querySelector("[data-row=\"0\"]") ?? null;
			return {
				arm,
				rows,
				row0Retained: row0 ? currentRow0 === row0 : null,
				detail: resource("detail"),
				health: resource("health"),
				diagnostics: controller?.diagnostics() ?? finalDiagnostics,
				remainingChildren: host?.childNodes.length ?? 0
			};
		},
		dispose(options) {
			const next = active();
			const diagnostics = next.dispose();
			const remainingChildren = host?.childNodes.length ?? 0;
			controller = null;
			finalDiagnostics = diagnostics;
			row0 = null;
			host?.remove();
			host = null;
			if (options.retain) retainedController = next;
			return {
				diagnostics,
				remainingChildren
			};
		},
		release() {
			if (controller) throw new Error("dispose before release");
			retainedController = null;
			finalDiagnostics = null;
			arm = null;
		}
	};
	return api;
}
export function installAuthoredLifecycle(selectedArm, mountScene) {
	if (window.__authoredLifecycle) throw new Error("authored lifecycle API already installed");
	window.__authoredLifecycle = createAuthoredLifecycleApi(selectedArm, mountScene);
}
