import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { transformWithOxc } from 'vite';
import { nativeModuleCompilerPlugin } from './vite_native_module.ts';
import { createNativeRoot } from '../src/native_runtime_api.ts';
import { MemoryVDOMHost } from '../src/vdom_snapshot_runtime.ts';
import { jsx } from '../src/jsx_binding_runtime.ts';

const rootDirectory = path.resolve('.');
const nativeImport = pathToFileURL(path.join(rootDirectory, 'src/native_runtime_api.ts')).href;
const authored = `/** @jsxRuntime classic */
/** @jsx jsx */
/** @jsxFrag Fragment */
// @native-ui
import { useState, jsx, Fragment } from ${JSON.stringify(nativeImport)};
export const setters: Record<string, (value: any) => boolean> = {};
export const renders = { hot: 0, generic: 0, guard: 0, forwarded: 0, captured: 0 };
export function Hot() {
  renders.hot++;
  const [x, setX] = useState(0);
  const [y, setY] = useState(2);
  setters.x = setX;
  setters.y = setY;
  return <div data-hot="yes" data-x={x} style={{left: \`\${x}px\`, opacity: (x+y)/100}} onClick={() => setX(previous => previous + 1)} />;
}
export function Generic() {
  renders.generic++;
  const [count, setCount] = useState(0);
  setters.count = setCount;
  return <span data-generic="yes" data-count={count}>Visible {count}</span>;
}
export function Guard() {
  renders.guard++;
  const [fail, setFail] = useState(false);
  setters.fail = setFail;
  if (fail) throw new Error("candidate failed");
  return <i data-guard="yes">Stable guard</i>;
}
export function Child({value}: {value: number}) {
  if(typeof value !== 'number') throw new Error('Child received a bound object');
  return <b data-forwarded="yes">{value}</b>;
}
export function Forwarded() {
  renders.forwarded++;
  const [value, setValue] = useState(10);
  setters.forwarded = setValue;
  return <Child value={value} />;
}
export function Keyed() {
  const [key, setKey] = useState(0);
  setters.key = setKey;
  return <em key={key} data-keyed="yes">keyed</em>;
}
export function Captured() {
  renders.captured++;
  const [value, setValue] = useState(0);
  setters.captured = setValue;
  return <button data-captured="yes" data-value={value} onClick={() => setValue(value+1)}>captured</button>;
}
export function App() {
  return <section><Hot key="hot" /><Generic key="generic" /><Guard key="guard" /><Forwarded /><Keyed /><Captured /></section>;
}
`;
const plugin = nativeModuleCompilerPlugin({ root: rootDirectory });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
let root;
try {
  const compiled = await plugin.transform.call(context, authored, path.join(rootDirectory, '.cache/native-state-execution.tsx'));
  assert.match(compiled.code, /__nativeBindStateProps?At\(/, 'No ordinary numeric prop read was compiled into a writer');
  const emitted = await transformWithOxc(compiled.code, '.cache/native-state-execution.tsx', { lang: 'tsx', jsx: { runtime: 'classic' } });
  await mkdir('.cache', { recursive: true });
  const outputPath = path.join(rootDirectory, '.cache/native-state-execution.mjs');
  await writeFile(outputPath, emitted.code);
  const app = await import(pathToFileURL(outputPath).href + '?test=' + Date.now());
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  root = createNativeRoot(host, container, { scheduleCommit() {} });
  root.mount(jsx(app.App, {}));
  const walk = (node, key) => node.props[key] === 'yes' ? node : node.children.map(child => walk(child, key)).find(Boolean);
  const text = node => (node.text ?? '') + node.children.map(text).join('');
  const hot = walk(container, 'data-hot');
  const generic = walk(container, 'data-generic');
  assert.ok(hot && generic, 'JSX children were lost between compiler and runtime');
  assert.equal(text(generic), 'Visible 0');
  assert.equal(app.renders.hot, 1);
  app.setters.x(5);
  root.flush();
  assert.equal(hot.props.style.left, '5px');
  assert.equal(hot.props['data-x'], 5);
  assert.equal(app.renders.hot, 1, 'Compiled prop update re-executed Hot');
  hot.props.onClick();
  root.flush();
  assert.equal(hot.props.style.left, '6px');
  app.setters.y(11);
  app.setters.count(3);
  root.flush();
  assert.equal(hot.props.style.opacity, .17);
  assert.equal(text(generic), 'Visible 3');
  assert.equal(app.renders.hot, 1);
  assert.equal(app.renders.generic, 2);
  app.setters.x(8);
  const committedFailSetter = app.setters.fail;
  app.setters.fail(true);
  assert.throws(() => root.flush(), /candidate failed/);
  assert.equal(hot.props.style.left, '6px', 'Direct write escaped rejected generic candidate');
  // This fixture's render-time registry also captured the rejected candidate's
  // private setter. Real host handlers remain committed until publication.
  assert.equal(app.setters.fail(false),false,'Discarded candidate setter remained active');
  committedFailSetter(false);
  root.flush();
  assert.equal(hot.props.style.left, '8px');
  assert.equal(app.renders.hot, 1);
  const forwarded = walk(container, 'data-forwarded');
  app.setters.forwarded(12);
  root.flush();
  assert.equal(text(forwarded), '12');
  assert.equal(app.renders.forwarded, 2);
  const originalKeyed = walk(container, 'data-keyed');
  app.setters.key(1);
  root.flush();
  assert.notEqual(walk(container, 'data-keyed'), originalKeyed, 'State key failed to remount host');
  const captured = walk(container, 'data-captured');
  captured.props.onClick();
  root.flush();
  captured.props.onClick();
  root.flush();
  assert.equal(captured.props['data-value'], 2, 'Event closure captured stale state');
  assert.equal(app.renders.captured, 3);
  console.log('Compiled authored state/prop execution PASS (direct, fallback, closure, custom props, state keys and failed mixed candidate).');
} finally {
  root?.dispose();
  plugin.closeBundle?.call({});
}
