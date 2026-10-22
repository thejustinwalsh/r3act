import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import react from '@vitejs/plugin-react';
import { nativeReactPlugins } from '@r3act/vite';
import { build } from 'vite';

const [mode, proof] = process.argv.slice(2);
assert.ok(['native', 'react'].includes(mode));
assert.ok(proof);
const consumer = path.dirname(fileURLToPath(import.meta.url));
const transformed = [], compilerEvents = [];
let armCode = '';
const capture = { name: 'closed-row-capture', enforce: 'post', async transform(code, id) {
  const clean = id.split('?', 1)[0];
  if (!clean.startsWith(consumer + path.sep) || clean.includes('/node_modules/') || !/\.[jt]sx?$/.test(clean)) return null;
  const relative = path.relative(consumer, clean).replaceAll(path.sep, '/');
  const target = path.join(proof, 'row-transforms', mode, relative + '.js');
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, code, { flag: 'wx' });
  transformed.push(relative);
  if (relative === `closed_rows_${mode}.tsx`) armCode = code;
  return null;
} };
const plugins = nativeReactPlugins(react, { root: consumer, sourceRoots: ['closed_rows_native.tsx'],
  reactOptions: { include: /closed_rows_react\.tsx$/, jsxImportSource: 'react',
    babel: { plugins: [['babel-plugin-react-compiler', { target: '19', logger: { logEvent(filename, event) {
      compilerEvents.push({ filename, kind: event.kind, fnName: event.fnName ?? null, reason: event.reason ?? null });
    } } }]] } } });
plugins.push(capture);
await build({ configFile: false, root: consumer, base: './', plugins,
  ...(mode === 'react' ? { oxc: { jsx: { runtime: 'automatic', importSource: 'react' } } } : {}),
  build: { outDir: path.join(proof, 'row-dist', mode), emptyOutDir: true, minify: false,
    rolldownOptions: { input: path.join(consumer, `rows-${mode}.html`) } } });
const ast = parse(armCode, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
const templates = [], memoCalls = [];
const visit = node => {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'ObjectProperty' && (node.key.name ?? node.key.value) === 'closedCollectionRowPrograms') {
    assert.equal(node.value.type, 'ArrayExpression');
    templates.push({ entries: node.value.elements.length, start: node.start, end: node.end });
  }
  if (node.type === 'CallExpression' && /^_c\d*$/.test(node.callee.name ?? '') && node.arguments[0]?.type === 'NumericLiteral') memoCalls.push(node.arguments[0].value);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'start', 'end', 'extra', 'comments'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
  }
};
visit(ast);
if (mode === 'native') {
  assert.ok(templates.length >= 2 && templates.reduce((sum, item) => sum + item.entries, 0) >= 2, 'Both actual closed row templates must be emitted');
  assert.ok(/registerCompiledSemanticPlan/.test(armCode));
} else {
  assert.ok(compilerEvents.some(event => event.kind === 'CompileSuccess' && event.fnName === 'Row'));
  assert.ok(memoCalls.length > 0, 'Actual React Compiler memo output required');
}
await writeFile(path.join(proof, `build-rows-${mode}-transforms.json`), JSON.stringify({ mode, transformed, compilerEvents, templates, memoCalls }, null, 2) + '\n', { flag: 'wx' });
