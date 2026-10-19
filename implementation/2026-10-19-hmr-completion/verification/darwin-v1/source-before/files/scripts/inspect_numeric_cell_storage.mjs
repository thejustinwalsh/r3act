import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";

const root = process.cwd();
const output = path.join(root, "results/numeric-cell-storage-baseline-v1");
const frozenBundle = path.join(root, "results/numeric-cell-shapes-v2/owner-state-world.iife.js");
const expectedBundleSha256 = "376ce34c8196df46797b896999398eafdab692fc6703993a8b7c680b53537422";
const artifactPath = path.join(output, "diagnostic.json");
const scriptSnapshotPath = path.join(output, "inspect_numeric_cell_storage.mjs");
const scriptPath = fileURLToPath(import.meta.url);
const browserOptions = {
  headless: true,
  gpu: false,
  browserArgs: ["--js-flags=--allow-natives-syntax"],
};
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const errorText = (error) => String(error?.stack ?? error);

await mkdir(output, { recursive: true });
assert.equal((await readdir(output)).length, 0, `Refusing to reuse ${output}`);

const actualBundleSha256 = sha256(await readFile(frozenBundle));
assert.equal(actualBundleSha256, expectedBundleSha256, "Frozen baseline bundle changed");

let browser;
let page;
let cdp;
const diagnostic = {
  status: "INCOMPLETE",
  bundlePath: path.relative(root, frozenBundle),
  bundleSha256: actualBundleSha256,
  browserOptions,
  propertyDiscovery: null,
  snapshots: {},
  semantics: {},
};

