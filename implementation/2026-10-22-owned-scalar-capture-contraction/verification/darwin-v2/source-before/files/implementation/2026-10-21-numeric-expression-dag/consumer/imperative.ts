import * as THREE from 'three';
import { makeObject, OBJECTS, start, value } from './scene';

const scene = new THREE.Scene();
const group = new THREE.Group();
scene.add(group);
const setupStart = performance.now();
const objects = Array.from({ length: OBJECTS }, (_, id) => makeObject(id));
group.add(...objects);
for (let id = 0; id < OBJECTS; id++) {
  const shifted = value(id, 0) * .01;
  const drift = shifted * shifted + shifted;
  const travel = drift * drift + drift;
  objects[id].position.x = id % 2 === 0 ? travel : travel * .25;
  objects[id].position.y = id % 2 === 0 ? travel * .5 : travel * .75;
  objects[id].rotation.z = id % 2 === 0 ? travel * .01 : travel * .02;
}
const setupMs = performance.now() - setupStart;
start({ scene,
  update(epoch) {
    for (let id = 0; id < OBJECTS; id++) {
      const shifted = value(id, epoch) * .01;
      const drift = shifted * shifted + shifted;
      const travel = drift * drift + drift;
      objects[id].position.x = id % 2 === 0 ? travel : travel * .25;
      objects[id].position.y = id % 2 === 0 ? travel * .5 : travel * .75;
      objects[id].rotation.z = id % 2 === 0 ? travel * .01 : travel * .02;
    }
    return { published: true };
  },
  dispose() { scene.clear(); return { setupMs, setupScope: 'object creation and attachment; scene/group construction excluded', sceneChildren: scene.children.length, retainedObjects: objects.length }; },
});
