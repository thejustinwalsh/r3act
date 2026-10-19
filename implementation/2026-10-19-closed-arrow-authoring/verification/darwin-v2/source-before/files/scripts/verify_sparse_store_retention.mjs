import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { createAsyncStore } from '../src/async_store_runtime.ts';
import { ComponentStateRoot, defineComponent, useStoreAt } from '../src/component_state_runtime.ts';
import { jsx } from '../src/jsx_binding_runtime.ts';
import { MemoryVDOMHost } from '../src/vdom_snapshot_runtime.ts';

assert.equal(typeof global.gc, 'function', 'Run Node with --expose-gc');
const source = createAsyncStore({ id: 0, bytes: new Uint8Array(1) }, (_state, action) => action);
const Reader = defineComponent('sparse-retention-reader', () => {
  const value = useStoreAt('payload', source);
  return jsx('button', { 'data-id': value.id, onClick: () => value.bytes.length });
}, { propOnlySites: [], hostLeafOutput: true });
const App = defineComponent('sparse-retention-app', () => jsx('main', {}, jsx(Reader, {})));
const host = new MemoryVDOMHost(), container = host.createContainer();
const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
root.mount(jsx(App, {}));
const button = container.children[0].children[0];
function replacePayload() {
  const obsolete = { id: 1, bytes: new Uint8Array(8192) };
  const weak = new WeakRef(obsolete);
  source.dispatch(obsolete); root.flush();
  assert.equal(button.props.onClick(), 8192);
  source.dispatch({ id: 2, bytes: new Uint8Array(2) }); root.flush();
  source.dispatch({ id: 3, bytes: new Uint8Array(3) }); root.flush();
  return { weak, control: new WeakRef({ control: true }) };
}
const { weak, control } = replacePayload();
for (let attempt = 0; attempt < 12; attempt++) { await setImmediate(); global.gc(); }
assert.equal(control.deref(), undefined, 'GC control was not collected');
assert.equal(weak.deref(), undefined, 'Sparse publication retained obsolete reader/callback payload through an ancestor cache or completed candidate');
assert.equal(container.children[0].children[0], button, 'Root and same host must remain mounted');
assert.equal(button.props['data-id'], 3);
assert.equal(button.props.onClick(), 3, 'Latest event handler must remain live');
root.dispose();
assert.deepEqual(source.diagnostics(), { roots: 0, listeners: 0, readers: 0, retainedActions: 0, transitions: 0 });
console.log('PASS: obsolete sparse-reader callback payload collected while root, source and stable host stay live. Narrow controlled Node GC check, not an allocation-rate claim.');
