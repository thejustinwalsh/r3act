/** @jsx jsx */
/** @jsxRuntime classic */
import { jsx, type RuntimeElement } from "../../../src/jsx_binding_runtime.ts";

export type TaskBRow = Readonly<{ id: number; group: number; score: number }>;
export type TaskBState = Readonly<{
  rows: readonly TaskBRow[];
  queryA: string;
  queryB: string;
}>;

export function GroupRegion({ rows, queryA }: {
  rows: readonly TaskBRow[];
  queryA: string;
}): RuntimeElement {
  // TODO: keep rows whose group matches queryA.
  const groupRows = rows.filter((row) => row.group !== Number(queryA));
  return <section data-region="groups">
    {/* TODO: bind queryA to data-query. */}
    {groupRows.map((row) => <li key={row.id} data-id={row.id}>group {row.group} · score {row.score}</li>)}
  </section>;
}

export function ScoreRegion({ rows, queryB }: {
  rows: readonly TaskBRow[];
  queryB: string;
}): RuntimeElement {
  // TODO: keep rows whose score is at least queryB.
  const scoreRows = rows.filter((row) => row.score < Number(queryB));
  return <section data-region="scores">
    {/* TODO: bind queryB to data-query. */}
    {scoreRows.map((row) => <li key={row.id} data-id={row.id}>group {row.group} · score {row.score}</li>)}
  </section>;
}

export function ParticipantTaskB({ state }: { state: TaskBState }): RuntimeElement {
  return <main className="task-b-regions">
    <GroupRegion rows={state.rows} queryA={state.queryA} />
    <ScoreRegion rows={state.rows} queryB={state.queryB} />
  </main>;
}
