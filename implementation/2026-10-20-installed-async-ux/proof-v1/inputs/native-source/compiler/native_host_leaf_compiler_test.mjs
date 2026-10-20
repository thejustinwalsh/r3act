import assert from 'node:assert/strict';
import path from 'node:path';
import { nativeModuleCompilerPlugin } from './vite_native_module.ts';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sourcePath = path.join(projectRoot, '.cache/native-host-leaf.tsx');
const source = `import { AsyncResource, createStore, use, useEffect, useState } from "../src/native_runtime_api.ts";
const counter = createStore(2);
const alternate = createStore(3);
const resource = new AsyncResource(Promise.resolve(4));
export function PlainOutput() { return <output />; }
export function StoreProbe() {
  const value = use(counter);
  return <output>{\`value \${String(value + 1)}\`}</output>;
}
export function ConditionalStoreProbe({ flag }) {
  const value = use(flag ? counter : alternate);
  return <output>{value}</output>;
}
export function CallbackReturnsIgnored() {
  useEffect(() => { return () => <span />; });
  return <button onClick={() => { return <output />; }} />;
}
export function ConditionalResourceRead({ flag }) {
  const value = use(flag ? counter : resource);
  return <output>constant</output>;
}
function Leaf() { return <span />; }
export function ConditionalNested() {
  const [show] = useState(false);
  return show ? <div /> : <Leaf />;
}
export function ConditionalNull() {
  const [show] = useState(false);
  return show ? <div /> : null;
}
export function ConditionalTagChange() {
  const [show] = useState(false);
  return show ? <div /> : <span />;
}
export function DynamicRootKey({ id }) { return <div key={id} />; }
export function UnknownChild({ children }) { return <div>{children}</div>; }
`;

const plugin = nativeModuleCompilerPlugin({ root: projectRoot });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
try {
  const transformed = await plugin.transform.call(context, source, sourcePath);
  assert.ok(transformed?.code, 'native compiler should transform TSX source');
  assert.match(
    transformed.code,
    /__nativeDefineComponent\("[^\"]+#component:PlainOutput", PlainOutput, \{ propOnlySites: \[\], hostLeafOutput: true \}\)/,
    'plain intrinsic output should carry the compiler hint',
  );
  assert.match(
    transformed.code,
    /__nativeDefineComponent\("[^\"]+#component:StoreProbe", StoreProbe, \{ propOnlySites: \[\], hostLeafOutput: true \}\)/,
    'primitive local-store text output should carry the compiler hint',
  );
  for (const name of ['ConditionalStoreProbe', 'CallbackReturnsIgnored']) {
    assert.match(
      transformed.code,
      new RegExp(`__nativeDefineComponent\\("[^\\"]+#component:${name}", ${name}, \\{ propOnlySites: \\[\\], hostLeafOutput: true \\}\\)`),
      `${name} should carry the compiler hint`,
    );
  }
  for (const name of ['ConditionalResourceRead', 'ConditionalNested', 'ConditionalNull', 'ConditionalTagChange', 'DynamicRootKey', 'UnknownChild']) {
    const registration = transformed.code.match(
      new RegExp(`__nativeDefineComponent\\("[^\\"]+#component:${name}", ${name}, \\{ propOnlySites: \\[\\](.*?) \\}\\)`),
    );
    assert.ok(registration, `missing registration for ${name}`);
    assert.doesNotMatch(registration[1], /hostLeafOutput\s*:\s*true/, `${name} must remain generic`);
  }
  console.log('PASS: native OXC metadata hints only stable intrinsic roots with primitive children.');
} finally {
  await plugin.closeBundle?.call(context);
}
