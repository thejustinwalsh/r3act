import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { PendingStateChanges } from "./pending_state_changes.ts";
import type { StateCellHandle, StateChange } from "./owner_state_world.ts";

const handle = (
  owner: number,
  site: string,
  cellIdentity: object,
): StateCellHandle => ({ owner, site, cellIdentity });

const fields = (changes: Iterable<StateChange>) =>
  [...changes].map(({ owner, site, version }) => [owner, site, version]);

Deno.test("native cell writes coalesce to the maximum version and keep queue order", () => {
  const pending = new PendingStateChanges();
  const a = handle(1, "a", {});
  const b = handle(2, "b", {});
  pending.setCell(a, 4);
  pending.setCell(b, 1);
  pending.setCell(a, 3); // A delayed outer notification cannot regress the version.
  assertEquals(pending.size, 2);
  assertEquals(fields(pending.values()), [[1, "a", 4], [2, "b", 1]]);
});

Deno.test("native values captures are independent fresh records", () => {
  const pending = new PendingStateChanges();
  const identity = {};
  pending.setCell(handle(3, "value", identity), 1);
  const older = [...pending.values()];
  const olderRecord = older[0];
  pending.setCell(handle(3, "value", identity), 2);
  const newer = [...pending.values()];
  assertEquals(olderRecord.version, 1);
  assertEquals(newer[0].version, 2);
  assertNotEquals(olderRecord, newer[0]);
  if (newer[0].cellIdentity !== identity) throw new Error("Identity changed");
  assertEquals(pending.capture()[0].version, 2);
});

Deno.test("a new cell identity at an address starts a new version sequence", () => {
  const pending = new PendingStateChanges();
  pending.setCell(handle(5, "replaced", {}), 20);
  pending.setCell(handle(5, "replaced", {}), 1);
  assertEquals(fields(pending.capture()), [[5, "replaced", 1]]);
});

Deno.test("acknowledging an older native capture preserves newer pending version", () => {
  const pending = new PendingStateChanges();
  const id = {};
  pending.setCell(handle(4, "counter", id), 10);
  const captured = [...pending.values()];
  pending.setCell(handle(4, "counter", id), 11);
  pending.clearThrough(captured);
  assertEquals(fields(pending.values()), [[4, "counter", 11]]);
  pending.clearThrough([...pending.values()]);
  assertEquals(pending.size, 0);
});

Deno.test("cleared cells re-enter at the tail and preserve other pending order", () => {
  const pending = new PendingStateChanges();
  const a = handle(1, "a", {});
  const b = handle(1, "b", {});
  pending.setCell(a, 1);
  pending.setCell(b, 1);
  pending.clearThrough([...pending.values()].slice(0, 1));
  pending.setCell(a, 2);
  assertEquals(fields(pending.values()), [[1, "b", 1], [1, "a", 2]]);
});

Deno.test("foreign reused identities and misaddressed handles stay address-safe", () => {
  const pending = new PendingStateChanges();
  const identity = {};
  pending.setCell(handle(1, "a", identity), 1);
  pending.setCell(handle(2, "a", identity), 2);
  pending.setCell(handle(1, "b", identity), 3);
  assertEquals(fields(pending.values()), [
    [1, "a", 1],
    [2, "a", 2],
    [1, "b", 3],
  ]);
  pending.clearThrough([{
    owner: 1,
    site: "a",
    version: 1,
    cellIdentity: identity,
  }]);
  assertEquals(fields(pending.values()), [[2, "a", 2], [1, "b", 3]]);
});

Deno.test("owner drop and clear release queued data and allow identity reuse", () => {
  const pending = new PendingStateChanges();
  const identity = {};
  const previous = handle(8, "value", identity);
  pending.setCell(previous, 5);
  pending.dropOwner(8);
  assertEquals(pending.size, 0);
  pending.setCell(previous, 6);
  assertEquals(fields(pending.values()), [[8, "value", 6]]);
  pending.clear();
  assertEquals(pending.size, 0);
  pending.setCell(previous, 7);
  assertEquals(fields(pending.values()), [[8, "value", 7]]);
});

Deno.test("legacy set keeps caller records and arrival semantics beside cell entries", () => {
  const pending = new PendingStateChanges();
  const legacy: StateChange = { owner: 1, site: "legacy", version: 5 };
  const later: StateChange = { owner: 1, site: "legacy", version: 2 };
  const native = handle(2, "native", {});
  pending.set(legacy);
  pending.setCell(native, 7);
  pending.set(later);
  const values = [...pending.values()];
  if (values[0] !== later) throw new Error("Legacy record was copied");
  assertEquals(values[1].version, 7);
});
