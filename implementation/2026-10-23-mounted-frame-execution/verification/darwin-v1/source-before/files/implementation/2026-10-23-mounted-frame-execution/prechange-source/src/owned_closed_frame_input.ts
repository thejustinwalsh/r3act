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
}>;
type MountedColumn = Readonly<{
  bound: BoundClosedProjectionRequest;
  sharedOffset: number;
  fillShared: boolean;
}>;
type MountedChunk = Readonly<{
  identity: object;
  rows: readonly MountedRow[];
  columns: readonly (readonly MountedColumn[])[];
}>;
type OrderedRow = Readonly<{
  chunk: MountedChunk;
  localRow: number;
  group: number;
}>;
type OrderedColumn = Readonly<{
  chunk: MountedChunk;
  localRow: number;
  localColumn: number;
  group: number;
  fallbackRow: number;
}>;

/** Immutable group geometry composed through an ordered row remap. */
export class OwnedClosedFramePlan {
  readonly #rows: readonly OrderedRow[];
  readonly #columns: readonly OrderedColumn[];
  readonly #chunks: readonly MountedChunk[];
  private constructor(key: symbol, rows: readonly OrderedRow[],
    columns: readonly OrderedColumn[], chunks: readonly MountedChunk[]) {
    if (key !== scheduleKey) throw new TypeError("Invalid closed frame plan");
    this.#rows = intrinsicFreeze(rows);
    this.#columns = intrinsicFreeze(columns);
    this.#chunks = intrinsicFreeze(chunks);
    intrinsicFreeze(this);
  }
  static create(rows: readonly Readonly<{
    world: OwnedClosedWorldInputRequest;
    projections: readonly BoundClosedProjectionRequest[];
    group: number;
    groupRow: number;
  }>[], previous?: OwnedClosedFramePlan | null): OwnedClosedFramePlan | null {
    if (!intrinsicIsArray(rows) || !rows.length || rows.length > 65536 ||
      (previous && !OwnedClosedFramePlan.owns(previous))) return null;
    const groupRows = new Map<number, number[]>();
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      if (!isOwnedClosedWorldInputRequest(row.world) ||
        !intrinsicIsArray(row.projections) || row.projections.length > 8 ||
        !intrinsicIsSafeInteger(row.group) || row.group < -1 ||
        !intrinsicIsSafeInteger(row.groupRow) ||
        (row.group < 0 ? row.groupRow !== -1 : row.groupRow < 0)) return null;
      const group = row.group < 0 ? -index - 1 : row.group;
      let members = groupRows.get(group);
      if (!members) groupRows.set(group, members = []);
      if (row.group >= 0 && row.groupRow !== members.length) return null;
      members.push(index);
    }
    const chunks: MountedChunk[] = [];
    const orderedRows: OrderedRow[] = Array(rows.length);
    const priorByWorld = new Map<OwnedClosedWorldInputRequest, MountedChunk[]>();
    for (const chunk of previous ? previous.#chunks : []) {
      const world = chunk.rows[0].world;
      let candidates = priorByWorld.get(world);
      if (!candidates) priorByWorld.set(world, candidates = []);
      candidates.push(chunk);
    }
    const usedPrior = new Set<MountedChunk>();
    for (const members of groupRows.values()) {
      const same = (chunk: MountedChunk) =>
        chunk.rows.length === members.length && members.every((ordinal, localRow) => {
          const source = rows[ordinal], prior = chunk.rows[localRow];
          return prior.world === source.world &&
            prior.projections.length === source.projections.length &&
            prior.projections.every((bound, index) => bound === source.projections[index]);
        });
      let chunk = priorByWorld.get(rows[members[0]].world)?.find((candidate) =>
        !usedPrior.has(candidate) && same(candidate));
      if (chunk) usedPrior.add(chunk);
      else {
        const chunkRows: MountedRow[] = [];
        const chunkColumns: (readonly MountedColumn[])[] = [];
        for (let localRow = 0; localRow < members.length; localRow++) {
          const source = rows[members[localRow]];
          const projections: BoundClosedProjectionRequest[] = [];
          const columns: MountedColumn[] = [];
          let offset = 0;
          for (const bound of source.projections) {
            if (!isBoundClosedProjectionRequest(bound)) return null;
            projections.push(bound);
            columns.push(intrinsicFreeze({ bound, sharedOffset: offset,
              fillShared: localRow === 0 }));
            offset += ownedClosedProjectionPathCount(bound);
          }
          chunkRows.push(intrinsicFreeze({ world: source.world,
            projections: intrinsicFreeze(projections) }));
          chunkColumns.push(intrinsicFreeze(columns));
        }
        chunk = intrinsicFreeze({ identity: intrinsicFreeze({}),
          rows: intrinsicFreeze(chunkRows),
          columns: intrinsicFreeze(chunkColumns) });
      }
      chunks.push(chunk);
      for (let localRow = 0; localRow < members.length; localRow++) {
        const ordinal = members[localRow];
        orderedRows[ordinal] = intrinsicFreeze({ chunk, localRow,
          group: rows[ordinal].group });
      }
    }
    const orderedColumns: OrderedColumn[] = [];
    for (let ordinal = 0; ordinal < orderedRows.length; ordinal++) {
      const entry = orderedRows[ordinal];
      const columns = entry.chunk.columns[entry.localRow];
      for (let localColumn = 0; localColumn < columns.length; localColumn++) {
        if (orderedColumns.length >= 65536) return null;
        orderedColumns.push(intrinsicFreeze({ chunk: entry.chunk,
          localRow: entry.localRow, localColumn, group: entry.group,
          fallbackRow: entry.group < 0 ? ordinal : -1 }));
      }
    }
    return new OwnedClosedFramePlan(scheduleKey, orderedRows, orderedColumns, chunks);
  }
  static owns(value: unknown): value is OwnedClosedFramePlan {
    try { return typeof value === "object" && value !== null && #rows in value; }
    catch { return false; }
  }
  get rowCount(): number { return this.#rows.length; }
  get projectionCount(): number { return this.#columns.length; }
  worldAt(index: number): OwnedClosedWorldInputRequest {
    const row = this.#rows[index];
    return row.chunk.rows[row.localRow].world;
  }
  rowGroupAt(index: number): number { return this.#rows[index].group; }
  groupRowAt(index: number): number {
    const row = this.#rows[index];
    return row.group < 0 ? -1 : row.localRow;
  }
  boundAt(index: number): BoundClosedProjectionRequest {
    const column = this.#columns[index];
    return column.chunk.columns[column.localRow][column.localColumn].bound;
  }
  projectionGroupAt(index: number): number { return this.#columns[index].group; }
  sharedOffsetAt(index: number): number {
    const column = this.#columns[index];
    return column.chunk.columns[column.localRow][column.localColumn].sharedOffset;
  }
  fillSharedAt(index: number): boolean {
    const column = this.#columns[index];
    return column.chunk.columns[column.localRow][column.localColumn].fillShared;
  }
  fallbackRowAt(index: number): number { return this.#columns[index].fallbackRow; }
  chunkAt(index: number): object { return this.#rows[index].chunk.identity; }
}
export const createOwnedClosedFramePlan = OwnedClosedFramePlan.create;
const canonicalPlanWorldAt = OwnedClosedFramePlan.prototype.worldAt;
const canonicalPlanRowGroupAt = OwnedClosedFramePlan.prototype.rowGroupAt;
const canonicalPlanGroupRowAt = OwnedClosedFramePlan.prototype.groupRowAt;
const canonicalPlanBoundAt = OwnedClosedFramePlan.prototype.boundAt;
const canonicalPlanProjectionGroupAt = OwnedClosedFramePlan.prototype.projectionGroupAt;
const canonicalPlanSharedOffsetAt = OwnedClosedFramePlan.prototype.sharedOffsetAt;
const canonicalPlanFillSharedAt = OwnedClosedFramePlan.prototype.fillSharedAt;
const canonicalPlanFallbackRowAt = OwnedClosedFramePlan.prototype.fallbackRowAt;
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
      const group = canonicalPlanRowGroupAt.call(plan, index);
      if (group >= groupInputs.length) throw new TypeError("Missing group input");
      if (group < 0) fallbacks[index] = [];
    }
    this.#fallbackValues = fallbacks;
    intrinsicFreeze(this);
  }
  static fromPlan(plan: OwnedClosedFramePlan,
    groupInputs: readonly OwnedClosedFrameInput[]): OwnedClosedFrameSchedule | null {
    if (!OwnedClosedFramePlan.owns(plan) || !intrinsicIsArray(groupInputs)) return null;
    for (let index = 0; index < groupInputs.length; index++)
      if (!OwnedClosedFrameInput.owns(groupInputs[index])) return null;
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
    return canonicalPlanWorldAt.call(this.#plan, index);
  }
  rowInputAt(index: number): OwnedClosedFrameInput | null {
    const group = canonicalPlanRowGroupAt.call(this.#plan, index);
    return group < 0 ? null : this.#groupInputs[group];
  }
  groupRowAt(index: number): number {
    return canonicalPlanGroupRowAt.call(this.#plan, index);
  }
  fallbackAt(index: number): number[][] | undefined {
    return this.#fallbackValues[index];
  }
  boundAt(index: number): BoundClosedProjectionRequest {
    return canonicalPlanBoundAt.call(this.#plan, index);
  }
  projectionInputAt(index: number): OwnedClosedFrameInput | null {
    const group = canonicalPlanProjectionGroupAt.call(this.#plan, index);
    return group < 0 ? null : this.#groupInputs[group];
  }
  sharedOffsetAt(index: number): number {
    return canonicalPlanSharedOffsetAt.call(this.#plan, index);
  }
  fillSharedAt(index: number): boolean {
    return canonicalPlanFillSharedAt.call(this.#plan, index);
  }
  projectionFallbackAt(index: number): number[][] | undefined {
    const row = canonicalPlanFallbackRowAt.call(this.#plan, index);
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
