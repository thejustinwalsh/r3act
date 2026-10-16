import { createHash } from "node:crypto";

export const sizes = [128, 1024, 10000];
export const pairsPerSize = 5;
export const warmupFrames = 60;
export const measuredFrames = 240;
export const viewport = Object.freeze({ width: 1200, height: 900 });
export const decisionRules = Object.freeze({
  schemaVersion: "headless-high-frequency-decision-v1",
  parity: {
    pairedMedianGeometricMeanAtMost: 1,
    pairedP95MedianAtMost: 1,
    requiredSizes: "all-three",
  },
  strongerDenseWin: {
    pairedMedianGeometricMeanAtMost: 0.8,
    requiredSizes: "at-least-two-of-three",
  },
  pairedDenominatorFloor: "five-times-the-maximum-of-frozen-preregistered-and-all-pair-before-after-positive-performance-now-quanta",
  unresolvedPolicy: "keep all records; do not exclude, replace, or infer a gate result when any arm median or p95 is below the floor",
  repetitionPrecision: "five independent pairs per size; p95 precision is limited by five page-pairs and 240 frame observations per page",
});

const canonical = (value) => {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  }
  return JSON.stringify(value);
};
export const fingerprint = (value) =>
  createHash("sha256").update(canonical(value)).digest("hex");

export const schedule = Object.freeze(sizes.flatMap((rows, sizeIndex) =>
  Array.from({ length: pairsPerSize }, (_, pair) => {
    const arms = pair % 2 === 0 ? ["react", "native"] : ["native", "react"];
    return {
      rows,
      pair,
      pairId: rows + "-" + String(pair).padStart(2, "0"),
      order: arms,
      pages: arms.map((arm, withinPair) => ({
        sequence: sizeIndex * pairsPerSize * 2 + pair * 2 + withinPair,
        arm,
        rows,
        dirty: "all",
        placement: "contiguous",
        programs: "homogeneous",
      })),
    };
  })
));

export const scheduleSha256 = fingerprint({
  schemaVersion: "headless-high-frequency-schedule-v1",
  sizes,
  pairsPerSize,
  warmupFrames,
  measuredFrames,
  viewport,
  schedule,
});
export const decisionRulesSha256 = fingerprint(decisionRules);
