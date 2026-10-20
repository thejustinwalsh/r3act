export function installClosedRows(mount) {
	let app = null;
	Object.assign(window, { closedRows: {
		mount() {
			if (app) throw new Error("Already mounted");
			app = mount(document.querySelector("#mount"));
			return app.inspect();
		},
		step(index) {
			if (!app) throw new Error("Not mounted");
			app.step(index);
		},
		inspect() {
			if (!app) throw new Error("Not mounted");
			return app.inspect();
		},
		dispose() {
			if (!app) throw new Error("Not mounted");
			const result = app.dispose();
			app = null;
			return result;
		}
	} });
}
