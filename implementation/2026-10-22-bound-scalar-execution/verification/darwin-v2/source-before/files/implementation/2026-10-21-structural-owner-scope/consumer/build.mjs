import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import react from '@vitejs/plugin-react';
import { nativeReactPlugins } from '@r3act/vite';
import { build } from 'vite';

const [mode, proof] = process.argv.slice(2);
assert.ok(['native', 'react', 'imperative'].includes(mode) && proof);
const consumer = path.dirname(fileURLToPath(import.meta.url));
const captures = [], compilerEvents = [];
let armCode = '';
const source = path.join(consumer, `${mode}.${mode === 'imperative' ? 'ts' : 'tsx'}`);
const capture = { name: 'structural-owner-scope-source-capture', enforce: 'post', async transform(code, id) {
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
    include: /react\.tsx$/, jsxImportSource: 'react', babel: { plugins: [[
      'babel-plugin-react-compiler', { target: '19', logger: { logEvent(filename, event) {
        compilerEvents.push({ filename, kind: event.kind, fnName: event.fnName ?? null, reason: event.reason ?? null });
      } } }
    ]] }
  }
}).concat(capture);
await build({ configFile: false, root: consumer, base: './', plugins,
  ...(mode === 'react' ? { oxc: { jsx: { runtime: 'automatic', importSource: 'react' } } } : {}),
  build: { outDir: path.join(proof, 'dist', mode), emptyOutDir: true, minify: false,
    rolldownOptions: { input: path.join(consumer, `${mode}.html`) } } });
let storeOwners = [];
if (mode === 'native') {
  const authored = await readFile(source, 'utf8');
  assert.match(authored, /<group key=\{id\} name=\{`object-\$\{id\}`\}>/);
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
  const field = (node, name) => node?.type === 'ObjectExpression'
    ? node.properties.find(item => item.type === 'ObjectProperty' &&
      (item.key.name ?? item.key.value) === name)?.value : undefined;
  for (const node of calls.filter(node => aliases.has(node.callee.name))) {
    const [site, component, options] = node.arguments;
    if (!['Position', 'Rotation'].includes(component?.name)) continue;
    assert.equal(site?.type, 'StringLiteral');
    const program = field(options, 'closedStoreHostProgram');
    assert.equal(field(program, 'schemaVersion')?.value, 6,
      `${component.name} requires actual retained Store schema 6`);
    assert.equal(field(program, 'retainedChildProp')?.value, 'children');
    const inputs = field(program, 'inputs');
    assert.equal(inputs?.type, 'ArrayExpression');
    assert.equal(inputs.elements.length, 1, `${component.name} requires one canonical frame Store`);
    const host = field(program, 'host');
    assert.equal(field(host, 'child')?.type, 'NullLiteral');
    const props = field(host, 'props');
    assert.equal(props?.type, 'ArrayExpression');
    assert.equal(props.elements.length, 3, `${component.name} must stage three transform props`);
    storeOwners.push({ component: component.name, ownerProgramId: site.value,
      schemaVersion: 6, inputCount: 1, sinkCount: 3, retainedChildProp: 'children' });
  }
  assert.deepEqual(storeOwners.map(item => item.component).sort(), ['Position', 'Rotation']);
  assert.equal(new Set(storeOwners.map(item => item.ownerProgramId)).size, 2);
  assert.match(armCode, /position-x/); assert.match(armCode, /position-y/); assert.match(armCode, /rotation-z/);
} else if (mode === 'react') {
  for (const name of ['Position', 'Rotation']) {
    assert.ok(compilerEvents.some(event => event.kind === 'CompileSuccess' && event.fnName === name), `${name} React Compiler did not succeed`);
    const component = parse(armCode, { sourceType: 'module', plugins: ['typescript', 'jsx'] }).program.body
      .find(node => node.type === 'FunctionDeclaration' && node.id?.name === name);
    assert.ok(component && /_c\d*\(/.test(armCode.slice(component.start, component.end)), `${name} lacks React Compiler memoization`);
  }
}
await writeFile(path.join(proof, `capture-${mode}.json`), JSON.stringify({ mode, captures,
  compilerEvents, storeOwners, nativePositionProgram: mode === 'native' && armCode.includes('position-x'),
  nativeRotationProgram: mode === 'native' && armCode.includes('rotation-z'),
  reactMemoized: mode === 'react' && /_c\d*\(/.test(armCode) }, null, 2) + '\n', { flag: 'wx' });
