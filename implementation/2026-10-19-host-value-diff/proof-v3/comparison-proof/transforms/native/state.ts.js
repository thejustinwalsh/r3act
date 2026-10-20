import { AsyncResource } from "@r3act/core";
import { Vector3 } from "three";
export const values = {
	position: new Vector3(1, 2, 3),
	rotation: [
		0,
		0,
		0
	],
	style: {
		color: "red",
		opacity: 1
	},
	scalar: "first"
};
export function createPending() {
	let resolve;
	const promise = new Promise((done) => {
		resolve = done;
	});
	return {
		resource: new AsyncResource(promise),
		resolve
	};
}
