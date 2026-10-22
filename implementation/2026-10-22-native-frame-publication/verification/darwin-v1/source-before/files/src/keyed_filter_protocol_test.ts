import { createGateAStudySchedule, parseGateAAutoRun } from "./keyed_filter_protocol.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("Gate A autorun stays disabled for ordinary interactive URLs", () => {
  assert(parseGateAAutoRun("?count=1000").kind === "disabled", "manual page should not autorun");
});

Deno.test("Gate A autorun accepts one deterministic size, seed, and session", () => {
  const result = parseGateAAutoRun("?autorun=1&count=5000&seed=520004&session=gate-a-session-2");
  assert(result.kind === "ready", "complete study URL should be accepted");
  if (result.kind !== "ready") return;
  assert(result.count === 5000, "row count should match the URL");
  assert(result.seed === 520004, "seed should match the URL");
  assert(result.sessionId === "gate-a-session-2", "session label should match the URL");
});

Deno.test("Gate A autorun rejects incomplete or invalid study URLs", () => {
  const cases = [
    "?autorun=1&seed=1&session=s1",
    "?autorun=1&count=3000&seed=1&session=s1",
    "?autorun=1&count=1000&seed=0&session=s1",
    "?autorun=1&count=1000&seed=4294967296&session=s1",
    "?autorun=1&count=1000&seed=1.5&session=s1",
    "?autorun=1&count=1000&seed=1&session=%20%20",
  ];
  for (const search of cases) {
    assert(parseGateAAutoRun(search).kind === "invalid", `expected invalid URL: ${search}`);
  }
});

Deno.test("Gate A schedule has six one-size page loads per size across two balanced sessions", () => {
  const schedule = createGateAStudySchedule(["session-1", "session-2"], 610001);
  assert(schedule.length === 18, "schedule should contain 18 page loads");
  for (const count of [1000, 5000, 10000]) {
    assert(schedule.filter((run) => run.count === count).length === 6, `${count} should have six independent page loads`);
  }
  for (const sessionId of ["session-1", "session-2"]) {
    const session = schedule.filter((run) => run.sessionId === sessionId);
    assert(session.length === 9, `${sessionId} should contain three blocks of three sizes`);
    for (const count of [1000, 5000, 10000]) {
      assert(session.filter((run) => run.count === count).length === 3, `${sessionId} should have three runs at ${count}`);
    }
    for (let block = 0; block < 3; block++) {
      const order = session.filter((run) => run.block === block + 1).map((run) => run.count);
      const expected = [[1000, 5000, 10000], [5000, 10000, 1000], [10000, 1000, 5000]][block];
      assert(order.join(",") === expected.join(","), `${sessionId} block ${block + 1} should use the preregistered rotation`);
    }
  }
  assert(new Set(schedule.map((run) => run.seed)).size === 18, "every page load should have a unique seed");
});
