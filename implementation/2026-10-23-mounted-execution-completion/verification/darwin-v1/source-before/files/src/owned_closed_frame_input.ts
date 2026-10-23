const inputKey = Symbol("owned-closed-frame-input");
const scheduleKey = Symbol("owned-closed-frame-schedule");
const intrinsicDefineProperty = Object.defineProperty;
const intrinsicFreeze = Object.freeze;
const intrinsicPush = Array.prototype.push;
const intrinsicApply = Reflect.apply;
const intrinsicIsArray = Array.isArray;
const intrinsicIsSafeInteger = Number.isSafeInteger;
const intrinsicIsFinite = Number.isFinite;
const intrinsicIs = Object.is;
import {
  isBoundClosedProjectionRequest, ownedClosedProjectionPathCount,
  type BoundClosedProjectionRequest,
} from "./async_store_runtime.ts";
import {
  isOwnedClosedWorldInputRequest, type OwnedClosedWorldInputRequest,
} from "./owner_state_world.ts";

/** Ephemeral numeric columns owned by one sealed frame capture. */
export class OwnedClosedFrameInput {
  readonly #shared: number[];
  readonly #varying: number[];
  readonly #sharedFilled: boolean[];
  readonly #varyingFilled: boolean[];
  readonly #varyingWidth: number;
  #sealed = false;

