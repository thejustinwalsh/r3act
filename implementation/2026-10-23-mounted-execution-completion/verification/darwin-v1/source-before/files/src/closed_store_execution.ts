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
  bindOwnedClosedProjectionRequest,
  readOwnedClosedProjectionSchedule,
  type AnyAsyncStore, type BoundClosedProjectionRequest,
  type StoreRenderTransaction,
} from "./async_store_runtime.ts";
import {
  bindOwnedClosedWorldInputRequest,
  captureOwnedClosedWorldInputSchedule,
  type ClosedWorldCellCut,
  type OwnedClosedWorldInputCell, type OwnedClosedWorldInputRequest,
  type OwnerStateWorld,
} from "./owner_state_world.ts";
import { snapshotScopedHostProp } from "./scoped_host_values.ts";
import type { ClosedHostOutputValue } from "./closed_host_value.ts";
import type { StorePropDelta } from "./vdom_snapshot_runtime.ts";
import {
  proveClosedStoreBatchKernel,
  CLOSED_STORE_BATCH_MAX_ROWS, type ClosedStoreBatchKernelProof,
} from "./closed_store_batch_kernel_proof.ts";
import {
  createOwnedClosedFrameInput, createOwnedClosedFramePlan,
  createOwnedClosedFrameScheduleFromPlan, type OwnedClosedFramePlan,
  canonicalOwnedClosedFrameScheduleFallbackAt,
  type OwnedClosedFrameInput,
} from "./owned_closed_frame_input.ts";
import {
  OwnedScalarFrame, OwnedScalarLayout, OwnedScalarBatchPage,
  materializeOwnedScalarPropEntries, materializeOwnedScalarImagePropEntries,
  captureVerifiedOwnedScalarBatch,
  type OwnedScalarImage,
  type OwnedScalarOutputCounts, type OwnedScalarValue,
} from "./closed_scalar_output.ts";

type ClosedStoreDataExecutionIdentity = Readonly<{
  kind: "owned-data";
  componentProgramId: string;
  moduleRevision: string;
}>;
export type ClosedStoreDataExecution = ClosedStoreDataExecutionIdentity & Readonly<{
  schemaVersion: 3;
  batchKernel?: (sharedInputs: readonly number[], varyingInputs: readonly number[],
    outputs: number[][], rowCount: number) => void;
}>;

type ExecutionFacts = Readonly<{
  host: ClosedStoreHostProgram;
  paths: readonly (readonly (readonly string[])[])[];
  stateSites: readonly string[];
  inputCount: number;
  valueCount: number;
  retainedChildren: boolean;
  layout: OwnedScalarLayout;
  batchProof: ClosedStoreBatchKernelProof | null;
  diagnostic: Readonly<{ mode: "verified-batch" | "interpreted";
    reason: string }>;
}>;
const associations = new WeakMap<object, ExecutionFacts>();

declare const normalizedExecutionBrand: unique symbol;
export type NormalizedClosedStoreDataExecution = ClosedStoreDataExecutionIdentity & Readonly<{
  schemaVersion: 3;
  [normalizedExecutionBrand]: true;
}>;
const intrinsicApply = Reflect.apply;
const intrinsicDefineProperty = Object.defineProperty;
const intrinsicPush = Array.prototype.push;
const intrinsicFreeze = Object.freeze;
const appendOwned = <T>(array: T[], value: T): void => {
  intrinsicApply(intrinsicPush, array, [value]);
};

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
    if (!data || data.schemaVersion !== 3 ||
      !exactClosedFields(data, Object.hasOwn(data, "batchKernel") ? [
        "schemaVersion", "kind", "componentProgramId", "moduleRevision", "batchKernel",
      ] : ["schemaVersion", "kind", "componentProgramId", "moduleRevision"]) ||
      data.kind !== "owned-data" ||
      data.componentProgramId !== host.componentProgramId ||
      data.moduleRevision !== host.moduleRevision) return null;
    const batchProof = typeof data.batchKernel === "function"
      ? proveClosedStoreBatchKernel(data.batchKernel, host) : null;
    const diagnostic = Object.freeze(batchProof?.kind === "verified"
      ? { mode: "verified-batch" as const, reason: "verified" }
      : { mode: "interpreted" as const,
        reason: batchProof?.reason ?? "batch-kernel-unavailable" });
    const normalized = Object.freeze({
      schemaVersion: 3 as const,
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
      batchProof?.kind === "verified" ? batchProof.numericPropIndices : undefined,
    );
    associations.set(normalized, Object.freeze({
      host, layout,
      paths: Object.freeze(inputs.map((input) => closedStoreHostInputPaths(input))),
      stateSites: host.schemaVersion === 7 ? host.stateSites : Object.freeze([]),
      inputCount: inputs.length,
      valueCount: closedStoreHostValueCount(host),
      retainedChildren: host.schemaVersion === 5 || host.schemaVersion === 6 ||
        host.schemaVersion === 7,
      batchProof, diagnostic,
    }));
    return normalized as NormalizedClosedStoreDataExecution;
  } catch {
    return null;
  }
};

