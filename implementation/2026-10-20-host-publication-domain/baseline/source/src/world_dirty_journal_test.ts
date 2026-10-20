import { WorldDirtyJournal } from "./world_dirty_journal.ts";
import type { OwnerId, StateSiteId } from "./owner_state_world.ts";

const equal = (
  actual: unknown,
  expected: unknown,
  message = "Values differ",
) => {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `${message}: expected ${String(expected)}, received ${String(actual)}`,
    );
  }
};

const sameEntries = (
  journal: WorldDirtyJournal,
  expected: readonly (readonly [OwnerId, StateSiteId])[],
  label: string,
) => {
  const actual = [...journal.entries()];
  equal(actual.length, expected.length, `${label}: entry count`);
  for (let index = 0; index < expected.length; index++) {
    equal(actual[index][0], expected[index][0], `${label}: owner ${index}`);
    equal(actual[index][1], expected[index][1], `${label}: site ${index}`);
  }
};

Deno.test("site and owner reactivation append at their respective tails", () => {
  const journal = new WorldDirtyJournal();
  journal.mark(1, "a");
  journal.mark(2, "x");
  journal.mark(1, "b");
  sameEntries(journal, [[1, "a"], [1, "b"], [2, "x"]], "owner-major order");
  equal(journal.size, 2);
  equal(journal.has(1, "a"), true);
  equal(journal.has(3, "a"), false);

  journal.delete(1, "a");
  equal(journal.has(1, "a"), false);
  journal.mark(1, "a");
  sameEntries(journal, [[1, "b"], [1, "a"], [2, "x"]], "site reactivation");

  journal.delete(1, "b");
  journal.delete(1, "a");
  equal(journal.size, 1, "Empty owner left the active owner list");
  journal.mark(1, "c");
  sameEntries(journal, [[2, "x"], [1, "c"]], "owner reactivation");
  equal(journal.size, 2);
});

Deno.test("clear drains active work but retains reusable ordering metadata", () => {
  const journal = new WorldDirtyJournal();
  journal.mark(1, "a");
  journal.mark(2, "b");
  journal.clear();
  equal(journal.size, 0);
  sameEntries(journal, [], "clear");

  journal.mark(2, "b");
  journal.mark(1, "a");
  sameEntries(journal, [[2, "b"], [1, "a"]], "post-clear activation order");
});

Deno.test("removeOwner drops active and retained entries without affecting neighbors", () => {
  const journal = new WorldDirtyJournal();
  journal.mark(1, "a");
  journal.mark(2, "b");
  journal.mark(1, "c");
  journal.removeOwner(1);
  equal(journal.size, 1);
  sameEntries(journal, [[2, "b"]], "owner removal");

  journal.mark(1, "c");
  sameEntries(journal, [[2, "b"], [1, "c"]], "recreated owner bucket");
  journal.removeOwner(2);
  sameEntries(journal, [[1, "c"]], "unrelated owner removal");
});

type Reference = Map<OwnerId, Set<StateSiteId>>;

const referenceMark = (reference: Reference, owner: OwnerId, site: string) => {
  let sites = reference.get(owner);
  if (!sites) reference.set(owner, sites = new Set());
  sites.add(site);
};

const referenceDelete = (
  reference: Reference,
  owner: OwnerId,
  site: string,
) => {
  const sites = reference.get(owner);
  if (!sites) return;
  sites.delete(site);
  if (sites.size === 0) reference.delete(owner);
};

const referenceEntries = (reference: Reference) =>
  [...reference].flatMap(([owner, sites]) =>
    [...sites].map((site) => [owner, site] as const)
  );

Deno.test("deterministic operation sequence matches nested Map/Set parity", () => {
  const journal = new WorldDirtyJournal();
  const reference: Reference = new Map();
  let randomState = 0x6d2b79f5;
  const random = () => {
    randomState =
      (Math.imul(randomState ^ randomState >>> 15, 1 | randomState) +
        0x6d2b79f5) | 0;
    randomState ^= randomState +
      Math.imul(randomState ^ randomState >>> 7, 61 | randomState);
    return ((randomState ^ randomState >>> 14) >>> 0) / 0x1_0000_0000;
  };

  for (let step = 0; step < 600; step++) {
    const owner = 1 + Math.floor(random() * 6);
    const site = `s${Math.floor(random() * 5)}`;
    const operation = Math.floor(random() * 10);
    if (operation < 6) {
      journal.mark(owner, site);
      referenceMark(reference, owner, site);
    } else if (operation < 9) {
      journal.delete(owner, site);
      referenceDelete(reference, owner, site);
    } else if (operation === 9 && step % 5 === 0) {
      journal.clear();
      reference.clear();
    } else {
      journal.removeOwner(owner);
      reference.delete(owner);
    }
    sameEntries(journal, referenceEntries(reference), `step ${step}`);
    equal(journal.size, reference.size, `step ${step}: active owners`);
    for (let checkOwner = 1; checkOwner <= 6; checkOwner++) {
      for (let checkSite = 0; checkSite < 5; checkSite++) {
        equal(
          journal.has(checkOwner, `s${checkSite}`),
          reference.get(checkOwner)?.has(`s${checkSite}`) ?? false,
          `step ${step}: membership ${checkOwner}/s${checkSite}`,
        );
      }
    }
  }
});
