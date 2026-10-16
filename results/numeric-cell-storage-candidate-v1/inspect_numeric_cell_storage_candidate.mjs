import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";

const root = process.cwd();
const attempt = process.env.NUMERIC_CELL_STORAGE_ATTEMPT ?? "v1";
assert.match(attempt, /^v\d+$/);
const output = path.join(root, `results/numeric-cell-storage-candidate-${attempt}`);
const sourcePath = path.join(root, "src/owner_state_world.ts");
const entryPath = path.join(output, "owner-state-world-entry.ts");
const bundlePath = path.join(output, "owner-state-world.iife.js");
const artifactPath = path.join(output, "diagnostic.json");
const scriptSnapshotPath = path.join(output, "inspect_numeric_cell_storage_candidate.mjs");
const scriptPath = fileURLToPath(import.meta.url);
const browserOptions = {
  headless: true,
  gpu: false,
  browserArgs: ["--js-flags=--allow-natives-syntax"],
};
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const errorText = (error) => String(error?.stack ?? error);

async function run(command, args, cwd = root) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({
      code,
      signal,
      stdout: Buffer.concat(stdout).toString("utf8"),
      stderr: Buffer.concat(stderr).toString("utf8"),
    }));
  });
}

await mkdir(output, { recursive: true });
assert.equal((await readdir(output)).length, 0, `Refusing to overwrite attempt ${attempt}`);
const sourceSha256BeforeBundle = sha256(await readFile(sourcePath));
const entrySource = `import { OwnerStateWorld } from "../../src/owner_state_world.ts";\n(globalThis as any).__numericCellStorageWorld = OwnerStateWorld;\n`;
await writeFile(entryPath, entrySource, { flag: "wx" });
const graphResult = await run("deno", [
  "info",
  "--json",
  "--config=deno.browser.json",
  entryPath,
]);
assert.equal(graphResult.code, 0, `Deno dependency graph failed: ${graphResult.stderr}`);
const dependencyGraph = JSON.parse(graphResult.stdout);
const bundledInputHashes = {};
for (const module of dependencyGraph.modules ?? []) {
  if (!module.local || !module.local.startsWith(root + path.sep)) continue;
  const relativePath = path.relative(root, module.local);
  bundledInputHashes[relativePath] = sha256(await readFile(module.local));
}
const bundleResult = await run("deno", [
  "bundle",
  "--config=deno.browser.json",
  "--platform=browser",
  "--format=iife",
  `--output=${bundlePath}`,
  entryPath,
]);
const sourceSha256AfterBundle = sha256(await readFile(sourcePath));

const diagnostic = {
  schemaVersion: 1,
  status: "INCOMPLETE",
  attempt,
  sourcePath: path.relative(root, sourcePath),
  sourceSha256BeforeBundle,
  sourceSha256AfterBundle,
  bundlePath: path.relative(root, bundlePath),
  bundleSha256: await readFile(bundlePath).then(sha256).catch(() => null),
  bundledInputHashes,
  bundleCommand: "deno bundle --config=deno.browser.json --platform=browser --format=iife",
  bundleResult,
  browserOptions,
  propertyDiscovery: null,
  snapshots: {},
  semantics: {},
};

