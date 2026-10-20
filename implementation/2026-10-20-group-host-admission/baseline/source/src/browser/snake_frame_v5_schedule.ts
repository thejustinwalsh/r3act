export const snakeFrameV5Counts = [32, 128, 512, 1024] as const;
export const snakeFrameV5Arms = [
  "react",
  "runtime",
  "generated-vdom",
  "generated",
  "direct",
] as const;

export const snakeFrameV5ArmOrders = [
  ["react", "generated-vdom", "runtime", "direct", "generated"],
  ["generated-vdom", "runtime", "direct", "generated", "react"],
  ["runtime", "direct", "generated", "react", "generated-vdom"],
  ["direct", "generated", "react", "generated-vdom", "runtime"],
  ["generated", "react", "generated-vdom", "runtime", "direct"],
] as const;

export const snakeFrameV5SizeOrders = [
  [32, 128, 512, 1024],
  [128, 512, 1024, 32],
  [512, 1024, 32, 128],
  [1024, 32, 128, 512],
  [32, 128, 512, 1024],
] as const;

export type SnakeFrameV5Arm = typeof snakeFrameV5Arms[number];

export function snakeFrameV5Pages() {
  const pages: Array<{
    sequence: number;
    replication: number;
    segmentCount: number;
    arm: SnakeFrameV5Arm;
    trialId: string;
  }> = [];
  for (let replication = 1; replication <= 5; replication++) {
    for (const segmentCount of snakeFrameV5SizeOrders[replication - 1]) {
      for (const arm of snakeFrameV5ArmOrders[replication - 1]) {
        pages.push({
          sequence: pages.length + 1,
          replication,
          segmentCount,
          arm,
          trialId: `s${segmentCount}-rep${replication}-${arm}`,
        });
      }
    }
  }
  return pages;
}

/** A distinct, matched schedule for the production-build replication. */
export function snakeFrameV5ProductionPages() {
  return snakeFrameV5Pages().map((page) => ({
    ...page,
    trialId: `production-${page.trialId}`,
  }));
}
