import * as THREE from "three";
export const OBJECTS = 256;
export const WARMUP = 12;
export const MEASURED = 60;
export const value = (id, epoch) => epoch === 0 ? 0 : id % 2 === 0 ? id * .015 + epoch * .25 : id * .003 + epoch * .018;
export const makeObject = (id) => {
	const object = new THREE.Group();
	object.name = `object-${id}`;
	object.userData.id = id;
	return object;
};
export function inspect(scene, epoch, references) {
	const objects = scene.children[0]?.children ?? [];
	if (objects.length !== OBJECTS) throw new Error(`membership ${objects.length}`);
	let checksum = 0;
	for (let id = 0; id < OBJECTS; id++) {
		const object = objects[id];
		if (object !== references[id] || object.name !== `object-${id}`) throw new Error(`identity ${id}`);
		const expected = value(id, epoch), actual = id % 2 === 0 ? object.position.x : object.rotation.z;
		if (!Number.isFinite(actual) || Math.abs(actual - expected) > 1e-9) throw new Error(`stale scene value ${id}: ${actual} != ${expected}`);
		checksum += actual * (id + 1);
	}
	return {
		epoch,
		checksum,
		count: objects.length,
		retained: true
	};
}
export function draw(scene, canvas) {
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas2D unavailable");
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "#1a4477";
	for (const [id, object] of scene.children[0].children.entries()) {
		const displacement = id % 2 === 0 ? object.position.x : object.rotation.z;
		ctx.fillRect(id % 16 * 40 + displacement % 15, Math.floor(id / 16) * 30, 4, 4);
	}
}
export function start(arm) {
	const canvas = document.getElementById("surface");
	const references = [...arm.scene.children[0].children];
	const mount = inspect(arm.scene, 0, references);
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
	const stop = () => {
		if (stopped) return { stopped: true };
		stopped = true;
		cancelAnimationFrame(raf);
		const teardownStart = performance.now();
		const cleanup = arm.dispose();
		return {
			stopped: true,
			cleanup,
			teardownMs: performance.now() - teardownStart
		};
	};
	const tick = (rafNow) => {
		if (stopped) return;
		try {
			frame++;
			const callbackEntry = performance.now();
			const updateStart = performance.now();
			const publication = arm.update(frame);
			const publishEnd = performance.now();
			if (!publication.published) throw new Error(`publication deferred at ${frame}`);
			const validationStart = performance.now();
			const state = inspect(arm.scene, frame, references);
			const validationEnd = performance.now();
			const drawStart = performance.now();
			draw(arm.scene, canvas);
			const drawEnd = performance.now();
			const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
			let pixelChecksum = 2166136261;
			for (let index = 0; index < pixels.length; index += 97) pixelChecksum = Math.imul(pixelChecksum ^ pixels[index], 16777619) >>> 0;
			const callbackEnd = performance.now();
			const frameState = {
				...state,
				updateStart,
				publishEnd,
				drawStart,
				drawEnd,
				pixelChecksum,
				publishMs: publishEnd - updateStart,
				drawMs: drawEnd - drawStart,
				validationMs: validationEnd - validationStart,
				canvasReadbackAndHashMs: callbackEnd - drawEnd,
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
				const teardown = stop();
				resolveDone({
					mount,
					firstUpdate: warmupSamples[0],
					warmupSamples,
					samples,
					timerQuantumMs: Number.isFinite(quantumMs) ? quantumMs : null,
					teardown,
					warmup: WARMUP,
					measured: MEASURED,
					rendering: "Three Object3D graph inspected, then common Canvas2D draw; no GPU renderer"
				});
			} else raf = requestAnimationFrame(tick);
		} catch (error) {
			stop();
			rejectDone(error);
		}
	};
	raf = requestAnimationFrame(tick);
	window.addEventListener("pagehide", stop, { once: true });
	window.realtimeHarness = {
		done,
		stop,
		get resolved() {
			return resolved;
		}
	};
}
