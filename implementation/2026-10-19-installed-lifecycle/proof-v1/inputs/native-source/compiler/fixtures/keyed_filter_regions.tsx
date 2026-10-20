type Row = Readonly<{ id: number; label: string; group: number; score: number }>;

export function FilteredRegions(rows: readonly Row[], queryA: string, queryB: string) {
  const groupRows = rows.filter((row) => row.group === Number(queryA));
  const scoreRows = rows.filter((row) => row.score >= Number(queryB));
  return <main className="keyed-regions">
    <section data-region="groups">{groupRows.map((row) =>
      <li key={row.id} data-id={row.id}>{row.label} · group {row.group} · score {row.score}</li>
    )}</section>
    <section data-region="scores">{scoreRows.map((row) =>
      <li key={row.id} data-id={row.id}>{row.label} · group {row.group} · score {row.score}</li>
    )}</section>
  </main>;
}
