import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";

const root = process.cwd();
const output = path.join(root, "results/numeric-cell-shapes-v2");
const sourcePath = path.join(root, "src/owner_state_world.ts");
const entryPath = path.join(output, "owner-state-world-entry.ts");
const bundlePath = path.join(output, "owner-state-world.iife.js");
const artifactPath = path.join(output, "diagnostic.json");
const scriptPath = fileURLToPath(import.meta.url);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

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
assert.equal((await readdir(output)).length, 0, `Refusing to reuse ${output}`);

const entrySource = `import { OwnerStateWorld } from "../../src/owner_state_world.ts";\n(globalThis as any).__numericCellShapeWorld = OwnerStateWorld;\n`;
await writeFile(entryPath, entrySource, { flag: "wx" });
const bundleResult = await run("deno", [
  "bundle",
  "--config=deno.browser.json",
  "--platform=browser",
  "--format=iife",
  `--output=${bundlePath}`,
  entryPath,
]);

const browserOptions = {
  headless: true,
  gpu: false,
  browserArgs: ["--js-flags=--allow-natives-syntax"],
};
let browser;
let page;
let diagnostic;
try {
  assert.equal(bundleResult.code, 0, `Deno bundle failed: ${bundleResult.stderr}`);
  browser = await openBrowser(browserOptions);
  page = await browser.newPage();
  await page.goto("about:blank");
  const session = await page.context().newCDPSession(page);
  const browserVersion = await session.send("Browser.getVersion");
  await page.addScriptTag({ path: bundlePath });

  diagnostic = await page.evaluate(() => {
    const World = globalThis.__numericCellShapeWorld;
    if (typeof World !== "function") throw new Error("OwnerStateWorld bundle did not expose its class");

    let fastProperties;
    try {
      fastProperties = new Function("value", "return %HasFastProperties(value);");
      fastProperties({ probe: 1 });
    } catch (error) {
      return {
        status: "INTRINSIC_UNAVAILABLE",
        reason: String(error),
        userAgent: navigator.userAgent,
        v8Version: globalThis.process?.versions?.v8 ?? null,
      };
    }

    const originalDefineProperty = Object.defineProperty;
    const captured = [];
    const actualCells = {};
    let captureMode = "direct-initial";
    const describe = (target) => {
      const descriptor = Object.getOwnPropertyDescriptor(target, "value");
      return {
        fastProperties: fastProperties(target),
        ownKeys: Object.keys(target),
        valueDescriptor: descriptor ? {
          configurable: descriptor.configurable,
          enumerable: descriptor.enumerable,
          hasGetter: typeof descriptor.get === "function",
          getterName: descriptor.get?.name ?? null,
          hasSetter: typeof descriptor.set === "function",
          setterName: descriptor.set?.name ?? null,
          writable: "writable" in descriptor ? descriptor.writable : null,
          valueType: "value" in descriptor ? typeof descriptor.value : null,
        } : null,
      };
    };

    Object.defineProperty = function(target, property, descriptor) {
      const isLaneActivation = property === "value" &&
        descriptor?.get?.name === "getLaneBackedValue";
      if (!isLaneActivation) return originalDefineProperty.call(Object, target, property, descriptor);
      const before = describe(target);
      const result = originalDefineProperty.call(Object, target, property, descriptor);
      const after = describe(target);
      captured.push({ mode: captureMode, before, after });
      actualCells[captureMode] = target;
      return result;
    };

    let world;
    let owner;
    let stateValueAfterNumeric;
    let laneActiveAfterNumeric = false;
    let promotedValue;
    let laneInactiveAfterPromotion = false;
    let numericValueAfterPromotion;
    let laneRemainedOffAfterReturnToNumeric = false;
    let destroyed = false;
    let reusedOwner;
    let reusedValue;
    let laneActiveAfterReuse = false;
    let directCellAfterPromotion = null;
    let directCellAfterNumericReturn = null;
    let privateCandidateValueBeforePublish;
    let privateCandidateValueAfterPublish;
    let privateLaneActiveAfterPublish = false;
    let privatePromotedValue;
    let privateLaneInactiveAfterPromotion = false;
    let privateNumericValueAfterPromotion;
    let privateLaneRemainedOffAfterReturnToNumeric = false;
    let privateCellAfterPromotion = null;
    let privateCellAfterNumericReturn = null;
    let actualCellAfterDestroy = null;
    let control;
    let controlShape = null;
    try {
      world = new World();
      const layout = { schemaVersion: 1, slots: [{ siteId: "value", slot: 0 }] };
      owner = world.resolveOwner(null, "diagnostic#component:Cell", "cell");
      const [, setValue] = world.useState(owner, "value", 1, layout);
      stateValueAfterNumeric = world.useState(owner, "value", 0, layout)[0];
      laneActiveAfterNumeric = world.numericLane(owner, "value") !== null;
      setValue(2);
      stateValueAfterNumeric = world.useState(owner, "value", 0, layout)[0];
      laneActiveAfterNumeric = world.numericLane(owner, "value") !== null;
      setValue("wide");
      promotedValue = world.useState(owner, "value", 0, layout)[0];
      laneInactiveAfterPromotion = world.numericLane(owner, "value") === null;
      directCellAfterPromotion = describe(actualCells["direct-initial"]);
      setValue(7);
      numericValueAfterPromotion = world.useState(owner, "value", 0, layout)[0];
      laneRemainedOffAfterReturnToNumeric = world.numericLane(owner, "value") === null;
      directCellAfterNumericReturn = describe(actualCells["direct-initial"]);
      destroyed = world.destroyOwner(owner);
      actualCellAfterDestroy = describe(actualCells["direct-initial"]);
      captureMode = "direct-reuse";
      reusedOwner = world.resolveOwner(null, "diagnostic#component:Cell", "cell");
      reusedValue = world.useState(reusedOwner, "value", 9, layout)[0];
      laneActiveAfterReuse = world.numericLane(reusedOwner, "value") !== null;

      const preparedWorld = new World();
      const preparation = preparedWorld.beginPreparation();
      const preparedOwner = preparation.resolveOwner(
        null,
        "diagnostic#component:PreparedCell",
        "prepared",
      );
      const [, preparedSetValue] = preparation.useState(
        preparedOwner,
        "value",
        11,
        layout,
      );
      preparedSetValue(12);
      privateCandidateValueBeforePublish = preparation.useState(
        preparedOwner,
        "value",
        0,
        layout,
      )[0];
      captureMode = "prepared-publish";
      preparation.publish();
      privateLaneActiveAfterPublish = preparedWorld.numericLane(preparedOwner, "value") !== null;
      privateCandidateValueAfterPublish = preparedWorld.useState(
        preparedOwner,
        "value",
        0,
        layout,
      )[0];
      preparedSetValue("prepared-wide");
      privatePromotedValue = preparedWorld.useState(
        preparedOwner,
        "value",
        0,
        layout,
      )[0];
      privateLaneInactiveAfterPromotion = preparedWorld.numericLane(preparedOwner, "value") === null;
      privateCellAfterPromotion = describe(actualCells["prepared-publish"]);
      preparedSetValue(14);
      privateNumericValueAfterPromotion = preparedWorld.useState(
        preparedOwner,
        "value",
        0,
        layout,
      )[0];
      privateLaneRemainedOffAfterReturnToNumeric = preparedWorld.numericLane(preparedOwner, "value") === null;
      privateCellAfterNumericReturn = describe(actualCells["prepared-publish"]);

      Object.defineProperty = originalDefineProperty;

      const controlPrototype = Object.create(Object.prototype);
      Object.defineProperty(controlPrototype, "value", {
        configurable: true,
        enumerable: true,
        get: function getLaneBackedValue() { return this.controlValue; },
        set: function setLaneBackedValue(next) { this.controlValue = next; },
      });
      control = Object.assign(Object.create(controlPrototype), {
        version: 0,
        controlValue: 7,
        site: "value",
        lane: null,
      });
      controlShape = describe(control);
      return {
        status: "PASS",
        userAgent: navigator.userAgent,
        v8Version: globalThis.process?.versions?.v8 ?? null,
        fastPropertiesIntrinsic: "%HasFastProperties",
        captured,
        actualCellAfterDestroy,
        lifecycle: {
          initialOwner: owner,
          stateValueAfterNumeric,
          laneActiveAfterNumeric,
          promotedValue,
          laneInactiveAfterPromotion,
          numericValueAfterPromotion,
          laneRemainedOffAfterReturnToNumeric,
          destroyed,
          reusedOwner,
          reusedValue,
          laneActiveAfterReuse,
          directCellAfterPromotion,
          directCellAfterNumericReturn,
          privateCandidateValueBeforePublish,
          privateCandidateValueAfterPublish,
          privateLaneActiveAfterPublish,
          privatePromotedValue,
          privateLaneInactiveAfterPromotion,
          privateNumericValueAfterPromotion,
          privateLaneRemainedOffAfterReturnToNumeric,
          privateCellAfterPromotion,
          privateCellAfterNumericReturn,
        },
        prototypeAccessorControl: {
          value: control.value,
          shape: controlShape,
        },
      };
    } finally {
      Object.defineProperty = originalDefineProperty;
    }
  });
  diagnostic.browserVersion = browserVersion;
  diagnostic.status = diagnostic.status ?? "PASS";
  if (diagnostic.status === "PASS") {
    assert.deepEqual(diagnostic.captured.map(({ mode }) => mode), [
      "direct-initial",
      "direct-reuse",
      "prepared-publish",
    ]);
    assert.equal(diagnostic.captured[0].before.valueDescriptor.hasGetter, false);
    assert.equal(diagnostic.captured[0].before.fastProperties, true);
    assert.equal(diagnostic.captured[0].after.valueDescriptor.getterName, "getLaneBackedValue");
    assert.equal(diagnostic.captured[0].after.fastProperties, false);
    assert.equal(diagnostic.captured[2].before.valueDescriptor.hasGetter, false);
    assert.equal(diagnostic.captured[2].before.fastProperties, true);
    assert.equal(diagnostic.captured[2].after.valueDescriptor.getterName, "getLaneBackedValue");
    assert.equal(diagnostic.captured[2].after.fastProperties, false);
    assert.equal(diagnostic.lifecycle.laneActiveAfterNumeric, true);
    assert.equal(diagnostic.lifecycle.laneInactiveAfterPromotion, true);
    assert.equal(diagnostic.lifecycle.laneRemainedOffAfterReturnToNumeric, true);
    assert.equal(diagnostic.lifecycle.destroyed, true);
    assert.equal(diagnostic.lifecycle.laneActiveAfterReuse, true);
    assert.equal(diagnostic.lifecycle.privateCandidateValueBeforePublish, 12);
    assert.equal(diagnostic.lifecycle.privateCandidateValueAfterPublish, 12);
    assert.equal(diagnostic.lifecycle.privateLaneActiveAfterPublish, true);
    assert.equal(diagnostic.lifecycle.privatePromotedValue, "prepared-wide");
    assert.equal(diagnostic.lifecycle.privateLaneInactiveAfterPromotion, true);
    assert.equal(diagnostic.lifecycle.privateNumericValueAfterPromotion, 14);
    assert.equal(diagnostic.lifecycle.privateLaneRemainedOffAfterReturnToNumeric, true);
    assert.equal(diagnostic.lifecycle.privateCellAfterPromotion.valueDescriptor.hasGetter, false);
    assert.equal(diagnostic.lifecycle.privateCellAfterNumericReturn.valueDescriptor.valueType, "number");
    assert.equal(diagnostic.prototypeAccessorControl.shape.fastProperties, true);
  }
} catch (error) {
  diagnostic = {
    status: diagnostic?.status === "INTRINSIC_UNAVAILABLE" ? "INTRINSIC_UNAVAILABLE" : "FAIL",
    error: String(error?.stack ?? error),
    browserOptions,
    bundle: {
      exitCode: bundleResult.code,
      stdout: bundleResult.stdout,
      stderr: bundleResult.stderr,
    },
  };
} finally {
  await page?.context().close().catch(() => {});
  await browser?.close().catch(() => {});
}

