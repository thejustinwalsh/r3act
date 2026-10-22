import { type ClosedNumericExpression } from "./closed_numeric_expression.ts";
import {
  closedDataArray, closedDataRecord, evaluateClosedHostValue, exactClosedFields,
  isClosedHostPrimitive,
} from "./closed_host_value.ts";
import {
  closedStoreHostInputPaths, closedStoreHostInputs, closedStoreHostValueCount,
  isNormalizedClosedStoreHostProgram,
  type ClosedStoreHostOutput, type ClosedStoreHostProgram,
} from "./closed_store_host_program.ts";
import {
  bindOwnedClosedProjectionRequest, readOwnedClosedProjectionBatch,
  type AnyAsyncStore, type BoundClosedProjectionRequest,
  type OwnedClosedProjectionRequest,
  type StoreRenderTransaction,
} from "./async_store_runtime.ts";
import {
  bindOwnedClosedWorldInputRequest, captureOwnedClosedWorldInputs,
  type OwnedClosedWorldInputCell, type OwnedClosedWorldInputRequest,
  type OwnerStateWorld,
} from "./owner_state_world.ts";
import { snapshotScopedHostProp } from "./scoped_host_values.ts";
import type { ClosedHostOutputValue } from "./closed_host_value.ts";
import type { StorePropDelta } from "./vdom_snapshot_runtime.ts";
import {
  proveClosedScalarNumericKernel, type ClosedScalarKernelProof,
} from "./closed_scalar_kernel_proof.ts";
import {
  OwnedScalarFrame, OwnedScalarLayout, materializeOwnedScalarPropEntries,
  type OwnedScalarOutputCounts, type OwnedScalarValue,
} from "./closed_scalar_output.ts";

type ClosedStoreDataExecutionIdentity = Readonly<{
  kind: "owned-data";
  componentProgramId: string;
  moduleRevision: string;
}>;
export type ClosedStoreDataExecution = ClosedStoreDataExecutionIdentity & (
  Readonly<{
  schemaVersion: 1;
  }> | Readonly<{
    schemaVersion: 2;
    numericKernel?: (inputs: readonly number[], outputs: number[]) => void;
  }>
);

type ExecutionFacts = Readonly<{
  host: ClosedStoreHostProgram;
  paths: readonly (readonly (readonly string[])[])[];
  stateSites: readonly string[];
  inputCount: number;
  valueCount: number;
  retainedChildren: boolean;
  layout: OwnedScalarLayout;
  scalarProof: ClosedScalarKernelProof | null;
  diagnostic: Readonly<{ mode: "verified-scalar" | "interpreted"; reason: string }>;
}>;
const associations = new WeakMap<object, ExecutionFacts>();

declare const normalizedExecutionBrand: unique symbol;
export type NormalizedClosedStoreDataExecution = ClosedStoreDataExecutionIdentity & Readonly<{
  schemaVersion: 1 | 2;
  [normalizedExecutionBrand]: true;
}>;
const intrinsicApply = Reflect.apply;
const intrinsicDefineProperty = Object.defineProperty;

const numericExpression = (value: ClosedNumericExpression): boolean => {
  switch (value.kind) {
    case "input": return true;
    case "literal": return typeof value.value === "number" && Number.isFinite(value.value);
    case "unary": return value.operator !== "!" && numericExpression(value.argument);
    case "binary": return !["==", "!=", "===", "!==", "<", "<=", ">", ">="].includes(
      value.operator,
    ) && numericExpression(value.left) && numericExpression(value.right);
    default: return false;
  }
};

const supportedHost = (host: ClosedStoreHostProgram): boolean => {
  if (host.schemaVersion === 4) return false;
  if (host.schemaVersion === 5) {
    if (host.host.tag !== "group" || host.host.children.length !== 0) return false;
    return host.host.props.some(([, value]) => numericExpression(value as ClosedNumericExpression)) &&
      host.host.props.every(([, value]) => value.kind === "literal"
        ? isClosedHostPrimitive(value.value)
        : numericExpression(value as ClosedNumericExpression));
  }
  return host.host.props.length > 0 && host.host.props.every(([, value]) =>
    numericExpression(value as ClosedNumericExpression));
};

