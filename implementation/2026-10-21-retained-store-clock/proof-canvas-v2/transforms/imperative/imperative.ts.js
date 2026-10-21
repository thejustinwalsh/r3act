import * as THREE from "three";
import { makeObject, OBJECTS, start, value } from "./scene";
const scene = new THREE.Scene();
const group = new THREE.Group();
group.name = "objects";
const marker = new THREE.Group();
marker.name = "accepted-frame";
scene.add(marker, group);
const setupStart = performance.now();
const objects = Array.from({ length: OBJECTS }, (_, id) => makeObject(id));
group.add(...objects);
for (let id = 0; id < OBJECTS; id++) {
	const motion = objects[id].children[0];
	motion.position.x = id % 2 === 0 ? value(0) * .01 : value(0) * .0025;
	motion.position.y = id % 2 === 0 ? value(0) * .005 : value(0) * .0075;
	motion.rotation.z = id % 2 === 0 ? value(0) * 1e-4 : value(0) * 2e-4;
}
const setupMs = performance.now() - setupStart;
start({
	scene,
	update(epoch) {
		for (let id = 0; id < OBJECTS; id++) {
			const motion = objects[id].children[0];
			motion.position.x = id % 2 === 0 ? value(epoch) * .01 : value(epoch) * .0025;
			motion.position.y = id % 2 === 0 ? value(epoch) * .005 : value(epoch) * .0075;
			motion.rotation.z = id % 2 === 0 ? value(epoch) * 1e-4 : value(epoch) * 2e-4;
		}
		marker.position.x = epoch;
		return { published: marker.position.x === epoch };
	},
	dispose() {
		scene.clear();
		return {
			setupMs,
			setupScope: "object creation and attachment; scene/group construction excluded",
			sceneChildren: scene.children.length,
			retainedObjects: objects.length
		};
	}
});
