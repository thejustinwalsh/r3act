type Row = Readonly<{ id: number; label: string; group: number; score: number }>;

export function FilteredRows(rows: readonly Row[], query: string) {
  const visible = rows.filter((row) => query === "" ||
    (query === "even" && row.id % 2 === 0) ||
    (query === "odd" && row.id % 2 !== 0) ||
    (query.startsWith("group:") && row.group === Number(query.slice(6))) ||
    (query.startsWith("score:") && row.score >= Number(query.slice(6))) ||
    (!query.startsWith("group:") && !query.startsWith("score:") &&
      query !== "even" && query !== "odd" && row.label.includes(query.toLowerCase()))
  );
  return <ul className="keyed-list">{visible.map((row) =>
    <li key={row.id} data-id={row.id}>{row.label}</li>
  )}</ul>;
}