/** Report registration-time selection without exposing executable state. */
export const inspectClosedStoreDataExecution = (
  execution: NormalizedClosedStoreDataExecution,
): Readonly<{ mode: "verified-batch" | "interpreted";
  reason: string }> | null =>
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
    return evaluateOwnedProps(facts, values as number[]);
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
  facts: ExecutionFacts, values: readonly number[],
  counts?: OwnedScalarOutputCounts,
): OwnedScalarFrame | null => {
  const props: OwnedScalarValue[] = [];
  for (const [, expression] of facts.host.host.props) {
    const value = evaluateClosedHostValue(expression, values);
    if (!isClosedHostPrimitive(value)) return null;
    intrinsicDefineProperty(props, props.length, { value, writable: true,
      enumerable: true, configurable: true });
  }
  return OwnedScalarFrame.create(facts.layout, props, counts);
};

const evaluateOwnedProps = (
  facts: ExecutionFacts, values: readonly number[],
): ClosedStoreHostOutput | null => {
  const frame = evaluateOwnedFrame(facts, values);
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
    props: materializeOwnedScalarImagePropEntries(row, counts),
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
  key: string;
  tag: string;
  retainedChildren?: true;
  componentOwner?: number;
}> & OwnedScalarImage;

type NormalizedRequest = Readonly<{
  execution: NormalizedClosedStoreDataExecution;
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
  return { execution: request.execution as NormalizedClosedStoreDataExecution,
    facts, owner: request.owner as number,
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

const unwrapOrderedRequests = (
  ordered: readonly BoundClosedStoreOutputRequest[],
): readonly NormalizedRequest[] | null => {
  if (!Array.isArray(ordered) || ordered.length < 1 || ordered.length > 65536) return null;
  const requests: NormalizedRequest[] = [];
  for (const bound of ordered) {
    const request = canonicalUnwrapClosedStoreOutputRequest(closedOutputBindingKey, bound);
    if (!request) return null;
    appendOwned(requests, request);
  }
  return Object.freeze(requests);
};

type ScheduledFrameRow = Readonly<{
  request: NormalizedRequest;
  group: BatchGroup | null;
  groupRow: number;
}>;
type BatchGroup = Readonly<{
  execution: NormalizedClosedStoreDataExecution;
  rows: readonly number[];
}>;
type GroupTrie = { children: Map<AnyAsyncStore, GroupTrie>; group?: BatchGroup };
const mountedExecutionKey = Symbol("mounted-closed-store-execution");

/** Root-owned immutable schedule geometry; a candidate owns every writable buffer. */
export class MountedClosedStoreExecution {
  readonly #mountedExecutionBrand = true;
  readonly #requests: readonly NormalizedRequest[];
  readonly #scheduled: readonly ScheduledFrameRow[];
  readonly #groups: readonly BatchGroup[];
  readonly #framePlan: OwnedClosedFramePlan;
  private constructor(key: symbol, requests: readonly NormalizedRequest[],
    scheduled: readonly ScheduledFrameRow[], groups: readonly BatchGroup[],
    framePlan: OwnedClosedFramePlan) {
    if (key !== mountedExecutionKey) throw new TypeError("Invalid mounted execution");
    this.#requests = requests;
    this.#scheduled = scheduled;
    this.#groups = groups;
    this.#framePlan = framePlan;
    Object.freeze(this);
  }
  static prepare(key: symbol, requests: readonly NormalizedRequest[],
    previous?: MountedClosedStoreExecution | null,
    counts?: MountedClosedStoreExecutionCounts): MountedClosedStoreExecution | null {
    if (key !== mountedExecutionKey) return null;
    if (previous && !MountedClosedStoreExecution.owns(previous)) previous = null;
    if (previous && previous.#requests.length === requests.length &&
      previous.#requests.every((request, index) => request === requests[index])) {
      if (counts) counts.reused++;
      return previous;
    }
    const scheduled: ScheduledFrameRow[] = [];
    const groups: BatchGroup[] = [];
    const byExecution = new Map<NormalizedClosedStoreDataExecution, GroupTrie>();
    for (let ordinal = 0; ordinal < requests.length; ordinal++) {
      const request = requests[ordinal];
      let group: BatchGroup | null = null;
      let groupRow = -1;
      if (request.facts.batchProof?.kind === "verified") {
        let node = byExecution.get(request.execution);
        if (!node) byExecution.set(request.execution,
          node = { children: new Map<AnyAsyncStore, GroupTrie>() });
        for (const input of request.inputs) {
          let child = node.children.get(input.store);
          if (!child) node.children.set(input.store,
            child = { children: new Map<AnyAsyncStore, GroupTrie>() });
          node = child;
        }
        group = node.group ?? null;
        if (!group || group.rows.length >= CLOSED_STORE_BATCH_MAX_ROWS) {
          group = { execution: request.execution, rows: [] };
          node.group = group;
          appendOwned(groups, group);
        }
        groupRow = group.rows.length;
        appendOwned(group.rows as number[], ordinal);
      }
      appendOwned(scheduled, Object.freeze({ request, group, groupRow }));
    }
    const reusedGroups = new Set<BatchGroup>();
    if (previous) for (let index = 0; index < groups.length; index++) {
      const fresh = groups[index];
      const old = previous.#groups.find((group) =>
        group.execution === fresh.execution &&
        group.rows.length === fresh.rows.length &&
        group.rows.every((ordinal, row) => ordinal === fresh.rows[row] &&
          previous.#requests[ordinal] === requests[ordinal]));
      if (!old) continue;
      groups[index] = old;
      reusedGroups.add(old);
      if (counts) counts.repairedGroups++;
      for (const ordinal of old.rows) scheduled[ordinal] = Object.freeze({
        request: requests[ordinal], group: old,
        groupRow: scheduled[ordinal].groupRow,
      });
    }
    for (const group of groups) if (!reusedGroups.has(group)) {
      Object.freeze(group.rows);
      Object.freeze(group);
    }
    const groupIndices = new Map(groups.map((group, index) => [group, index]));
    const framePlan = createOwnedClosedFramePlan(scheduled.map((row) => ({
      world: row.request.worldRequest!,
      projections: row.request.projectionRequests!,
      group: row.group ? groupIndices.get(row.group)! : -1,
      groupRow: row.groupRow,
    })));
    if (!framePlan) return null;
    if (counts) counts.built++;
    return new MountedClosedStoreExecution(mountedExecutionKey,
      Object.freeze([...requests]),
      Object.freeze(scheduled), Object.freeze(groups), framePlan);
  }
  static owns(value: unknown): value is MountedClosedStoreExecution {
    try { return typeof value === "object" && value !== null &&
      #mountedExecutionBrand in value; }
    catch { return false; }
  }
  static inspect(key: symbol, value: MountedClosedStoreExecution): Readonly<{
    scheduled: readonly ScheduledFrameRow[];
    groups: readonly BatchGroup[];
    framePlan: OwnedClosedFramePlan;
  }> | null {
    return key === mountedExecutionKey && MountedClosedStoreExecution.owns(value)
      ? { scheduled: value.#scheduled, groups: value.#groups,
        framePlan: value.#framePlan } : null;
  }
}
const canonicalInspectMountedExecution = MountedClosedStoreExecution.inspect;
Object.freeze(MountedClosedStoreExecution.prototype);
Object.freeze(MountedClosedStoreExecution);
export type MountedClosedStoreExecutionCounts = {
  built: number;
  reused: number;
  repairedGroups: number;
};

const prepareOwnedFrameSchedule = (
  world: OwnerStateWorld, transaction: StoreRenderTransaction,
  plan: MountedClosedStoreExecution, counts?: OwnedScalarOutputCounts,
): { kind: "ready"; rows: readonly OwnedClosedStoreOutputRow[];
  cellCut: ClosedWorldCellCut } | { kind: "public-required" } | null => {
  const details = canonicalInspectMountedExecution(mountedExecutionKey, plan);
  if (!details) return null;
  const { scheduled, groups } = details;
  if (scheduled.length === 0) return null;
  const groupInputs: OwnedClosedFrameInput[] = [];
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex];
    const proof = scheduled[group.rows[0]].request.facts.batchProof;
    if (proof?.kind !== "verified") return null;
    groupInputs.push(createOwnedClosedFrameInput(
      proof.sharedInputCount, proof.varyingInputCount, group.rows.length,
    ));
  }
  const schedule = createOwnedClosedFrameScheduleFromPlan(details.framePlan, groupInputs);
  if (!schedule) return null;
  const worldBatch = captureOwnedClosedWorldInputSchedule(world, schedule);
  if (!worldBatch) return { kind: "public-required" };
  if (!readOwnedClosedProjectionSchedule(transaction, schedule))
    return { kind: "public-required" };
  const rows: OwnedClosedStoreOutputRow[] = [];
  const makeRow = (ordinal: number, source: OwnedScalarFrame | OwnedScalarBatchPage,
    rowIndex = -1): void => {
    const request = scheduled[ordinal].request;
    const worldRow = worldBatch.rows[ordinal];
    if (!worldRow || worldRow.owner !== request.owner ||
      worldRow.cells.length !== request.facts.stateSites.length)
      throw new TypeError("Invalid owned World row");
    const image = rowIndex < 0
      ? { kind: "frame" as const, frame: source as OwnedScalarFrame }
      : { kind: "page" as const, page: source as OwnedScalarBatchPage, rowIndex };
    const row = intrinsicFreeze({ owner: request.owner, lineage: worldRow.lineage,
      cells: worldRow.cells, ...image,
      key: request.facts.retainedChildren ? request.hostKey : request.facts.host.host.key,
      tag: request.facts.host.host.tag,
      ...(request.facts.retainedChildren ? { retainedChildren: true as const,
        componentOwner: request.owner } : {}),
    });
    ownedClosedOutputRows.add(row);
    intrinsicDefineProperty(rows, ordinal, { value: row, enumerable: true,
      writable: true, configurable: true });
  };
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex];
    const facts = scheduled[group.rows[0]].request.facts;
    const proof = facts.batchProof;
    const input = groupInputs[groupIndex];
    if (proof?.kind !== "verified" || !input) return null;
    const page = captureVerifiedOwnedScalarBatch(facts.layout, proof,
      input, group.rows.length, counts);
    for (let index = 0; index < group.rows.length; index++)
      makeRow(group.rows[index], page, index);
  }
  let scratch: number[] | null = null;
  for (let ordinal = 0; ordinal < scheduled.length; ordinal++) {
    const row = scheduled[ordinal];
    if (row.group) continue;
    const facts = row.request.facts;
    const worldRow = worldBatch.rows[ordinal];
    const fallbackValues = canonicalOwnedClosedFrameScheduleFallbackAt.call(
      schedule, ordinal);
    if (!worldRow || !fallbackValues ||
      fallbackValues.length !== row.request.inputs.length)
      return null;
    if (!scratch) scratch = denseNumericScratch(0);
    growNumericScratch(scratch, facts.valueCount);
    let cursor = 0;
    for (let projection = 0; projection < fallbackValues.length; projection++) {
      const values = fallbackValues[projection];
      for (let valueIndex = 0; valueIndex < values.length; valueIndex++) {
        const value = values[valueIndex];
        if (typeof value !== "number" || !Number.isFinite(value)) return null;
        scratch[cursor++] = value;
      }
    }
    for (let cellIndex = 0; cellIndex < worldRow.cells.length; cellIndex++) {
      const cell = worldRow.cells[cellIndex];
      if (typeof cell.value !== "number" || !Number.isFinite(cell.value)) return null;
      scratch[cursor++] = cell.value;
    }
    if (cursor !== facts.valueCount) return null;
    const frame = evaluateOwnedFrame(facts, scratch, counts);
    if (!frame) return null;
    makeRow(ordinal, frame);
  }
  return intrinsicFreeze({ kind: "ready" as const, rows: intrinsicFreeze(rows),
    cellCut: worldBatch.cellCut });
};

/** Enclose passive captures and finite evaluation for ordered owned scalar rows. */
export const prepareOwnedClosedStoreOutputs = (
  world: OwnerStateWorld,
  transaction: StoreRenderTransaction,
  orderedRequests: readonly BoundClosedStoreOutputRequest[],
  counts?: OwnedScalarOutputCounts,
  previousPlan?: MountedClosedStoreExecution | null,
  planCounts?: MountedClosedStoreExecutionCounts,
): { kind: "ready"; rows: readonly OwnedClosedStoreOutputRow[];
  cellCut: ClosedWorldCellCut; plan: MountedClosedStoreExecution } |
  { kind: "public-required" } | null => {
  try {
    const owned = unwrapOrderedRequests(orderedRequests);
    const plan = owned ? MountedClosedStoreExecution.prepare(
      mountedExecutionKey, owned, previousPlan, planCounts) : null;
    const prepared = plan ? prepareOwnedFrameSchedule(world, transaction, plan, counts) : null;
    return prepared?.kind === "ready" ? { ...prepared, plan } : prepared;
  } catch {
    return null;
  }
};
