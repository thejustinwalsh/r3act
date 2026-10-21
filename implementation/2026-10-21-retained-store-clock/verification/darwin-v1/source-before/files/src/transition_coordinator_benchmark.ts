import { TransitionCoordinator } from "./transition_coordinator.ts";

type Arm = "indexedCoordinator" | "scanOnEveryResolve";

type Pair = {
  pair: number;
  order: Arm[];
  indexedCoordinatorMs: number;
  scanOnEveryResolveMs: number;
  repeats: number;
  parity: boolean;
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const nearestRank = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};

const randomFor = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
};

const makeOrders = (pairCount: number, seed: number): Arm[][] => {
  const orders = Array.from({ length: pairCount }, (_, index): Arm[] =>
    index % 2 === 0
      ? ["indexedCoordinator", "scanOnEveryResolve"]
      : ["scanOnEveryResolve", "indexedCoordinator"]
  );
  const random = randomFor(seed);
  for (let i = orders.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [orders[i], orders[j]] = [orders[j], orders[i]];
  }
  return orders;
};

const runIndexedCoordinator = (rootCount: number, transitionRepeats: number) => {
  const roots = Array.from({ length: rootCount }, (_, index) => `root-${index}`);
  const versions = new Map(roots.map((root) => [root, 0]));
  let commitCount = 0;
  const coordinator = new TransitionCoordinator<{ epoch: number }>(versions, (batch) => {
    commitCount += batch.length;
  });
  const start = performance.now();
  for (let epoch = 0; epoch < transitionRepeats; epoch++) {
    const candidateRoots = roots.map((rootId) => ({
      rootId,
      baseVersion: epoch,
      targetVersion: epoch + 1,
      snapshot: { epoch: epoch + 1 },
      pendingResources: [`${rootId}:${epoch}`],
    }));
    const begun = coordinator.begin(candidateRoots);
    if (begun.status !== "pending") throw new Error("Coordinator did not enter pending state");
    const generation = coordinator.generation;
    for (const rootId of roots) coordinator.resolve(generation, `${rootId}:${epoch}`);
  }
  const elapsedMs = performance.now() - start;
  const finalVersionsMatch = roots.every((root) => coordinator.getVersion(root) === transitionRepeats);
  return { elapsedMs, commitCount, finalVersionsMatch };
};

/**
 * Reference with identical root/resource/version work, but validating every
 * outstanding root's generation on each resource completion. This represents
 * the straightforward full-scan alternative to the coordinator's index.
 */
const runScanReference = (rootCount: number, transitionRepeats: number) => {
  const roots = Array.from({ length: rootCount }, (_, index) => `root-${index}`);
  const versions = new Map(roots.map((root) => [root, 0]));
  let commitCount = 0;
  const start = performance.now();
  for (let epoch = 0; epoch < transitionRepeats; epoch++) {
    const generation = epoch + 1;
    const rootGenerations = new Map(roots.map((root) => [root, generation]));
    const pending = new Set(roots.map((root) => `${root}:${epoch}`));
    const candidates = roots.map((rootId) => ({ rootId, targetVersion: epoch + 1 }));
    for (const rootId of roots) {
      for (const root of roots) {
        if (rootGenerations.get(root) !== generation) throw new Error("Scan baseline saw stale root");
      }
      if (!pending.delete(`${rootId}:${epoch}`)) throw new Error("Scan baseline missed resource completion");
    }
    if (pending.size === 0) {
      for (const root of candidates) versions.set(root.rootId, root.targetVersion);
      commitCount += candidates.length;
    }
  }
  const elapsedMs = performance.now() - start;
  const finalVersionsMatch = roots.every((root) => versions.get(root) === transitionRepeats);
  return { elapsedMs, commitCount, finalVersionsMatch };
};

