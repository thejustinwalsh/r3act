import { AsyncResource } from "@r3act/core";
import { Vector3 } from "three";

export const values = {
  position: new Vector3(1, 2, 3),
  rotation: [0, 0, 0],
  style: { color: "red", opacity: 1 } as { color: string; opacity?: number },
  scalar: "first",
};
export function createPending() {
  let resolve!: (value: { x: number }) => void;
  const promise = new Promise<{ x: number }>(done => { resolve = done; });
  return { resource: new AsyncResource(promise), resolve };
}
