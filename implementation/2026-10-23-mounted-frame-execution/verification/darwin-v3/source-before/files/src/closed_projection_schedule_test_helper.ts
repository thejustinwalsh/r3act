import {
  bindOwnedClosedProjectionRequest, isBoundClosedProjectionRequest,
  readOwnedClosedProjectionFill, type BoundClosedProjectionRequest,
  type OwnedClosedProjectionRequest, type StoreRenderTransaction,
} from "./async_store_runtime.ts";
import {
  createOwnedClosedFramePlan, createOwnedClosedFrameFillFromPlan,
} from "./owned_closed_frame_input.ts";
import { bindOwnedClosedWorldInputRequest } from "./owner_state_world.ts";

export function readOwnedClosedProjectionBatch(
  transaction: StoreRenderTransaction,
  requests: readonly (OwnedClosedProjectionRequest | BoundClosedProjectionRequest)[],
): readonly (readonly number[])[] | null {
  if (requests.length === 0) return Object.freeze([]);
  const world = bindOwnedClosedWorldInputRequest({ owner: 0, sites: [] });
  if (!world) return null;
  const rows: { world: typeof world; projections: BoundClosedProjectionRequest[];
    group: number; groupRow: number }[] = [];
  for (const request of requests) {
    const bound = isBoundClosedProjectionRequest(request) ? request :
      bindOwnedClosedProjectionRequest(request);
    if (!bound) return null;
    rows.push({ world, projections: [bound], group: -1, groupRow: -1 });
  }
  const plan = createOwnedClosedFramePlan(rows);
  const fill = plan ? createOwnedClosedFrameFillFromPlan(plan, []) : null;
  if (!fill || !readOwnedClosedProjectionFill(transaction, fill)) return null;
  const results: (readonly number[])[] = [];
  for (let index = 0; index < fill.rowCount; index++) {
    const values = fill.fallbackAt(index)?.[0];
    if (!values) return null;
    results.push(values);
  }
  return Object.freeze(results);
}
