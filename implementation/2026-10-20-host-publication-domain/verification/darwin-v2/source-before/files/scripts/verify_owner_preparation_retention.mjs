import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {OwnerStateWorld} from '../src/owner_state_world.ts';

assert.equal(typeof global.gc, 'function', 'Run Node with --expose-gc');
const world = new OwnerStateWorld();
const owner = world.resolveOwner(null, 'root');
const keepSetters = [];
function prepare() {
  const oldValue = {payload: new Uint8Array(4096)};
  const weakPublished = new WeakRef(oldValue);
  const [, update] = world.useState(owner, 'published', oldValue);
  const published = world.beginPreparation();
  const [, setter] = published.useState(owner, 'published', null);
  published.publish();
  keepSetters.push(setter);
  update({payload: new Uint8Array(1)});

  const privateValue = {payload: new Uint8Array(4096)};
  const weakDiscarded = new WeakRef(privateValue);
  const discarded = world.beginPreparation();
  const [, privateSetter] = discarded.useState(owner, 'discarded', privateValue);
  keepSetters.push(privateSetter);
  discarded.discard();
  const control = new WeakRef({control: true});
  return {weakPublished, weakDiscarded, control};
}
const weak = prepare();
// Never dereference between collections: deref keeps objects alive until the
// end of the current job and would invalidate this narrow retention check.
for (let i = 0; i < 12; i++) {
  await setImmediate();
  global.gc();
}
assert.equal(weak.control.deref(), undefined, 'Control was not collected');
assert.equal(weak.weakPublished.deref(), undefined, 'Published setter retained old snapshot');
assert.equal(weak.weakDiscarded.deref(), undefined, 'Discarded setter retained private value');
assert.equal(keepSetters[1]({}), false, 'Discarded setter was active');
assert.equal(keepSetters[0]({payload: new Uint8Array(2)}), true);
console.log('PASS: retained setters release old published and discarded candidate values; live setter forwards. Narrow Node GC check, not a heap or performance claim.');
