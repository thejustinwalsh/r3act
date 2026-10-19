import { AsyncResource, createStore } from "@r3act/core";
function deferred() {
	let resolve;
	const promise = new Promise((done) => {
		resolve = done;
	});
	return {
		promise,
		resolve
	};
}
export function createSceneDomain() {
	const detailPending = deferred();
	const signalPending = deferred();
	const healthPending = deferred();
	return {
		point: createStore(1),
		open: createStore(false),
		detail: new AsyncResource(detailPending.promise),
		signal: new AsyncResource(signalPending.promise),
		health: new AsyncResource(healthPending.promise),
		resolveDetail: detailPending.resolve,
		resolveSignal: signalPending.resolve,
		resolveHealth: healthPending.resolve
	};
}