let browser;
let page;
let cdp;
try {
  assert.equal(bundleResult.code, 0, `Deno bundle failed: ${bundleResult.stderr}`);
  assert.equal(sourceSha256AfterBundle, sourceSha256BeforeBundle, "World source changed during bundling");
  browser = await openBrowser(browserOptions);
  page = await browser.newPage();
  await page.goto("about:blank");
  cdp = await page.context().newCDPSession(page);
  await cdp.send("Runtime.enable");
  diagnostic.browserVersion = await cdp.send("Browser.getVersion");
  await page.addScriptTag({ path: bundlePath });

  const setup = await page.evaluate(() => {
    const World = globalThis.__numericCellStorageWorld;
    if (typeof World !== "function") throw new Error("Source bundle did not expose OwnerStateWorld");
    const layout = { schemaVersion: 1, slots: [{ siteId: "value", slot: 0 }] };

    const directWorld = new World();
    const directOwner = directWorld.resolveOwner(null, "candidate#component:Direct", "cell");
    const [, directSetter] = directWorld.useState(directOwner, "value", 1, layout);

    const preparedWorld = new World();
    const preparation = preparedWorld.beginPreparation();
    const preparedOwner = preparation.resolveOwner(null, "candidate#component:Prepared", "cell");
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
      layout,
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
  const getProperties = async (objectId) => await cdp.send("Runtime.getProperties", {
    objectId,
    ownProperties: true,
    accessorPropertiesOnly: false,
    generatePreview: true,
    nonIndexedPropertiesOnly: true,
  });
  const findPrivateMap = async (worldId, label) => {
    const properties = await getProperties(worldId);
    const privateProperties = properties.privateProperties;
    diagnostic.propertyDiscovery ??= {};
    diagnostic.propertyDiscovery[label] = {
      responseKeys: Object.keys(properties).sort(),
      privatePropertyNames: Array.isArray(privateProperties)
        ? privateProperties.map(({ name }) => name)
        : null,
    };
    if (!Array.isArray(privateProperties)) return null;
    return privateProperties.find(({ name }) => name === "#stateByOwner")?.value?.objectId ?? null;
  };
  const directWorldId = await evaluateRemote("globalThis.__numericCellStorageProbe.directWorld");
  const preparedWorldId = await evaluateRemote("globalThis.__numericCellStorageProbe.preparedWorld");
  const directMapId = await findPrivateMap(directWorldId, "directWorld");
  const preparedMapId = await findPrivateMap(preparedWorldId, "preparedWorld");
  if (!directMapId || !preparedMapId) {
    diagnostic.status = "PRIVATE_PROPERTIES_UNAVAILABLE";
    diagnostic.stopReason = "CDP did not expose #stateByOwner with an objectId; no fallback access path was attempted.";
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
            logicalValue: this.value,
            boxedValuePresent: Object.prototype.hasOwnProperty.call(this, "boxedValue"),
            boxedValue: this.boxedValue,
            lanePresent: this.lane !== null && this.lane !== undefined,
            lane: this.lane ? {
              row: this.lane.row,
              generation: this.lane.generation,
              site: this.lane.site,
            } : null,
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
    const directCellId = await readCellId(directMapId, directOwner, "value");
    const preparedCellId = await readCellId(preparedMapId, preparedOwner, "value");
    diagnostic.snapshots.directInitial = await describeCell(directCellId);
    diagnostic.snapshots.preparedPublished = await describeCell(preparedCellId);

    diagnostic.semantics.afterReentryDispatch = await page.evaluate(() => {
      const probe = globalThis.__numericCellStorageProbe;
      let directReentered = false;
      let preparedReentered = false;
      const stopDirect = probe.directWorld.subscribeDirtyCells((handle) => {
        if (handle.owner === probe.directOwner && handle.site === "value" && !directReentered) {
          directReentered = true;
          probe.directSetter(3);
        }
      });
      const stopPrepared = probe.preparedWorld.subscribeDirtyCells((handle) => {
        if (handle.owner === probe.preparedOwner && handle.site === "value" && !preparedReentered) {
          preparedReentered = true;
          probe.preparedSetter(15);
        }
      });
      probe.directSetter(2);
      probe.preparedSetter(13);
      stopDirect();
      stopPrepared();
      return {
        directValue: probe.directWorld.useState(probe.directOwner, "value", 0)[0],
        directLaneActive: probe.directWorld.numericLane(probe.directOwner, "value") !== null,
        preparedValue: probe.preparedWorld.useState(probe.preparedOwner, "value", 0)[0],
        preparedLaneActive: probe.preparedWorld.numericLane(probe.preparedOwner, "value") !== null,
        directReentered,
        preparedReentered,
      };
    });
    diagnostic.snapshots.directAfterReentryDispatch = await describeCell(directCellId);
    diagnostic.snapshots.preparedAfterReentryDispatch = await describeCell(preparedCellId);

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

    diagnostic.semantics.afterReturnToNumeric = await page.evaluate(() => {
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
    diagnostic.snapshots.directAfterReturnToNumeric = await describeCell(directCellId);
    diagnostic.snapshots.preparedAfterReturnToNumeric = await describeCell(preparedCellId);

    diagnostic.semantics.preparationCancellation = await page.evaluate(() => {
      const probe = globalThis.__numericCellStorageProbe;
      const preparation = probe.preparedWorld.beginPreparation();
      const owner = preparation.resolveOwner(null, "candidate#component:Cancelled", "cell");
      const [, candidateSetter] = preparation.useState(owner, "value", 20, probe.layout);
      const acceptedBeforeDiscard = candidateSetter(21);
      preparation.discard();
      const acceptedAfterDiscard = candidateSetter(22);
      return {
        acceptedBeforeDiscard,
        acceptedAfterDiscard,
        ownerVisibleAfterDiscard: probe.preparedWorld.findOwner(
          null,
          "candidate#component:Cancelled",
          "cell",
        ) !== undefined,
        retainedPreparedValue: probe.preparedWorld.useState(probe.preparedOwner, "value", 0)[0],
      };
    });

    diagnostic.semantics.destroyAndReuse = await page.evaluate(() => {
      const probe = globalThis.__numericCellStorageProbe;
      const destroyed = probe.directWorld.destroyOwner(probe.directOwner);
      const retainedSetterAccepted = probe.directSetter(99);
      const reusedOwner = probe.directWorld.resolveOwner(null, "candidate#component:Direct", "cell");
      const reusedValue = probe.directWorld.useState(reusedOwner, "value", 9, probe.layout)[0];
      const laneActive = probe.directWorld.numericLane(reusedOwner, "value") !== null;
      probe.reusedOwner = reusedOwner;
      return { destroyed, retainedSetterAccepted, reusedOwner, reusedValue, laneActive };
    });
    diagnostic.snapshots.directAfterDestroy = await describeCell(directCellId);
    const reusedProperties = await getProperties(directWorldId);
    const reusedMapId = reusedProperties.privateProperties?.find(({ name }) =>
      name === "#stateByOwner"
    )?.value?.objectId;
    if (!reusedMapId) throw new Error("CDP lost #stateByOwner private map after owner reuse");
    const reusedCellId = await readCellId(
      reusedMapId,
      diagnostic.semantics.destroyAndReuse.reusedOwner,
      "value",
    );
    diagnostic.snapshots.directAfterOwnerReuse = await describeCell(reusedCellId);

    const snapshots = diagnostic.snapshots;
    const inheritedGetter = (snapshot) => snapshot.prototypeValueDescriptor?.getterName;
    const inheritedSetter = (snapshot) => snapshot.prototypeValueDescriptor?.setterName;
    const noOwnValue = (snapshot) => snapshot.ownValueDescriptor === null;
    for (const name of [
      "directInitial",
      "preparedPublished",
      "directAfterReentryDispatch",
      "preparedAfterReentryDispatch",
      "directAfterOwnerReuse",
    ]) {
      assert.equal(snapshots[name].fastProperties, true, `${name}: fast properties should remain enabled`);
      assert.equal(noOwnValue(snapshots[name]), true, `${name}: value should not be an own data/accessor property`);
      assert.equal(inheritedGetter(snapshots[name]), "getLaneBackedValue", `${name}: shared prototype getter missing`);
      assert.equal(inheritedSetter(snapshots[name]), "setLaneBackedValue", `${name}: shared prototype setter missing`);
    }
    for (const name of [
      "directInitial",
      "preparedPublished",
      "directAfterReentryDispatch",
      "preparedAfterReentryDispatch",
    ]) {
      assert.equal(snapshots[name].boxedValue, undefined, `${name}: numeric lane must not retain a boxed mirror`);
      assert.equal(snapshots[name].lanePresent, true, `${name}: expected published lane`);
    }
    for (const name of ["directAfterPromotion", "preparedAfterPromotion"]) {
      assert.equal(snapshots[name].fastProperties, true, `${name}: promotion should preserve fast properties`);
      assert.equal(noOwnValue(snapshots[name]), true, `${name}: prototype accessor should remain shared`);
      assert.equal(inheritedGetter(snapshots[name]), "getLaneBackedValue");
      assert.equal(snapshots[name].lanePresent, false, `${name}: promoted state should release lane`);
      assert.equal(snapshots[name].boxedValue, name === "directAfterPromotion" ? "wide" : "prepared-wide");
    }
    for (const name of ["directAfterReturnToNumeric", "preparedAfterReturnToNumeric"]) {
      assert.equal(snapshots[name].fastProperties, true);
      assert.equal(noOwnValue(snapshots[name]), true);
      assert.equal(snapshots[name].lanePresent, false);
      assert.equal(snapshots[name].boxedValue, name === "directAfterReturnToNumeric" ? 7 : 14);
    }
    assert.equal(snapshots.directAfterDestroy.fastProperties, true);
    assert.equal(snapshots.directAfterDestroy.logicalValue, undefined);
    assert.equal(snapshots.directAfterDestroy.boxedValue, undefined);
    assert.equal(snapshots.directAfterDestroy.lanePresent, false);
    assert.equal(diagnostic.semantics.initial.directLaneActiveAfterActivation, true);
    assert.equal(diagnostic.semantics.initial.preparedLaneActiveAfterPublish, true);
    assert.deepEqual(diagnostic.semantics.afterReentryDispatch, {
      directValue: 3,
      directLaneActive: true,
      preparedValue: 15,
      preparedLaneActive: true,
      directReentered: true,
      preparedReentered: true,
    });
    assert.deepEqual(diagnostic.semantics.afterPromotion, {
      directValue: "wide",
      directLaneActive: false,
      preparedValue: "prepared-wide",
      preparedLaneActive: false,
    });
    assert.deepEqual(diagnostic.semantics.afterReturnToNumeric, {
      directValue: 7,
      directLaneActive: false,
      preparedValue: 14,
      preparedLaneActive: false,
    });
    assert.deepEqual(diagnostic.semantics.preparationCancellation, {
      acceptedBeforeDiscard: true,
      acceptedAfterDiscard: false,
      ownerVisibleAfterDiscard: false,
      retainedPreparedValue: 14,
    });
    assert.equal(diagnostic.semantics.destroyAndReuse.destroyed, true);
    assert.equal(diagnostic.semantics.destroyAndReuse.retainedSetterAccepted, false);
    assert.equal(diagnostic.semantics.destroyAndReuse.laneActive, true);
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

diagnostic.collectedAt = new Date().toISOString();
diagnostic.scope = "Candidate object-storage diagnostic only; no latency or performance claim.";
diagnostic.environment = {
  node: process.version,
  platform: process.platform,
  architecture: process.arch,
  browserOptions,
  scriptPath: path.relative(root, scriptPath),
  scriptSha256: sha256(await readFile(scriptPath)),
};
await writeFile(artifactPath, `${JSON.stringify(diagnostic, null, 2)}\n`, { flag: "wx" });
await writeFile(scriptSnapshotPath, await readFile(scriptPath), { flag: "wx" });
assert.equal(sha256(await readFile(scriptSnapshotPath)), diagnostic.environment.scriptSha256);
console.log(JSON.stringify({
  status: diagnostic.status,
  attempt,
  artifactPath: path.relative(root, artifactPath),
  sourceSha256: sourceSha256BeforeBundle,
  bundleSha256: diagnostic.bundleSha256,
}, null, 2));
if (diagnostic.status !== "PASS") process.exitCode = 1;
