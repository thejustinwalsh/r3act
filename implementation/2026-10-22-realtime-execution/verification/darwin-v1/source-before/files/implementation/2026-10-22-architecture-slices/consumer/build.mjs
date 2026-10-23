import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import react from '@vitejs/plugin-react';
import { nativeReactPlugins } from '@r3act/vite';
import { build } from 'vite';

const [mode, proof, variant = 'baseline'] = process.argv.slice(2);
assert.ok(['native', 'react', 'react-frame', 'imperative'].includes(mode) && proof);
assert.ok(['baseline', 'minified', 'rebundled'].includes(variant));
assert.ok(variant === 'baseline' || mode === 'native');
const consumer = path.dirname(fileURLToPath(import.meta.url));
const rebundled = variant === 'rebundled';
const inputRoot = rebundled ? path.join(path.dirname(proof), 'minified', 'dist', 'native') : consumer;
const captures = [], compilerEvents = [];
let armCode = '';
let storeOwners = [];
const source = path.join(consumer, `${mode}.${mode === 'imperative' ? 'ts' : 'tsx'}`);
const location = loc => loc ? { start: loc.start ? { line: loc.start.line, column: loc.start.column, index: loc.start.index } : null,
  end: loc.end ? { line: loc.end.line, column: loc.end.column, index: loc.end.index } : null } : null;
const compilerEvent = (filename, event) => ({ filename, kind: event.kind,
  fnName: event.fnName ?? null, fnLoc: location(event.fnLoc), loc: location(event.loc),
  reason: event.reason ?? event.detail?.reason ?? null,
  detail: event.detail ? { category: event.detail.category ?? null,
    reason: event.detail.reason ?? null, description: event.detail.description ?? null,
    loc: location(event.detail.loc ?? event.detail.primaryLocation?.()),
    text: String(event.detail) } : null,
  data: event.data ?? null,
  text: String(event.detail ?? event.data ?? event.reason ?? event.kind),
  metrics: event.kind === 'CompileSuccess' ? { memoSlots: event.memoSlots, memoBlocks: event.memoBlocks,
    memoValues: event.memoValues, prunedMemoBlocks: event.prunedMemoBlocks,
    prunedMemoValues: event.prunedMemoValues } : null });
