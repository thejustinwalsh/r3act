import { AsyncResource } from "@r3act/core";
export function createSceneResource() {
	let resolve;
	const promise = new Promise((done) => {
		resolve = done;
	});
	return {
		resource: new AsyncResource(promise),
		resolve
	};
}
