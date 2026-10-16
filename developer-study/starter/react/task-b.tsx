import { memo } from "react";

export type TaskBRow = Readonly<{ id: number; group: number; score: number }>;
export type TaskBState = Readonly<{
  rows: readonly TaskBRow[];
  queryA: string;
  queryB: string;
}>;

const GroupRegion = memo(function GroupRegion({ rows, queryA }: {
  rows: readonly TaskBRow[];
  queryA: string;
}) {
  // TODO: keep rows whose group matches queryA.
  const visible = rows.filter((row) => row.group !== Number(queryA));
  return <section data-region="groups">
    {/* TODO: bind queryA to data-query. */}
    {visible.map((row) => <li key={row.id} data-id={row.id}>group {row.group} · score {row.score}</li>)}
  </section>;
});

const ScoreRegion = memo(function ScoreRegion({ rows, queryB }: {
  rows: readonly TaskBRow[];
  queryB: string;
}) {
  // TODO: keep rows whose score is at least queryB.
  const visible = rows.filter((row) => row.score < Number(queryB));
  return <section data-region="scores">
    {/* TODO: bind queryB to data-query. */}
    {visible.map((row) => <li key={row.id} data-id={row.id}>group {row.group} · score {row.score}</li>)}
  </section>;
});

export function ParticipantTaskB({ state }: { state: TaskBState }) {
  return <main className="task-b-regions">
    <GroupRegion rows={state.rows} queryA={state.queryA} />
    <ScoreRegion rows={state.rows} queryB={state.queryB} />
  </main>;
}
