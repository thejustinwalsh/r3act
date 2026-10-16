import { NativeCollectionBoard, makeRows } from "./native_collection.tsx";
import { NativeGenericBoard } from "./native_generic.tsx";
import { ReactArrayBoard } from "./react_array.tsx";

const registry = Object.freeze({
  NativeCollectionBoard,
  makeRows,
  NativeGenericBoard,
  ReactArrayBoard,
});

Object.assign(globalThis, { __structuralEligibility: registry });
export { NativeCollectionBoard, makeRows, NativeGenericBoard, ReactArrayBoard };
