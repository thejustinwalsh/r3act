import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchServedMaps } from "./served-map-fetch.mjs";

const body = new TextEncoder().encode("frozen-map-response");
const expected = createHash("sha256").update(body).digest("hex");
const item = { url: "/assets/proof.js.map", path: "dist/assets/proof.js.map", sha256: expected };
const mock = (status, bytes = body) => async () => ({ status,
  async arrayBuffer() { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); } });
assert.deepEqual(await fetchServedMaps([item], mock(200)), [{
  url: item.url, path: item.path, status: 200, sha256: expected,
}]);
await assert.rejects(fetchServedMaps([item], mock(404)), /HTTP 404/);
await assert.rejects(fetchServedMaps([item], mock(200, new TextEncoder().encode("drift"))),
  /SHA-256 mismatch/);
const collector = await readFile(fileURLToPath(new URL("./collect-once.mjs", import.meta.url)), "utf8");
assert.match(collector, /page\.evaluate\(fetchServedMaps, maps\)/);
const root = path.resolve(fileURLToPath(new URL("./", import.meta.url)), "../../../..");
const playwrightTypes = await readFile(path.join(root,
  "node_modules/.pnpm/playwright-core@1.63.0-beta-1788477194000/node_modules/playwright-core/types/types.d.ts"), "utf8");
const domTypes = await readFile(path.join(root,
  "node_modules/.pnpm/@typescript+native-preview-darwin-arm64@7.0.0-dev.20260707.2/node_modules/@typescript/native-preview-darwin-arm64/lib/lib.dom.d.ts"), "utf8");
assert.match(playwrightTypes, /status\(\): number;/);
assert.match(playwrightTypes, /location\(\): \{/);
const responseStart = domTypes.indexOf("interface Response extends Body {");
assert.ok(responseStart >= 0);
const responseTypes = domTypes.slice(responseStart, responseStart + 6000);
assert.match(responseTypes, /readonly status: number;/);
console.log("served-map Fetch status and hash synthetic checks PASS");
