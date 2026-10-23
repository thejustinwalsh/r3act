import { c as _c } from "react/compiler-runtime";
/** @jsxImportSource react */
import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber/legacy";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function NavigationPanel(t0) {
	const $ = _c(14);
	const { store } = t0;
	const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
	let t1;
	if ($[0] !== state.urgentHead) {
		t1 = /* @__PURE__ */ _jsx("output", {
			"data-urgent": state.urgentHead,
			children: state.urgentHead
		});
		$[0] = state.urgentHead;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	let t2;
	if ($[2] !== state.nav.label || $[3] !== state.nav.projectCount || $[4] !== state.nav.query) {
		t2 = /* @__PURE__ */ _jsxs("output", {
			"data-navigation": state.nav.query,
			"data-label": state.nav.label,
			"data-project-count": state.nav.projectCount,
			children: [
				state.nav.label,
				" · ",
				state.nav.projectCount,
				" projects"
			]
		});
		$[2] = state.nav.label;
		$[3] = state.nav.projectCount;
		$[4] = state.nav.query;
		$[5] = t2;
	} else {
		t2 = $[5];
	}
	let t3;
	let t4;
	if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
		t3 = { antialias: false };
		t4 = {
			width: 240,
			height: 120
		};
		$[6] = t3;
		$[7] = t4;
	} else {
		t3 = $[6];
		t4 = $[7];
	}
	let t5;
	if ($[8] !== store) {
		t5 = /* @__PURE__ */ _jsx(Canvas, {
			frameloop: "never",
			gl: t3,
			style: t4,
			children: /* @__PURE__ */ _jsx(ThreePanel, { store })
		});
		$[8] = store;
		$[9] = t5;
	} else {
		t5 = $[9];
	}
	let t6;
	if ($[10] !== t1 || $[11] !== t2 || $[12] !== t5) {
		t6 = /* @__PURE__ */ _jsxs("section", {
			"data-root": "navigation",
			children: [
				t1,
				t2,
				t5
			]
		});
		$[10] = t1;
		$[11] = t2;
		$[12] = t5;
		$[13] = t6;
	} else {
		t6 = $[13];
	}
	return t6;
}
function ThreePanel(t0) {
	const $ = _c(7);
	const { store } = t0;
	const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
	const name = `navigation-${state.nav.query}-${state.nav.projectCount}-urgent-${state.urgentHead}`;
	const group = useRef(null);
	let t1;
	if ($[0] !== store) {
		t1 = () => {
			if (group.current) {
				store.observeThree(group.current.name);
			}
		};
		$[0] = store;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	let t2;
	if ($[2] !== name || $[3] !== store) {
		t2 = [name, store];
		$[2] = name;
		$[3] = store;
		$[4] = t2;
	} else {
		t2 = $[4];
	}
	useLayoutEffect(t1, t2);
	let t3;
	if ($[5] !== name) {
		t3 = /* @__PURE__ */ _jsx("group", {
			ref: group,
			name
		});
		$[5] = name;
		$[6] = t3;
	} else {
		t3 = $[6];
	}
	return t3;
}
function RecommendationPanel(t0) {
	const $ = _c(8);
	const { store } = t0;
	const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
	let t1;
	if ($[0] !== state.urgentHead) {
		t1 = /* @__PURE__ */ _jsx("output", {
			"data-urgent": state.urgentHead,
			children: state.urgentHead
		});
		$[0] = state.urgentHead;
		$[1] = t1;
	} else {
		t1 = $[1];
	}
	let t2;
	if ($[2] !== state.fork.label || $[3] !== state.fork.query) {
		t2 = /* @__PURE__ */ _jsx("output", {
			"data-recommendations": state.fork.query,
			"data-recommendation-label": state.fork.label,
			children: state.fork.label
		});
		$[2] = state.fork.label;
		$[3] = state.fork.query;
		$[4] = t2;
	} else {
		t2 = $[4];
	}
	let t3;
	if ($[5] !== t1 || $[6] !== t2) {
		t3 = /* @__PURE__ */ _jsxs("section", {
			"data-root": "recommendations",
			children: [t1, t2]
		});
		$[5] = t1;
		$[6] = t2;
		$[7] = t3;
	} else {
		t3 = $[7];
	}
	return t3;
}
function deferred() {
	let resolve;
	const promise = new Promise((yes) => {
		resolve = yes;
	});
	return {
		promise,
		resolve
	};
}
export function mountReact(host) {
	const navHost = document.createElement("div");
	const forkHost = document.createElement("div");
	host.append(navHost, forkHost);
	const navRoot = createRoot(navHost);
	const forkRoot = createRoot(forkHost);
	const listeners = new Set();
	const trace = [];
	const settled = [];
	const providers = new Map();
	const controllers = new Map();
	const navCache = new Map();
	let queryHead = "A", urgentHead = 0, navGeneration = 0, forkGeneration = 0;
	let nav = {
		query: "A",
		label: "Initial",
		projectCount: 0
	};
	let fork = {
		query: "A",
		label: "Initial"
	};
	let threeName = null;
	let disposed = false;
	let view = {
		nav,
		fork,
		urgentHead
	};
	const subscribe = (listener) => {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	};
	const getSnapshot = () => view;
	const store = {
		subscribe,
		getSnapshot,
		observeThree(name) {
			threeName = name;
			window.dispatchEvent(new Event("dependency-three-commit"));
		}
	};
	const publish = () => {
		view = {
			nav,
			fork,
			urgentHead
		};
		for (const listener of [...listeners]) listener();
	};
	const provider = (kind, key) => {
		const id = `${kind}:${key}`;
		let entry = providers.get(id);
		if (!entry) {
			entry = deferred();
			providers.set(id, entry);
			controllers.set(id, new AbortController());
			trace.push({
				kind,
				key,
				event: "start",
				atMs: performance.now()
			});
		}
		return entry.promise;
	};
	const resolve = (kind, key, value) => {
		const id = `${kind}:${key}`;
		const entry = providers.get(id);
		if (!entry) throw new Error(`Unknown ${id} resolution`);
		providers.delete(id);
		trace.push({
			kind,
			key,
			event: "resolve",
			atMs: performance.now()
		});
		entry.resolve(value);
	};
	const abort = (kind, key) => {
		const id = `${kind}:${key}`;
		const controller = controllers.get(id);
		if (!controller || controller.signal.aborted) return;
		controller.abort();
		trace.push({
			kind,
			key,
			event: "abort",
			atMs: performance.now()
		});
	};
	const read = (element, selector, attribute) => element.querySelector(selector)?.getAttribute(attribute) ?? null;
	navRoot.render(/* @__PURE__ */ _jsx(NavigationPanel, { store }));
	forkRoot.render(/* @__PURE__ */ _jsx(RecommendationPanel, { store }));
	const snapshot = () => ({
		navigation: {
			query: read(navHost, "[data-navigation]", "data-navigation"),
			label: read(navHost, "[data-label]", "data-label"),
			projectCount: read(navHost, "[data-project-count]", "data-project-count"),
			urgent: read(navHost, "[data-urgent]", "data-urgent")
		},
		fork: {
			query: read(forkHost, "[data-recommendations]", "data-recommendations"),
			label: read(forkHost, "[data-recommendation-label]", "data-recommendation-label"),
			urgent: read(forkHost, "[data-urgent]", "data-urgent")
		},
		three: threeName,
		queryHead,
		urgentHead,
		providerTrace: [...trace],
		settlementTrace: [...settled],
		navigationWork: null,
		forkWork: null,
		scopeEntries: providers.size,
		accepted: null,
		disposed
	});
	const acceptedUrgent = (count) => {
		const expected = String(count);
		const navQuery = read(navHost, "[data-navigation]", "data-navigation");
		const projectCount = read(navHost, "[data-project-count]", "data-project-count");
		return navQuery !== null && navQuery !== "pending" && read(forkHost, "[data-recommendations]", "data-recommendations") !== null && read(navHost, "[data-urgent]", "data-urgent") === expected && read(forkHost, "[data-urgent]", "data-urgent") === expected && threeName === `navigation-${navQuery}-${projectCount}-urgent-${expected}`;
	};
	return {
		begin(query) {
			if (disposed) throw new Error("Dependency route disposed");
			queryHead = query;
			const navTicket = ++navGeneration;
			const forkTicket = ++forkGeneration;
			const profile = provider("profile", query);
			const permissions = provider("permissions", query);
			const recommendations = provider("recommendations", query);
			const projects = profile.then((value) => provider("projects", value.accountId));
			void Promise.all([
				profile,
				permissions,
				projects
			]).then(([p, permission, project]) => {
				let next = navCache.get(query);
				if (!next) {
					next = {
						query: p.query,
						label: `${p.name} · ${permission.level}`,
						projectCount: project.titles.length
					};
					navCache.set(query, next);
				}
				if (!disposed && navTicket === navGeneration) {
					nav = next;
					settled.push({
						lane: "navigation",
						status: "committed"
					});
					publish();
				}
			});
			void recommendations.then((next) => {
				if (!disposed && forkTicket === forkGeneration) {
					fork = next;
					settled.push({
						lane: "fork",
						status: "committed"
					});
					publish();
				}
			});
			return snapshot();
		},
		resolveProfile(query, value) {
			resolve("profile", query, Object.freeze({ ...value }));
			return snapshot();
		},
		resolvePermissions(query, value) {
			resolve("permissions", query, Object.freeze({ ...value }));
			return snapshot();
		},
		resolveProjects(accountId, value) {
			resolve("projects", accountId, Object.freeze({
				...value,
				titles: Object.freeze([...value.titles])
			}));
			return snapshot();
		},
		resolveRecommendations(query, value) {
			resolve("recommendations", query, Object.freeze({ ...value }));
			return snapshot();
		},
		urgent() {
			if (disposed) throw new Error("Dependency route disposed");
			urgentHead++;
			publish();
		},
		cancelPending() {
			++forkGeneration;
			abort("recommendations", queryHead);
			return snapshot();
		},
		snapshot,
		acceptedUrgent,
		dispose() {
			if (disposed) return snapshot();
			disposed = true;
			++navGeneration;
			++forkGeneration;
			for (const id of controllers.keys()) {
				const [kind, ...key] = id.split(":");
				abort(kind, key.join(":"));
			}
			navRoot.unmount();
			forkRoot.unmount();
			navHost.remove();
			forkHost.remove();
			threeName = null;
			listeners.clear();
			return snapshot();
		}
	};
}
