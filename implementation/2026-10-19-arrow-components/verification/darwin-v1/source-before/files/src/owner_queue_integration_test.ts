import { assertEquals } from "jsr:@std/assert";
import { type OwnerPreparation, OwnerStateWorld } from "./owner_state_world.ts";
import { RootWorkQueue } from "./root_work_queue.ts";

Deno.test("queue detects numeric read staleness without a host version change", () => {
  const world = new OwnerStateWorld();
  const root = world.resolveOwner(null, "root");
  const counter = world.resolveOwner(root, "Counter");
  const [, set] = world.useState(counter, "count", 0);
  const queue = new RootWorkQueue<{ prep: OwnerPreparation; value: number }>(
    new Map([["root", 0]]),
  );
  let attempts = 0, discarded = 0, published = -1;
  const handle = queue.enqueue({
    id: "numeric",
    roots: ["root"],
    prepare: ({ versions, attempt }) => {
      attempts++;
      const prep = world.beginPreparation();
      const [value] = prep.useState(counter, "count", 99);
      const baseVersion = versions.get("root")!;
      return [{
        rootId: "root",
        baseVersion,
        targetVersion: baseVersion + 1,
        value: { prep, value },
        validate: () => {
          if (attempt === 0) set(7);
          return prep.validate();
        },
      }];
    },
    discard: ({ value }) => {
      discarded++;
      value.prep.discard();
    },
    commit: ([candidate]) => {
      candidate.value.prep.publish();
      published = candidate.value.value;
    },
  });
  assertEquals(handle.status, "committed");
  assertEquals([attempts, discarded, published, queue.getVersion("root")], [
    2,
    1,
    7,
    1,
  ]);
});

Deno.test("group effects observe both owner publications and advanced queue versions", () => {
  const world = new OwnerStateWorld();
  const parents = new Map([["left", world.resolveOwner(null, "left")], [
    "right",
    world.resolveOwner(null, "right"),
  ]]);
  const queue = new RootWorkQueue<{ prep: OwnerPreparation; owner: number }>(
    new Map([["left", 0], ["right", 0]]),
  );
  let effects = 0;
  const handle = queue.enqueue({
    id: "group",
    roots: ["left", "right"],
    prepare: ({ versions }) =>
      [...parents].map(([rootId, parent]) => {
        const prep = world.beginPreparation();
        const owner = prep.resolveOwner(parent, "Child");
        prep.useState(owner, "value", rootId);
        const baseVersion = versions.get(rootId)!;
        return {
          rootId,
          baseVersion,
          targetVersion: baseVersion + 1,
          value: { prep, owner },
          validate: () => prep.validate(),
        };
      }),
    commit: (candidates) => {
      for (const candidate of candidates) candidate.value.prep.publish();
    },
    discard: ({ value }) => value.prep.discard(),
    afterCommit: (candidates) => {
      effects++;
      for (const candidate of candidates) {
        assertEquals(
          world.findOwner(parents.get(candidate.rootId)!, "Child"),
          candidate.value.owner,
        );
        assertEquals(
          world.useState(candidate.value.owner, "value", "bad")[0],
          candidate.rootId,
        );
        assertEquals(queue.getVersion(candidate.rootId), 1);
      }
    },
  });
  assertEquals(handle.status, "committed");
  assertEquals(effects, 1);
});

Deno.test("reentrant root detachment discards private owner cells before notification", () => {
  const world = new OwnerStateWorld();
  const root = world.resolveOwner(null, "root");
  const queue = new RootWorkQueue<OwnerPreparation>(new Map([["root", 0]]));
  let privateOwner = 0;
  let setter: (value: number) => boolean = () => {
    throw new Error("not initialized");
  };
  let effects = 0, observed = false;
  const handle = queue.enqueue({
    id: "detach",
    roots: ["root"],
    prepare: ({ versions }) => {
      const prep = world.beginPreparation();
      privateOwner = prep.resolveOwner(root, "PendingChild");
      [, setter] = prep.useState(privateOwner, "count", 1);
      return [{
        rootId: "root",
        baseVersion: versions.get("root")!,
        targetVersion: 1,
        value: prep,
        validate: () => {
          queue.detachRoot("root");
          return prep.validate();
        },
      }];
    },
    discard: ({ value }) => value.discard(),
    commit: () => {
      throw new Error("Detached work committed");
    },
    afterCommit: () => {
      effects++;
    },
    onSettled: () => {
      observed = !world.isAlive(privateOwner) && !setter(8);
    },
  });
  assertEquals(handle.status, "cancelled");
  assertEquals(observed, true);
  assertEquals(effects, 0);
  assertEquals(world.findOwner(root, "PendingChild"), undefined);
});