export const runTransitionCoordinatorBenchmark = (
  seed = 0x71a45,
  pairCount = 17,
  warmupPairs = 2,
  transitionRepeats = 4,
) => {
  const rootCounts = [1, 16, 64, 256, 1024];
  const pairs: Array<{ rootCount: number; pair: Pair }> = [];
  for (const rootCount of rootCounts) {
    for (const warmupOrder of makeOrders(warmupPairs, seed ^ rootCount)) {
      for (const arm of warmupOrder) {
        if (arm === "indexedCoordinator") runIndexedCoordinator(rootCount, transitionRepeats);
        else runScanReference(rootCount, transitionRepeats);
      }
    }
    const orders = makeOrders(pairCount, seed ^ (rootCount * 17));
    for (let pair = 0; pair < pairCount; pair++) {
      const result: Record<Arm, ReturnType<typeof runIndexedCoordinator>> = {
        indexedCoordinator: { elapsedMs: 0, commitCount: 0, finalVersionsMatch: false },
        scanOnEveryResolve: { elapsedMs: 0, commitCount: 0, finalVersionsMatch: false },
      };
      for (const arm of orders[pair]) {
        result[arm] = arm === "indexedCoordinator"
          ? runIndexedCoordinator(rootCount, transitionRepeats)
          : runScanReference(rootCount, transitionRepeats);
      }
      const parity =
        result.indexedCoordinator.commitCount === result.scanOnEveryResolve.commitCount &&
        result.indexedCoordinator.finalVersionsMatch && result.scanOnEveryResolve.finalVersionsMatch;
      if (!parity) throw new Error(`Coordinator/reference parity failed at ${rootCount} roots`);
      pairs.push({
        rootCount,
        pair: {
          pair,
          order: orders[pair],
          indexedCoordinatorMs: result.indexedCoordinator.elapsedMs,
          scanOnEveryResolveMs: result.scanOnEveryResolve.elapsedMs,
          repeats: transitionRepeats,
          parity,
        },
      });
    }
  }

  const summaries = rootCounts.map((rootCount) => {
    const conditionPairs = pairs.filter((entry) => entry.rootCount === rootCount).map((entry) => entry.pair);
    const indexed = conditionPairs.map((pair) => pair.indexedCoordinatorMs);
    const scanned = conditionPairs.map((pair) => pair.scanOnEveryResolveMs);
    return {
      rootCount,
      pairCount: conditionPairs.length,
      indexedCoordinator: { medianMs: median(indexed), p95Ms: nearestRank(indexed, 0.95) },
      scanOnEveryResolve: { medianMs: median(scanned), p95Ms: nearestRank(scanned, 0.95) },
      scanOverIndexedMedianRatio: median(scanned) / median(indexed),
      wins: {
        indexedCoordinator: conditionPairs.filter((pair) => pair.indexedCoordinatorMs < pair.scanOnEveryResolveMs).length,
        scanOnEveryResolve: conditionPairs.filter((pair) => pair.scanOnEveryResolveMs < pair.indexedCoordinatorMs).length,
        ties: conditionPairs.filter((pair) => pair.scanOnEveryResolveMs === pair.indexedCoordinatorMs).length,
      },
    };
  });

  return {
    schemaVersion: "transition-coordinator-fanin-benchmark-v1",
    runtime: {
      deno: Deno.version.deno,
      v8: Deno.version.v8,
      os: Deno.build.os,
      arch: Deno.build.arch,
      hardwareConcurrency: typeof navigator === "undefined" ? null : navigator.hardwareConcurrency,
    },
    protocol: {
      seed,
      pairCount,
      warmupPairs,
      transitionRepeats,
      rootCounts,
      timedResourceCompletions: rootCounts.reduce((sum, count) => sum + count * transitionRepeats * pairCount, 0),
      statistic: "Within each root-count condition, median is the middle paired-run sample; p95 is nearest-rank across paired runs.",
      timedWork: "begin and resolve all one-resource-per-root candidates, including final root-group commit; setup and candidate creation included.",
      limitations: [
        "JavaScript scheduler bookkeeping only; no VDOM construction, DOM patches, actual effect work, or async waiting is timed.",
        "The scan reference deliberately checks every root generation on each completion; it is not a React comparison.",
        "Small conditions may be near the performance timer floor; interpret scaling and large fan-in more than tiny absolute differences.",
      ],
    },
    summaries,
    pairs,
  };
};
