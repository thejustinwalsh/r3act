export const sparseV1Sizes = [512, 4096] as const;
export const sparseV1Densities = [1, 10, 50, 100] as const;
export const sparseV1Localities = ["clustered", "scattered"] as const;
export const sparseV1Arms = [
  "react",
  "dense-vdom",
  "dirty-rows-vdom",
  "bucket-32-vdom",
  "bucket-128-vdom",
  "direct",
] as const;

export type SparseV1Arm = typeof sparseV1Arms[number];

const armRotation = [
  ["react", "dirty-rows-vdom", "dense-vdom", "bucket-32-vdom", "direct", "bucket-128-vdom"],
  ["dirty-rows-vdom", "dense-vdom", "react", "bucket-128-vdom", "bucket-32-vdom", "direct"],
  ["dense-vdom", "bucket-32-vdom", "dirty-rows-vdom", "direct", "react", "bucket-128-vdom"],
] as const;

export function sparseV1Pages() {
  const pages: Array<{
    sequence: number;
    replication: number;
    size: number;
    dirtyPercent: number;
    locality: typeof sparseV1Localities[number];
    arm: SparseV1Arm;
    trialId: string;
  }> = [];
  for (let replication = 1; replication <= 3; replication++) {
    for (let sizeIndex = 0; sizeIndex < sparseV1Sizes.length; sizeIndex++) {
      for (let densityIndex = 0; densityIndex < sparseV1Densities.length; densityIndex++) {
        for (let localityIndex = 0; localityIndex < sparseV1Localities.length; localityIndex++) {
          const offset = (replication - 1 + sizeIndex + densityIndex + localityIndex) % sparseV1Arms.length;
          const base = armRotation[(replication - 1) % armRotation.length];
          const order = [...base.slice(offset), ...base.slice(0, offset)];
          for (const arm of order) {
            const size = sparseV1Sizes[sizeIndex];
            const dirtyPercent = sparseV1Densities[densityIndex];
            const locality = sparseV1Localities[localityIndex];
            pages.push({
              sequence: pages.length,
              replication,
              size,
              dirtyPercent,
              locality,
              arm,
              trialId: `sparse-v1-n${size}-d${dirtyPercent}-${locality}-r${replication}-${arm}`,
            });
          }
        }
      }
    }
  }
  return pages;
}
