import { AsyncResource, createStore, storeRecord } from "@r3act/core";
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
export const heldState = (x, y) => storeRecord({ vector: storeRecord({
	x,
	y
}) });
export const sample = (x, y) => storeRecord({ sample: storeRecord({
	x,
	y
}) });
export function createDomain() {
	const detailPending = deferred();
	const signalPending = deferred();
	return {
		heldA: createStore(heldState(1, 2)),
		independentB: createStore(false),
		detail: new AsyncResource(detailPending.promise),
		signal: new AsyncResource(signalPending.promise),
		resolveDetail: detailPending.resolve,
		resolveSignal: signalPending.resolve
	};
}
