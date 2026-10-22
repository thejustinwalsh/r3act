export const snakeFrameV6Sizes = [128, 512, 1024] as const;
export const snakeFrameV6Arms = [
  "react",
  "runtime",
  "generated-vdom",
  "columnar-vdom",
  "direct",
] as const;

const armOrders = [
  ["react", "generated-vdom", "runtime", "columnar-vdom", "direct"],
  ["generated-vdom", "runtime", "direct", "columnar-vdom", "react"],
  ["runtime", "direct", "columnar-vdom", "react", "generated-vdom"],
  ["direct", "columnar-vdom", "react", "generated-vdom", "runtime"],
  ["columnar-vdom", "react", "generated-vdom", "runtime", "direct"],
] as const;
const sizeOrders = [
  [128, 512, 1024],
  [512, 1024, 128],
  [1024, 128, 512],
  [128, 512, 1024],
  [512, 1024, 128],
] as const;

export type SnakeFrameV6Arm = typeof snakeFrameV6Arms[number];

export function snakeFrameV6Pages() {
  const pages: Array<{
    sequence: number;
    replication: number;
    segmentCount: number;
    arm: SnakeFrameV6Arm;
    trialId: string;
  }> = [];
  for (let replication = 1; replication <= 5; replication++) {
    for (const segmentCount of sizeOrders[replication - 1]) {
      for (const arm of armOrders[replication - 1]) {
        pages.push({
          sequence: pages.length,
          replication,
          segmentCount,
          arm,
          trialId: `v6-s${segmentCount}-rep${replication}-${arm}`,
        });
      }
    }
  }
  return pages;
}
