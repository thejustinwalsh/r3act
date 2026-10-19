export const lifecycleArms = [
  "react",
  "runtime-vdom",
  "columnar-vdom",
] as const;
export type LifecycleArm = typeof lifecycleArms[number];
type Cell = { arm: LifecycleArm; segmentCount: 512 | 1024 };
const cells: Cell[] = [
  { arm: "react", segmentCount: 512 },
  { arm: "runtime-vdom", segmentCount: 512 },
  { arm: "columnar-vdom", segmentCount: 512 },
  { arm: "react", segmentCount: 1024 },
  { arm: "runtime-vdom", segmentCount: 1024 },
  { arm: "columnar-vdom", segmentCount: 1024 },
];
const randomFor = (seed: number) => {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
};
const shuffle = <T>(items: T[], random: () => number) => {
  const output = [...items];
  for (let i = output.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
};
export const lifecyclePages = () => {
  const pages: Array<{
    replication: number;
    slot: number;
    arm: LifecycleArm;
    segmentCount: 512 | 1024;
    warmupFrames: 90;
    measuredFrames: 300;
    seed: number;
  }> = [];
  const random = randomFor(83_006_001);
  for (let replication = 1; replication <= 5; replication++) {
    for (const [index, cell] of shuffle(cells, random).entries()) {
      pages.push({
        replication,
        slot: index + 1,
        ...cell,
        warmupFrames: 90,
        measuredFrames: 300,
        seed: 83_006_000 + replication,
      });
    }
  }
  return pages;
};
