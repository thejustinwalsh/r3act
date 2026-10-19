import {
  OwnerStateWorld,
  type OwnerId,
  type StateChange,
  type StateSiteId,
} from "./owner_state_world.ts";

type AddressedChange = {
  world: OwnerStateWorld;
  owner: OwnerId;
  other: OwnerId;
  identity: object;
};

type Accessors = {
  identity?: (read: number) => unknown;
  owner?: (read: number) => OwnerId;
  site?: (read: number) => StateSiteId;
};

function equal(actual: unknown, expected: unknown, label: string) {
  const objectLike = actual !== null && expected !== null &&
    typeof actual === "object" && typeof expected === "object";
  const matches = objectLike
    ? JSON.stringify(actual) === JSON.stringify(expected)
    : Object.is(actual, expected);
  if (!matches) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function addressedChange(): AddressedChange {
  const world = new OwnerStateWorld();
  const owner = world.resolveOwner(null, "legacy-accessor-owner");
  const other = world.resolveOwner(null, "legacy-accessor-other");
  const [, setter] = world.useState(owner, "value", 1);
  world.useState(other, "value", 40);
  const changes: StateChange[] = [];
  world.subscribeChanges((change) => changes.push(change));
  setter(2);
  const identity = changes[0].cellIdentity;
  if (!identity) throw new Error("Committed setter did not publish an identity");
  return { world, owner, other, identity };
}

function observedChange(
  identity: unknown,
  owner: OwnerId,
  site: StateSiteId,
  events: string[],
  accessors: Accessors = {},
) {
  const counts = { identity: 0, owner: 0, site: 0 };
  const change = {
    get cellIdentity() {
      const read = ++counts.identity;
      events.push("identity");
      return accessors.identity ? accessors.identity(read) : identity;
    },
    get owner() {
      const read = ++counts.owner;
      events.push("owner");
      return accessors.owner ? accessors.owner(read) : owner;
    },
    get site() {
      const read = ++counts.site;
      events.push("site");
      return accessors.site ? accessors.site(read) : site;
    },
    version: 1,
  } as StateChange;
  return { change, counts };
}

function throwsNotAlive(run: () => unknown, label: string) {
  let message = "";
  try {
    run();
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  if (!message.includes("not alive")) {
    throw new Error(`${label}: expected dead-owner failure, got ${message || "no throw"}`);
  }
}

Deno.test("authentic legacy change preserves getter order and source/version", () => {
  const state = addressedChange();
  const sourceEvents: string[] = [];
  const sourceChange = observedChange(
    state.identity,
    state.owner,
    "value",
    sourceEvents,
  );
  equal(
    state.world.scalarSourceForChange(sourceChange.change)?.value,
    2,
    "authentic source",
  );
  equal(sourceEvents, ["identity", "identity", "owner", "site", "owner"], "source getter order");
  equal(sourceChange.counts, { identity: 2, owner: 2, site: 1 }, "source getter counts");

  const versionEvents: string[] = [];
  const versionChange = observedChange(
    state.identity,
    state.owner,
    "value",
    versionEvents,
  );
  equal(state.world.versionForChange(versionChange.change), 1, "authentic version");
  equal(versionEvents, ["identity", "identity", "owner", "site", "owner"], "version getter order");
  equal(versionChange.counts, { identity: 2, owner: 2, site: 1 }, "version getter counts");
});

Deno.test("mismatched legacy addresses fall back with the original short-circuit order", () => {
  const state = addressedChange();
  const ownerEvents: string[] = [];
  const ownerChange = observedChange(
    state.identity,
    state.other,
    "value",
    ownerEvents,
  );
  equal(state.world.scalarSourceForChange(ownerChange.change)?.value, 40, "owner mismatch source fallback");
  equal(ownerEvents, ["identity", "identity", "owner", "owner", "site"], "owner mismatch order");

  const siteEvents: string[] = [];
  const siteChange = observedChange(
    state.identity,
    state.owner,
    "missing",
    siteEvents,
  );
  equal(state.world.versionForChange(siteChange.change), 0, "site mismatch version fallback");
  equal(siteEvents, ["identity", "identity", "owner", "site", "owner", "site"], "site mismatch order");
});

Deno.test("foreign, proxied, and malformed identities use the addressed fallback", () => {
  const target = addressedChange();
  const foreign = addressedChange();
  const proxyTraps: string[] = [];
  const proxied = new Proxy(target.identity, {
    get(_target, property) {
      proxyTraps.push(String(property));
      return undefined;
    },
  });
  const cases: Array<[unknown, string]> = [
    [foreign.identity, "foreign capability"],
    [proxied, "proxied capability"],
    [7, "malformed primitive"],
  ];
  for (const [identity, label] of cases) {
    const sourceEvents: string[] = [];
    const source = observedChange(identity, target.owner, "value", sourceEvents);
    equal(target.world.scalarSourceForChange(source.change)?.value, 2, `${label} source fallback`);
    equal(sourceEvents, ["identity", "identity", "owner", "site"], `${label} source order`);
    const versionEvents: string[] = [];
    const version = observedChange(identity, target.owner, "value", versionEvents);
    equal(target.world.versionForChange(version.change), 1, `${label} version fallback`);
    equal(versionEvents, ["identity", "identity", "owner", "site"], `${label} version order`);
  }
  equal(proxyTraps, [], "capability proxy property traps");
});

Deno.test("truthy identities are read twice and falsey identities once", () => {
  const state = addressedChange();
  let truthyReads = 0;
  const truthyEvents: string[] = [];
  const truthy = observedChange(state.identity, state.owner, "value", truthyEvents, {
    identity: (read) => {
      truthyReads = read;
      return state.identity;
    },
  });
  equal(state.world.versionForChange(truthy.change), 1, "truthy identity version");
  equal(truthyReads, 2, "truthy identity double read");

  let falseyReads = 0;
  const falseyEvents: string[] = [];
  const falsey = observedChange(state.identity, state.owner, "value", falseyEvents, {
    identity: (read) => {
      falseyReads = read;
      return null;
    },
  });
  equal(state.world.scalarSourceForChange(falsey.change)?.value, 2, "falsey fallback source");
  equal(falseyReads, 1, "falsey identity single read");
});

Deno.test("reentrant revocation keeps the cell captured before address getters", () => {
  for (const method of ["source", "version"] as const) {
    const state = addressedChange();
    let destroyed = false;
    let ownerReads = 0;
    const events: string[] = [];
    const wrapped = observedChange(state.identity, state.owner, "value", events, {
      owner: () => {
        ownerReads++;
        if (!destroyed) {
          destroyed = true;
          state.world.destroyOwner(state.owner);
          return state.owner;
        }
        return state.other;
      },
    });
    if (method === "source") {
      equal(state.world.scalarSourceForChange(wrapped.change), null, "source uses cleared captured cell");
    } else {
      equal(state.world.versionForChange(wrapped.change), 1, "version uses captured cell");
    }
    equal(events, ["identity", "identity", "owner", "site", "owner"], `${method} reentrant order`);
    equal(ownerReads, 2, `${method} reentrant owner reads`);
  }
});

Deno.test("destroyed owners still throw independently for both legacy lookup methods", () => {
  for (const method of ["source", "version"] as const) {
    const state = addressedChange();
    state.world.destroyOwner(state.owner);
    if (method === "source") {
      throwsNotAlive(
        () => state.world.scalarSourceForChange({
          owner: state.owner,
          site: "value",
          version: 1,
          cellIdentity: state.identity,
        }),
        "source lookup after destruction",
      );
    } else {
      throwsNotAlive(
        () => state.world.versionForChange({
          owner: state.owner,
          site: "value",
          version: 1,
          cellIdentity: state.identity,
        }),
        "version lookup after destruction",
      );
    }
  }
});