/** Copy an explicit data marker and bind it privately to a normalized host program. */
export const normalizeClosedStoreDataExecution = (
  raw: unknown,
  host: ClosedStoreHostProgram,
): NormalizedClosedStoreDataExecution | null => {
  try {
    if (!isNormalizedClosedStoreHostProgram(host) || !supportedHost(host)) return null;
    const data = closedDataRecord(raw);
    if (!data || (data.schemaVersion !== 1 && data.schemaVersion !== 2) ||
      !exactClosedFields(data, data.schemaVersion === 1 ? [
        "schemaVersion", "kind", "componentProgramId", "moduleRevision",
      ] : Object.hasOwn(data, "numericKernel") ? [
        "schemaVersion", "kind", "componentProgramId", "moduleRevision", "numericKernel",
      ] : ["schemaVersion", "kind", "componentProgramId", "moduleRevision"]) ||
      data.kind !== "owned-data" ||
      data.componentProgramId !== host.componentProgramId ||
      data.moduleRevision !== host.moduleRevision) return null;
    const scalarProof = data.schemaVersion === 2 && typeof data.numericKernel === "function"
      ? proveClosedScalarNumericKernel(data.numericKernel, host) : null;
    const diagnostic = Object.freeze(scalarProof?.kind === "verified"
      ? { mode: "verified-scalar" as const, reason: "verified" }
      : { mode: "interpreted" as const,
        reason: scalarProof?.reason ?? (data.schemaVersion === 1
          ? "schema-1" : "numeric-kernel-unavailable") });
    const normalized = Object.freeze({
      schemaVersion: data.schemaVersion as 1 | 2,
      kind: "owned-data" as const,
      componentProgramId: host.componentProgramId,
      moduleRevision: host.moduleRevision,
    });
    const inputs = closedStoreHostInputs(host);
    const layout = OwnedScalarLayout.create(
      host.host.props.map(([name]) => name),
      host.host.props.map(([, expression]) => expression.kind === "literal" &&
          isClosedHostPrimitive(expression.value)
        ? expression.value : undefined),
    );
    associations.set(normalized, Object.freeze({
      host, layout,
      paths: Object.freeze(inputs.map((input) => closedStoreHostInputPaths(input))),
      stateSites: host.schemaVersion === 7 ? host.stateSites : Object.freeze([]),
      inputCount: inputs.length,
      valueCount: closedStoreHostValueCount(host),
      retainedChildren: host.schemaVersion === 5 || host.schemaVersion === 6 ||
        host.schemaVersion === 7,
      scalarProof, diagnostic,
    }));
    return normalized as NormalizedClosedStoreDataExecution;
  } catch {
    return null;
  }
};

/** Report registration-time selection without exposing executable state. */
export const inspectClosedStoreDataExecution = (
  execution: NormalizedClosedStoreDataExecution,
): Readonly<{ mode: "verified-scalar" | "interpreted"; reason: string }> | null =>
  typeof execution === "object" && execution !== null
    ? associations.get(execution)?.diagnostic ?? null : null;

/** Evaluate only privately associated, finite numeric inputs into candidate-owned props. */
export const evaluateClosedStoreDataExecution = (
  execution: NormalizedClosedStoreDataExecution,
  numericValues: readonly number[],
): ClosedStoreHostOutput | null => {
  try {
    const facts = typeof execution === "object" && execution !== null
      ? associations.get(execution) : undefined;
    if (!facts) return null;
    const values = closedDataArray(numericValues);
    if (!values || values.length !== facts.valueCount ||
      values.some((value) => typeof value !== "number" || !Number.isFinite(value))) return null;
    if (facts.scalarProof?.kind !== "verified")
      return evaluateOwnedProps(facts, values as number[]);
    const inputScratch = denseNumericScratch(values.length);
    for (let index = 0; index < values.length; index++)
      inputScratch[index] = values[index] as number;
    return evaluateOwnedProps(facts, inputScratch);
  } catch {
    return null;
  }
};

