const seeds = [83003001, 83003002, 83003003, 83003004, 83003005];
const url = (seed: number) =>
  `https://react-runtime-index.localhost:1355/component-state-index-benchmark.html?autorun=1&seed=${seed}`;
const preregistration = {
  schemaVersion: "component-state-structural-index-preregistration-v1",
  status: "FROZEN_BEFORE_COLLECTION",
  frozenAt: new Date().toISOString(),
  question:
    "Does delta key-index maintenance improve end-to-end keyed structural updates when keyed child components own local state, compared with the prior subtree-rescan algorithm in the same compiled component-state runtime?",
  hypotheses: {
    primary:
      "Delta key-index maintenance will reduce within-page median update time relative to subtree rescanning for rotate, edge replacement, and each direction of half filtering.",
    contextual:
      "React + Compiler provides a same-page contextual comparison; it is not the causal contrast because the runtime algorithms differ only within the runtime arms.",
  },
  design: {
    arms: ["react", "rebuild", "delta"],
    count: 10000,
    warmupPairsPerOperation: 8,
    measuredPairsPerOperation: 24,
    operations: ["rotate", "replace-edge", "filter-half"],
    filterDirections: ["shrink", "restore"],
    armOrder:
      "Eight warmup pairs execute first in seeded shuffled order. The 24 measured pairs execute afterward in a separate seeded shuffle; the six arm permutations occur exactly four times each among measured pairs. Raw pair order is archived.",
    warmupOrder:
      "Eight warmup pairs precede all measured pairs; warmups are never interleaved with the measured phase.",
    measurement:
      "Click through commit completion: React flushSync; runtime arms include the scheduled microtask commit. Mount and teardown are timed separately once per arm and operation.",
    replicationUnit:
      "Fresh visible browser page; update samples within a page are repeated measures, not independent replications.",
    pageReplications: seeds.length,
    seeds,
    browserProfile:
      "One Chrome MacIntel profile and one device; environment recorded by each page.",
  },
  primaryEndpoints: [
    "Within-page median paired difference and ratio for rebuild versus delta, by operation; filter samples additionally stratified by explicit direction.",
    "Number of pages where delta has a lower within-page median for each operation and filter direction.",
  ],
  secondaryEndpoints: [
    "React context median and p95 update times.",
    "Per-arm update p95, mount, and teardown time.",
    "Combined mount + 24 updates + teardown per arm, reported descriptively with no exclusions.",
  ],
  contracts: [
    "All three arms produce identical ordered rows and selected-state output after every pair.",
    "Retained keys preserve host identity; removed keys detach; reinserted keys receive fresh host identity and initial local state.",
    "Every page is visible, uses 10,000 rows, and records 8 warmups plus 24 measured pairs for each operation.",
    "All six arm orders appear exactly four times in each 24-pair measured operation schedule; warmups run first; no performance-based exclusion.",
  ],
  limitations: [
    "One browser/device profile and five page replications do not establish hardware or browser generality.",
    "The measurement ends at synchronous DOM commit and excludes layout, paint, and display presentation.",
    "Mount and teardown have one timing observation per arm and operation; lifecycle totals are descriptive.",
    "This isolates keyed index maintenance inside a stateful owner benchmark but does not represent a complete application.",
  ],
  urls: seeds.map(url),
  amendments: [{
    id: "AMD-1",
    status: "FROZEN_BEFORE_SCHEDULED_COLLECTION",
    amendedAt: new Date().toISOString(),
    issue:
      "The initial browser harness shuffled all 32 pairs together and then classified samples by pair label, so warmups were interleaved with measured updates and the measured filter directions could be unbalanced.",
    change:
      "Run eight warmup pairs first in a seed-shuffled warmup block, then run 24 measured pairs in a separately seeded shuffle. The six arm-order permutations occur exactly four times each in the measured block; 24 measured filter updates start from the restored full list and contain 12 shrink and 12 restore samples.",
    unchanged:
      "Seeds, arms, operations, row count, timing endpoint, correctness contracts, and summary estimands are unchanged.",
    collectionStatus:
      "No preregistered seed has been collected. Out-of-schedule smoke runs passed parity and identity but were rejected at archive validation; a smoke record also exposed the phase-order bug. They are not accepted data and no raw files were archived.",
  }],
};
await Deno.writeTextFile(
  "results/component-state-structural-index-v1-preregistration.json",
  `${JSON.stringify(preregistration, null, 2)}\n`,
);
console.log(
  "Froze structural index V1 preregistration before browser collection",
);
