import { c as _c } from "react/compiler-runtime";
/** @jsxImportSource react */
import { startTransition, Suspense, use, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Scene } from "three";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
function deferred() {
	let finish;
	const promise = new Promise((resolve) => {
		finish = resolve;
	});
	const provider = {
		promise,
		status: "pending",
		resolve(value) {
			if (provider.status !== "pending") throw new Error("provider resolved twice");
			provider.status = "resolved";
			finish(value);
		}
	};
	return provider;
}
const accepted = {
	query: "A",
	detail: "ready-A",
	catalog: "shared-catalog"
};
const initial = Promise.resolve(accepted);
const position = (query) => query === "A" ? 1 : query === "B" ? 2 : 3;
export function mountReact(host) {
	const primaryHost = document.createElement("div"), forkHost = document.createElement("div");
	host.append(primaryHost, forkHost);
	const scene = new Scene(), group = new Group();
	group.name = "forked-transitions";
	scene.add(group);
	const queryGroup = new Group();
	queryGroup.name = "query-A";
	group.add(queryGroup);
	const urgentGroup = new Group();
	urgentGroup.name = "urgent-0";
	group.add(urgentGroup);
	const borrowedGeometry = new BoxGeometry(.5, .5, .5);
	const borrowedMaterial = new MeshBasicMaterial({ color: "#89a4bf" });
	const borrowed = new Mesh(borrowedGeometry, borrowedMaterial);
	borrowed.name = "borrowed";
	group.add(borrowed);
	const borrowedDisposed = {
		geometry: 0,
		material: 0
	};
	borrowedGeometry.addEventListener("dispose", () => {
		borrowedDisposed.geometry++;
	});
	borrowedMaterial.addEventListener("dispose", () => {
		borrowedDisposed.material++;
	});
	const owned = {
		createdGeometry: 0,
		disposedGeometry: 0,
		createdMaterial: 0,
		disposedMaterial: 0
	};
	let resultMesh = null;
	let urgent = 0, queryHead = "A", forkHead = "A";
	let disposed = false, borrowedAtHostDisposal = null;
	let primarySetter = null;
	let forkSetter = null;
	const listeners = new Set();
	const providers = {
		A: deferred(),
		B: deferred(),
		C: deferred()
	};
	const life = {
		effectRuns: 0,
		effectCleanups: 0,
		resourceStarts: 0,
		resourceSettlements: 0,
		resourceCancellations: 0,
		primaryMounts: 0,
		primaryCleanups: 0,
		forkMounts: 0,
		forkCleanups: 0
	};
	const providerTrace = [];
	const logicalRetirements = [];
	const subscribe = (listener) => {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	};
	const notify = () => {
		for (const listener of [...listeners]) listener();
	};
	const getPrimary = () => `${queryHead}:${urgent}`;
	const getFork = () => `${forkHead}:${urgent}`;
	const beginProvider = (query) => {
		providerTrace.push({
			query,
			event: "start"
		});
		life.resourceStarts++;
	};
	const retire = (query) => {
		logicalRetirements.push(query);
		life.resourceCancellations++;
	};
	function Projection(t0) {
		const $ = _c(14);
		const { target } = t0;
		const state = useSyncExternalStore(subscribe, target === "primary" ? getPrimary : getFork);
		let t1;
		if ($[0] !== state) {
			t1 = state.split(":");
			$[0] = state;
			$[1] = t1;
		} else {
			t1 = $[1];
		}
		const [query, count] = t1;
		let t2;
		let t3;
		if ($[2] !== count || $[3] !== query || $[4] !== target) {
			t2 = () => {
				if (target === "primary") {
					queryGroup.name = `query-${query}`;
					urgentGroup.name = `urgent-${count}`;
				}
			};
			t3 = [
				target,
				query,
				count
			];
			$[2] = count;
			$[3] = query;
			$[4] = target;
			$[5] = t2;
			$[6] = t3;
		} else {
			t2 = $[5];
			t3 = $[6];
		}
		useLayoutEffect(t2, t3);
		let t4;
		if ($[7] !== query) {
			t4 = /* @__PURE__ */ _jsx("output", {
				"data-query": query,
				children: query
			});
			$[7] = query;
			$[8] = t4;
		} else {
			t4 = $[8];
		}
		let t5;
		if ($[9] !== count) {
			t5 = /* @__PURE__ */ _jsx("output", {
				"data-urgent": count,
				children: count
			});
			$[9] = count;
			$[10] = t5;
		} else {
			t5 = $[10];
		}
		let t6;
		if ($[11] !== t4 || $[12] !== t5) {
			t6 = /* @__PURE__ */ _jsxs(_Fragment, { children: [t4, t5] });
			$[11] = t4;
			$[12] = t5;
			$[13] = t6;
		} else {
			t6 = $[13];
		}
		return t6;
	}
	function Result(t0) {
		const $ = _c(14);
		const { promise, target } = t0;
		const value = use(promise);
		const requestedQuery = useSyncExternalStore(subscribe, target === "primary" ? getPrimary : getFork).split(":")[0];
		let t1;
		let t2;
		if ($[0] !== target) {
			t1 = () => {
				if (target === "primary") {
					life.primaryMounts = life.primaryMounts + 1;
				} else {
					life.forkMounts = life.forkMounts + 1;
				}
				return () => {
					if (target === "primary") {
						life.primaryCleanups = life.primaryCleanups + 1;
					} else {
						life.forkCleanups = life.forkCleanups + 1;
					}
				};
			};
			t2 = [target];
			$[0] = target;
			$[1] = t1;
			$[2] = t2;
		} else {
			t1 = $[1];
			t2 = $[2];
		}
		useLayoutEffect(t1, t2);
		let t3;
		if ($[3] !== target || $[4] !== value.query) {
			t3 = () => {
				life.effectRuns = life.effectRuns + 1;
				if (target === "primary") {
					if (resultMesh) {
						resultMesh.name = `result-${value.query}`;
						resultMesh.position.x = position(value.query);
					}
				}
				return _temp;
			};
			$[3] = target;
			$[4] = value.query;
			$[5] = t3;
		} else {
			t3 = $[5];
		}
		let t4;
		if ($[6] !== target || $[7] !== value) {
			t4 = [target, value];
			$[6] = target;
			$[7] = value;
			$[8] = t4;
		} else {
			t4 = $[8];
		}
		useLayoutEffect(t3, t4);
		const t5 = requestedQuery === value.query ? undefined : "detail";
		let t6;
		if ($[9] !== t5 || $[10] !== value.catalog || $[11] !== value.detail || $[12] !== value.query) {
			t6 = /* @__PURE__ */ _jsxs("output", {
				"data-result": value.query,
				"data-detail": value.detail,
				"data-pending": t5,
				children: [
					value.query,
					": ",
					value.detail,
					" · ",
					value.catalog
				]
			});
			$[9] = t5;
			$[10] = value.catalog;
			$[11] = value.detail;
			$[12] = value.query;
			$[13] = t6;
		} else {
			t6 = $[13];
		}
		return t6;
	}
	function _temp() {
		life.effectCleanups = life.effectCleanups + 1;
	}
	function App(t0) {
		const $ = _c(23);
		const { target } = t0;
		const [resource, setResource] = useState(initial);
		let t1;
		let t2;
		if ($[0] !== target) {
			t1 = () => {
				if (target === "primary") {
					primarySetter = setResource;
				} else {
					forkSetter = setResource;
				}
				return () => {
					if (target === "primary") {
						primarySetter = null;
					} else {
						forkSetter = null;
					}
				};
			};
			t2 = [target, setResource];
			$[0] = target;
			$[1] = t1;
			$[2] = t2;
		} else {
			t1 = $[1];
			t2 = $[2];
		}
		useLayoutEffect(t1, t2);
		let t3;
		let t4;
		if ($[3] !== target) {
			t3 = () => {
				if (target !== "primary") {
					return;
				}
				const geometry = new BoxGeometry(1, 1, 1);
				const material = new MeshBasicMaterial({ color: "#4775ad" });
				owned.createdGeometry = owned.createdGeometry + 1;
				owned.createdMaterial = owned.createdMaterial + 1;
				const mesh = new Mesh(geometry, material);
				mesh.name = `result-${accepted.query}`;
				mesh.position.x = position(accepted.query);
				group.add(mesh);
				resultMesh = mesh;
				return () => {
					group.remove(mesh);
					resultMesh = null;
					geometry.dispose();
					material.dispose();
					owned.disposedGeometry = owned.disposedGeometry + 1;
					owned.disposedMaterial = owned.disposedMaterial + 1;
				};
			};
			t4 = [target];
			$[3] = target;
			$[4] = t3;
			$[5] = t4;
		} else {
			t3 = $[4];
			t4 = $[5];
		}
		useLayoutEffect(t3, t4);
		const t5 = target === "primary" ? "Workspace" : "Forked inspector";
		let t6;
		if ($[6] !== t5) {
			t6 = /* @__PURE__ */ _jsx("h2", { children: t5 });
			$[6] = t5;
			$[7] = t6;
		} else {
			t6 = $[7];
		}
		let t7;
		if ($[8] !== target) {
			t7 = /* @__PURE__ */ _jsx(Projection, { target });
			$[8] = target;
			$[9] = t7;
		} else {
			t7 = $[9];
		}
		let t8;
		if ($[10] !== target) {
			t8 = /* @__PURE__ */ _jsx("output", {
				"data-startup": target,
				children: "Loading"
			});
			$[10] = target;
			$[11] = t8;
		} else {
			t8 = $[11];
		}
		let t9;
		if ($[12] !== resource || $[13] !== target) {
			t9 = /* @__PURE__ */ _jsx(Result, {
				promise: resource,
				target
			});
			$[12] = resource;
			$[13] = target;
			$[14] = t9;
		} else {
			t9 = $[14];
		}
		let t10;
		if ($[15] !== t8 || $[16] !== t9) {
			t10 = /* @__PURE__ */ _jsx(Suspense, {
				fallback: t8,
				children: t9
			});
			$[15] = t8;
			$[16] = t9;
			$[17] = t10;
		} else {
			t10 = $[17];
		}
		let t11;
		if ($[18] !== t10 || $[19] !== t6 || $[20] !== t7 || $[21] !== target) {
			t11 = /* @__PURE__ */ _jsxs("section", {
				"data-root": target,
				children: [
					t6,
					t7,
					t10
				]
			});
			$[18] = t10;
			$[19] = t6;
			$[20] = t7;
			$[21] = target;
			$[22] = t11;
		} else {
			t11 = $[22];
		}
		return t11;
	}
	const primaryRoot = createRoot(primaryHost), forkRoot = createRoot(forkHost);
	primaryRoot.render(/* @__PURE__ */ _jsx(App, { target: "primary" }));
	forkRoot.render(/* @__PURE__ */ _jsx(App, { target: "fork" }));
	const current = (rootName, field) => host.querySelector(`[data-root="${rootName}"] [data-${field}]`)?.getAttribute(`data-${field}`) ?? null;
	const snapshot = () => ({
		primary: {
			query: current("primary", "query"),
			urgent: current("primary", "urgent"),
			result: current("primary", "result"),
			detail: current("primary", "detail"),
			pending: current("primary", "pending")
		},
		fork: {
			query: current("fork", "query"),
			urgent: current("fork", "urgent"),
			result: current("fork", "result"),
			detail: current("fork", "detail"),
			pending: current("fork", "pending")
		},
		three: {
			query: queryGroup.name,
			urgent: urgentGroup.name,
			result: resultMesh?.name ?? null,
			resultPosition: resultMesh?.position.x ?? null,
			children: scene.children.length,
			resultHandleId: resultMesh?.uuid ?? null,
			resultGeometryId: resultMesh?.geometry.uuid ?? null,
			resultMaterialId: (resultMesh?.material)?.uuid ?? null
		},
		queryHead,
		urgentHead: urgent,
		providers: {
			A: providers.A.status,
			B: providers.B.status,
			C: providers.C.status
		},
		providerTrace: [...providerTrace],
		logicalRetirements: [...logicalRetirements],
		life: { ...life },
		owned: { ...owned },
		borrowedDisposed: { ...borrowedDisposed },
		borrowedAtHostDisposal,
		listenerCount: listeners.size
	});
	function requireReady() {
		if (disposed || !primarySetter || !forkSetter) throw new Error("React roots not ready or disposed");
	}
	function settle(query, detail) {
		providers[query].resolve({
			query,
			detail,
			catalog: "shared-catalog"
		});
		providerTrace.push({
			query,
			event: "resolve"
		});
		life.resourceSettlements++;
	}
	return {
		beginB() {
			requireReady();
			queryHead = "B";
			notify();
			beginProvider("B");
			beginProvider("A");
			startTransition(() => {
				primarySetter(providers.B.promise);
				forkSetter(providers.A.promise);
			});
		},
		catchUpFork() {
			requireReady();
			if (queryHead !== "B") throw new Error("fork catch-up requires pending B");
			forkHead = "B";
			retire("A");
			notify();
			startTransition(() => forkSetter(providers.B.promise));
		},
		urgent() {
			requireReady();
			urgent++;
			notify();
		},
		beginC() {
			requireReady();
			if (forkHead !== "B") throw new Error("C requires converged B");
			queryHead = "C";
			forkHead = "C";
			retire("B");
			beginProvider("C");
			notify();
			startTransition(() => {
				primarySetter(providers.C.promise);
				forkSetter(providers.C.promise);
			});
		},
		resolveA() {
			settle("A", "late-A");
		},
		resolveB() {
			settle("B", "late-B");
		},
		resolveC() {
			settle("C", "ready-C");
		},
		cancel() {
			if (disposed) return;
			for (const query of [
				"A",
				"B",
				"C"
			]) if (providerTrace.some((item) => item.query === query && item.event === "start") && !logicalRetirements.includes(query)) retire(query);
			if (primarySetter && forkSetter) startTransition(() => {
				primarySetter(initial);
				forkSetter(initial);
			});
		},
		snapshot,
		dispose() {
			if (disposed) return {
				...snapshot(),
				hostChildren: host.childNodes.length,
				sceneChildren: scene.children.length
			};
			disposed = true;
			primaryRoot.unmount();
			forkRoot.unmount();
			group.remove(queryGroup, urgentGroup, borrowed);
			scene.remove(group);
			borrowedAtHostDisposal = { ...borrowedDisposed };
			borrowedGeometry.dispose();
			borrowedMaterial.dispose();
			primaryHost.remove();
			forkHost.remove();
			return {
				...snapshot(),
				hostChildren: host.childNodes.length,
				sceneChildren: scene.children.length
			};
		}
	};
}