const denseNumericScratch = (length: number): number[] => {
  const values: number[] = [];
  growNumericScratch(values, length);
  return values;
};

const growNumericScratch = (values: number[], length: number): void => {
  for (let index = values.length; index < length; index++) {
    intrinsicDefineProperty(values, index, { value: 0, writable: true,
      enumerable: true, configurable: true });
  }
};

const evaluateOwnedFrame = (
  facts: ExecutionFacts, values: readonly number[], outputScratch?: number[],
  counts?: OwnedScalarOutputCounts,
): OwnedScalarFrame | null => {
  const proof = facts.scalarProof;
  const numericIndices = proof?.kind === "verified" ? proof.numericPropIndices : null;
  let outputs: number[] | null = null;
  if (proof?.kind === "verified" && numericIndices) {
    outputs = outputScratch ?? denseNumericScratch(numericIndices.length);
    for (let index = 0; index < numericIndices.length; index++) outputs[index] = NaN;
    intrinsicApply(proof.kernel, undefined, [values, outputs]);
  }
  const props: OwnedScalarValue[] = [];
  let numericIndex = 0;
  for (const [, expression] of facts.host.host.props) {
    const value = outputs && numericIndices && numericIndex < numericIndices.length &&
        numericIndices[numericIndex] === props.length
      ? outputs[numericIndex++] : evaluateClosedHostValue(expression, values);
    if (!isClosedHostPrimitive(value)) return null;
    intrinsicDefineProperty(props, props.length, { value, writable: true,
      enumerable: true, configurable: true });
  }
  return OwnedScalarFrame.create(facts.layout, props, counts);
};

const evaluateOwnedProps = (
  facts: ExecutionFacts, values: readonly number[], outputScratch?: number[],
): ClosedStoreHostOutput | null => {
  const frame = evaluateOwnedFrame(facts, values, outputScratch);
  return frame ? materializeOwnedScalarPropEntries(frame) : null;
};

const ownedScalarStorePropDeltas = new WeakSet<StorePropDelta>();
const ownedClosedOutputRows = new WeakSet<object>();

/** Identify a region constructed by the shared scalar output authority. */
export const isOwnedScalarStorePropDelta = (region: StorePropDelta): boolean =>
  ownedScalarStorePropDeltas.has(region);

const ownScalarRegionData = (input: unknown): Record<string, unknown> | null => {
  if (input === null || typeof input !== "object") return null;
  try {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length < 3 || keys.length > 5 ||
      keys.some((key) => typeof key !== "string" ||
        !["key", "tag", "props", "retainedChildren", "componentOwner", "children"]
          .includes(key)) ||
      !descriptors.key || !descriptors.tag || !descriptors.props) return null;
    const copy: Record<string, unknown> = Object.create(null);
    for (const key of keys as string[]) {
      const descriptor = descriptors[key];
      if (!descriptor || !("value" in descriptor)) return null;
      copy[key] = descriptor.value;
    }
    return copy;
  } catch { return null; }
};

const ownArray = (input: unknown, limit: number): readonly unknown[] | null => {
  if (!Array.isArray(input)) return null;
  try {
    if (Object.getPrototypeOf(input) !== Array.prototype) return null;
    const size = Object.getOwnPropertyDescriptor(input, "length")?.value;
    if (!Number.isSafeInteger(size) || size < 0 || size > limit) return null;
    const descriptors = Object.getOwnPropertyDescriptors(input) as unknown as
      Record<string, PropertyDescriptor>;
    const length = descriptors.length?.value;
    if (length !== size ||
      Reflect.ownKeys(descriptors).length !== length + 1) return null;
    const copy: unknown[] = [];
    for (let index = 0; index < length; index++) {
      const descriptor = descriptors[index];
      if (!descriptor || !("value" in descriptor)) return null;
      copy.push(descriptor.value);
    }
    return copy;
  } catch { return null; }
};

