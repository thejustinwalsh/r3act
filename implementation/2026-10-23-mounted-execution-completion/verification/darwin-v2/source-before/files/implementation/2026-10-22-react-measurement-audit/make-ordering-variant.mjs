import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, '../2026-10-22-native-frame-publication/proof-canvas-v3/dist/react');
const asset = 'assets/react-Dn0IWIE6.js';
const expectedSha256 = '6d67971492a2766a8e770d21cc101b0b595df0ec5db291c0f4829acbdca6a832';
const sha256 = value => createHash('sha256').update(value).digest('hex');

// This function is serialized into a browser init script by the separate collector.
export function initReactBoundaryAudit() {
  if (globalThis.__reactBoundaryAudit) throw new Error('React boundary audit already installed');
  const events = [];
  const restores = [];
  const hostIds = new WeakMap();
  const windows = new Map();
  let phase = 'setup';
  let currentEpoch = 0;
  let installed = false;
  let restoreRender = null;
  const anchors = { 'update-start': 'scene.tick:updateStart', 'publish-end': 'scene.tick:publishEnd', input: 'react.clock.dispatch:entry', snapshot: 'react.clock.dispatch:snapshot', 'listener-begin': 'react.clock.dispatch:listener-before', 'listener-end': 'react.clock.dispatch:listener-after', render: 'react.Position|Rotation|FrameMarker:after-useSyncExternalStore', commit: 'r3f.commitUpdate:entry', write: 'Three.per-instance-property:setter', checkpoint: 'scene.tick:post-publish-checkpoint', 'observers-installed': 'scene.start:before-controlProof', 'renderer-enter': 'Three.WebGLRenderer.render:entry', 'renderer-exit': 'Three.WebGLRenderer.render:exit', 'app-render': 'react.App:entry', 'get-snapshot': 'react.clock.getSnapshot:read', 'root-render': 'react-reconciler.renderRootSync:entry', 'root-commit': 'react-reconciler.commitRoot:entry', 'teardown-start': 'scene.stop:before-arm.dispose' };
  function record(kind, detail = {}, epoch = currentEpoch) {
    events.push({ kind, sourceAnchor: anchors[kind], epoch, phase, atMs: performance.now(), ...detail });
  }
  function observe(target, key, id, field) {
    if (!target || typeof target !== 'object') throw new Error(`Missing target ${id}/${field}`);
    const own = Object.getOwnPropertyDescriptor(target, key);
    let inherited = own;
    if (!inherited) {
      let proto = Object.getPrototypeOf(target);
      while (proto && !inherited) { inherited = Object.getOwnPropertyDescriptor(proto, key); proto = Object.getPrototypeOf(proto); }
    }
    if (!inherited || (own && !own.configurable)) throw new Error(`Unsupported descriptor ${id}/${field}`);
    const accessor = 'get' in inherited || 'set' in inherited;
    if (accessor && (!inherited.get || !inherited.set)) throw new Error(`Unsupported accessor ${id}/${field}`);
    if (!accessor && !inherited.writable) throw new Error(`Unwritable property ${id}/${field}`);
    let value = target[key];
    Object.defineProperty(target, key, {
      configurable: true, enumerable: inherited.enumerable,
      get() { return accessor ? inherited.get.call(this) : value; },
      set(next) {
        const previous = accessor ? inherited.get.call(this) : value;
        if (accessor) inherited.set.call(this, next); else value = next;
        const accepted = accessor ? inherited.get.call(this) : value;
        record('write', { id, field, previous, value: accepted });
      },
    });
    restores.push(() => {
      if (own) Object.defineProperty(target, key, accessor ? own : { ...own, value });
      else if (accessor) delete target[key];
      else Object.defineProperty(target, key, { configurable: true, enumerable: true, writable: true, value });
    });
  }
  function install(scene, renderer) {
    if (installed) throw new Error('Observers already installed');
    if (!renderer || typeof renderer.render !== 'function') throw new Error('Expected shared WebGLRenderer');
    const objects = scene.getObjectByName('objects')?.children;
    const marker = scene.getObjectByName('accepted-frame');
    if (!objects || objects.length !== 256 || !marker) throw new Error('Expected 256 motion groups and marker');
    objects.forEach((outer, id) => {
      const motion = outer.children[0];
      if (!motion || motion.name !== '' || motion.children.length !== 1) throw new Error(`Motion host ${id} changed`);
      hostIds.set(motion, id);
      observe(motion.position, 'x', id, 'position-x');
      observe(motion.position, 'y', id, 'position-y');
      observe(motion.rotation, 'z', id, 'rotation-z');
    });
    hostIds.set(marker, 'marker');
    observe(marker.position, 'x', 'marker', 'position-x');
    if (restores.length !== 769) throw new Error(`Expected 769 observers, got ${restores.length}`);
    const originalRender = renderer.render;
    renderer.render = function (...args) {
      record('renderer-enter');
      let originalThrew = false;
      try { return originalRender.apply(this, args); }
      catch (error) { originalThrew = true; throw error; }
      finally {
        if (originalThrew) { try { record('renderer-exit', { threw: true }); } catch {} }
        else record('renderer-exit', { threw: false });
      }
    };
    restoreRender = () => { renderer.render = originalRender; };
    installed = true;
    record('observers-installed', { count: restores.length });
  }
  function expected(id, field, epoch) {
    if (id === 'marker') return epoch;
    if (field === 'position-x') return epoch * (id % 2 === 0 ? .01 : .0025);
    if (field === 'position-y') return epoch * (id % 2 === 0 ? .005 : .0075);
    return epoch * (id % 2 === 0 ? .0001 : .0002);
  }
  function close(a, b) { return typeof a === 'number' && Number.isFinite(a) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b)); }
  const audit = {
    events,
    install,
    begin(epoch, updateStart) {
      if (!installed || phase === 'update' || windows.has(epoch)) throw new Error(`Invalid begin ${epoch}`);
      currentEpoch = epoch;
      phase = 'update';
      windows.set(epoch, { updateStart, publishEnd: null });
      record('update-start', { originalAtMs: updateStart });
    },
    end(epoch, publishEnd) {
      const window = windows.get(epoch);
      if (phase !== 'update' || currentEpoch !== epoch || !window) throw new Error(`Invalid end ${epoch}`);
      window.publishEnd = publishEnd;
      record('publish-end', { originalAtMs: publishEnd });
      phase = 'after-update';
    },
    input(frame) { record('input', { framePhase: frame.phase }, frame.epoch); },
    getSnapshot() { record('get-snapshot'); },
    appRender() { record('app-render'); },
    rootRender() { record('root-render'); },
    rootCommit() { record('root-commit'); },
    snapshot(frame) { record('snapshot', { framePhase: frame.phase }, frame.epoch); },
    listenerBegin(epoch) { record('listener-begin', {}, epoch); },
    listenerEnd(epoch) { record('listener-end', {}, epoch); },
    render(component, id, epoch) { record('render', { component, id }, epoch); },
    commit(object, props) {
      const id = hostIds.get(object);
      if (id === undefined) return;
      record('commit', { id, props: ['position-x', 'position-y', 'rotation-z'].filter(key => Object.hasOwn(props, key)) });
    },
    checkpoint(epoch, label) { record('checkpoint', { label }, epoch); },
    teardown() { phase = 'teardown'; record('teardown-start'); },
    summarize() {
      const frames = [];
      const violations = [];
      for (let epoch = 1; epoch <= 72; epoch++) {
        const window = windows.get(epoch);
        if (!window || !Number.isFinite(window.updateStart) || !Number.isFinite(window.publishEnd)) {
          violations.push({ epoch, reason: 'missing-timer-window' });
          continue;
        }
        const relevant = events.filter(event => event.epoch === epoch && event.phase !== 'teardown');
        const count = kind => relevant.filter(event => event.kind === kind).length;
        const writes = relevant.filter(event => event.kind === 'write');
        const keys = new Set();
        for (const event of relevant) {
          if (!['input', 'snapshot', 'listener-begin', 'listener-end', 'render', 'commit', 'write', 'root-render', 'root-commit'].includes(event.kind)) continue;
          if (event.phase !== 'update' || event.atMs < window.updateStart || event.atMs > window.publishEnd)
            violations.push({ epoch, reason: 'work-outside-original-update-window', kind: event.kind, id: event.id, field: event.field, atMs: event.atMs, phase: event.phase });
        }
        for (const event of writes) {
          const key = `${event.id}/${event.field}`;
          if (keys.has(key)) violations.push({ epoch, reason: 'duplicate-write', key });
          keys.add(key);
          if (!close(event.previous, expected(event.id, event.field, epoch - 1)) || !close(event.value, expected(event.id, event.field, epoch)))
            violations.push({ epoch, reason: 'wrong-old-or-new-value', key, previous: event.previous, value: event.value });
        }
        const drawEvents = relevant.filter(event => event.kind === 'renderer-enter' || event.kind === 'renderer-exit');
        for (const event of drawEvents) {
          if (event.phase !== 'after-update' || event.atMs < window.publishEnd)
            violations.push({ epoch, reason: 'renderer-during-or-before-update', kind: event.kind, atMs: event.atMs, phase: event.phase });
          if (event.kind === 'renderer-exit' && event.threw) violations.push({ epoch, reason: 'renderer-threw' });
        }
        if (drawEvents.length === 2 && (drawEvents[0].kind !== 'renderer-enter' || drawEvents[1].kind !== 'renderer-exit' || drawEvents[1].atMs < drawEvents[0].atMs))
          violations.push({ epoch, reason: 'renderer-entry-exit-order' });
        const afterUpdate = relevant.filter(event => event.phase === 'after-update');
        const afterUpdateCounts = Object.fromEntries([...new Set(afterUpdate.map(event => event.kind))].sort().map(kind => [kind, afterUpdate.filter(event => event.kind === kind).length]));
        const counts = { input: count('input'), snapshot: count('snapshot'), getSnapshot: count('get-snapshot'), appRender: count('app-render'), listenerBegin: count('listener-begin'), listenerEnd: count('listener-end'), render: count('render'), commit: count('commit'), write: writes.length, rendererEnter: count('renderer-enter'), rendererExit: count('renderer-exit'), rootRender: count('root-render'), rootCommit: count('root-commit') };
        if (counts.input !== 1 || counts.snapshot !== 1 || counts.appRender !== 0 || counts.listenerBegin !== 257 || counts.listenerEnd !== 257 || counts.render !== 257 || counts.commit !== 257 || counts.write !== 769 || keys.size !== 769 || counts.rendererEnter !== 1 || counts.rendererExit !== 1 || counts.rootRender !== 1 || counts.rootCommit !== 1)
          violations.push({ epoch, reason: 'unexpected-work-counts', counts, uniqueWrites: keys.size });
        frames.push({ epoch, cohort: epoch <= 12 ? 'warmup' : 'measured', ...window, counts, uniqueWrites: keys.size, afterUpdateCounts, afterUpdateFirstAtMs: afterUpdate[0]?.atMs ?? null, afterUpdateLastAtMs: afterUpdate.at(-1)?.atMs ?? null, checkpoints: relevant.filter(event => event.kind === 'checkpoint').map(event => ({ label: event.label, atMs: event.atMs, phase: event.phase })) });
      }
      const teardownEvents = events.filter(event => event.phase === 'teardown');
      const teardownEventCounts = Object.fromEntries([...new Set(teardownEvents.map(event => event.kind))].sort().map(kind => [kind, teardownEvents.filter(event => event.kind === kind).length]));
      return { status: violations.length ? 'FAIL' : 'PASS', source: 'instrumented-ordering-only', originalTimingValid: false, installedObservers: restores.length, eventCount: events.length, setupEventCount: events.filter(event => event.phase === 'setup').length, teardownEventCount: teardownEvents.length, teardownEventCounts, frames, violations };
    },
    cleanup() { restoreRender?.(); restoreRender = null; while (restores.length) restores.pop()(); phase = 'teardown'; },
  };
  globalThis.__reactBoundaryAudit = audit;
  return audit;
}

