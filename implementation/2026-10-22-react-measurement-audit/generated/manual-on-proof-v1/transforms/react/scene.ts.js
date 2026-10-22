import * as THREE from "three";
export const OBJECTS = 256;
export const WARMUP = 12;
export const MEASURED = 60;
export const WIDTH = 640;
export const HEIGHT = 480;
export const value = (epoch) => epoch;
export const gridX = (id) => (id % 16 - 7.5) * .45;
export const gridY = (id) => (Math.floor(id / 16) - 7.5) * .45;
export function applyCommonRendererSettings(renderer) {
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.NoToneMapping;
}
export function createView() {
	const canvas = document.getElementById("surface");
	const renderer = new THREE.WebGLRenderer({
		canvas,
		antialias: false,
		alpha: false,
		preserveDrawingBuffer: true
	});
	renderer.setPixelRatio(1);
	renderer.setSize(WIDTH, HEIGHT, false);
	applyCommonRendererSettings(renderer);
	const scene = new THREE.Scene();
	scene.background = new THREE.Color("#000000");
	const camera = Object.assign(new THREE.OrthographicCamera(-4, 4, 4, -4, .1, 100), { manual: true });
	camera.position.z = 10;
	camera.updateProjectionMatrix();
	scene.add(camera);
	return {
		scene,
		camera,
		renderer
	};
}
export const makeObject = (id) => {
	const object = new THREE.Group();
	object.name = `object-${id}`;
	object.userData.id = id;
	object.position.x = gridX(id);
	object.position.y = gridY(id);
	const motion = new THREE.Group();
	const child = new THREE.Group();
	child.name = `child-${id}`;
	child.add(new THREE.Mesh(new THREE.BoxGeometry(.12, .12, .12), new THREE.MeshBasicMaterial({ color: "orange" })));
	motion.add(child);
	object.add(motion);
	return object;
};
function expectedTransform(id, epoch) {
	return id % 2 === 0 ? [
		value(epoch) * .01,
		value(epoch) * .005,
		value(epoch) * 1e-4
	] : [
		value(epoch) * .0025,
		value(epoch) * .0075,
		value(epoch) * 2e-4
	];
}
export function inspect(scene, epoch, references, children) {
	const objects = scene.getObjectByName("objects")?.children ?? [];
	if (objects.length !== OBJECTS) throw new Error(`membership ${objects.length}`);
	let checksum = 0;
	for (let id = 0; id < OBJECTS; id++) {
		const object = objects[id];
		if (object !== references[id] || object.name !== `object-${id}`) throw new Error(`identity ${id}`);
		if (Math.abs(object.position.x - gridX(id)) > 1e-10 || Math.abs(object.position.y - gridY(id)) > 1e-10) throw new Error(`grid position ${id}`);
		const motion = object.children[0];
		if (!motion || motion.children[0] !== children[id] || children[id].name !== `child-${id}`) throw new Error(`retained child identity ${id}`);
		const mesh = children[id].children[0];
		if (!(mesh instanceof THREE.Mesh) || !(mesh.geometry instanceof THREE.BoxGeometry) || !(mesh.material instanceof THREE.MeshBasicMaterial)) throw new Error(`retained resource ${id}`);
		const expected = expectedTransform(id, epoch);
		const actual = [
			motion.position.x,
			motion.position.y,
			motion.rotation.z
		];
		for (let field = 0; field < 3; field++) {
			if (!Number.isFinite(actual[field]) || Math.abs(actual[field] - expected[field]) > 1e-9 * Math.max(1, Math.abs(expected[field]))) throw new Error(`stale scene value ${id}/${field}: ${actual[field]} != ${expected[field]}`);
			checksum += actual[field] * (id + 1) * (field + 1);
		}
	}
	return {
		epoch,
		checksum,
		count: objects.length,
		retained: true
	};
}
export function draw(view) {
	view.renderer.render(view.scene, view.camera);
	const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
	const gl = view.renderer.getContext();
	gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
	let hash = 2166136261;
	for (let index = 0; index < pixels.length; index += 97) hash = Math.imul(hash ^ pixels[index], 16777619) >>> 0;
	let litPixels = 0;
	for (let index = 0; index < pixels.length; index += 4) if (pixels[index] || pixels[index + 1] || pixels[index + 2]) litPixels++;
	return {
		pixelChecksum: hash,
		litPixels
	};
}
export function start(arm) {
	if (arm.renderer.outputColorSpace !== THREE.SRGBColorSpace || arm.renderer.toneMapping !== THREE.NoToneMapping || arm.renderer.getPixelRatio() !== 1) throw new Error("Common WebGL renderer settings drifted");
	if (arm.camera.manual !== true || arm.camera.left !== -4 || arm.camera.right !== 4 || arm.camera.top !== 4 || arm.camera.bottom !== -4) throw new Error("Manual orthographic camera bounds drifted");
	const gl = arm.renderer.getContext();
	const debug = gl.getExtension("WEBGL_debug_renderer_info");
	const rendererInfo = {
		version: String(gl.getParameter(gl.VERSION)),
		renderer: String(gl.getParameter(gl.RENDERER)),
		unmaskedRenderer: debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : null,
		outputColorSpace: arm.renderer.outputColorSpace,
		toneMapping: arm.renderer.toneMapping,
		pixelRatio: arm.renderer.getPixelRatio(),
		antialias: gl.getContextAttributes()?.antialias,
		preserveDrawingBuffer: gl.getContextAttributes()?.preserveDrawingBuffer,
		drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
		camera: {
			manual: true,
			left: arm.camera.left,
			right: arm.camera.right,
			top: arm.camera.top,
			bottom: arm.camera.bottom,
			near: arm.camera.near,
			far: arm.camera.far,
			projectionMatrix: Array.from(arm.camera.projectionMatrix.elements)
		}
	};
	const references = [...arm.scene.getObjectByName("objects")?.children ?? []];
	const children = references.map((object) => object.children[0]?.children[0]);
	if (children.some((child) => !child)) throw new Error("Retained child missing at mount");
	const resources = new Set();
	const disposalEvents = new Map();
	let signalDisposed = null;
	const allDisposed = new Promise((resolve) => {
		signalDisposed = resolve;
	});
	for (const child of children) {
		const mesh = child.children[0];
		for (const resource of [mesh.geometry, mesh.material]) {
			resources.add(resource);
			resource.addEventListener("dispose", () => {
				disposalEvents.set(resource, (disposalEvents.get(resource) ?? 0) + 1);
				if (disposalEvents.size === resources.size) signalDisposed?.();
			});
		}
	}
	arm.controlProof();
	const mount = inspect(arm.scene, 0, references, children);
	let quantumMs = Infinity, lastClock = performance.now();
	for (let index = 0; index < 1e4; index++) {
		const now = performance.now();
		if (now > lastClock) quantumMs = Math.min(quantumMs, now - lastClock);
		lastClock = now;
	}
	const samples = [], warmupSamples = [];
	let frame = 0, priorRaf = 0, stopped = false, resolved = false;
	let resolveDone;
	let rejectDone;
	const done = new Promise((resolve, reject) => {
		resolveDone = resolve;
		rejectDone = reject;
	});
	let raf = 0;
	const stop = async () => {
		if (stopped) return { stopped: true };
		stopped = true;
		cancelAnimationFrame(raf);
		const teardownStart = performance.now();
		let cleanup;
		try {
			cleanup = await arm.dispose();
			let timeout;
			try {
				await Promise.race([allDisposed, new Promise((_, reject) => {
					timeout = setTimeout(() => reject(new Error("Resource disposal deadline")), 1e4);
				})]);
			} finally {
				clearTimeout(timeout);
			}
			await new Promise((resolve) => {
				if (typeof requestIdleCallback === "function") requestIdleCallback(() => resolve(), { timeout: 1e3 });
				else setTimeout(resolve, 0);
			});
			if (disposalEvents.size !== resources.size || [...disposalEvents.values()].some((count) => count !== 1)) throw new Error("Resource disposal must occur exactly once per geometry and material");
			return {
				stopped: true,
				cleanup,
				resourcesExpected: resources.size,
				resourcesDisposed: disposalEvents.size,
				duplicateDisposalEvents: [...disposalEvents.values()].filter((count) => count !== 1).length,
				teardownMs: performance.now() - teardownStart
			};
		} finally {
			arm.renderer.dispose();
		}
	};
	const tick = async (rafNow) => {
		if (stopped) return;
		try {
			frame++;
			const callbackEntry = performance.now();
			const updateStart = performance.now();
			const publication = arm.update(frame);
			const publishEnd = performance.now();
			if (!publication.published) throw new Error(`publication deferred at ${frame}`);
			const validationStart = performance.now();
			if (arm.camera.left !== -4 || arm.camera.right !== 4 || arm.camera.top !== 4 || arm.camera.bottom !== -4 || gl.drawingBufferWidth !== WIDTH || gl.drawingBufferHeight !== HEIGHT || arm.camera.projectionMatrix.elements.some((entry, index) => !Object.is(entry, rendererInfo.camera.projectionMatrix[index]))) throw new Error(`camera projection drift at ${frame}`);
			const state = inspect(arm.scene, frame, references, children);
			const validationEnd = performance.now();
			const drawStart = performance.now();
			const { pixelChecksum, litPixels } = draw(arm);
			if (litPixels === 0) throw new Error("WebGL output is empty");
			const drawEnd = performance.now();
			const callbackEnd = performance.now();
			const frameState = {
				...state,
				updateStart,
				publishEnd,
				drawStart,
				drawEnd,
				pixelChecksum,
				litPixels,
				publishMs: publishEnd - updateStart,
				drawMs: drawEnd - drawStart,
				validationMs: validationEnd - validationStart,
				webglRenderAndReadbackMs: drawEnd - drawStart,
				updateThroughDrawMs: drawEnd - updateStart,
				callbackMs: callbackEnd - callbackEntry,
				stateAgeMs: drawStart - updateStart,
				rafIntervalMs: priorRaf ? rafNow - priorRaf : null,
				deadlineMissAt60HzReference: callbackEnd - rafNow > 1e3 / 60,
				counters: publication.counters ?? null
			};
			priorRaf = rafNow;
			if (frame > WARMUP) samples.push(frameState);
			else warmupSamples.push(frameState);
			if (frame === WARMUP + MEASURED) {
				resolved = true;
				const teardown = await stop();
				resolveDone({
					mount,
					rendererInfo,
					firstUpdate: warmupSamples[0],
					warmupSamples,
					samples,
					timerQuantumMs: Number.isFinite(quantumMs) ? quantumMs : null,
					teardown,
					warmup: WARMUP,
					measured: MEASURED,
					rendering: "Shared WebGLRenderer render/readPixels after Three Object3D graph validation; no presentation claim"
				});
			} else raf = requestAnimationFrame(tick);
		} catch (error) {
			try {
				await stop();
			} catch (cleanupError) {
				rejectDone(new AggregateError([error, cleanupError]));
				return;
			}
			rejectDone(error);
		}
	};
	window.realtimeManualHarness = {
		arm,
		inspect(epoch) {
			if (stopped || !Number.isSafeInteger(epoch) || epoch < 0) throw new Error("Invalid manual inspection epoch");
			const started = performance.now();
			const marker = arm.scene.getObjectByName("accepted-frame")?.position.x;
			if (marker !== epoch) throw new Error("Manual marker publication mismatch");
			const state = inspect(arm.scene, epoch, references, children);
			return {
				...state,
				marker,
				valuesChecked: OBJECTS * 3 + 1,
				validationMs: performance.now() - started
			};
		},
		draw() {
			if (stopped) throw new Error("Manual harness stopped");
			return draw(arm);
		},
		stop
	};
	window.addEventListener("pagehide", () => {
		void stop();
	}, { once: true });
	window.realtimeHarness = {
		done,
		stop,
		get resolved() {
			return resolved;
		}
	};
}
