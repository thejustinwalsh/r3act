import { AsyncResource, createStore } from "@r3act/core";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

export function createSceneDomain() {
  const detailPending = deferred<number>();
  const signalPending = deferred<number>();
  const healthPending = deferred<string>();
  return {
    point: createStore(1),
    open: createStore(false),
    detail: new AsyncResource(detailPending.promise),
    signal: new AsyncResource(signalPending.promise),
    health: new AsyncResource(healthPending.promise),
    resolveDetail: detailPending.resolve,
    resolveSignal: signalPending.resolve,
    resolveHealth: healthPending.resolve,
  };
}

export type SceneDomain = ReturnType<typeof createSceneDomain>;