/** Copy a caller's scalar Store region into a privately owned immutable shape. */
export const createOwnedScalarStorePropDelta = (
  region: StorePropDelta,
): StorePropDelta | null => {
  const data = ownScalarRegionData(region);
  return data ? copyOwnedScalarRegion(data) : null;
};

const copyOwnedScalarRegion = (fields: Record<string, unknown>): StorePropDelta | null => {
  const { key, tag, props, retainedChildren, componentOwner, children } = fields;
  if (typeof key !== "string" || !key || typeof tag !== "string" || !tag ||
    !["div", "span", "output", "group", "mesh"].includes(tag) ||
    (Object.hasOwn(fields, "retainedChildren") !==
      Object.hasOwn(fields, "componentOwner")) ||
    (Object.hasOwn(fields, "children") && children === undefined) ||
    (retainedChildren !== undefined && retainedChildren !== true) ||
    (componentOwner !== undefined &&
      (retainedChildren !== true || typeof componentOwner !== "number" ||
        !Number.isSafeInteger(componentOwner))) ||
    (retainedChildren === true && (componentOwner === undefined ||
      children !== undefined))) return null;
  const rawProps = ownArray(props, 32);
  if (!rawProps || (!rawProps.length && children === undefined)) return null;
  const pairs: (readonly [string, ClosedHostOutputValue])[] = [];
  const names = new Set<string>();
  for (const rawPair of rawProps) {
    const pair = ownArray(rawPair, 2);
    if (!pair || pair.length !== 2 || typeof pair[0] !== "string" ||
      !pair[0] || pair[0] === "__proto__" || pair[0] === "prototype" ||
      pair[0] === "constructor" || pair[0] === "ref" ||
      /^on[A-Z]/.test(pair[0]) || names.has(pair[0])) return null;
    const value = pair[1];
    if (value !== null && typeof value !== "string" &&
      typeof value !== "boolean" &&
      !(typeof value === "number" && Number.isFinite(value))) return null;
    const captured = snapshotScopedHostProp(tag, pair[0], value);
    if (!captured.accepted || captured.value === undefined ||
      !Object.is(captured.value, value)) return null;
    names.add(pair[0]);
    pairs.push(Object.freeze([pair[0], value] as const));
  }
  if (children !== undefined) {
    const empty = ownArray(children, 0);
    if (!empty || empty.length !== 0) return null;
  }
  const copy: StorePropDelta = Object.freeze({ key, tag,
    props: Object.freeze(pairs),
    ...(retainedChildren === true ? { retainedChildren: true as const,
      componentOwner: componentOwner as number } : {}),
    ...(children === undefined ? {} : { children: Object.freeze([]) }),
  });
  ownedScalarStorePropDeltas.add(copy);
  return copy;
};

export const materializeOwnedScalarStorePropDelta = (
  row: OwnedClosedStoreOutputRow,
  counts?: OwnedScalarOutputCounts,
): StorePropDelta => {
  if (typeof row !== "object" || row === null || !ownedClosedOutputRows.has(row)) {
    throw new TypeError("Unowned scalar output row");
  }
  const region: StorePropDelta = Object.freeze({
    key: row.key,
    tag: row.tag,
    props: materializeOwnedScalarPropEntries(row.frame, counts),
    ...(row.retainedChildren ? { retainedChildren: true as const,
      componentOwner: row.componentOwner } : {}),
  });
  ownedScalarStorePropDeltas.add(region);
  return region;
};