try {
  browser = await openBrowser(browserOptions);
  page = await browser.newPage();
  await page.goto("about:blank");
  cdp = await page.context().newCDPSession(page);
  await cdp.send("Runtime.enable");
  const browserVersion = await cdp.send("Browser.getVersion");
  diagnostic.browserVersion = browserVersion;
  await page.addScriptTag({ path: frozenBundle });

  const setup = await page.evaluate(() => {
    const World = globalThis.__numericCellShapeWorld;
    if (typeof World !== "function") throw new Error("Frozen bundle did not expose OwnerStateWorld");
    const layout = { schemaVersion: 1, slots: [{ siteId: "value", slot: 0 }] };

    const directWorld = new World();
    const directOwner = directWorld.resolveOwner(null, "storage#component:Direct", "cell");
    const [, directSetter] = directWorld.useState(directOwner, "value", 1, layout);

    const preparedWorld = new World();
    const preparation = preparedWorld.beginPreparation();
    const preparedOwner = preparation.resolveOwner(null, "storage#component:Prepared", "cell");
    const [, preparedSetter] = preparation.useState(preparedOwner, "value", 10, layout);
    preparedSetter(12);
    const preparedValueBeforePublish = preparation.useState(
      preparedOwner,
      "value",
      0,
      layout,
    )[0];
    preparation.publish();

    globalThis.__numericCellStorageProbe = {
      directWorld,
      directOwner,
      directSetter,
      directSite: "value",
      preparedWorld,
      preparedOwner,
      preparedSetter,
      preparedSite: "value",
    };
    return {
      directOwner,
      directValueAfterActivation: directWorld.useState(directOwner, "value", 0, layout)[0],
      directLaneActiveAfterActivation: directWorld.numericLane(directOwner, "value") !== null,
      preparedOwner,
      preparedValueBeforePublish,
      preparedValueAfterPublish: preparedWorld.useState(preparedOwner, "value", 0, layout)[0],
      preparedLaneActiveAfterPublish: preparedWorld.numericLane(preparedOwner, "value") !== null,
    };
  });
  diagnostic.semantics.initial = setup;

  const evaluateRemote = async (expression) => {
    const response = await cdp.send("Runtime.evaluate", {
      expression,
      returnByValue: false,
      generatePreview: true,
    });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    if (!response.result?.objectId) throw new Error(`Expected objectId for ${expression}`);
    return response.result.objectId;
  };
  const directWorldId = await evaluateRemote("globalThis.__numericCellStorageProbe.directWorld");
  const preparedWorldId = await evaluateRemote("globalThis.__numericCellStorageProbe.preparedWorld");

  const getProperties = async (objectId) => await cdp.send("Runtime.getProperties", {
    objectId,
    ownProperties: true,
    accessorPropertiesOnly: false,
    generatePreview: true,
    nonIndexedPropertiesOnly: true,
  });
  const findPrivateMap = async (worldId, expectedName) => {
    const properties = await getProperties(worldId);
    const privateProperties = properties.privateProperties;
    diagnostic.propertyDiscovery ??= {};
    diagnostic.propertyDiscovery[expectedName] = {
      responseKeys: Object.keys(properties).sort(),
      privatePropertyNames: Array.isArray(privateProperties)
        ? privateProperties.map(({ name }) => name)
        : null,
    };
    if (!Array.isArray(privateProperties)) return null;
    const descriptor = privateProperties.find(({ name }) =>
      name === "#stateByOwner" || name.endsWith("#stateByOwner")
    );
    if (!descriptor?.value?.objectId) return null;
    return descriptor.value.objectId;
  };
  const directMapId = await findPrivateMap(directWorldId, "directWorld");
  const preparedMapId = await findPrivateMap(preparedWorldId, "preparedWorld");
  if (!directMapId || !preparedMapId) {
    diagnostic.status = "PRIVATE_PROPERTIES_UNAVAILABLE";
    diagnostic.stopReason = "CDP did not expose #stateByOwner as a private property with an objectId; no fallback access path was attempted.";
  } else {
    const readCellId = async (mapId, owner, site) => {
      const response = await cdp.send("Runtime.callFunctionOn", {
        objectId: mapId,
        functionDeclaration: "function(owner, site) { return this.get(owner).get(site); }",
        arguments: [{ value: owner }, { value: site }],
        returnByValue: false,
        generatePreview: true,
      });
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
      if (!response.result?.objectId) throw new Error("CDP Map traversal returned no StateCell objectId");
      return response.result.objectId;
    };
    const describeCell = async (cellId) => {
      const response = await cdp.send("Runtime.callFunctionOn", {
        objectId: cellId,
        functionDeclaration: `function() {
          const own = Object.getOwnPropertyDescriptor(this, "value");
          const inherited = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), "value");
          const summarize = (descriptor) => descriptor ? {
            configurable: descriptor.configurable,
            enumerable: descriptor.enumerable,
            writable: "writable" in descriptor ? descriptor.writable : null,
            valueType: "value" in descriptor ? typeof descriptor.value : null,
            getterName: descriptor.get?.name ?? null,
            setterName: descriptor.set?.name ?? null,
          } : null;
          return {
            fastProperties: %HasFastProperties(this),
            ownKeys: Object.keys(this),
            value: this.value,
            ownValueDescriptor: summarize(own),
            prototypeValueDescriptor: summarize(inherited),
          };
        }`,
        returnByValue: true,
      });
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
      return response.result.value;
    };
    const directOwner = setup.directOwner;
    const preparedOwner = setup.preparedOwner;
    let directCellId = await readCellId(directMapId, directOwner, "value");
    let preparedCellId = await readCellId(preparedMapId, preparedOwner, "value");
    diagnostic.snapshots.directInitial = await describeCell(directCellId);
    diagnostic.snapshots.preparedPublished = await describeCell(preparedCellId);

    diagnostic.semantics.afterActivation = await page.evaluate(() => {
      const probe = globalThis.__numericCellStorageProbe;
      probe.directSetter(2);
      probe.preparedSetter(13);
      return {
        directValue: probe.directWorld.useState(probe.directOwner, "value", 0)[0],
        directLaneActive: probe.directWorld.numericLane(probe.directOwner, "value") !== null,
        preparedValue: probe.preparedWorld.useState(probe.preparedOwner, "value", 0)[0],
        preparedLaneActive: probe.preparedWorld.numericLane(probe.preparedOwner, "value") !== null,
      };
    });
    diagnostic.snapshots.directAfterNumericDispatch = await describeCell(directCellId);
    diagnostic.snapshots.preparedAfterNumericDispatch = await describeCell(preparedCellId);

    diagnostic.semantics.afterPromotion = await page.evaluate(() => {
      const probe = globalThis.__numericCellStorageProbe;
      probe.directSetter("wide");
      probe.preparedSetter("prepared-wide");
      return {
        directValue: probe.directWorld.useState(probe.directOwner, "value", 0)[0],
        directLaneActive: probe.directWorld.numericLane(probe.directOwner, "value") !== null,
        preparedValue: probe.preparedWorld.useState(probe.preparedOwner, "value", 0)[0],
        preparedLaneActive: probe.preparedWorld.numericLane(probe.preparedOwner, "value") !== null,
      };
    });
    diagnostic.snapshots.directAfterPromotion = await describeCell(directCellId);
    diagnostic.snapshots.preparedAfterPromotion = await describeCell(preparedCellId);

    diagnostic.semantics.afterNumericReturn = await page.evaluate(() => {
      const probe = globalThis.__numericCellStorageProbe;
      probe.directSetter(7);
      probe.preparedSetter(14);
      return {
        directValue: probe.directWorld.useState(probe.directOwner, "value", 0)[0],
        directLaneActive: probe.directWorld.numericLane(probe.directOwner, "value") !== null,
        preparedValue: probe.preparedWorld.useState(probe.preparedOwner, "value", 0)[0],
        preparedLaneActive: probe.preparedWorld.numericLane(probe.preparedOwner, "value") !== null,
      };
    });
    diagnostic.snapshots.directAfterNumericReturn = await describeCell(directCellId);
    diagnostic.snapshots.preparedAfterNumericReturn = await describeCell(preparedCellId);

    diagnostic.semantics.afterDestroyAndReuse = await page.evaluate(() => {
      const probe = globalThis.__numericCellStorageProbe;
      const destroyed = probe.directWorld.destroyOwner(probe.directOwner);
      const reusedOwner = probe.directWorld.resolveOwner(null, "storage#component:Direct", "cell");
      const reusedValue = probe.directWorld.useState(reusedOwner, "value", 9, {
        schemaVersion: 1,
        slots: [{ siteId: "value", slot: 0 }],
      })[0];
      const laneActive = probe.directWorld.numericLane(reusedOwner, "value") !== null;
      probe.reusedOwner = reusedOwner;
      return { destroyed, reusedOwner, reusedValue, laneActive };
    });
    const reusedMapProperties = await getProperties(directWorldId);
    const reusedPrivateMap = reusedMapProperties.privateProperties?.find(({ name }) =>
      name === "#stateByOwner" || name.endsWith("#stateByOwner")
    )?.value?.objectId;
    if (!reusedPrivateMap) throw new Error("CDP lost #stateByOwner private map after direct owner reuse");
    const reusedCellId = await readCellId(
      reusedPrivateMap,
      diagnostic.semantics.afterDestroyAndReuse.reusedOwner,
      "value",
    );
    diagnostic.snapshots.directAfterOwnerReuse = await describeCell(reusedCellId);

    assert.equal(diagnostic.semantics.initial.directValueAfterActivation, 1);
    assert.equal(diagnostic.semantics.initial.preparedValueBeforePublish, 12);
    assert.equal(diagnostic.semantics.initial.preparedValueAfterPublish, 12);
    assert.equal(diagnostic.semantics.initial.preparedLaneActiveAfterPublish, true);
    assert.equal(diagnostic.snapshots.directInitial.fastProperties, false);
    assert.equal(diagnostic.snapshots.preparedPublished.fastProperties, false);
    assert.equal(diagnostic.semantics.afterActivation.directValue, 2);
    assert.equal(diagnostic.semantics.afterActivation.preparedValue, 13);
    assert.equal(diagnostic.snapshots.directAfterNumericDispatch.fastProperties, false);
    assert.equal(diagnostic.snapshots.preparedAfterNumericDispatch.fastProperties, false);
    assert.equal(diagnostic.semantics.afterPromotion.directLaneActive, false);
    assert.equal(diagnostic.semantics.afterPromotion.preparedLaneActive, false);
    assert.equal(diagnostic.snapshots.directAfterPromotion.ownValueDescriptor.getterName, null);
    assert.equal(diagnostic.snapshots.preparedAfterPromotion.ownValueDescriptor.getterName, null);
    assert.equal(diagnostic.snapshots.directAfterPromotion.fastProperties, false);
    assert.equal(diagnostic.snapshots.preparedAfterPromotion.fastProperties, false);
    assert.equal(diagnostic.semantics.afterNumericReturn.directValue, 7);
    assert.equal(diagnostic.semantics.afterNumericReturn.preparedValue, 14);
    assert.equal(diagnostic.semantics.afterNumericReturn.directLaneActive, false);
    assert.equal(diagnostic.semantics.afterNumericReturn.preparedLaneActive, false);
    assert.equal(diagnostic.semantics.afterDestroyAndReuse.destroyed, true);
    assert.equal(diagnostic.semantics.afterDestroyAndReuse.laneActive, true);
    assert.equal(diagnostic.snapshots.directAfterOwnerReuse.fastProperties, false);
    diagnostic.status = "PASS";
  }
} catch (error) {
  diagnostic.status = diagnostic.status === "PRIVATE_PROPERTIES_UNAVAILABLE"
    ? diagnostic.status
    : "FAIL";
  diagnostic.error = errorText(error);
} finally {
  await page?.context().close().catch(() => {});
  await browser?.close().catch(() => {});
}

const result = {
  schemaVersion: 1,
  ...diagnostic,
  collectedAt: new Date().toISOString(),
  scope: "Frozen baseline object-storage diagnostic; no latency or performance claim.",
  environment: {
    node: process.version,
    platform: process.platform,
    architecture: process.arch,
    browserOptions,
    sourceBundleSha256: actualBundleSha256,
    scriptPath: path.relative(root, scriptPath),
    scriptSha256: sha256(await readFile(scriptPath)),
  },
};
await writeFile(artifactPath, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
await writeFile(scriptSnapshotPath, await readFile(scriptPath), { flag: "wx" });
const snapshotSha256 = sha256(await readFile(scriptSnapshotPath));
assert.equal(snapshotSha256, result.environment.scriptSha256);
console.log(JSON.stringify({
  status: result.status,
  artifactPath: path.relative(root, artifactPath),
  bundleSha256: actualBundleSha256,
  scriptSnapshotSha256: snapshotSha256,
}, null, 2));
if (result.status !== "PASS") process.exitCode = 1;
