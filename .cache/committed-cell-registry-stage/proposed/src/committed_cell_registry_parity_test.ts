import { OwnerStateWorld as BeforeWorld } from "../../before/src/owner_state_world.ts";
import { OwnerStateWorld as StagedWorld } from "./owner_state_world.ts";
import type { StateChange } from "./owner_state_world.ts";

function same(actual: unknown, expected: unknown, label: string) {
  if (!Object.is(actual, expected)) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function runScenario(World: new () => any, scenario: string) {
  const world = new World();
  const owner = world.resolveOwner(null, "parity-owner");
  const other = world.resolveOwner(null, "parity-other");
  world.useState(owner, "value", 1);
  world.useState(other, "value", 40);
  const changes: StateChange[] = [];
  world.subscribeChanges((change: StateChange) => changes.push(change));
  const [, setter] = world.useState(owner, "value", 1);
  setter(2);
  const identity = changes[0].cellIdentity!;
  const counts = { owner: 0, site: 0, cellIdentity: 0, identityTrap: 0 };
  const events: string[] = [];
  let queryOwner = owner;
  let querySite = "value";
  let identityValue: unknown = identity;
  if (scenario === "foreign-proxy") {
    identityValue = new Proxy({}, {
      get() {
        counts.identityTrap++;
        return undefined;
      },
    });
  } else if (scenario === "authentic-proxy") {
    identityValue = new Proxy(identity, {
      get() {
        counts.identityTrap++;
        return undefined;
      },
    });
  } else if (scenario === "malformed-primitive") {
    identityValue = "not-an-object";
  } else if (scenario === "owner-mismatch") {
    queryOwner = other;
  } else if (scenario === "site-mismatch") {
    querySite = "missing";
  }
  let destroyed = false;
  const change = {
    get owner() {
      counts.owner++;
      events.push("owner");
      if (
        (scenario === "destroy-in-owner-getter" ||
          scenario === "destroy-in-owner-getter-then-other") && !destroyed
      ) {
        destroyed = true;
        world.destroyOwner(owner);
      }
      if (scenario === "throw-owner-getter") throw new Error("owner getter");
      return scenario === "destroy-in-owner-getter-then-other" && destroyed &&
          counts.owner > 1
        ? other
        : queryOwner;
    },
    get site() {
      counts.site++;
      events.push("site");
      if (scenario === "throw-site-getter") throw new Error("site getter");
      return querySite;
    },
    version: 1,
    get cellIdentity() {
      counts.cellIdentity++;
      events.push("cellIdentity");
      if (scenario === "throw-identity-getter") throw new Error("identity getter");
      if (scenario === "throw-second-identity-getter" && counts.cellIdentity === 2) {
        throw new Error("second identity getter");
      }
      if (scenario === "destroy-in-identity-getter" && !destroyed) {
        destroyed = true;
        world.destroyOwner(owner);
      }
      return identityValue;
    },
  } as StateChange;
  const outcome: { source?: number | null; version?: number; error?: string } = {};
  try {
    outcome.source = world.scalarSourceForChange(change)?.value ?? null;
  } catch (error) {
    outcome.error = error instanceof Error ? error.message : String(error);
  }
  if (!outcome.error) {
    try {
      outcome.version = world.versionForChange(change);
    } catch (error) {
      outcome.error = error instanceof Error ? error.message : String(error);
    }
  }
  return { outcome, counts, events };
}

Deno.test("legacy change identity resolution matches registry behavior", () => {
  for (const scenario of [
    "matching",
    "foreign-proxy",
    "authentic-proxy",
    "malformed-primitive",
    "owner-mismatch",
    "site-mismatch",
    "destroy-in-owner-getter",
    "destroy-in-owner-getter-then-other",
    "destroy-in-identity-getter",
    "throw-owner-getter",
    "throw-site-getter",
    "throw-identity-getter",
    "throw-second-identity-getter",
  ]) {
    const before = runScenario(BeforeWorld, scenario);
    const staged = runScenario(StagedWorld, scenario);
    same(JSON.stringify(staged), JSON.stringify(before), `${scenario} parity`);
  }
});

Deno.test("identity field getter keeps the historical truthy double-read", () => {
  const truthy = runScenario(StagedWorld, "matching");
  same(truthy.counts.cellIdentity, 4, "truthy identity reads for source and version");
  let nullReads = 0;
  const nullChange = {
    owner: 1,
    site: "missing",
    version: 0,
    get cellIdentity() {
      nullReads++;
      return null;
    },
  } as unknown as StateChange;
  const world = new StagedWorld();
  world.resolveOwner(null, "empty");
  world.scalarSourceForChange(nullChange);
  same(nullReads, 1, "falsey identity is read once");
});

Deno.test("foreign capability proxies are screened without property traps", () => {
  const world = new StagedWorld();
  const owner = world.resolveOwner(null, "proxy-screen");
  world.useState(owner, "value", 1);
  let traps = 0;
  const change = {
    owner,
    site: "value",
    version: 0,
    cellIdentity: new Proxy({}, {
      get() {
        traps++;
        return undefined;
      },
    }),
  } as StateChange;
  world.scalarSourceForChange(change);
  world.versionForChange(change);
  same(traps, 0, "private brand screen triggers no proxy trap");
});

function runCrossWorld(World: new () => any) {
  const sourceWorld = new World();
  const sourceOwner = sourceWorld.resolveOwner(null, "cross-world-source");
  const [, sourceSetter] = sourceWorld.useState(sourceOwner, "value", 1);
  const sourceChanges: StateChange[] = [];
  sourceWorld.subscribeChanges((change: StateChange) => sourceChanges.push(change));
  sourceSetter(2);

  const targetWorld = new World();
  const targetOwner = targetWorld.resolveOwner(null, "cross-world-target");
  const [, targetSetter] = targetWorld.useState(targetOwner, "value", 40);
  targetSetter(41);
  const change = {
    ...sourceChanges[0],
    owner: targetOwner,
  } as StateChange;
  return {
    source: targetWorld.scalarSourceForChange(change)?.value ?? null,
    version: targetWorld.versionForChange(change),
  };
}

Deno.test("foreign World capability falls back to addressed live cell", () => {
  const before = runCrossWorld(BeforeWorld);
  const staged = runCrossWorld(StagedWorld);
  same(JSON.stringify(staged), JSON.stringify(before), "cross-World parity");
  same(staged.source, 41, "foreign capability uses target World source");
  same(staged.version, 1, "foreign capability uses target World version");
});

function runCapturedCellAcrossRevocation(
  World: new () => any,
  method: "source" | "version",
) {
  const world = new World();
  const owner = world.resolveOwner(null, `capture-${method}`);
  const other = world.resolveOwner(null, `capture-other-${method}`);
  const [, setter] = world.useState(owner, "value", 1);
  world.useState(other, "value", 40);
  const changes: StateChange[] = [];
  world.subscribeChanges((change: StateChange) => changes.push(change));
  setter(2);
  let ownerReads = 0;
  const change = {
    get owner() {
      ownerReads++;
      if (ownerReads === 1) {
        world.destroyOwner(owner);
        return owner;
      }
      return other;
    },
    site: "value",
    version: 1,
    cellIdentity: changes[0].cellIdentity,
  } as StateChange;
  return method === "source"
    ? world.scalarSourceForChange(change)?.value ?? null
    : world.versionForChange(change);
}

Deno.test("reentrant revocation keeps the pre-accessor cell snapshot", () => {
  for (const method of ["source", "version"] as const) {
    const before = runCapturedCellAcrossRevocation(BeforeWorld, method);
    const staged = runCapturedCellAcrossRevocation(StagedWorld, method);
    same(staged, before, `${method} revocation parity`);
    same(staged, method === "source" ? null : 1, `${method} keeps captured cell`);
  }
});
