import * as THREE from 'three';
import { makeObject, OBJECTS, start, value } from './scene';

const scene = new THREE.Scene();
const group = new THREE.Group();
scene.add(group);
const setupStart = performance.now();
const objects = Array.from({ length: OBJECTS }, (_, id) => makeObject(id));
group.add(...objects);
for (let id = 0; id < OBJECTS; id++) {
  if (id % 2 === 0) objects[id].position.x = value(id, 0);
  else objects[id].rotation.z = value(id, 0);
}
const setupMs = performance.now() - setupStart;
start({ scene,
  update(epoch) {
    for (let id = 0; id < OBJECTS; id++) {
      if (id % 2 === 0) objects[id].position.x = value(id, epoch);
      else objects[id].rotation.z = value(id, epoch);
    }
    return { published: true };
  },
  dispose() { scene.clear(); return { setupMs, setupScope: 'object creation and attachment; scene/group construction excluded', sceneChildren: scene.children.length, retainedObjects: objects.length }; },
});