const result = {
  schemaVersion: 1,
  status: diagnostic?.status ?? "FAIL",
  collectedAt: new Date().toISOString(),
  scope: "Object-layout diagnostic only; no latency or performance claim.",
  runtime: {
    node: process.version,
    hostPlatform: process.platform,
    hostArchitecture: process.arch,
    browserOptions,
    browserVersion: diagnostic?.browserVersion ?? null,
    userAgent: diagnostic?.userAgent ?? null,
    v8Version: diagnostic?.v8Version ?? diagnostic?.browserVersion?.jsVersion ?? null,
  },
  inputs: {
    sourcePath: path.relative(root, sourcePath),
    sourceSha256: sha256(await readFile(sourcePath)),
    scriptPath: path.relative(root, scriptPath),
    scriptSha256: sha256(await readFile(scriptPath)),
    bundlePath: path.relative(root, bundlePath),
    bundleSha256: await readFile(bundlePath).then(sha256).catch(() => null),
  },
  bundle: {
    command: "deno bundle --config=deno.browser.json --platform=browser --format=iife",
    exitCode: bundleResult.code,
    stdout: bundleResult.stdout,
    stderr: bundleResult.stderr,
  },
  diagnostic,
};
await writeFile(artifactPath, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ status: result.status, artifactPath: path.relative(root, artifactPath) }, null, 2));
if (result.status !== "PASS") process.exitCode = 1;