const patches = [
  ['root-render', '\t\t\tfunction mu(t, r, a) {\n\t\t\t\tvar l = de;\n\t\t\t\tde |= 2;', '\t\t\tfunction mu(t, r, a) {\n\t\t\t\tglobalThis.__reactBoundaryAudit.rootRender();\n\t\t\t\tvar l = de;\n\t\t\t\tde |= 2;'],
  ['root-commit', '\t\t\tfunction Cp(t, r, a, l, c, d, h) {\n\t\t\t\tvar y = r.lanes | r.childLanes;', '\t\t\tfunction Cp(t, r, a, l, c, d, h) {\n\t\t\t\tglobalThis.__reactBoundaryAudit.rootCommit();\n\t\t\t\tvar y = r.lanes | r.childLanes;'],
  ['install', '\tarm.controlProof();\n\tconst mount = inspect(arm.scene, 0, references, children);', '\tglobalThis.__reactBoundaryAudit.install(arm.scene, arm.renderer);\n\tarm.controlProof();\n\tconst mount = inspect(arm.scene, 0, references, children);'],
  ['timer-start', '\t\t\tconst updateStart = performance.now();\n\t\t\tconst publication = arm.update(frame);', '\t\t\tconst updateStart = performance.now();\n\t\t\tglobalThis.__reactBoundaryAudit.begin(frame, updateStart);\n\t\t\tconst publication = arm.update(frame);'],
  ['timer-end', '\t\t\tconst publishEnd = performance.now();\n\t\t\tif (!publication.published)', '\t\t\tconst publishEnd = performance.now();\n\t\t\tglobalThis.__reactBoundaryAudit.end(frame, publishEnd);\n\t\t\tqueueMicrotask(() => globalThis.__reactBoundaryAudit.checkpoint(frame, "microtask"));\n\t\t\tsetTimeout(() => globalThis.__reactBoundaryAudit.checkpoint(frame, "task"), 0);\n\t\t\tif (!publication.published)'],
  ['teardown', '\t\tlet cleanup;\n\t\ttry {\n\t\t\tcleanup = await arm.dispose();', '\t\tlet cleanup;\n\t\ttry {\n\t\t\tglobalThis.__reactBoundaryAudit.teardown();\n\t\t\tcleanup = await arm.dispose();'],
  ['snapshot-read', '\tgetSnapshot() {\n\t\treturn snapshot;\n\t},\n\tdispatch(frame) {', '\tgetSnapshot() {\n\t\tglobalThis.__reactBoundaryAudit.getSnapshot();\n\t\treturn snapshot;\n\t},\n\tdispatch(frame) {'],
  ['input', '\tdispatch(frame) {\n\t\tsnapshot = Object.freeze(frame);\n\t\tfor (const listener of listeners) listener();', '\tdispatch(frame) {\n\t\tglobalThis.__reactBoundaryAudit.input(frame);\n\t\tsnapshot = Object.freeze(frame);\n\t\tglobalThis.__reactBoundaryAudit.snapshot(frame);\n\t\tfor (const listener of listeners) {\n\t\t\tglobalThis.__reactBoundaryAudit.listenerBegin(frame.epoch);\n\t\t\tlistener();\n\t\t\tglobalThis.__reactBoundaryAudit.listenerEnd(frame.epoch);\n\t\t}'],
  ['position-render', 'function Position(t0) {\n\tconst $ = (0, import_compiler_runtime.c)(8);\n\tconst { id, children } = t0;\n\tconst frame = (0, import_react.useSyncExternalStore)(clock.subscribe, clock.getSnapshot);', 'function Position(t0) {\n\tconst $ = (0, import_compiler_runtime.c)(8);\n\tconst { id, children } = t0;\n\tconst frame = (0, import_react.useSyncExternalStore)(clock.subscribe, clock.getSnapshot);\n\tglobalThis.__reactBoundaryAudit.render("Position", id, frame.epoch);'],
  ['rotation-render', 'function Rotation(t0) {\n\tconst $ = (0, import_compiler_runtime.c)(8);\n\tconst { id, children } = t0;\n\tconst frame = (0, import_react.useSyncExternalStore)(clock.subscribe, clock.getSnapshot);', 'function Rotation(t0) {\n\tconst $ = (0, import_compiler_runtime.c)(8);\n\tconst { id, children } = t0;\n\tconst frame = (0, import_react.useSyncExternalStore)(clock.subscribe, clock.getSnapshot);\n\tglobalThis.__reactBoundaryAudit.render("Rotation", id, frame.epoch);'],
  ['marker-render', 'function FrameMarker() {\n\tconst $ = (0, import_compiler_runtime.c)(2);\n\tconst frame = (0, import_react.useSyncExternalStore)(clock.subscribe, clock.getSnapshot);', 'function FrameMarker() {\n\tconst $ = (0, import_compiler_runtime.c)(2);\n\tconst frame = (0, import_react.useSyncExternalStore)(clock.subscribe, clock.getSnapshot);\n\tglobalThis.__reactBoundaryAudit.render("FrameMarker", "marker", frame.epoch);'],
  ['app-render', 'function App() {\n\tconst $ = (0, import_compiler_runtime.c)(2);', 'function App() {\n\tglobalThis.__reactBoundaryAudit.appRender();\n\tconst $ = (0, import_compiler_runtime.c)(2);'],
  ['host-commit', '\tcommitUpdate(instance, type, oldProps, newProps, fiber) {\n\t\tvalidateInstance(instance.type, newProps, instance.root);', '\tcommitUpdate(instance, type, oldProps, newProps, fiber) {\n\t\tglobalThis.__reactBoundaryAudit.commit(instance.object, newProps);\n\t\tvalidateInstance(instance.type, newProps, instance.root);'],
];

