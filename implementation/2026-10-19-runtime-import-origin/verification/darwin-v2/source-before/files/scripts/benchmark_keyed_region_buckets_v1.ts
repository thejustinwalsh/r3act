import { KeyedRegionBuckets, type KeyedRegionEntry } from "../src/keyed_region_buckets.ts";

const sizes = [1_000, 10_000, 50_000];
const localities = ["head", "middle", "tail"] as const;
const capacities = [32, 64, 128, 256];
const operationsPerSample = 64;
const warmups = 2;
const measuredSamples = 7;
const seed = 247119;
const outputPath = "results/keyed-region-buckets-v1.json";

type Locality = typeof localities[number];
type Move = { key: string; before: string };
type ArmOrder =
  | { arm: "flat-array"; bucketCapacity: null }
  | { arm: "bucketed"; bucketCapacity: number };
type Sample = {
  size: number;
  locality: Locality;
  arm: "flat-array" | "bucketed";
  bucketCapacity: number | null;
  sample: number;
  elapsedMs: number;
  comparisons?: number;
  rowShifts?: number;
  bucketSlotReads?: number;
  bucketSlotWrites?: number;
  splits?: number;
  merges?: number;
  bucketCount?: number;
};

const keyOf = (index: number) => `row-${index.toString().padStart(6, "0")}`;
const entriesFor = (size: number): KeyedRegionEntry<number>[] =>
  Array.from({ length: size }, (_, index) => ({ key: keyOf(index), value: index }));

function movesFor(size: number, locality: Locality): Move[] {
  let first: number;
  let anchor: number;
  if (locality === "head") {
    first = 80;
    anchor = 20;
  } else if (locality === "middle") {
    first = Math.floor(size / 2) - Math.ceil(operationsPerSample / 2);
    anchor = Math.floor(size / 2) + 80;
  } else {
    first = size - operationsPerSample - 80;
    anchor = size - 20;
  }
  return Array.from({ length: operationsPerSample }, (_, index) => ({
    key: keyOf(first + index),
    before: keyOf(anchor),
  }));
}

function makeRng(initialSeed: number) {
  let state = initialSeed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
}

const rng = makeRng(seed);
function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rng() % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function runArray(initial: KeyedRegionEntry<number>[], moves: Move[]) {
  const rows = initial.map((entry) => ({ ...entry }));
  let comparisons = 0;
  let rowShifts = 0;
  const started = performance.now();
  for (const move of moves) {
    let from = -1;
    for (let index = 0; index < rows.length; index++) {
      comparisons++;
      if (rows[index].key === move.key) {
        from = index;
        break;
      }
    }
    if (from < 0) throw new Error(`Missing array key ${move.key}`);
    const [entry] = rows.splice(from, 1);
    rowShifts += rows.length - from;
    let before = -1;
    for (let index = 0; index < rows.length; index++) {
      comparisons++;
      if (rows[index].key === move.before) {
        before = index;
        break;
      }
    }
    if (before < 0) throw new Error(`Missing array anchor ${move.before}`);
    rows.splice(before, 0, entry);
    rowShifts += rows.length - before - 1;
  }
  return { rows, elapsedMs: performance.now() - started, comparisons, rowShifts };
}

function runBucketed(
  initial: KeyedRegionEntry<number>[],
  moves: Move[],
  bucketCapacity: number,
) {
  const rows = new KeyedRegionBuckets(initial, bucketCapacity);
  rows.resetStats();
  const started = performance.now();
  for (const move of moves) rows.moveBefore(move.key, move.before);
  const elapsedMs = performance.now() - started;
  rows.assertIntegrity();
  return { rows: [...rows.entries()], elapsedMs, stats: rows.stats() };
}

function sameOrder(
  a: readonly KeyedRegionEntry<number>[],
  b: readonly KeyedRegionEntry<number>[],
) {
  return a.length === b.length && a.every((entry, index) =>
    entry.key === b[index].key && entry.value === b[index].value
  );
}

const samples: Sample[] = [];
for (const size of sizes) {
  const initial = entriesFor(size);
  for (const locality of localities) {
    const moves = movesFor(size, locality);
    const expected = runArray(initial, moves).rows;
    const armOrders = Array.from({ length: warmups + measuredSamples }, (_, sample) =>
      shuffled<ArmOrder>([
        ...capacities.map((bucketCapacity): ArmOrder => ({
          arm: "bucketed",
          bucketCapacity,
        })),
        { arm: "flat-array", bucketCapacity: null },
      ])
    );
    for (let sample = 0; sample < warmups + measuredSamples; sample++) {
      for (const arm of armOrders[sample]) {
        if (arm.arm === "flat-array") {
          const result = runArray(initial, moves);
          if (!sameOrder(expected, result.rows)) {
            throw new Error(`Flat-array output mismatch at ${size}/${locality}`);
          }
          if (sample >= warmups) {
            samples.push({
              size,
              locality,
              arm: arm.arm,
              bucketCapacity: null,
              sample: sample - warmups,
              elapsedMs: result.elapsedMs,
              comparisons: result.comparisons,
              rowShifts: result.rowShifts,
            });
          }
        } else {
          const result = runBucketed(initial, moves, arm.bucketCapacity);
          const actual = result.rows;
          if (!sameOrder(expected, actual)) {
            throw new Error(
              `Bucketed output mismatch at ${size}/${locality}/B${arm.bucketCapacity}`,
            );
          }
          if (sample >= warmups) {
            samples.push({
              size,
              locality,
              arm: arm.arm,
              bucketCapacity: arm.bucketCapacity,
              sample: sample - warmups,
              elapsedMs: result.elapsedMs,
              bucketSlotReads: result.stats.bucketSlotReads,
              bucketSlotWrites: result.stats.bucketSlotWrites,
              splits: result.stats.splits,
              merges: result.stats.merges,
              bucketCount: result.stats.bucketCount,
            });
          }
        }
      }
    }
  }
}

await Deno.mkdir("results", { recursive: true });
await Deno.writeTextFile(outputPath, JSON.stringify({
  study: "keyed-region-buckets-v1",
  collectedAt: new Date().toISOString(),
  deno: Deno.version,
  platform: `${Deno.build.os}-${Deno.build.arch}`,
  seed,
  sizes,
  localities,
  capacities,
  operationsPerSample,
  warmups,
  measuredSamples,
  samples,
}, null, 2) + "\n");
console.log(`Wrote ${samples.length} samples to ${outputPath}`);
