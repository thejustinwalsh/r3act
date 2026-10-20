import { assertEquals } from "jsr:@std/assert";
import { PendingStateChanges } from "./pending_state_changes.ts";
import type { StateChange } from "./owner_state_world.ts";

const change = (owner: number, site: string, version: number): StateChange => ({
  owner,
  site,
  version,
});

Deno.test("pending changes expose current values in insertion order", () => {
  const pending = new PendingStateChanges();
  const first = change(1, "a", 1);
  const second = change(2, "a", 1);
  const third = change(1, "b", 1);
  pending.set(first);
  pending.set(second);
  pending.set(third);

  assertEquals(pending.size, 3);
  assertEquals([...pending.values()], [first, second, third]);
});

Deno.test("repeated writes coalesce without changing insertion order", () => {
  const pending = new PendingStateChanges();
  const first = change(1, "a", 1);
  const other = change(2, "a", 1);
  const latest = change(1, "a", 2);
  pending.set(first);
  pending.set(other);
  pending.set(latest);

  assertEquals(pending.size, 2);
  assertEquals([...pending.values()], [latest, other]);
});

Deno.test("different owners and unusual site strings remain distinct", () => {
  const pending = new PendingStateChanges();
  const entries = [
    change(1, "2\u0000site", 1),
    change(1, "site", 1),
    change(12, "site", 1),
    change(1, "", 1),
  ];
  for (const entry of entries) pending.set(entry);
  assertEquals(pending.size, entries.length);
  assertEquals([...pending.values()], entries);
});

Deno.test("clearThrough only removes entries at or below captured versions", () => {
  const pending = new PendingStateChanges();
  const oldA = change(1, "a", 1);
  const oldB = change(1, "b", 1);
  pending.set(oldA);
  pending.set(oldB);

  const newerA = change(1, "a", 2);
  pending.set(newerA);
  pending.clearThrough([oldA, oldB, change(9, "absent", 20)]);

  assertEquals(pending.size, 1);
  assertEquals([...pending.values()], [newerA]);
});

Deno.test("a write after a captured clear is preserved", () => {
  const pending = new PendingStateChanges();
  const captured = change(5, "count", 4);
  pending.set(captured);
  const reentrant = change(5, "count", 5);
  pending.set(reentrant);
  pending.clearThrough([captured]);
  assertEquals([...pending.values()], [reentrant]);
});

Deno.test("cleared identities are reused without moving pending entries", () => {
  const pending = new PendingStateChanges();
  const a = change(1, "a", 1);
  const b = change(1, "b", 1);
  pending.set(a);
  pending.set(b);
  pending.clearThrough([a]);
  const aAgain = change(1, "a", 2);
  pending.set(aAgain);

  assertEquals([...pending.values()], [b, aAgain]);
});

Deno.test("dropOwner removes that owner's entries and permits clean reuse", () => {
  const pending = new PendingStateChanges();
  const oldOwned = change(3, "site", 1);
  const other = change(4, "site", 1);
  pending.set(oldOwned);
  pending.set(other);
  pending.dropOwner(3);
  assertEquals([...pending.values()], [other]);

  const reused = change(3, "site", 2);
  pending.set(reused);
  assertEquals([...pending.values()], [other, reused]);
});

Deno.test("clear removes pending changes and cached identities", () => {
  const pending = new PendingStateChanges();
  pending.set(change(1, "site", 1));
  pending.clear();
  assertEquals(pending.size, 0);
  assertEquals([...pending.values()], []);

  const afterClear = change(1, "site", 2);
  pending.set(afterClear);
  assertEquals([...pending.values()], [afterClear]);
});
