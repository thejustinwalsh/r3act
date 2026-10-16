export async function fetchServedMaps(entries, fetchMap = globalThis.fetch) {
  const result = [];
  for (const item of entries) {
    const response = await fetchMap(item.url, { cache: "no-store" });
    const body = await response.arrayBuffer();
    const digest = await globalThis.crypto.subtle.digest("SHA-256", body);
    const actual = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const found = { url: item.url, path: item.path, status: response.status, sha256: actual };
    result.push(found);
    if (response.status !== 200)
      throw new Error(`served map ${item.url}: HTTP ${response.status}; sha256=${actual}; expected=${item.sha256}`);
    if (actual !== item.sha256)
      throw new Error(`served map ${item.url}: SHA-256 mismatch; status=${response.status}; sha256=${actual}; expected=${item.sha256}`);
  }
  return result;
}
