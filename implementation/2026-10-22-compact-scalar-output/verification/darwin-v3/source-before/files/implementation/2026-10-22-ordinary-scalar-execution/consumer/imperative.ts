import * as THREE from 'three';
import { createView, makeObject, OBJECTS, start, value } from './scene';

const { scene, camera, renderer } = createView();
const group = new THREE.Group(); group.name = 'objects';
const marker = new THREE.Group(); marker.name = 'accepted-frame';
scene.add(marker, group);
const setupStart = performance.now();
const objects = Array.from({ length: OBJECTS }, (_, id) => makeObject(id));
group.add(...objects);
const offsets = Array(OBJECTS).fill(0);
for (let id = 0; id < OBJECTS; id++) {
  const motion = objects[id].children[0];
  motion.position.x = id % 2 === 0 ? value(0) * .01 : value(0) * .0025;
  motion.position.y = id % 2 === 0 ? value(0) * .005 : value(0) * .0075;
  motion.rotation.z = id % 2 === 0 ? value(0) * .0001 : value(0) * .0002;
}
const setupMs = performance.now() - setupStart;
start({ scene, camera, renderer,
  controlProof() {
    offsets[0] = 2; offsets[1] = 3;
    for (const id of [0, 1]) objects[id].children[0].position.x = offsets[id];
    if (objects[0].children[0].position.x !== 2 || objects[1].children[0].position.x !== 3) throw new Error('Imperative control mismatch');
    offsets[0] = 0; offsets[1] = 0;
    for (const id of [0, 1]) objects[id].children[0].position.x = 0;
  },
  update(epoch) {
    for (let id = 0; id < OBJECTS; id++) {
      const motion = objects[id].children[0];
      motion.position.x = (id % 2 === 0 ? value(epoch) * .01 : value(epoch) * .0025) + offsets[id];
      motion.position.y = (id % 2 === 0 ? value(epoch) * .005 : value(epoch) * .0075) + offsets[id] * .5;
      motion.rotation.z = (id % 2 === 0 ? value(epoch) * .0001 : value(epoch) * .0002) + offsets[id] * .01;
    }
    marker.position.x = epoch;
    return { published: marker.position.x === epoch };
  },
  dispose() {
    for (const object of objects) {
      const mesh = object.children[0].children[0].children[0] as THREE.Mesh;
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    scene.clear();
    const sceneChildren = scene.children.length;
    return { setupMs, setupScope: 'object creation and attachment; scene/group construction excluded', sceneChildren, retainedObjects: objects.length };
  },
});
