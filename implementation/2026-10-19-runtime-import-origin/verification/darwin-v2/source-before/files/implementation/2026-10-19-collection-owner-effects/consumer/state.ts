import { AsyncResource } from "@r3act/core";

export type SceneValue = { sample: { x: number } };
export function createSceneResource() {
  let resolve!: (value: SceneValue) => void;
  const promise = new Promise<SceneValue>(done => { resolve = done; });
  return { resource: new AsyncResource(promise), resolve };
}
