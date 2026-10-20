export const productMixedWarmup = 60;
export const productMixedFrames = 240;
export const productMixedTopologyEvery = 30;
export const productMixedSchedule = [128, 512, 1024].flatMap(size =>
  Array.from({ length: 5 }, (_, pair) =>
    (pair % 2 ? ["native", "react"] : ["react", "native"]).map(arm => ({
      size, pair, arm: arm as "native" | "react",
    }))
  ).flat()
).map((page, sequence) => ({ ...page, sequence }));
