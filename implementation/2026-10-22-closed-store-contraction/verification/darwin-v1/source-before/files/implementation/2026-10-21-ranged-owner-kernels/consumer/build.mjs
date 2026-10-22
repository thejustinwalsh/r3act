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
const capture = { name: 'ranged-owner-source-capture', enforce: 'post', async transform(code, id) {
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
let numericOwners = [], dagOwners = [], rangedOwners = [];
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
  const kernels = [];
  const find = (node, predicate, found = []) => {
    if (!node || typeof node !== 'object') return found;
    if (predicate(node)) found.push(node);
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'start', 'end', 'extra', 'comments'].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(item => find(item, predicate, found));
      else if (value && typeof value === 'object') find(value, predicate, found);
    }
    return found;
  };
  for (const declaration of find(program, node => node.type === 'VariableDeclarator' && node.init?.type === 'ArrayExpression')) {
    const entries = declaration.init.elements;
    if (entries?.every(entry => entry?.type === 'ObjectExpression' && field(entry, 'executeCut')?.type === 'FunctionExpression'))
      kernels.push(...entries);
  }
  for (const owner of numericOwners) {
    const kernel = kernels.find(entry => field(entry, 'programId')?.value === owner.ownerProgramId);
    assert.ok(kernel, `${owner.component} generated executeCut absent`);
    assert.equal(field(kernel, 'schemaVersion')?.value, 4, `${owner.component} requires ranged schema 4`);
    assert.equal(field(kernel, 'sinkIds')?.elements?.length, 3, `${owner.component} must have three numeric sinks`);
    const executeCut = field(kernel, 'executeCut');
    assert.equal(executeCut.params.length, 8, `${owner.component} requires eight range parameters`);
    for (const [index, name] of [[6, 'inputStart'], [7, 'outputStart']]) {
      assert.equal(executeCut.params[index]?.type, 'AssignmentPattern');
      assert.equal(executeCut.params[index].left.name, name);
      assert.equal(executeCut.params[index].right.value, 0);
    }
    const stagedStart = find(executeCut.body, node => node.type === 'VariableDeclarator' &&
      node.id?.name === 'stagedCount' && node.init?.name === 'outputStart');
    const absoluteInputs = find(executeCut.body, node => node.type === 'VariableDeclarator' &&
      node.id?.name === 'changeIndex' && node.init?.operator === '+' &&
      node.init.left?.name === 'inputStart' && node.init.right?.name === 'localIndex');
    const appendedReturn = find(executeCut.body, node => node.type === 'ReturnStatement' &&
      node.argument?.operator === '-' && node.argument.left?.name === 'stagedCount' &&
      node.argument.right?.name === 'outputStart');
    const absoluteWrites = find(executeCut.body, node => node.type === 'AssignmentExpression' &&
      node.left?.type === 'MemberExpression' && node.left.object?.name === 'stagedInputIndices' &&
      node.left.property?.name === 'stagedCount' && node.right?.name === 'changeIndex');
    assert.equal(stagedStart.length, 1); assert.equal(absoluteInputs.length, 1);
    assert.equal(appendedReturn.length, 1); assert.ok(absoluteWrites.length > 0);
    rangedOwners.push({ component: owner.component, ownerProgramId: owner.ownerProgramId,
      schemaVersion: 4, inputStartDefault: 0, outputStartDefault: 0,
      absoluteInputWrites: absoluteWrites.length });
    const cases = find(executeCut, node => node.type === 'SwitchCase' && node.test?.value === 0);
    assert.equal(cases.length, 1, `${owner.component} expected one state slot case`);
    const body = cases[0];
    const nexts = find(body, node => node.type === 'VariableDeclarator' && node.id?.name === 'next');
    assert.equal(nexts.length, 3, `${owner.component} expected three staged expressions`);
    const temporaries = find(body, node => node.type === 'VariableDeclarator' && /^\$r3actDag\d+$/.test(node.id?.name ?? ''));
    assert.ok(temporaries.length > 0, `${owner.component} has no compiler-built numeric DAG temporary`);
    const shared = temporaries.map(temp => {
      const uses = nexts.filter(next => find(next.init, node => node.type === 'Identifier' && node.name === temp.id.name).length > 0).length;
      const guarded = temp.init?.type === 'ConditionalExpression' &&
        find(temp.init.test, node => node.type === 'MemberExpression' && node.property?.name === 'seenMask').length > 0 &&
        temp.init.alternate?.type === 'NumericLiteral';
      return { name: temp.id.name, uses, guarded };
    });
    assert.ok(shared.some(temp => temp.uses >= 2 && temp.guarded), `${owner.component} lacks masked shared numeric execution`);
    assert.ok(shared.every(temp => temp.guarded), `${owner.component} eagerly evaluates a DAG temporary`);
    dagOwners.push({ component: owner.component, ownerProgramId: owner.ownerProgramId,
      sinkCount: nexts.length, shared });
  }
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
  compilerEvents, numericOwners, dagOwners, rangedOwners, nativePositionProgram: mode === 'native' && armCode.includes('position-x'),
  nativeRotationProgram: mode === 'native' && armCode.includes('rotation-z'),
  reactMemoized: mode === 'react' && /_c\d*\(/.test(armCode) }, null, 2) + '\n', { flag: 'wx' });