export async function makeOrderingVariant(output) {
  if (!output || !path.isAbsolute(output)) throw new Error('Pass an absolute --output path for a new directory');
  const target = path.resolve(output);
  if (target === source || target.startsWith(source + path.sep)) throw new Error('Output cannot be inside frozen source');
  const original = await readFile(path.join(source, asset));
  const inputHash = sha256(original);
  if (inputHash !== expectedSha256) throw new Error(`Frozen React bundle hash drift: ${inputHash}`);
  let code = original.toString('utf8');
  const edits = [];
  for (const [name, before, after] of patches) {
    const offset = code.indexOf(before);
    if (offset < 0 || code.indexOf(before, offset + 1) >= 0) throw new Error(`Patch anchor ${name} is missing or ambiguous`);
    edits.push({ name, originalSourceOffset: original.toString('utf8').indexOf(before), matchedOffsetBeforeEdit: offset, originalSnippetSha256: sha256(before), replacementSnippetSha256: sha256(after) });
    code = code.slice(0, offset) + after + code.slice(offset + before.length);
  }
  await mkdir(target);
  for (const entry of await readdir(source)) await cp(path.join(source, entry), path.join(target, entry), { recursive: true, force: false, errorOnExist: true });
  await writeFile(path.join(target, asset), code);
  const manifest = { schemaVersion: 'react-ordering-copied-asset-v1', source, asset, sourceSha256: inputHash, variantSha256: sha256(code), instrumenterSha256: sha256(await readFile(fileURLToPath(import.meta.url))), edits, originalTimingValid: false, purpose: 'Event ordering and completeness only; copied frozen bundle, no authored source change' };
  await writeFile(path.join(target, 'ordering-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  return manifest;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--output') throw new Error('Usage: node make-ordering-variant.mjs --output ABS_NEW_DIR');
  const result = await makeOrderingVariant(args[1]);
  process.stdout.write(JSON.stringify({ status: 'READY', output: args[1], sourceSha256: result.sourceSha256, variantSha256: result.variantSha256 }) + '\n');
}
