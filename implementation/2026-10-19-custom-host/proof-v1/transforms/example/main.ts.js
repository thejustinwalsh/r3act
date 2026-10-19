import { NativeRootWorkQueue, createNativeRoot, createStore, createWorld, jsx } from "@r3act/core";
import { createDOMRoot } from "@r3act/host-dom";
import { createThreeNativeRoot } from "@r3act/host-three";
import { Scene } from "three";
import { CanvasApp, DomApp } from "./app";
import { ThreeApp } from "./scene";
import { Brush, RetainedCanvasHost } from "./retained_host";
export function mountNative(host) {
	const domElement = document.createElement("div");
	const canvasElement = document.createElement("canvas");
	canvasElement.width = 240;
	canvasElement.height = 216;
	const context = canvasElement.getContext("2d");
	if (!context) throw new Error("Canvas 2D context is unavailable");
	host.append(domElement, canvasElement);
	const world = createWorld();
	const stage = createStore("A");
	const scene = new Scene();
	const dom = createDOMRoot(domElement, {
		world,
		rootId: "custom-host-dom"
	});
	const three = createThreeNativeRoot(scene, { rootOptions: {
		world,
		rootId: "custom-host-three"
	} });
	const canvasHost = new RetainedCanvasHost();
	const container = canvasHost.createContainer();
	const canvas = createNativeRoot(canvasHost, container, {
		world,
		rootId: "custom-host-canvas"
	});
	const publications = new NativeRootWorkQueue();
	const shared = new Brush("#4775ad"), owned = new Brush("#7d5fbd"), borrowed = new Brush("#a65d4b");
	let brushes = {
		"shared-a": {
			brush: shared,
			ownership: "owned"
		},
		"shared-b": {
			brush: shared,
			ownership: "owned"
		},
		owned: {
			brush: owned,
			ownership: "owned"
		},
		borrowed: {
			brush: borrowed,
			ownership: "borrowed"
		}
	};
	const refs = {
		"shared-a": { current: null },
		"shared-b": { current: null },
		owned: { current: null },
		borrowed: { current: null }
	};
	const payloads = {
		"shared-a": { label: "shared-a" },
		"shared-b": { label: "shared-b" },
		owned: { label: "owned" },
		borrowed: { label: "borrowed" }
	};
	const life = {
		mounts: 0,
		cleanups: 0
	};
	let rows = [
		"shared-a",
		"shared-b",
		"owned",
		"borrowed"
	];
	let disposed = false;
	let staleNode = refs["shared-a"].current;
	let borrowedAtHostDisposal = null;
	const publicationObservations = [];
	const domTree = () => jsx(DomApp, { stage });
	const threeTree = () => jsx(ThreeApp, { stage });
	const canvasTree = () => jsx(CanvasApp, {
		stage,
		rows,
		brushes,
		refs,
		payloads,
		life
	});
	const draw = () => {
		context.clearRect(0, 0, canvasElement.width, canvasElement.height);
		canvasHost.draw(context);
	};
	const updateCanvas = () => {
		canvas.update(canvasTree());
		draw();
	};
	const active = () => {
		if (disposed) throw new Error("Custom host example is disposed");
	};
	dom.mount(domTree());
	three.root.mount(threeTree());
	canvas.mount(canvasTree());
	draw();
	const unsubscribeStage = stage.subscribe(canvas.rootId, () => {
		if (stage.getStateForRoot(canvas.rootId) !== "B") return;
		const stageCommand = canvasHost.frame().find((command) => command.name === "stage");
		publicationObservations.push({
			domStage: domElement.querySelector("[data-stage]")?.getAttribute("data-stage") ?? null,
			threeStage: scene.getObjectByName("custom-host-scene")?.children[0]?.name ?? null,
			canvasStage: stageCommand?.kind === "text" ? stageCommand.text : null,
			versions: {
				dom: dom.version,
				three: three.root.version,
				canvas: canvas.version
			}
		});
	});
	const snapshot = () => ({
		domStage: domElement.querySelector("[data-stage]")?.getAttribute("data-stage") ?? null,
		threeStage: scene.getObjectByName("custom-host-scene")?.children[0]?.name ?? null,
		frame: canvasHost.frame(),
		canvas: {
			width: canvasElement.width,
			height: canvasElement.height
		},
		rows: [...rows],
		refs: Object.fromEntries(Object.entries(refs).map(([id, ref]) => [id, {
			live: ref.current?.live ?? false,
			name: ref.current?.name ?? null
		}])),
		life: { ...life },
		brushes: {
			shared: shared.disposeCalls,
			owned: owned.disposeCalls,
			replacement: brushes.owned.brush === owned ? null : brushes.owned.brush.disposeCalls,
			borrowed: borrowed.disposeCalls,
			borrowedAtHostDisposal
		},
		host: canvasHost.diagnostics(),
		roots: {
			dom: dom.diagnostics(),
			three: three.root.diagnostics(),
			canvas: canvas.diagnostics()
		},
		store: stage.diagnostics(),
		stageHead: stage.getState(),
		publicationObservations: publicationObservations.map((entry) => ({
			...entry,
			versions: { ...entry.versions }
		})),
		disposed
	});
	return {
		snapshot,
		handle(id) {
			return refs[id].current;
		},
		click(id) {
			active();
			const node = refs[id].current;
			if (!node) throw new Error(`No mounted ${id} row`);
			canvasHost.dispatch(node, "click");
			canvas.flush();
			draw();
			return snapshot();
		},
		move() {
			active();
			const order = [
				"borrowed",
				"owned",
				"shared-b",
				"shared-a"
			];
			rows = order.filter((id) => rows.includes(id));
			updateCanvas();
			return snapshot();
		},
		removeSharedFirst() {
			active();
			staleNode = refs["shared-a"].current;
			rows = rows.filter((id) => id !== "shared-a");
			updateCanvas();
			return snapshot();
		},
		removeSharedLast() {
			active();
			rows = rows.filter((id) => id !== "shared-b");
			updateCanvas();
			return snapshot();
		},
		replaceOwnedBrush() {
			active();
			brushes = {
				...brushes,
				owned: {
					brush: new Brush("#227e70"),
					ownership: "owned"
				}
			};
			updateCanvas();
			return snapshot();
		},
		lateClick() {
			if (!staleNode) return false;
			return canvasHost.dispatch(staleNode, "click");
		},
		async publishB() {
			active();
			let resolveSettled;
			const settled = new Promise((resolve) => {
				resolveSettled = resolve;
			});
			stage.beginTransition("stage-B", [
				dom.rootId,
				three.root.rootId,
				canvas.rootId
			]);
			stage.dispatch("B", {
				kind: "transition",
				transitionId: "stage-B"
			});
			publications.enqueue({
				id: "stage-B-all",
				transitions: ["stage-B"],
				finishTransitions: true,
				roots: [
					{
						root: dom,
						tree: domTree()
					},
					{
						root: three.root,
						tree: threeTree()
					},
					{
						root: canvas,
						tree: canvasTree()
					}
				],
				onSettled: resolveSettled
			});
			const outcome = await settled;
			if (disposed && outcome.status === "cancelled") return snapshot();
			if (outcome.status !== "committed") throw outcome.error ?? new Error(`Three-root publication: ${outcome.status}`);
			if (!disposed) draw();
			return snapshot();
		},
		dispose() {
			if (disposed) return snapshot();
			disposed = true;
			const errors = [];
			for (const cleanup of [
				() => unsubscribeStage(),
				() => publications.dispose(),
				() => dom.dispose(),
				() => three.dispose(),
				() => canvas.dispose(),
				() => canvasHost.dispose()
			]) {
				try {
					cleanup();
				} catch (error) {
					errors.push(error);
				}
			}
			borrowedAtHostDisposal = borrowed.disposeCalls;
			try {
				borrowed.dispose();
			} catch (error) {
				errors.push(error);
			}
			for (const cleanup of [() => domElement.remove(), () => canvasElement.remove()]) {
				try {
					cleanup();
				} catch (error) {
					errors.push(error);
				}
			}
			if (errors.length) throw new AggregateError(errors, "Custom host example disposal failed");
			return snapshot();
		}
	};
}
const element = document.querySelector("#app");
if (element) {
	const controller = mountNative(element);
	window.customHostDemo = controller;
	const dispose = () => {
		controller.dispose();
	};
	window.addEventListener("pagehide", dispose, { once: true });
	if (import.meta.hot) import.meta.hot.dispose(() => {
		window.removeEventListener("pagehide", dispose);
		dispose();
	});
}
