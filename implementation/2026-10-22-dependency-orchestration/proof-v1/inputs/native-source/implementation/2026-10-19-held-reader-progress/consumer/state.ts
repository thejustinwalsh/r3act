import { AsyncResource, createStore, storeRecord } from "@r3act/core";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

export const heldState = (x: number, y: number) =>
  storeRecord({ vector: storeRecord({ x, y }) });
export const sample = (x: number, y: number) =>
  storeRecord({ sample: storeRecord({ x, y }) });

export function createDomain() {
  const detailPending = deferred<ReturnType<typeof sample>>();
  const signalPending = deferred<ReturnType<typeof sample>>();
  return {
    heldA: createStore(heldState(1, 2)),
    independentB: createStore(false),
    detail: new AsyncResource(detailPending.promise),
    signal: new AsyncResource(signalPending.promise),
    resolveDetail: detailPending.resolve,
    resolveSignal: signalPending.resolve,
  };
}

export type Domain = ReturnType<typeof createDomain>;