  constructor(key: symbol, sharedCount: number, varyingCount: number,
    rowCount: number) {
    if (key !== inputKey || !intrinsicIsSafeInteger(sharedCount) ||
      !intrinsicIsSafeInteger(varyingCount) || !intrinsicIsSafeInteger(rowCount) ||
      sharedCount < 0 || varyingCount < 0 || rowCount < 1 || rowCount > 4096 ||
      sharedCount > 256 || varyingCount > 256) {
      throw new TypeError("Invalid closed frame input shape");
    }
    this.#shared = [];
    this.#varying = [];
    this.#varyingWidth = varyingCount;
    this.#sharedFilled = [];
    this.#varyingFilled = [];
    for (let index = 0; index < sharedCount; index++) {
      intrinsicDefineProperty(this.#sharedFilled, index, { value: false,
        writable: true, enumerable: true, configurable: true });
      intrinsicDefineProperty(this.#shared, index, { value: NaN,
        writable: true, enumerable: true, configurable: true });
    }
    for (let index = 0; index < varyingCount * rowCount; index++) {
      intrinsicDefineProperty(this.#varyingFilled, index, { value: false,
        writable: true, enumerable: true, configurable: true });
      intrinsicDefineProperty(this.#varying, index, { value: NaN,
        writable: true, enumerable: true, configurable: true });
    }
    intrinsicFreeze(this);
  }

  get sharedCount(): number { return this.#shared.length; }
  get varyingCount(): number { return this.#varyingWidth; }
  static owns(value: unknown): value is OwnedClosedFrameInput {
    try { return typeof value === "object" && value !== null && #shared in value; }
    catch { return false; }
  }
  setShared(index: number, value: number): void {
    if (this.#sealed || !intrinsicIsSafeInteger(index) || index < 0 || index >= this.#shared.length ||
      typeof value !== "number" || !intrinsicIsFinite(value)) {
      throw new TypeError("Invalid shared input");
    }
    if (this.#sharedFilled[index] && !intrinsicIs(this.#shared[index], value))
      throw new TypeError("Conflicting shared input");
    this.#shared[index] = value;
    this.#sharedFilled[index] = true;
  }
  setVarying(index: number, value: number): void {
    if (this.#sealed || !intrinsicIsSafeInteger(index) || index < 0 || index >= this.#varying.length ||
      typeof value !== "number" || !intrinsicIsFinite(value) ||
      this.#varyingFilled[index]) throw new TypeError("Invalid varying input");
    this.#varying[index] = value;
    this.#varyingFilled[index] = true;
  }
  buffers(): Readonly<{ shared: readonly number[]; varying: readonly number[] }> {
    if (this.#sealed) throw new TypeError("Closed frame input already consumed");
    for (let index = 0; index < this.#sharedFilled.length; index++)
      if (!this.#sharedFilled[index]) throw new TypeError("Incomplete closed frame input");
    for (let index = 0; index < this.#varyingFilled.length; index++)
      if (!this.#varyingFilled[index]) throw new TypeError("Incomplete closed frame input");
    this.#sealed = true;
    return intrinsicFreeze({ shared: intrinsicFreeze(this.#shared),
      varying: intrinsicFreeze(this.#varying) });
  }
}

export const createOwnedClosedFrameInput = (sharedCount: number,
  varyingCount: number, rowCount: number): OwnedClosedFrameInput =>
  new OwnedClosedFrameInput(inputKey, sharedCount, varyingCount, rowCount);

Object.freeze(OwnedClosedFrameInput.prototype);
Object.freeze(OwnedClosedFrameInput);

type MountedRow = Readonly<{
  world: OwnedClosedWorldInputRequest;
  projections: readonly BoundClosedProjectionRequest[];
  group: number;
  groupRow: number;
}>;
type MountedColumn = Readonly<{
  bound: BoundClosedProjectionRequest;
  group: number;
  sharedOffset: number;
  fillShared: boolean;
  fallbackRow: number;
}>;

/** Immutable capture geometry retained by the owning Root while bindings match. */
export class OwnedClosedFramePlan {
  readonly #rows: readonly MountedRow[];
  readonly #columns: readonly MountedColumn[];
  private constructor(key: symbol, rows: readonly MountedRow[],
    columns: readonly MountedColumn[]) {
    if (key !== scheduleKey) throw new TypeError("Invalid closed frame plan");
    this.#rows = intrinsicFreeze(rows);
    this.#columns = intrinsicFreeze(columns);
    intrinsicFreeze(this);
  }
  static create(rows: readonly Readonly<{
    world: OwnedClosedWorldInputRequest;
    projections: readonly BoundClosedProjectionRequest[];
    group: number;
    groupRow: number;
  }>[]): OwnedClosedFramePlan | null {
    if (!intrinsicIsArray(rows) || !rows.length || rows.length > 65536) return null;
    const ownedRows: MountedRow[] = [];
    const columns: MountedColumn[] = [];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      if (!isOwnedClosedWorldInputRequest(row.world) ||
        !intrinsicIsArray(row.projections) || row.projections.length > 8 ||
        !intrinsicIsSafeInteger(row.group) || row.group < -1 ||
        !intrinsicIsSafeInteger(row.groupRow) ||
        (row.group < 0 ? row.groupRow !== -1 : row.groupRow < 0)) return null;
      const projections: BoundClosedProjectionRequest[] = [];
      let offset = 0;
      for (const bound of row.projections) {
        if (!isBoundClosedProjectionRequest(bound) || columns.length >= 65536) return null;
        intrinsicApply(intrinsicPush, projections, [bound]);
        intrinsicApply(intrinsicPush, columns, [intrinsicFreeze({ bound,
          group: row.group, sharedOffset: offset,
          fillShared: row.groupRow === 0, fallbackRow: row.group < 0 ? rowIndex : -1 })]);
        offset += ownedClosedProjectionPathCount(bound);
      }
      intrinsicApply(intrinsicPush, ownedRows, [intrinsicFreeze({
        world: row.world, projections: intrinsicFreeze(projections),
        group: row.group, groupRow: row.groupRow,
      })]);
    }
    return new OwnedClosedFramePlan(scheduleKey, ownedRows, columns);
  }
  static owns(value: unknown): value is OwnedClosedFramePlan {
    try { return typeof value === "object" && value !== null && #rows in value; }
    catch { return false; }
  }
  get rowCount(): number { return this.#rows.length; }
  get projectionCount(): number { return this.#columns.length; }
  rowAt(index: number): MountedRow { return this.#rows[index]; }
  projectionAt(index: number): MountedColumn { return this.#columns[index]; }
}
export const createOwnedClosedFramePlan = OwnedClosedFramePlan.create;
const canonicalPlanRowAt = OwnedClosedFramePlan.prototype.rowAt;
const canonicalPlanProjectionAt = OwnedClosedFramePlan.prototype.projectionAt;
intrinsicFreeze(OwnedClosedFramePlan.prototype);
intrinsicFreeze(OwnedClosedFramePlan);

/** Candidate-private buffers over a retained immutable capture plan. */
export class OwnedClosedFrameSchedule {
  readonly #plan: OwnedClosedFramePlan;
  readonly #groupInputs: readonly OwnedClosedFrameInput[];
  readonly #fallbackValues: readonly number[][][];
  private constructor(key: symbol, plan: OwnedClosedFramePlan,
    groupInputs: readonly OwnedClosedFrameInput[]) {
    if (key !== scheduleKey) throw new TypeError("Invalid closed frame cut");
    this.#plan = plan;
    this.#groupInputs = intrinsicFreeze([...groupInputs]);
    const fallbacks: number[][][] = [];
    for (let index = 0; index < plan.rowCount; index++) {
      const row = canonicalPlanRowAt.call(plan, index);
      if (row.group >= groupInputs.length) throw new TypeError("Missing group input");
      if (row.group < 0) fallbacks[index] = [];
    }
    this.#fallbackValues = fallbacks;
    intrinsicFreeze(this);
  }
  static fromPlan(plan: OwnedClosedFramePlan,
    groupInputs: readonly OwnedClosedFrameInput[]): OwnedClosedFrameSchedule | null {
    if (!OwnedClosedFramePlan.owns(plan) || !intrinsicIsArray(groupInputs) ||
      groupInputs.some((input) => !OwnedClosedFrameInput.owns(input))) return null;
    try { return new OwnedClosedFrameSchedule(scheduleKey, plan, groupInputs); }
    catch { return null; }
  }
  static owns(value: unknown): value is OwnedClosedFrameSchedule {
    try { return typeof value === "object" && value !== null && #plan in value; }
    catch { return false; }
  }
  get rowCount(): number { return this.#plan.rowCount; }
  get projectionCount(): number { return this.#plan.projectionCount; }
  worldAt(index: number): OwnedClosedWorldInputRequest {
    return canonicalPlanRowAt.call(this.#plan, index).world;
  }
  rowInputAt(index: number): OwnedClosedFrameInput | null {
    const group = canonicalPlanRowAt.call(this.#plan, index).group;
    return group < 0 ? null : this.#groupInputs[group];
  }
  groupRowAt(index: number): number {
    return canonicalPlanRowAt.call(this.#plan, index).groupRow;
  }
  fallbackAt(index: number): number[][] | undefined {
    return this.#fallbackValues[index];
  }
  boundAt(index: number): BoundClosedProjectionRequest {
    return canonicalPlanProjectionAt.call(this.#plan, index).bound;
  }
  projectionInputAt(index: number): OwnedClosedFrameInput | null {
    const group = canonicalPlanProjectionAt.call(this.#plan, index).group;
    return group < 0 ? null : this.#groupInputs[group];
  }
  sharedOffsetAt(index: number): number {
    return canonicalPlanProjectionAt.call(this.#plan, index).sharedOffset;
  }
  fillSharedAt(index: number): boolean {
    return canonicalPlanProjectionAt.call(this.#plan, index).fillShared;
  }
  projectionFallbackAt(index: number): number[][] | undefined {
    const row = canonicalPlanProjectionAt.call(this.#plan, index).fallbackRow;
    return row < 0 ? undefined : this.#fallbackValues[row];
  }
}

export const createOwnedClosedFrameScheduleFromPlan = OwnedClosedFrameSchedule.fromPlan;
export const canonicalOwnedClosedFrameScheduleOwns = OwnedClosedFrameSchedule.owns;
export const canonicalOwnedClosedFrameScheduleWorldAt =
  OwnedClosedFrameSchedule.prototype.worldAt;
export const canonicalOwnedClosedFrameScheduleRowInputAt =
  OwnedClosedFrameSchedule.prototype.rowInputAt;
export const canonicalOwnedClosedFrameScheduleGroupRowAt =
  OwnedClosedFrameSchedule.prototype.groupRowAt;
export const canonicalOwnedClosedFrameScheduleFallbackAt =
  OwnedClosedFrameSchedule.prototype.fallbackAt;
export const canonicalOwnedClosedFrameScheduleBoundAt =
  OwnedClosedFrameSchedule.prototype.boundAt;
export const canonicalOwnedClosedFrameScheduleProjectionInputAt =
  OwnedClosedFrameSchedule.prototype.projectionInputAt;
export const canonicalOwnedClosedFrameScheduleSharedOffsetAt =
  OwnedClosedFrameSchedule.prototype.sharedOffsetAt;
export const canonicalOwnedClosedFrameScheduleFillSharedAt =
  OwnedClosedFrameSchedule.prototype.fillSharedAt;
export const canonicalOwnedClosedFrameScheduleProjectionFallbackAt =
  OwnedClosedFrameSchedule.prototype.projectionFallbackAt;
intrinsicFreeze(OwnedClosedFrameSchedule.prototype);
intrinsicFreeze(OwnedClosedFrameSchedule);
