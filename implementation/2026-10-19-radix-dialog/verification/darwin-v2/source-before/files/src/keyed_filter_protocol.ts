export const GATE_A_SIZES = [1000, 5000, 10000] as const;
export type GateASize = typeof GATE_A_SIZES[number];

export type GateAAutoRun =
  | { kind: "disabled" }
  | { kind: "invalid"; message: string }
  | { kind: "ready"; count: GateASize; seed: number; sessionId: string };

export type GateAStudyRun = {
  sessionId: string;
  block: 1 | 2 | 3;
  count: GateASize;
  seed: number;
  url: string;
};

/** Build the preregistered 18-page collection schedule with unique seeds. */
export function createGateAStudySchedule(
  sessionIds: readonly [string, string],
  firstSeed: number,
  pagePath = "keyed-filter-benchmark.html",
): GateAStudyRun[] {
  const [firstSession, secondSession] = sessionIds.map((session) => session.trim());
  if (!firstSession || !secondSession || firstSession === secondSession) {
    throw new RangeError("Gate A needs two distinct, non-empty session labels");
  }
  if (!Number.isSafeInteger(firstSeed) || firstSeed < 1 || firstSeed + 17 > 0xffff_ffff) {
    throw new RangeError("firstSeed must leave room for 18 unique uint32 seeds");
  }

  const blockOrders: readonly (readonly GateASize[])[] = [
    [1000, 5000, 10000],
    [5000, 10000, 1000],
    [10000, 1000, 5000],
  ];
  const runs: GateAStudyRun[] = [];
  let seed = firstSeed;
  for (const sessionId of [firstSession, secondSession]) {
    for (let block = 0; block < blockOrders.length; block++) {
      for (const count of blockOrders[block]) {
        const params = new URLSearchParams({
          autorun: "1",
          count: String(count),
          seed: String(seed),
          session: sessionId,
        });
        runs.push({
          sessionId,
          block: (block + 1) as 1 | 2 | 3,
          count,
          seed,
          url: `${pagePath}?${params.toString()}`,
        });
        seed++;
      }
    }
  }
  return runs;
}

/** Parse a reproducible, one-size-per-page Gate A study URL. */
export function parseGateAAutoRun(search: string): GateAAutoRun {
  const params = new URLSearchParams(search);
  if (params.get("autorun") !== "1") return { kind: "disabled" };

  const countValue = params.get("count");
  if (!GATE_A_SIZES.some((size) => String(size) === countValue)) {
    return { kind: "invalid", message: "count must be 1000, 5000, or 10000" };
  }

  const seedValue = params.get("seed");
  if (!seedValue || !/^\d+$/.test(seedValue)) {
    return { kind: "invalid", message: "seed must be an integer from 1 to 4294967295" };
  }
  const seed = Number(seedValue);
  if (!Number.isSafeInteger(seed) || seed < 1 || seed > 0xffff_ffff) {
    return { kind: "invalid", message: "seed must be an integer from 1 to 4294967295" };
  }

  const sessionId = params.get("session")?.trim();
  if (!sessionId) return { kind: "invalid", message: "session must be a non-empty label" };

  return { kind: "ready", count: Number(countValue) as GateASize, seed, sessionId };
}
