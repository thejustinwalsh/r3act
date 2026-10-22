import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveConfig } from "vite";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const configFile = path.join(root, "vite.config.ts");
const liveSource = path.join(root, "src/browser/native_three_host.tsx");
const ignored = ["implementation", "results", ".cache", ".pnpm-store", "compiler/oxc-spike/target"].map((name) =>
  path.join(root, name, "**"));
const originalPolling = process.env.CHOKIDAR_USEPOLLING;
const originalInterval = process.env.CHOKIDAR_INTERVAL;

try {
  for (const [value, enabled] of [
    [undefined, false],
    ["", false],
    ["0", false],
    ["FaLsE", false],
    ["1", true],
    ["TrUe", true],
    ["yes", true],
  ]) {
    if (value === undefined) delete process.env.CHOKIDAR_USEPOLLING;
    else process.env.CHOKIDAR_USEPOLLING = value;
    const config = await resolveConfig({ root, configFile }, "serve");
    assert.equal(path.resolve(config.root), root);
    assert.equal(path.resolve(config.configFile), configFile);
    assert.equal(config.command, "serve");
    const watch = config.server.watch;
    if (enabled) {
      assert.equal(watch?.usePolling, true, `${value}: polling option`);
      assert.equal(watch?.useFsEvents, false, `${value}: FSEvents option`);
      assert.deepEqual(watch?.ignored, ignored, `${value}: archive exclusions`);
      for (const pattern of ignored) {
        const archiveRoot = pattern.slice(0, -3);
        assert.ok(!liveSource.startsWith(`${archiveRoot}${path.sep}`),
          `${value}: live browser source fell under ${archiveRoot}`);
      }
    } else {
      assert.equal(watch?.usePolling, undefined, `${value}: default polling option`);
      assert.equal(watch?.useFsEvents, undefined, `${value}: default FSEvents option`);
      assert.equal(watch?.ignored, undefined, `${value}: default exclusions`);
    }
    assert.equal(watch?.interval, undefined, "CHOKIDAR_INTERVAL remains Chokidar-owned");
    assert.equal(process.env.CHOKIDAR_INTERVAL, originalInterval);
  }
} finally {
  if (originalPolling === undefined) delete process.env.CHOKIDAR_USEPOLLING;
  else process.env.CHOKIDAR_USEPOLLING = originalPolling;
  if (originalInterval === undefined) delete process.env.CHOKIDAR_INTERVAL;
  else process.env.CHOKIDAR_INTERVAL = originalInterval;
}

console.log("PASS workbench Vite polling config and archive exclusions");