const capture = { name: 'mixed-numeric-r3f-source-capture', enforce: 'post', async transform(code, id) {
  const clean = id.split('?', 1)[0];
  if (!clean.startsWith(consumer + path.sep) || clean.includes('/node_modules/') || !/\.[jt]sx?$/.test(clean)) return null;
  const relative = path.relative(consumer, clean).replaceAll(path.sep, '/');
  if (clean === source) {
    armCode = code;
  }
  const target = path.join(proof, 'transforms', mode, relative + '.js');
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, code, { flag: 'wx' });
  captures.push(relative);
  return null;
} };
const plugins = mode === 'imperative' ? [capture] : nativeReactPlugins(react, {
  root: consumer, sourceRoots: ['native.tsx'], reactOptions: {
    include: /react(?:-frame)?\.tsx$/, jsxImportSource: 'react', babel: { plugins: [[
      'babel-plugin-react-compiler', { target: '19', logger: { logEvent(filename, event) {
        compilerEvents.push(compilerEvent(filename, event));
      } } }
    ]] }
  }
}).concat(capture);
const cspProbe = `globalThis.__r3actScalarCsp = { blocked: false, violations: [] };
document.addEventListener('securitypolicyviolation', event => {
  globalThis.__r3actScalarCsp.violations.push(event.blockedURI);
});
try { Function('return 1')(); } catch (error) {
  globalThis.__r3actScalarCsp.blocked = error instanceof EvalError;
}
`;
const cspDelivery = { name: 'scalar-no-eval-delivery-proof',
  transformIndexHtml: { order: 'post', handler() {
    return [{ tag: 'script', attrs: { type: 'module', src: './csp-probe.mjs' }, injectTo: 'head-prepend' }];
  } },
  generateBundle() { this.emitFile({ type: 'asset', fileName: 'csp-probe.mjs', source: cspProbe }); },
};
let status = 'STARTED', error = null;
try {
await build({ configFile: false, mode: 'production', root: inputRoot, base: './',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  plugins: rebundled ? [] : [...plugins, ...(variant === 'minified' ? [cspDelivery] : [])],
  ...(['react', 'react-frame'].includes(mode) ? { oxc: { jsx: { runtime: 'automatic', importSource: 'react' } } } : {}),
  build: { outDir: path.join(proof, 'dist', mode), emptyOutDir: true,
    minify: true,
    rolldownOptions: { input: path.join(inputRoot, `${mode}.html`) } } });
if (mode === 'native' && !rebundled) {
  const authored = await readFile(source, 'utf8');
  assert.match(authored, /<group key=\{id\} name=\{`object-\$\{id\}`\}/);
  assert.match(authored, /<Position key="motion"/);
  assert.match(authored, /<Rotation key="motion"/);
  const program = parse(armCode, { sourceType: 'module', plugins: ['typescript', 'jsx'] }).program;
  const aliases = new Set(program.body.filter(node => node.type === 'ImportDeclaration')
    .flatMap(node => node.specifiers.filter(item => item.type === 'ImportSpecifier' &&
      (item.imported.name ?? item.imported.value) === 'defineComponent').map(item => item.local.name)));
  const calls = [];
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'CallExpression') calls.push(node);
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'start', 'end', 'extra', 'comments'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(program);
  const field = (node, name) => {
    if (node?.type !== 'ObjectExpression') return undefined;
    const item = node.properties.find(item =>
      (item.key?.name ?? item.key?.value) === name);
    return item?.type === 'ObjectMethod' ? item : item?.value;
  };
  for (const node of calls.filter(node => aliases.has(node.callee.name))) {
    const [site, component, options] = node.arguments;
    if (!['Position', 'Rotation'].includes(component?.name)) continue;
    assert.equal(site?.type, 'StringLiteral');
    const program = field(options, 'closedStoreHostProgram');
    assert.equal(field(program, 'schemaVersion')?.value, 7,
      `${component.name} requires actual retained mixed schema 7`);
    assert.equal(field(program, 'retainedChildProp')?.value, 'children');
    const inputs = field(program, 'inputs');
    assert.equal(inputs?.type, 'ArrayExpression');
    assert.equal(inputs.elements.length, 1, `${component.name} requires one canonical frame Store`);
    const host = field(program, 'host');
    assert.equal(field(host, 'child')?.type, 'NullLiteral');
    const props = field(host, 'props');
    assert.equal(props?.type, 'ArrayExpression');
    assert.equal(props.elements.length, 3, `${component.name} must stage three transform props`);
    assert.equal(field(options, 'closedStoreNumericKernel'), undefined);
    const execution = field(options, 'closedStoreExecution');
    assert.equal(execution?.type, 'ObjectExpression');
    assert.equal(execution.properties.length, 5);
    assert.equal(field(execution, 'schemaVersion')?.value, 3);
    assert.equal(field(execution, 'numericKernel'), undefined);
    assert.ok(['ArrowFunctionExpression', 'FunctionExpression'].includes(
      field(execution, 'batchKernel')?.type), 'compiler must emit actual batched arithmetic code');
    assert.equal(field(execution, 'kind')?.value, 'owned-data');
    assert.equal(field(execution, 'componentProgramId')?.value, site.value);
    assert.equal(field(execution, 'moduleRevision')?.value, field(program, 'moduleRevision')?.value);
    const flattened = inputs.elements.flatMap(item => field(item, 'paths')?.elements ?? []);
    assert.deepEqual(flattened.map(item => item.elements.map(part => part.value)), [['phase']]);
    const stateSites = field(program, 'stateSites')?.elements?.map(item => item.value);
    const effectSites = field(program, 'effectSites')?.elements?.map(item => item.value);
    assert.deepEqual(stateSites, [`${site.value}#state:0`]);
    assert.deepEqual(effectSites, [`${site.value}#effect:0`]);
    const names = props.elements.map(item => item.elements[0].value);
    assert.deepEqual(names, ['position-x', 'position-y', 'rotation-z']);
    storeOwners.push({ component: component.name, ownerProgramId: site.value,
      schemaVersion: 7, inputCount: 1, stateSites, effectSites,
      executionKind: 'owned-data', executionSchema: 3, batchKernel: 'emitted',
      flattenedInputCount: flattened.length + stateSites.length,
      propNames: names, sinkCount: 3,
      retainedChildProp: 'children' });
  }
  assert.deepEqual(storeOwners.map(item => item.component).sort(), ['Position', 'Rotation']);
  assert.equal(new Set(storeOwners.map(item => item.ownerProgramId)).size, 2);
  assert.match(armCode, /position-x/); assert.match(armCode, /position-y/); assert.match(armCode, /rotation-z/);
} else if (mode === 'react') {
  const authored = await readFile(source, 'utf8');
  assert.match(authored, /from '@react-three\/fiber\/legacy'/);
  assert.match(authored, /<mesh><boxGeometry/);
  assert.match(authored, /frameloop: 'never'/);
  assert.doesNotMatch(authored,
    /(?:\.position\.[xyz]|\.rotation\.[xyz])\s*(?:=(?!=|>)|[+\-*/%&|^]=|\+\+|--)/,
    'primary R3F arm must update Three through declarative JSX props');
  for (const name of ['Position', 'Rotation']) {
    assert.ok(compilerEvents.some(event => event.kind === 'CompileSuccess' && event.fnName === name), `${name} React Compiler did not succeed`);
    const component = parse(armCode, { sourceType: 'module', plugins: ['typescript', 'jsx'] }).program.body
      .find(node => node.type === 'FunctionDeclaration' && node.id?.name === name);
    assert.ok(component && /_c\d*\(/.test(armCode.slice(component.start, component.end)), `${name} lacks React Compiler memoization`);
  }
} else if (mode === 'react-frame') {
  const authored = await readFile(source, 'utf8');
  assert.match(authored, /import\s*\{[^}]*\buseFrame\b[^}]*\}\s*from ['"]@react-three\/fiber\/legacy['"]/);
  assert.match(authored, /\buseFrame\s*\(/);
  assert.match(authored, /rootStore\.getState\(\)\.advance\s*\(/);
  assert.match(authored, /<mesh><boxGeometry/);
  assert.match(authored, /frameloop: ['"]never['"]/);
  assert.match(authored, /(?:\.position\.[xyz]|\.rotation\.[xyz])\s*(?:=(?!=|>)|[+\-*/%&|^]=|\+\+|--)/,
    'frame arm must mutate retained Three transforms from the frame hook');
  const tree = parse(authored, { sourceType: 'module', plugins: ['typescript', 'jsx'] }).program;
  const frameHooks = [];
  const inspect = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'CallExpression' && node.callee?.name === 'useFrame') frameHooks.push(node);
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'start', 'end', 'extra', 'comments'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(inspect);
      else if (value && typeof value === 'object') inspect(value);
    }
  };
  inspect(tree);
  assert.equal(frameHooks.length, 4, '256 motion hooks, one marker and one render takeover must be authored');
  const phases = frameHooks.map(hook => hook.arguments[1]?.properties?.find(item =>
    (item.key?.name ?? item.key?.value) === 'phase')?.value?.value);
  assert.deepEqual(phases.sort(), ['render', 'update', 'update', 'update']);
  for (const hook of frameHooks) {
    const callback = hook.arguments[0];
    assert.ok(['ArrowFunctionExpression', 'FunctionExpression'].includes(callback?.type));
    const body = authored.slice(callback.start, callback.end);
    assert.doesNotMatch(body, /\b(?:set[A-Z]\w*|dispatch)\s*\(/,
      'frame callbacks must not publish React state per frame');
  }
  assert.ok(compilerEvents.some(event => event.filename?.endsWith('/react-frame.tsx')),
    'React Compiler must emit actual frame-arm diagnostics');
  assert.ok(!compilerEvents.some(event => event.kind === 'PipelineError'),
    'React Compiler pipeline error is not a valid frame-arm decline');
}
status = mode === 'react-frame' && ['Position', 'Rotation'].some(name =>
  !compilerEvents.some(event => event.kind === 'CompileSuccess' && event.fnName === name))
  ? 'FRAME_COMPILER_DECLINE_PENDING_PRIMARY_REVIEW' : 'PASS';
} catch (caught) { error = caught instanceof Error ? caught.stack : String(caught); status = 'INCOMPLETE'; }
await writeFile(path.join(proof, `capture-${mode}.json`), JSON.stringify({ mode, variant, status, error, captures,
  minification: variant === 'baseline' ? false : 'vite-default',
  ...(rebundled ? { rebundleInput: inputRoot } : {}),
  compilerEvents, storeOwners, nativePositionProgram: mode === 'native' && armCode.includes('position-x'),
  nativeRotationProgram: mode === 'native' && armCode.includes('rotation-z'),
  reactMemoized: mode === 'react' && /_c\d*\(/.test(armCode),
  motionCompiled: mode === 'react-frame' ? Object.fromEntries(['Position', 'Rotation'].map(name =>
    [name, compilerEvents.some(event => event.kind === 'CompileSuccess' && event.fnName === name)])) : null,
  primaryComparator: mode === 'react' ? 'declarative-r3f-10.0.0-alpha.6-react-compiler' : null,
  frameComparator: mode === 'react-frame' ? 'useFrame-r3f-10.0.0-alpha.6-compiler-pipeline' : null,
  frameScheduler: mode === 'react-frame' ? 'rootStore.getState().advance with frameloop never' : null }, null, 2) + '\n', { flag: 'wx' });
if (error) throw new Error(error);