export type OwnedClosedStoreOutputRequest = Readonly<{
  execution: NormalizedClosedStoreDataExecution;
  owner: number;
  hostKey: string;
  inputs: readonly Readonly<{ store: AnyAsyncStore; readerId: string }>[];
}>;

export type OwnedClosedStoreOutputRow = Readonly<{
  owner: number;
  lineage: readonly number[];
  cells: readonly OwnedClosedWorldInputCell[];
  frame: OwnedScalarFrame;
  key: string;
  tag: string;
  retainedChildren?: true;
  componentOwner?: number;
}>;

type NormalizedRequest = Readonly<{
  facts: ExecutionFacts;
  owner: number;
  hostKey: string;
  inputs: readonly Readonly<{ store: AnyAsyncStore; readerId: string }>[];
  worldRequest?: OwnedClosedWorldInputRequest;
  projectionRequests?: readonly BoundClosedProjectionRequest[];
}>;

const normalizeOwnedOutputRequest = (raw: unknown): NormalizedRequest | null => {
  const request = closedDataRecord(raw);
  if (!request || !exactClosedFields(request,
    ["execution", "owner", "hostKey", "inputs"])) return null;
  const facts = typeof request.execution === "object" && request.execution !== null
    ? associations.get(request.execution) : undefined;
  if (!facts || !Number.isSafeInteger(request.owner) ||
    typeof request.hostKey !== "string" || !request.hostKey) return null;
  const rawInputs = closedDataArray(request.inputs, 8);
  if (!rawInputs || rawInputs.length !== facts.inputCount) return null;
  const inputs: { store: AnyAsyncStore; readerId: string }[] = [];
  for (const rawInput of rawInputs) {
    const input = closedDataRecord(rawInput);
    if (!input || !exactClosedFields(input, ["store", "readerId"]) ||
      typeof input.readerId !== "string" || !input.readerId ||
      typeof input.store !== "object" || input.store === null) return null;
    inputs.push({ store: input.store as AnyAsyncStore, readerId: input.readerId });
  }
  return { facts, owner: request.owner as number,
    hostKey: request.hostKey, inputs };
};

const closedOutputBindingKey = Symbol("closed-output-binding");
class PrivateBoundClosedStoreOutputRequest {
  readonly #request: NormalizedRequest;
  private constructor(key: symbol, request: NormalizedRequest) {
    if (key !== closedOutputBindingKey) throw new TypeError("Invalid output binding");
    this.#request = request;
    Object.freeze(this);
  }
  static bind(raw: OwnedClosedStoreOutputRequest): PrivateBoundClosedStoreOutputRequest | null {
    try {
      const request = normalizeOwnedOutputRequest(raw);
      if (!request) return null;
      const worldRequest = bindOwnedClosedWorldInputRequest({
        owner: request.owner, sites: request.facts.stateSites,
      });
      if (!worldRequest) return null;
      const projectionRequests: BoundClosedProjectionRequest[] = [];
      for (let index = 0; index < request.inputs.length; index++) {
        const input = request.inputs[index];
        const bound = bindOwnedClosedProjectionRequest({
          store: input.store, readerId: input.readerId,
          paths: request.facts.paths[index],
        });
        if (!bound) return null;
        projectionRequests.push(bound);
      }
      return new PrivateBoundClosedStoreOutputRequest(closedOutputBindingKey, Object.freeze({
        ...request, inputs: Object.freeze(request.inputs.map((input) => Object.freeze(input))),
        worldRequest, projectionRequests: Object.freeze(projectionRequests),
      }));
    } catch {
      return null;
    }
  }
  static unwrap(key: symbol, value: unknown): NormalizedRequest | null {
    if (key !== closedOutputBindingKey) return null;
    return typeof value === "object" && value !== null &&
      #request in value ? value.#request : null;
  }
}

