import { AsyncResource, AsyncTaskDemandScope, NativeTaskTransitionQueue, createStore, defineProviderDemand, definePureDerivedDemand, jsx } from "@r3act/core";
import { createDOMRoot } from "@r3act/host-dom";
import { createThreeNativeRoot } from "@r3act/host-three";
import { Scene } from "three";
import { NavigationApp, RecommendationsApp, ThreeApp, deriveNavigation, routeTasks, profileTask } from "./app";
const deferred = () => {
	let resolve;
	const promise = new Promise((yes) => {
		resolve = yes;
	});
	return {
		promise,
		resolve
	};
};
export function mountNative(host) {
	const navHost = document.createElement("div");
	const forkHost = document.createElement("div");
	host.append(navHost, forkHost);
	const scene = new Scene();
	const navigationRoot = createDOMRoot(navHost, { rootId: "dependency-navigation" });
	const forkRoot = createDOMRoot(forkHost, { rootId: "dependency-fork" });
	const three = createThreeNativeRoot(scene, { rootOptions: { rootId: "dependency-three" } });
	const transitions = new NativeTaskTransitionQueue();
	const demandScope = new AsyncTaskDemandScope();
	const query = createStore("A");
	const urgent = createStore(0);
	const trace = [];
	const pending = new Map();
	const settled = [];
	let routeHandle = null;
	let nextRoute = 0;
	let disposed = false;
	const start = (kind, key, signal) => {
		trace.push({
			kind,
			key,
			event: "start",
			atMs: performance.now()
		});
		signal.addEventListener("abort", () => trace.push({
			kind,
			key,
			event: "abort",
			atMs: performance.now()
		}), { once: true });
		const result = deferred();
		const id = `${kind}:${key}`;
		const queue = pending.get(id) ?? [];
		queue.push(result);
		pending.set(id, queue);
		return result.promise;
	};
	const provider = Object.freeze({
		profile: (value, signal) => start("profile", value, signal),
		permissions: (value, signal) => start("permissions", value, signal),
		projects: (value, signal) => start("projects", value, signal),
		recommendations: (value, signal) => start("recommendations", value, signal)
	});
	const revision = profileTask.compiled?.moduleRevision ?? "authored-route-v1";
	const identities = {
		profile: {},
		permissions: {},
		projects: {},
		navigation: {},
		recommendations: {}
	};
	const valueCapture = (value) => Object.freeze({
		identity: value,
		version: 0,
		value
	});
	const providerCapture = valueCapture(provider);
	const queryCaptures = (inputs) => Object.freeze([providerCapture, valueCapture(String(inputs.get("$query")))]);
	const demands = new Map([
		["profile", {
			definition: defineProviderDemand(identities.profile, revision, (captures, signal) => provider.profile(String(captures[1].value), signal)),
			captures: queryCaptures
		}],
		["permissions", {
			definition: defineProviderDemand(identities.permissions, revision, (captures, signal) => provider.permissions(String(captures[1].value), signal)),
			captures: queryCaptures
		}],
		["projects", {
			definition: defineProviderDemand(identities.projects, revision, (captures, signal) => provider.projects(captures[1].value.accountId, signal)),
			captures: (inputs) => Object.freeze([providerCapture, valueCapture(inputs.get("profile"))])
		}],
		["navigation", {
			definition: definePureDerivedDemand(identities.navigation, revision, (captures) => deriveNavigation(captures[0].value, captures[1].value, captures[2].value)),
			captures: (inputs) => Object.freeze([
				valueCapture(inputs.get("profile")),
				valueCapture(inputs.get("permissions")),
				valueCapture(inputs.get("projects"))
			])
		}],
		["recommendations", {
			definition: defineProviderDemand(identities.recommendations, revision, (captures, signal) => provider.recommendations(String(captures[1].value), signal)),
			captures: queryCaptures
		}]
	]);
	const initialNav = new AsyncResource(Promise.resolve(Object.freeze({
		query: "A",
		label: "Initial",
		projectCount: 0
	})));
	const initialRecommendations = new AsyncResource(Promise.resolve(Object.freeze({
		query: "A",
		label: "Initial"
	})));
	const navigationTree = (resource) => jsx(NavigationApp, {
		resource,
		urgent
	});
	const recommendationsTree = (resource) => jsx(RecommendationsApp, {
		resource,
		urgent
	});
	const threeTree = (resource) => jsx(ThreeApp, {
		resource,
		urgent
	});
	navigationRoot.mount(navigationTree(initialNav));
	forkRoot.mount(recommendationsTree(initialRecommendations));
	three.root.mount(threeTree(initialNav));
	const requireActive = () => {
		if (disposed) throw new Error("Dependency route is disposed");
	};
	const resolve = (kind, key, value) => {
		trace.push({
			kind,
			key,
			event: "resolve",
			atMs: performance.now()
		});
		const id = `${kind}:${key}`;
		for (const request of pending.get(id) ?? []) request.resolve(value);
		pending.delete(id);
	};
	const read = (element, selector, attribute) => element.querySelector(selector)?.getAttribute(attribute) ?? null;
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
		three: scene.children[0]?.name ?? null,
		queryHead: query.getState(),
		urgentHead: urgent.getState(),
		providerTrace: [...trace],
		settlementTrace: [...settled],
		routeWork: routeHandle?.snapshot() ?? null,
		scopeEntries: demandScope.size,
		accepted: {
			navigation: JSON.stringify(navigationRoot.snapshot),
			fork: JSON.stringify(forkRoot.snapshot),
			three: JSON.stringify(three.root.snapshot)
		},
		disposed
	});
	const acceptedUrgent = (count) => {
		const expected = String(count);
		const navQuery = read(navHost, "[data-navigation]", "data-navigation");
		const projectCount = read(navHost, "[data-project-count]", "data-project-count");
		return navQuery !== null && navQuery !== "pending" && read(forkHost, "[data-recommendations]", "data-recommendations") !== null && read(navHost, "[data-urgent]", "data-urgent") === expected && read(forkHost, "[data-urgent]", "data-urgent") === expected && scene.children[0]?.name === `navigation-${navQuery}-${projectCount}-urgent-${expected}`;
	};
	return {
		begin(value) {
			requireActive();
			query.dispatch(value);
			routeHandle = transitions.enqueue(routeTasks, [
				{
					root: navigationRoot,
					buildTree: (execution) => navigationTree(execution.resource("navigation"))
				},
				{
					root: three.root,
					buildTree: (execution) => threeTree(execution.resource("navigation"))
				},
				{
					root: forkRoot,
					buildTree: (execution) => recommendationsTree(execution.resource("recommendations"))
				}
			], {
				id: `route-${++nextRoute}-${value}`,
				key: "dependency-route",
				reveal: "independent",
				renderPreparation: "repeatable",
				inputs: { "$provider": provider },
				liveInputs: { "$query": query },
				demandScope,
				demands,
				onSettled: (outcome) => settled.push({
					lane: "route",
					status: outcome.status
				})
			});
			return snapshot();
		},
		resolveProfile(value, profile) {
			resolve("profile", value, Object.freeze({ ...profile }));
			return snapshot();
		},
		resolvePermissions(value, permissions) {
			resolve("permissions", value, Object.freeze({ ...permissions }));
			return snapshot();
		},
		resolveProjects(accountId, projects) {
			resolve("projects", accountId, Object.freeze({
				...projects,
				titles: Object.freeze([...projects.titles])
			}));
			return snapshot();
		},
		resolveRecommendations(value, recommendations) {
			resolve("recommendations", value, Object.freeze({ ...recommendations }));
			return snapshot();
		},
		urgent() {
			requireActive();
			urgent.dispatch(urgent.getState() + 1);
			navigationRoot.flush();
			forkRoot.flush();
			three.root.flush();
		},
		cancelPending() {
			requireActive();
			routeHandle?.cancel("Pending fork recommendation cancelled");
			return snapshot();
		},
		snapshot,
		acceptedUrgent,
		dispose() {
			if (disposed) return snapshot();
			disposed = true;
			const errors = [];
			for (const cleanup of [
				() => transitions.dispose(),
				() => demandScope.dispose(),
				() => navigationRoot.dispose(),
				() => forkRoot.dispose(),
				() => three.dispose(),
				() => navHost.remove(),
				() => forkHost.remove()
			]) {
				try {
					cleanup();
				} catch (error) {
					errors.push(error);
				}
			}
			if (errors.length) throw new AggregateError(errors, "Dependency route disposal failed");
			return snapshot();
		}
	};
}
const host = document.querySelector("#app");
if (host) {
	const controller = mountNative(host);
	window.dependencyScoped = controller;
	const dispose = () => controller.dispose();
	window.addEventListener("pagehide", dispose, { once: true });
	if (import.meta.hot) import.meta.hot.dispose(() => {
		window.removeEventListener("pagehide", dispose);
		dispose();
	});
}
