import {
  bindOwnedClosedProjectionRequest, isBoundClosedProjectionRequest,
  readOwnedClosedProjectionSchedule, type BoundClosedProjectionRequest,
  type OwnedClosedProjectionRequest, type StoreRenderTransaction,
} from "./async_store_runtime.ts";
import { createOwnedClosedFrameSchedule } from "./owned_closed_frame_input.ts";
import { bindOwnedClosedWorldInputRequest } from "./owner_state_world.ts";

export function readOwnedClosedProjectionBatch(
  transaction: StoreRenderTransaction,
  requests: readonly (OwnedClosedProjectionRequest | BoundClosedProjectionRequest)[],
): readonly (readonly number[])[] | null {
  if (requests.length === 0) return Object.freeze([]);
  const world = bindOwnedClosedWorldInputRequest({ owner: 0, sites: [] });
  if (!world) return null;
  const schedule = createOwnedClosedFrameSchedule();
  for (const request of requests) {
    const bound = isBoundClosedProjectionRequest(request) ? request :
      bindOwnedClosedProjectionRequest(request);
    if (!bound || !schedule.append(world, [bound], null, -1, true)) return null;
  }
  if (!schedule.seal() || !readOwnedClosedProjectionSchedule(transaction, schedule)) return null;
  const results: (readonly number[])[] = [];
  for (let index = 0; index < schedule.rowCount; index++) {
    const values = schedule.rowAt(index).fallbackValues?.[0];
    if (!values) return null;
    results.push(values);
  }
  return Object.freeze(results);
}
