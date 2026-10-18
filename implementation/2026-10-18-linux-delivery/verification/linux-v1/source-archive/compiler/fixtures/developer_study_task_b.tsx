/** @jsx jsx */
/** @jsxRuntime classic */
import { jsx, type RuntimeElement } from "../../src/jsx_binding_runtime.ts";

export type Row = Readonly<{ id: number; group: number; score: number }>;
export type GroupRegionProps = Readonly<{ rows: readonly Row[]; queryA: string }>;
export type ScoreRegionProps = Readonly<{ rows: readonly Row[]; queryB: string }>;

export function GroupRegion({ rows, queryA }: GroupRegionProps): RuntimeElement {
  const groupRows = rows.filter((row) => row.group === Number(queryA));
  return <section data-region="groups" data-query={queryA}>{groupRows.map((row) =>
    <li key={row.id} data-id={row.id}>group {row.group} · score {row.score}</li>
  )}</section>;
}

export function ScoreRegion({ rows, queryB }: ScoreRegionProps): RuntimeElement {
  const scoreRows = rows.filter((row) => row.score >= Number(queryB));
  return <section data-region="scores" data-query={queryB}>{scoreRows.map((row) =>
    <li key={row.id} data-id={row.id}>group {row.group} · score {row.score}</li>
  )}</section>;
}

export function TaskBRegions({ rows, queryA, queryB }: {
  rows: readonly Row[];
  queryA: string;
  queryB: string;
}): RuntimeElement {
  return <main className="task-b-regions">
    <GroupRegion rows={rows} queryA={queryA} />
    <ScoreRegion rows={rows} queryB={queryB} />
  </main>;
}
