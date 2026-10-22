import assert from 'node:assert/strict';
import path from 'node:path';
import { nativeModulePlugin } from './vite_native_plugin.ts';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const plugin = nativeModulePlugin({ root: projectRoot });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
let nextId = 0;

async function compile(name, body) {
  const source = `import { createDOMRoot } from "../src/native_runtime_api.ts";\n${body}`;
  const sourcePath = path.join(projectRoot, `.cache/native-typed-collection-${nextId++}.tsx`);
  const result = await plugin.transform.call(context, source, sourcePath);
  assert.ok(result?.code, `${name}: composed native plugin should transform TSX`);
  return result.code;
}

try {
  const positive = await compile('typed collection with alias', `
import type { KeyedCollection as NativeRows } from "../src/native_runtime_api.ts";
type Row = { id: number };
export function Board({ items, records }: { items: NativeRows<Row>; records: NativeRows<Row> }) {
  const rowsAlias = items;
  return <ul>{rowsAlias.map((row) => (<li key={row.id}>{row.id}</li>))}{records.map((row) => <li key={row.id} />)}</ul>;
}
`);
  assert.match(positive, /__nativeRenderCollectionAt\(/, 'typed prop alias should emit an actual collection helper call');
  assert.doesNotMatch(positive, /__nativeRenderCollectionAt\([^\n]*requiresOwnerRender:\s*true/, 'simple immutable aliases must retain sparse eligibility');
  assert.match(positive, /#collection:0\", rowsAlias/);
  assert.match(positive, /#collection:1\", records/);

  const namedProp = await compile('typed collection on a non-rows prop', `
import type { KeyedCollection } from "../src/native_runtime_api.ts";
type Row = { id: number };
export function Board({ records }: { records: KeyedCollection<Row> }) {
  return <ul>{records.map((row) => <li key={row.id} />)}</ul>;
}
`);
  assert.match(namedProp, /__nativeRenderCollectionAt\(/, 'the trait must work for any simple property name');

  const outsideRead = await compile('conservative outside collection read', `
import type { KeyedCollection } from "../src/native_runtime_api.ts";
type Row = { id: number };
export function Board({ rows }: { rows: KeyedCollection<Row> }) {
  if (!rows) return null;
  return <ul>{rows.map((row) => <li key={row.id} />)}</ul>;
}
`);
  assert.match(outsideRead, /__nativeRenderCollectionAt\([^\n]*requiresOwnerRender:\s*true/, 'other collection reads must keep the owner-render fallback');

  const rejectedSources = [
    ['foreign same-name type', `import type { KeyedCollection } from "./foreign_runtime.ts";
type Row = { id: number };
export function Board({ rows }: { rows: KeyedCollection<Row> }) { return <ul>{rows.map((row) => <li key={row.id} />)}</ul>; }`],
    ['local shadow type', `import type { KeyedCollection as NativeRows } from "../src/native_runtime_api.ts";
type KeyedCollection<T> = readonly T[];
type Row = { id: number };
export function Board({ rows }: { rows: KeyedCollection<Row> }) { return <ul>{rows.map((row) => <li key={row.id} />)}</ul>; }`],
    ['array prop', `import type { KeyedCollection } from "../src/native_runtime_api.ts";
type Row = { id: number };
export function Board({ rows }: { rows: Row[] }) { return <ul>{rows.map((row) => <li key={row.id} />)}</ul>; }`],
    ['untyped prop', `type Row = { id: number };
export function Board({ rows }: { rows: unknown }) { return <ul>{rows.map((row) => <li key={row.id} />)}</ul>; }`],
    ['reassigned typed prop', `import type { KeyedCollection } from "../src/native_runtime_api.ts";
type Row = { id: number };
export function Board({ rows }: { rows: KeyedCollection<Row> }) { rows = rows; return <ul>{rows.map((row) => <li key={row.id} />)}</ul>; }`],
    ['mutable alias', `import type { KeyedCollection } from "../src/native_runtime_api.ts";
type Row = { id: number };
export function Board({ rows }: { rows: KeyedCollection<Row> }) { let alias = rows; alias = rows; return <ul>{alias.map((row) => <li key={row.id} />)}</ul>; }`],
    ['defaulted destructuring', `import type { KeyedCollection } from "../src/native_runtime_api.ts";
type Row = { id: number };
export function Board({ rows = [] }: { rows: KeyedCollection<Row> }) { return <ul>{rows.map((row) => <li key={row.id} />)}</ul>; }`],
  ];
  for (const [name, body] of rejectedSources) {
    const output = await compile(name, body);
    assert.doesNotMatch(output, /__nativeRenderCollectionAt\(/, `${name} must remain on generic collection rendering`);
  }

  console.log('PASS: native typed collection props lower only through the resolved imported trait and safe aliases.');
} finally {
  await plugin.closeBundle?.call(context);
}
