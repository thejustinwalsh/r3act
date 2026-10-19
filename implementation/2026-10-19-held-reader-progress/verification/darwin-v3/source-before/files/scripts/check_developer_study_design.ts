type Design = {
  status: string;
  protocolVersion: string;
  rubricVersion: string;
  participantPacket: string;
  scheduleSlots: Array<{
    slot: string;
    systemOrder: string[];
    taskOrder: Record<string, string[]>;
  }>;
};

const assert: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) throw new Error(message);
};

const design = JSON.parse(
  await Deno.readTextFile("results/developer-study-v1-design.json"),
) as Design;
const rubric = await Deno.readTextFile("developer-study-rubric.md");
const packetPath = design.participantPacket;
const packet = await Deno.readTextFile(packetPath);
const protocol = await Deno.readTextFile("developer-study-protocol.md");
const schema = JSON.parse(
  await Deno.readTextFile("developer-study-data-v1.schema.json"),
) as { properties: { studyVersion: { const: string } } };
const lock = JSON.parse(
  await Deno.readTextFile("results/developer-study-v1-preflight-source-lock.json"),
) as {
  status: string;
  files: Array<{ path: string; sha256: string }>;
};

assert(
  design.status === "DESIGN_ONLY_NOT_PREREGISTERED",
  `Unexpected design status: ${design.status}`,
);
const rubricVersion = rubric.match(/\*\*Rubric v([\d.]+) · draft · pre-data\*\*/)?.[1];
assert(rubricVersion, "Could not read the rubric draft version");
assert(
  design.rubricVersion.startsWith(`${rubricVersion}-`),
  `Design rubric version ${design.rubricVersion} does not match rubric v${rubricVersion}`,
);
assert(
  schema.properties.studyVersion.const ===
    `developer-study-protocol-v${design.protocolVersion}`,
  "Raw-data schema studyVersion does not match the design protocol version",
);
assert(
  protocol.includes(`./${packetPath}`),
  "Protocol does not link the participant packet listed by the design",
);

const section = (start: string, end: string) => {
  const from = rubric.indexOf(start);
  const to = rubric.indexOf(end, from + start.length);
  assert(from >= 0 && to > from, `Missing rubric section ${start}`);
  return rubric.slice(from, to);
};
const taskA = section("## Task A:", "## Task B:");
const taskB = section("## Task B:", "## Scorer worksheet");
const questionCount = (text: string) =>
  [...text.matchAll(/^\d+\. \*\*/gm)].length;
assert(questionCount(taskA) === 5, "Task A must have exactly five scored questions");
assert(questionCount(taskB) === 5, "Task B must have exactly five scored questions");
const scorerKeys = [...rubric.matchAll(/^\| ([AB][1-5]) \|/gm)].map((match) => match[1]);
const expectedKeys = [
  ...Array.from({ length: 5 }, (_, index) => `A${index + 1}`),
  ...Array.from({ length: 5 }, (_, index) => `B${index + 1}`),
];
assert(
  scorerKeys.length === 10 && expectedKeys.every((key) => scorerKeys.includes(key)),
  "Scorer calibration table must contain exactly A1–A5 and B1–B5",
);
for (const phrase of ["## Warm-up", "## Task A", "## Task B", "Facilitator sequence"]) {
  assert(packet.includes(phrase), `Participant packet is missing ${phrase}`);
}
const participantGuides = [
  {
    packetLink: "./docs/react-19.3-compiler.md",
    path: "developer-study/docs/react-19.3-compiler.md",
    requiredText: [
      "React 19.3.0",
      "React Compiler 1.0.0",
      "useState",
      "useEffect",
      "developer-study:task-a:build",
      "?arm=react&run=1",
    ],
  },
  {
    packetLink: "./docs/runtime.md",
    path: "developer-study/docs/runtime.md",
    requiredText: [
      "OXC compiler",
      "useState",
      "useEffect",
      "JSX",
      "developer-study:task-a:build",
      "?arm=runtime&run=1",
    ],
  },
];
for (const guide of participantGuides) {
  const guideText = await Deno.readTextFile(guide.path);
  assert(packet.includes(guide.packetLink), `Participant packet does not link ${guide.path}`);
  for (const phrase of guide.requiredText) {
    assert(guideText.includes(phrase), `${guide.path} is missing ${phrase}`);
  }
}

assert(design.scheduleSlots.length === 8, "Expected eight counterbalanced assignment slots");
const slots = new Set(design.scheduleSlots.map((slot) => slot.slot));
assert(slots.size === 8, "Assignment slot IDs must be unique");
const sequences = new Map<string, number>();
for (const slot of design.scheduleSlots) {
  assert(
    slot.systemOrder.length === 2 && new Set(slot.systemOrder).size === 2 &&
      ["react", "runtime"].every((arm) => slot.taskOrder[arm]?.length === 2),
    `Incomplete crossover assignment in ${slot.slot}`,
  );
  const key = `${slot.systemOrder.join(">")} | ${slot.taskOrder.react.join(">")} / ${slot.taskOrder.runtime.join(">")}`;
  sequences.set(key, (sequences.get(key) ?? 0) + 1);
}
assert(
  sequences.size === 4 && [...sequences.values()].every((count) => count === 2),
  "The four system/task order sequences must each occur twice",
);

assert(
  lock.status === "PREFLIGHT_ONLY_NOT_FROZEN_FOR_PARTICIPANT_DATA",
  "The source lock must remain explicitly preflight-only",
);
const lockPaths = new Set(lock.files.map((file) => file.path));
for (const path of [
  "developer-study-protocol.md",
  "developer-study-rubric.md",
  ...participantGuides.map((guide) => guide.path),
  packetPath,
  "results/developer-study-v1-design.json",
  "developer-study-data-v1.schema.json",
  "scripts/check_developer_study_design.ts",
]) {
  assert(lockPaths.has(path), `Preflight source lock does not include ${path}`);
}
const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0"))
    .join("");
const stale: string[] = [];
for (const file of lock.files) {
  const contents = await Deno.readFile(file.path);
  const actual = hex(await crypto.subtle.digest("SHA-256", contents));
  if (actual !== file.sha256) stale.push(file.path);
}
assert(
  stale.length === 0,
  `Preflight source lock is stale for: ${stale.join(", ")}`,
);

console.log(
  `PASS: protocol v${design.protocolVersion}, rubric v${rubricVersion}, 10 scored questions, four balanced crossover sequences, and ${lock.files.length} current preflight hashes.`,
);
