import * as THREE from 'three';

export const OBJECTS = 256;
export const WARMUP = 12;
export const MEASURED = 60;
export type Arm = { scene: THREE.Scene; update(epoch: number): { published: boolean; counters?: Record<string, number> }; dispose(): Record<string, unknown> };
export const value = (epoch: number) => epoch;
export const makeObject = (id: number) => {
  const object = new THREE.Group(); object.name = `object-${id}`; object.userData.id = id;
  const motion = new THREE.Group();
  const child = new THREE.Group(); child.name = `child-${id}`;
  motion.add(child); object.add(motion);
  return object;
};
function expectedTransform(id: number, epoch: number): [number, number, number] {
  return id % 2 === 0
    ? [value(epoch) * .01, value(epoch) * .005, value(epoch) * .0001]
    : [value(epoch) * .0025, value(epoch) * .0075, value(epoch) * .0002];
}
export function inspect(scene: THREE.Scene, epoch: number, references: THREE.Object3D[], children: THREE.Object3D[]) {
  const objects = scene.getObjectByName('objects')?.children ?? [];
  if (objects.length !== OBJECTS) throw new Error(`membership ${objects.length}`);
  let checksum = 0;
  for (let id = 0; id < OBJECTS; id++) {
    const object = objects[id];
    if (object !== references[id] || object.name !== `object-${id}`) throw new Error(`identity ${id}`);
    const motion = object.children[0];
    if (!motion || motion.children[0] !== children[id] || children[id].name !== `child-${id}`)
      throw new Error(`retained child identity ${id}`);
    const expected = expectedTransform(id, epoch);
    const actual = [motion.position.x, motion.position.y, motion.rotation.z];
    for (let field = 0; field < 3; field++) {
      if (!Number.isFinite(actual[field]) || Math.abs(actual[field] - expected[field]) > 1e-9 * Math.max(1, Math.abs(expected[field])))
        throw new Error(`stale scene value ${id}/${field}: ${actual[field]} != ${expected[field]}`);
      checksum += actual[field] * (id + 1) * (field + 1);
    }
  }
  return { epoch, checksum, count: objects.length, retained: true };
}
export function draw(scene: THREE.Scene, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas2D unavailable');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1a4477';
  for (const [id, object] of scene.getObjectByName('objects')!.children.entries()) {
    const motion = object.children[0];
    const displacement = motion.position.x + motion.position.y + motion.rotation.z * 100;
    ctx.fillRect((id % 16) * 40 + displacement % 15, Math.floor(id / 16) * 30, 4, 4);
  }
}
export function start(arm: Arm) {
  const canvas = document.getElementById('surface') as HTMLCanvasElement;
  const references = [...(arm.scene.getObjectByName('objects')?.children ?? [])];
  const children = references.map(object => object.children[0]?.children[0]);
  if (children.some(child => !child)) throw new Error('Retained child missing at mount');
  const mount = inspect(arm.scene, 0, references, children as THREE.Object3D[]);
  let quantumMs = Infinity, lastClock = performance.now();
  for (let index = 0; index < 10_000; index++) {
    const now = performance.now();
    if (now > lastClock) quantumMs = Math.min(quantumMs, now - lastClock);
    lastClock = now;
  }
  const samples: Record<string, unknown>[] = [], warmupSamples: Record<string, unknown>[] = [];
  let frame = 0, priorRaf = 0, stopped = false, resolved = false;
  let resolveDone!: (result: Record<string, unknown>) => void;
  let rejectDone!: (error: unknown) => void;
  const done = new Promise<Record<string, unknown>>((resolve, reject) => { resolveDone = resolve; rejectDone = reject; });
  let raf = 0;
  const stop = () => {
    if (stopped) return { stopped: true };
    stopped = true; cancelAnimationFrame(raf);
    const teardownStart = performance.now();
    const cleanup = arm.dispose();
    return { stopped: true, cleanup, teardownMs: performance.now() - teardownStart };
  };
  const tick = (rafNow: number) => {
    if (stopped) return;
    try {
      frame++;
      const callbackEntry = performance.now();
      const updateStart = performance.now();
      const publication = arm.update(frame);
      const publishEnd = performance.now();
      if (!publication.published) throw new Error(`publication deferred at ${frame}`);
      const validationStart = performance.now();
      const state = inspect(arm.scene, frame, references, children as THREE.Object3D[]);
      const validationEnd = performance.now();
      const drawStart = performance.now();
      draw(arm.scene, canvas);
      const drawEnd = performance.now();
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      let pixelChecksum = 2166136261;
      for (let index = 0; index < pixels.length; index += 97)
        pixelChecksum = Math.imul(pixelChecksum ^ pixels[index], 16777619) >>> 0;
      const callbackEnd = performance.now();
      const frameState = { ...state, updateStart, publishEnd, drawStart, drawEnd,
        pixelChecksum,
        publishMs: publishEnd - updateStart, drawMs: drawEnd - drawStart,
        validationMs: validationEnd - validationStart,
        canvasReadbackAndHashMs: callbackEnd - drawEnd,
        updateThroughDrawMs: drawEnd - updateStart,
        callbackMs: callbackEnd - callbackEntry,
        stateAgeMs: drawStart - updateStart, rafIntervalMs: priorRaf ? rafNow - priorRaf : null,
        deadlineMissAt60HzReference: callbackEnd - rafNow > 1000 / 60,
        counters: publication.counters ?? null };
      priorRaf = rafNow;
      if (frame > WARMUP) samples.push(frameState);
      else warmupSamples.push(frameState);
      if (frame === WARMUP + MEASURED) {
        resolved = true;
        const teardown = stop();
        resolveDone({ mount, firstUpdate: warmupSamples[0], warmupSamples, samples,
          timerQuantumMs: Number.isFinite(quantumMs) ? quantumMs : null,
          teardown, warmup: WARMUP, measured: MEASURED,
          rendering: 'Three Object3D graph inspected, then common Canvas2D draw; no GPU renderer' });
      } else raf = requestAnimationFrame(tick);
    } catch (error) { stop(); rejectDone(error); }
  };
  raf = requestAnimationFrame(tick);
  window.addEventListener('pagehide', stop, { once: true });
  (window as Window & { realtimeHarness?: unknown }).realtimeHarness = { done, stop, get resolved() { return resolved; } };
}
