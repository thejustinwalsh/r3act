/** Format a World site from explicit structural contract segments in tests. */
export function expectedScopedOwnerSite(
  site: string,
  segments: readonly (readonly unknown[])[],
): string {
  if (segments.length === 0) return site;
  const scope = segments.map((segment) => {
    const encoded = JSON.stringify(segment);
    return `${encoded.length}:${encoded}`;
  }).join("");
  return `\u0000structural:${JSON.stringify([site, scope])}`;
}