export type BoundClosedStoreOutputRequest = PrivateBoundClosedStoreOutputRequest;
export const bindOwnedClosedStoreOutputRequest = PrivateBoundClosedStoreOutputRequest.bind;
const canonicalUnwrapClosedStoreOutputRequest = PrivateBoundClosedStoreOutputRequest.unwrap;

/** Enclose passive captures and finite evaluation for ordered owned scalar rows. */
export const prepareOwnedClosedStoreOutputs = (
  world: OwnerStateWorld,
  transaction: StoreRenderTransaction,
  orderedRequests: readonly (OwnedClosedStoreOutputRequest | BoundClosedStoreOutputRequest)[],
  counts?: OwnedScalarOutputCounts,
): { kind: "ready"; rows: readonly OwnedClosedStoreOutputRow[] } |
  { kind: "public-required" } | null => {
  try {
    const rawRequests = closedDataArray(orderedRequests, 65536);
    if (!rawRequests || rawRequests.length === 0) return null;
    const normalized: NormalizedRequest[] = [];
    for (const raw of rawRequests) {
      const request = canonicalUnwrapClosedStoreOutputRequest(closedOutputBindingKey, raw) ??
        normalizeOwnedOutputRequest(raw);
      if (!request) return null;
      normalized.push(request);
    }
    const worldRows = captureOwnedClosedWorldInputs(world,
      normalized.map(({ owner, facts, worldRequest }) =>
        worldRequest ?? { owner, sites: facts.stateSites }));
    if (!worldRows) return { kind: "public-required" };
    const projectionRequests: (OwnedClosedProjectionRequest | BoundClosedProjectionRequest)[] = [];
    for (const row of normalized) {
      for (let index = 0; index < row.inputs.length; index++) {
        projectionRequests.push(row.projectionRequests?.[index] ??
          { ...row.inputs[index], paths: row.facts.paths[index] });
      }
    }
    const projections = readOwnedClosedProjectionBatch(transaction, projectionRequests);
    if (!projections) return { kind: "public-required" };
    const scratch = denseNumericScratch(0);
    const outputScratch = denseNumericScratch(0);
    const rows: OwnedClosedStoreOutputRow[] = [];
    let projectionIndex = 0;
    for (let index = 0; index < normalized.length; index++) {
      const request = normalized[index];
      const worldRow = worldRows[index];
      if (!worldRow || worldRow.owner !== request.owner ||
        worldRow.cells.length !== request.facts.stateSites.length) return null;
      growNumericScratch(scratch, request.facts.valueCount);
      const proof = request.facts.scalarProof;
      if (proof?.kind === "verified")
        growNumericScratch(outputScratch, proof.numericPropIndices.length);
      let cursor = 0;
      for (let input = 0; input < request.inputs.length; input++) {
        const values = projections[projectionIndex++];
        if (!values || values.length !== request.facts.paths[input].length) return null;
        for (const value of values) {
          if (typeof value !== "number" || !Number.isFinite(value)) return null;
          scratch[cursor++] = value;
        }
      }
      for (const cell of worldRow.cells) {
        if (typeof cell.value !== "number" || !Number.isFinite(cell.value)) return null;
        scratch[cursor++] = cell.value;
      }
      if (cursor !== request.facts.valueCount) return null;
      const frame = evaluateOwnedFrame(request.facts, scratch, outputScratch, counts);
      if (!frame) return null;
      const row = Object.freeze({ owner: request.owner, lineage: worldRow.lineage,
        cells: worldRow.cells, frame,
        key: request.facts.retainedChildren ? request.hostKey : request.facts.host.host.key,
        tag: request.facts.host.host.tag,
        ...(request.facts.retainedChildren ? { retainedChildren: true as const,
          componentOwner: request.owner } : {}),
      });
      ownedClosedOutputRows.add(row);
      rows.push(row);
    }
    return Object.freeze({ kind: "ready" as const, rows: Object.freeze(rows) });
  } catch {
    return null;
  }
};
