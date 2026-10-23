import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping';
import { nativeModulePlugin } from './vite_native_plugin.ts';
import { createNativeRoot } from '../src/native_runtime_api.ts';
import { MemoryVDOMHost } from '../src/vdom_snapshot_runtime.ts';
import { jsx } from '../src/jsx_binding_runtime.ts';

const rootDirectory = path.resolve('.');
const nativeImport = pathToFileURL(path.join(rootDirectory, 'src/native_runtime_api.ts')).href;
const authored = `import { useState, useEffect } from ${JSON.stringify(nativeImport)};
export const controls: Record<string, (value: number) => boolean> = {};
export const metrics = { appRenders: 0, rowRenders: 0, effectSetups: 0, effectCleanups: 0 };
export function Row() {
  metrics.rowRenders++;
  useEffect(() => { metrics.effectSetups++; return () => { metrics.effectCleanups++; }; });
  return <aside data-row="retained">row</aside>;
}
export function App() {
  metrics.appRenders++;
  const [x, setX] = useState(1);
  const [y, setY] = useState(2);
  controls.x = setX;
  controls.y = setY;
  return <section><div data-direct={x} data-repeated={x + x} data-compound={x + y} /><Row key="row" /></section>;
}`;

const plugin = nativeModulePlugin();
plugin.configResolved.call({}, { root: rootDirectory });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    return specifier === nativeImport ? { id: path.join(rootDirectory, 'src/native_runtime_api.ts') } : null;
  },
  error(message) { throw new Error(String(message)); },
};
let root;
try {
  const id = path.join(rootDirectory, '.cache/native-unary-binding.tsx');
  const compiled = await plugin.transform.call(context, authored, id);
  assert.ok(compiled?.code.includes('bindStatePropAt'), 'single-state numeric props did not use the singular binding helper');
  const executableCode = compiled.code.slice(0, compiled.code.indexOf('export const compiledNativeComponentPlan'));
  assert.equal((executableCode.match(/__nativeBindStatePropAt\(/g) ?? []).length, 2, 'both unary props must call the singular helper');
  assert.equal((executableCode.match(/__nativeBindStatePropsAt\(/g) ?? []).length, 1, 'only the compound prop calls the plural helper');
  assert.match(compiled.code, /data-compound=\{__nativeBindStatePropsAt\(/, 'compound state expressions must keep the general helper');

  const originalOffset = authored.indexOf('data-direct={x}') + 'data-direct={'.length;
  const generatedExpression = compiled.code.indexOf('(x) => x');
  assert.notEqual(generatedExpression, -1);
  const generatedOffset = generatedExpression + '(x) => '.length;
  const generatedLocation = {
    line: compiled.code.slice(0, generatedOffset).split('\n').length,
    column: generatedOffset - compiled.code.lastIndexOf('\n', generatedOffset - 1) - 1,
  };
  const originalLocation = {
    line: authored.slice(0, originalOffset).split('\n').length,
    column: originalOffset - authored.lastIndexOf('\n', originalOffset - 1) - 1,
  };
  assert.deepEqual(originalPositionFor(new TraceMap(compiled.map), generatedLocation), {
    source: id, line: originalLocation.line, column: originalLocation.column, name: null,
  }, 'generated binding edits must retain the authored expression source location');

  await mkdir('.cache', { recursive: true });
  const outputPath = path.join(rootDirectory, '.cache/native-unary-binding.mjs');
  await writeFile(outputPath, compiled.code);
  const app = await import(pathToFileURL(outputPath).href + '?test=' + Date.now());
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  root = createNativeRoot(host, container, { scheduleCommit() {} });
  root.mount(jsx(app.App, {}));

  const find = (node, key, value) => node.props?.[key] === value ? node : node.children.map(child => find(child, key, value)).find(Boolean);
  const values = find(container, 'data-direct', 1);
  const row = find(container, 'data-row', 'retained');
  assert.ok(values && row, 'authored tree did not mount');
  const initialSetups = app.metrics.effectSetups;
  assert.equal(values.props['data-repeated'], 2);
  assert.equal(values.props['data-compound'], 3);
  assert.equal(app.metrics.appRenders, 1);
  assert.equal(app.metrics.rowRenders, 1);

  app.controls.x(5);
  root.flush();
  assert.equal(values.props['data-direct'], 5);
  assert.equal(values.props['data-repeated'], 10);
  assert.equal(values.props['data-compound'], 7);
  assert.equal(find(container, 'data-row', 'retained'), row, 'binding updates must retain the sibling row');
  assert.equal(app.metrics.appRenders, 1, 'direct prop updates must not rerun the owner component');
  assert.equal(app.metrics.rowRenders, 1, 'direct prop updates must not rerun the row');
  assert.equal(app.metrics.effectSetups, initialSetups, 'direct prop updates must not rerun row effects');

  app.controls.y(9);
  root.flush();
  assert.equal(values.props['data-compound'], 14, 'compound binding updates must continue to work');
  assert.equal(app.metrics.appRenders, 1);
  assert.equal(find(container, 'data-row', 'retained'), row);
  root.dispose();
  root = undefined;
  assert.equal(app.metrics.effectCleanups, initialSetups, 'disposing the tree must clean up retained row effects');
  console.log('Compiled unary state binding execution PASS (singular updates, repeated reads, compound binding, row/effect retention and source maps).');
} finally {
  root?.dispose();
  plugin.closeBundle?.call({});
}
