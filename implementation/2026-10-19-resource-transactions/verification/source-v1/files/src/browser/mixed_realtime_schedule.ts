export const mixedRealtimeSizes = [128, 512, 1024] as const;
export const mixedRealtimeArms = ["react", "runtime"] as const;
export const mixedRealtimeWarmupFrames = 60;
export const mixedRealtimeMeasuredFrames = 240;
export const mixedRealtimeTopologyEvery = 30;

export type MixedRealtimePage = {
  sequence: number;
  replication: number;
  entityCount: typeof mixedRealtimeSizes[number];
  arm: typeof mixedRealtimeArms[number];
  trialId: string;
};

/** Counterbalanced, deterministic order; page loads are the replication unit. */
export function mixedRealtimePages(): MixedRealtimePage[] {
  const pages: MixedRealtimePage[] = [];
  for (let replication = 1; replication <= 5; replication++) {
    const sizes = mixedRealtimeSizes.map((_, index) =>
      mixedRealtimeSizes[(index + replication - 1) % mixedRealtimeSizes.length]
    );
    for (const [sizeIndex, entityCount] of sizes.entries()) {
      const first = (replication + sizeIndex) % 2 === 0 ? "react" : "runtime";
      const arms = first === "react" ? ["react", "runtime"] as const : ["runtime", "react"] as const;
      for (const arm of arms) {
        pages.push({
          sequence: pages.length,
          replication,
          entityCount,
          arm,
          trialId: `mixed-v1-n${entityCount}-r${replication}-${arm}`,
        });
      }
    }
  }
  return pages;
}
