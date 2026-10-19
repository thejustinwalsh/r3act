import { memo } from "react";
import type { TaskBRow, TaskBState } from "./task_b_runtime.tsx";

const GroupRegion = memo(function GroupRegion({ rows, query }: {
  rows: readonly TaskBRow[];
  query: string;
}) {
  const visible = rows.filter((row) => row.group === Number(query));
  return <section data-region="groups" data-query={query}>{visible.map((row) =>
    <li key={row.id} data-id={row.id}>group {row.group} · score {row.score}</li>
  )}</section>;
});

const ScoreRegion = memo(function ScoreRegion({ rows, query }: {
  rows: readonly TaskBRow[];
  query: string;
}) {
  const visible = rows.filter((row) => row.score >= Number(query));
  return <section data-region="scores" data-query={query}>{visible.map((row) =>
    <li key={row.id} data-id={row.id}>group {row.group} · score {row.score}</li>
  )}</section>;
});

/** Public-API React comparison arm with memoized independent keyed regions. */
export function TaskBReactTree({ state }: { state: TaskBState }) {
  return <main className="task-b-regions">
    <GroupRegion rows={state.rows} query={state.queryA} />
    <ScoreRegion rows={state.rows} query={state.queryB} />
  </main>;
}
