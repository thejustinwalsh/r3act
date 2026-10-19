import { lifecyclePages } from "../src/browser/snake_lifecycle_v1_schedule.ts";
import { cadencePages } from "../src/browser/snake_frame_cadence_v1_schedule.ts";

type LockedFile = { path: string; bytes: number; sha256: string };
type DriftEntry = {
  path: string;
  frozenBytes: number;
  frozenSha256: string;
  currentBytes: number;
  currentSha256: string;
  appliesTo: string[];
};

const hash = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
const driftDoc = JSON.parse(
  await Deno.readTextFile("results/post-collection-source-drift.json"),
) as { entries: DriftEntry[] };

const verifyStudy = async (
  id: string,
  directory: string,
  schedule: readonly unknown[],
  preregStatus: string[],
) => {
  const prereg = JSON.parse(
    await Deno.readTextFile(`${directory}/preregistration.json`),
  );
  const lock = JSON.parse(
    await Deno.readTextFile(`${directory}/source-lock.json`),
  );
  if (
    !preregStatus.includes(prereg.status) ||
    prereg.schedule.length !== schedule.length ||
    lock.status !== "FROZEN_BEFORE_COLLECTION" ||
    lock.preregistration !== `${directory}/preregistration.json`
  ) {
    throw new Error(`${id}: preregistration/source-lock metadata failed`);
  }
  if (JSON.stringify(prereg.schedule) !== JSON.stringify(schedule)) {
    throw new Error(
      `${id}: generated browser schedule differs from preregistration`,
    );
  }

  const files: LockedFile[] = lock.files ?? [
    ...lock.sourceFiles,
    ...lock.productionAssets,
  ];
  if (lock.includedFiles !== undefined && lock.includedFiles !== files.length) {
    throw new Error(`${id}: lock file count does not match its entries`);
  }
  const documentedDrift: string[] = [];
  for (const entry of files) {
    const bytes = await Deno.readFile(entry.path);
    const currentSha = await hash(bytes);
    if (bytes.byteLength === entry.bytes && currentSha === entry.sha256) {
      continue;
    }

    const drift = driftDoc.entries.find((candidate) =>
      candidate.path === entry.path && candidate.appliesTo.includes(id) &&
      candidate.frozenBytes === entry.bytes &&
      candidate.frozenSha256 === entry.sha256
    );
    if (
      !drift || drift.currentBytes !== bytes.byteLength ||
      drift.currentSha256 !== currentSha
    ) {
      throw new Error(
        `${id}: undocumented or stale source drift at ${entry.path}`,
      );
    }
    documentedDrift.push(entry.path);
  }

  const productionFiles: LockedFile[] = lock.productionAssets ??
    files.filter((entry) => entry.path.startsWith("dist/"));
  const benchmarkBundle = productionFiles.find((entry) =>
    entry.path.includes(
      id === "snake-frame-lifecycle-v1"
        ? "snakeLifecycleV1Benchmark"
        : "snakeFrameCadenceV1Benchmark",
    ) && entry.path.endsWith(".js")
  );
  if (!benchmarkBundle) throw new Error(`${id}: production JS bundle missing`);
  if (
    !(await Deno.readTextFile(benchmarkBundle.path)).includes(
      "memo_cache_sentinel",
    )
  ) {
    throw new Error(
      `${id}: React Compiler marker missing from production bundle`,
    );
  }

  return {
    pages: schedule.length,
    lockedInputs: files.length,
    documentedPostCollectionDrift: documentedDrift,
    reactCompilerMarker: true,
  };
};

const lifecycle = await verifyStudy(
  "snake-frame-lifecycle-v1",
  "results/snake-frame-lifecycle-v1",
  lifecyclePages(),
  ["FROZEN_BEFORE_COLLECTION", "AMENDED_BEFORE_COLLECTION"],
);
const cadence = await verifyStudy(
  "snake-frame-cadence-v1",
  "results/snake-frame-cadence-v1",
  cadencePages(),
  ["FROZEN_BEFORE_IMPLEMENTATION"],
);

console.log(JSON.stringify({ status: "PASS", lifecycle, cadence }, null, 2));
