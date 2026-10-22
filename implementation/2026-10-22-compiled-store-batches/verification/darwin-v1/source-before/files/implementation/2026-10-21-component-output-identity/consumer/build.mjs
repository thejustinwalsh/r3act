import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
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
const capture = { name: 'realtime-source-capture', enforce: 'post', async transform(code, id) {
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
let numericOwners = [];
if (mode === 'native') {
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
  numericOwners = calls.filter(node => aliases.has(node.callee.name)).flatMap(node => {
    const [site, component, options] = node.arguments;
    const kernel = field(options, 'ownerUpdateProgram');
    if (!['Position', 'Rotation'].includes(component?.name)) return [];
    assert.equal(site?.type, 'StringLiteral');
    assert.equal(kernel?.type, 'MemberExpression', `${component.name} lacks owner update kernel`);
    assert.equal(kernel.computed, true);
    assert.equal(kernel.property.type, 'NumericLiteral');
    return [{ component: component.name, ownerProgramId: site.value, kernelIndex: kernel.property.value }];
  });
  assert.deepEqual(numericOwners.map(item => item.component).sort(), ['Position', 'Rotation']);
  assert.equal(new Set(numericOwners.map(item => item.ownerProgramId)).size, 2);
  assert.equal(new Set(numericOwners.map(item => item.kernelIndex)).size, 2);
  assert.match(armCode, /position-x/); assert.match(armCode, /rotation-z/);
} else if (mode === 'react') {
  assert.ok(compilerEvents.filter(event => event.kind === 'CompileSuccess' &&
    ['Position', 'Rotation'].includes(event.fnName)).length >= 2);
  assert.match(armCode, /_c\d*\(/);
}
await writeFile(path.join(proof, `capture-${mode}.json`), JSON.stringify({ mode, captures,
  compilerEvents, numericOwners, nativePositionProgram: mode === 'native' && armCode.includes('position-x'),
  nativeRotationProgram: mode === 'native' && armCode.includes('rotation-z'),
  reactMemoized: mode === 'react' && /_c\d*\(/.test(armCode) }, null, 2) + '\n', { flag: 'wx' });
