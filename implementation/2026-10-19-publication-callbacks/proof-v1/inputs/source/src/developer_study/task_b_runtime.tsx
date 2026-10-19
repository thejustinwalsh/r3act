import { jsx, type RuntimeNode } from "../jsx_binding_runtime.ts";
import { GroupRegion, ScoreRegion, type Row } from "../../compiler/fixtures/developer_study_task_b.tsx";

export type TaskBRow = Row;
export type TaskBState = Readonly<{
  rows: readonly TaskBRow[];
  queryA: string;
  queryB: string;
}>;

/** The compiled arm derives just the invalidated region from participant-style data. */
export const taskBRegionTree = (region: number, state: TaskBState): RuntimeNode =>
  region === 0
    ? GroupRegion({ rows: state.rows, queryA: state.queryA })
    : ScoreRegion({ rows: state.rows, queryB: state.queryB });

/** Full-tree version used by parity and the uncompiled comparison path. */
export const taskBTree = (state: TaskBState): RuntimeNode => jsx(
  "main",
  { className: "task-b-regions" },
  [taskBRegionTree(0, state), taskBRegionTree(1, state)],
);
