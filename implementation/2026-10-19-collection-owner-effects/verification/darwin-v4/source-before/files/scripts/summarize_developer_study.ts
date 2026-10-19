type TaskId = "conditional-stateful-region" | "shared-source-two-regions";
type Arm = "react" | "runtime";
type TaskResult = {
  taskId: TaskId;
  status: "correct" | "timeout" | "aborted";
  elapsedSeconds: number;
  failedRuns: number;
  lookups: number;
  filesChanged: number;
  conceptsChanged: string[];
  easeRating: number | null;
  predictabilityRating: number | null;
  comprehension: Array<
    { questionId: string; score: number; rationale: string }
  >;
};
type Session = {
  arm: Arm;
  order: 1 | 2;
  status: "completed" | "withdrawn";
  warmup: { completed: boolean; durationSeconds: number };
  tasks: TaskResult[];
};
type Participant = {
  participantId: string;
  assignmentSlot: string;
  sessions: Session[];
  deviations: string[];
};
type StudyData = {
  schemaVersion: "developer-extension-study-v1-data";
  studyVersion: "developer-study-protocol-v0.3";
  participants: Participant[];
};
type StudySchedule = {
  scheduleSlots: Array<{
    slot: string;
    systemOrder: Arm[];
    taskOrder: Record<Arm, TaskId[]>;
  }>;
};

const expectedTasks: TaskId[] = [
  "conditional-stateful-region",
  "shared-source-two-regions",
];
const fail = (path: string, message: string): never => {
  throw new Error(`${path}: ${message}`);
};
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isIntegerBetween = (value: unknown, min: number, max: number) =>
  Number.isInteger(value) && Number(value) >= min && Number(value) <= max;

function validate(
  data: unknown,
  design: StudySchedule,
): asserts data is StudyData {
  if (!isObject(data)) fail("$", "expected an object");
  const raw = data as unknown as StudyData;
  if (raw.schemaVersion !== "developer-extension-study-v1-data") {
    fail("$.schemaVersion", "unsupported schema version");
  }
  if (raw.studyVersion !== "developer-study-protocol-v0.3") {
    fail("$.studyVersion", "unsupported protocol version");
  }
  if (!Array.isArray(raw.participants) || raw.participants.length > 8) {
    fail("$.participants", "expected an array with at most eight participants");
  }
  const ids = new Set<string>();
  const slots = new Set<string>();
  raw.participants.forEach((participant, participantIndex) => {
    const p = `$.participants[${participantIndex}]`;
    if (!isObject(participant)) fail(p, "expected an object");
    if (
      typeof participant.participantId !== "string" ||
      !/^P\d{2}$/.test(participant.participantId)
    ) {
      fail(`${p}.participantId`, "expected an anonymized ID such as P01");
    }
    if (ids.has(participant.participantId)) {
      fail(`${p}.participantId`, "duplicate participant ID");
    }
    ids.add(participant.participantId);
    if (
      typeof participant.assignmentSlot !== "string" ||
      !/^S0[1-8]$/.test(participant.assignmentSlot)
    ) {
      fail(`${p}.assignmentSlot`, "expected a scheduled slot from S01 to S08");
    }
    if (slots.has(participant.assignmentSlot)) {
      fail(`${p}.assignmentSlot`, "duplicate assignment slot");
    }
    slots.add(participant.assignmentSlot);
    const assignment = design.scheduleSlots.find((slot) =>
      slot.slot === participant.assignmentSlot
    ) ?? fail(`${p}.assignmentSlot`, "slot is not present in the frozen schedule");
    if (
      !Array.isArray(participant.sessions) || participant.sessions.length < 1 ||
      participant.sessions.length > 2
    ) {
      fail(`${p}.sessions`, "expected one or two observed sessions");
    }
    const arms = new Set<Arm>();
    const orders = new Set<number>();
    participant.sessions.forEach((session, sessionIndex) => {
      const s = `${p}.sessions[${sessionIndex}]`;
      if (!isObject(session)) fail(s, "expected an object");
      if (session.arm !== "react" && session.arm !== "runtime") {
        fail(`${s}.arm`, "expected react or runtime");
      }
      if (arms.has(session.arm)) {
        fail(`${s}.arm`, "duplicate arm for participant");
      }
      arms.add(session.arm);
      if (!isIntegerBetween(session.order, 1, 2)) {
        fail(`${s}.order`, "expected 1 or 2");
      }
      if (orders.has(Number(session.order))) {
        fail(`${s}.order`, "duplicate session order");
      }
      orders.add(Number(session.order));
      if (assignment.systemOrder[Number(session.order) - 1] !== session.arm) {
        fail(`${s}.arm`, "arm does not match the assigned crossover order");
      }
      if (session.status !== "completed" && session.status !== "withdrawn") {
        fail(`${s}.status`, "invalid session status");
      }
      if (
        !isObject(session.warmup) ||
        typeof session.warmup.completed !== "boolean" ||
        typeof session.warmup.durationSeconds !== "number" ||
        session.warmup.durationSeconds < 0
      ) {
        fail(`${s}.warmup`, "expected completion status and observed duration");
      }
      if (session.warmup.completed && session.warmup.durationSeconds < 600) {
        fail(`${s}.warmup.durationSeconds`, "completed warm-up must cover the full ten-minute allocation");
      }
      if (!Array.isArray(session.tasks) || session.tasks.length !== 2) {
        fail(`${s}.tasks`, "expected both task observations");
      }
      const taskIds = new Set<TaskId>();
      session.tasks.forEach((task, taskIndex) => {
        const t = `${s}.tasks[${taskIndex}]`;
        if (!isObject(task)) fail(t, "expected an object");
        if (!expectedTasks.includes(task.taskId as TaskId)) {
          fail(`${t}.taskId`, "unknown task");
        }
        if (taskIds.has(task.taskId as TaskId)) {
          fail(`${t}.taskId`, "duplicate task");
        }
        taskIds.add(task.taskId as TaskId);
        if (
          !(["correct", "timeout", "aborted"] as unknown[]).includes(
            task.status,
          )
        ) fail(`${t}.status`, "invalid task status");
        if (
          typeof task.elapsedSeconds !== "number" || task.elapsedSeconds < 0 ||
          task.elapsedSeconds > 2400
        ) fail(`${t}.elapsedSeconds`, "expected 0–2400 seconds");
        if (task.status === "timeout" && task.elapsedSeconds !== 2400) {
          fail(
            `${t}.elapsedSeconds`,
            "timeouts must be recorded as right-censored at 2400 seconds",
          );
        }
        for (
          const field of ["failedRuns", "lookups", "filesChanged"] as const
        ) {
          if (!isIntegerBetween(task[field], 0, Number.MAX_SAFE_INTEGER)) {
            fail(`${t}.${field}`, "expected a nonnegative integer");
          }
        }
        if (
          !Array.isArray(task.conceptsChanged) ||
          !task.conceptsChanged.every((value) => typeof value === "string")
        ) fail(`${t}.conceptsChanged`, "expected string array");
        for (const field of ["easeRating", "predictabilityRating"] as const) {
          if (
            task[field] !== null && !isIntegerBetween(task[field], 1, 7)
          ) fail(`${t}.${field}`, "expected null or a 1–7 rating");
        }
        if (
          !Array.isArray(task.comprehension) || task.comprehension.length > 5
        ) fail(`${t}.comprehension`, "expected up to five scored answers");
        const questionIds = new Set<string>();
        for (const [answerIndex, answer] of task.comprehension.entries()) {
          const a = `${t}.comprehension[${answerIndex}]`;
          if (
            !isObject(answer) || typeof answer.questionId !== "string" ||
            !/^[AB][1-5]$/.test(answer.questionId)
          ) fail(`${a}.questionId`, "invalid question ID");
          const expectedPrefix = task.taskId === "conditional-stateful-region"
            ? "A"
            : "B";
          if (!answer.questionId.startsWith(expectedPrefix)) {
            fail(`${a}.questionId`, `expected a ${expectedPrefix} task question`);
          }
          if (questionIds.has(answer.questionId)) {
            fail(`${a}.questionId`, "duplicate question ID");
          }
          questionIds.add(answer.questionId);
          if (!isIntegerBetween(answer.score, 0, 2)) {
            fail(`${a}.score`, "expected score 0–2");
          }
          if (
            typeof answer.rationale !== "string" ||
            answer.rationale.trim() === ""
          ) {
            fail(`${a}.rationale`, "scoring rationale is required");
          }
        }
        if (task.status === "correct" && task.comprehension.length !== 5) {
          fail(`${t}.comprehension`, "correct task requires all five answers");
        }
      });
      if (taskIds.size !== 2) {
        fail(`${s}.tasks`, "both protocol tasks are required");
      }
      const expectedTaskOrder = assignment.taskOrder[session.arm];
      if (
        JSON.stringify(session.tasks.map((task) => task.taskId)) !==
          JSON.stringify(expectedTaskOrder)
      ) {
        fail(`${s}.tasks`, "task order does not match the assigned schedule");
      }
    });
    if (
      !Array.isArray(participant.deviations) ||
      !participant.deviations.every((value) => typeof value === "string")
    ) {
      fail(`${p}.deviations`, "expected string array");
    }
  });
}

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

function summarize(data: StudyData) {
  const completedCrossover = data.participants.filter((participant) =>
    participant.sessions.length === 2 &&
    new Set(participant.sessions.map((session) => session.arm)).size === 2 &&
    participant.sessions.every((session) => session.status === "completed")
  );
  const tasks = Object.fromEntries(expectedTasks.map((taskId) => {
    const byArm = Object.fromEntries(([
      "react",
      "runtime",
    ] as const).map((arm) => {
      const observations = data.participants.flatMap((participant) =>
        participant.sessions.filter((session) => session.arm === arm).flatMap((
          session,
        ) =>
          session.tasks.filter((task) => task.taskId === taskId).map((
            task,
          ) => ({ participantId: participant.participantId, task }))
        )
      );
      return [arm, {
        observed: observations.length,
        correct: observations.filter(({ task }) =>
          task.status === "correct"
        ).length,
        timeouts: observations.filter(({ task }) =>
          task.status === "timeout"
        ).length,
        aborted: observations.filter(({ task }) =>
          task.status === "aborted"
        ).length,
        medianCompletedSeconds: median(
          observations.filter(({ task }) => task.status === "correct").map((
            { task },
          ) => task.elapsedSeconds),
        ),
        medianComprehension: median(
          observations.filter(({ task }) => task.comprehension.length === 5)
            .map(({ task }) =>
              task.comprehension.reduce((sum, answer) => sum + answer.score, 0)
            ),
        ),
        medianEase: median(observations.flatMap(({ task }) =>
          task.easeRating === null ? [] : [task.easeRating]
        )),
        medianPredictability: median(observations.flatMap(({ task }) =>
          task.predictabilityRating === null
            ? []
            : [task.predictabilityRating]
        )),
      }];
    }));
    const pairs = data.participants.flatMap((participant) => {
      const result = Object.fromEntries(
        participant.sessions.map((
          session,
        ) => [
          session.arm,
          session.tasks.find((task) => task.taskId === taskId),
        ]),
      ) as Record<Arm, TaskResult | undefined>;
      if (!result.react || !result.runtime) return [];
      return [{
        participantId: participant.participantId,
        react: result.react,
        runtime: result.runtime,
      }];
    });
    const timePairs = pairs.filter((pair) =>
      pair.react.status === "correct" && pair.runtime.status === "correct"
    ).map((pair) => ({
      participantId: pair.participantId,
      reactSeconds: pair.react.elapsedSeconds,
      runtimeSeconds: pair.runtime.elapsedSeconds,
      runtimeMinusReactSeconds: pair.runtime.elapsedSeconds -
        pair.react.elapsedSeconds,
    }));
    const scorePairs = pairs.filter((pair) =>
      pair.react.comprehension.length === 5 &&
      pair.runtime.comprehension.length === 5
    ).map((pair) => {
      const react = pair.react.comprehension.reduce(
        (sum, answer) => sum + answer.score,
        0,
      );
      const runtime = pair.runtime.comprehension.reduce(
        (sum, answer) => sum + answer.score,
        0,
      );
      return {
        participantId: pair.participantId,
        react,
        runtime,
        runtimeMinusReact: runtime - react,
      };
    });
    return [taskId, {
      byArm,
      paired: {
        completePairs: pairs.length,
        bothCorrectPairs: timePairs.length,
        completedTimePairsSeconds: timePairs,
        medianCompletedTimeDifferenceSeconds: median(
          timePairs.map((pair) => pair.runtimeMinusReactSeconds),
        ),
        comprehensionPairs: scorePairs,
        medianComprehensionDifference: median(
          scorePairs.map((pair) => pair.runtimeMinusReact),
        ),
        participantsFavoringRuntimeComprehension: scorePairs.filter((pair) =>
          pair.runtimeMinusReact > 0
        ).length,
        tiedComprehension: scorePairs.filter((pair) =>
          pair.runtimeMinusReact === 0
        ).length,
        participantsFavoringReactComprehension: scorePairs.filter((pair) =>
          pair.runtimeMinusReact < 0
        ).length,
      },
    }];
  }));
  const taskComparisons = completedCrossover.flatMap((participant) => {
    const sessions = Object.fromEntries(
      participant.sessions.map((session) => [session.arm, session]),
    ) as Record<Arm, Session>;
    return expectedTasks.flatMap((taskId) => {
      const react = sessions.react.tasks.find((task) => task.taskId === taskId);
      const runtime = sessions.runtime.tasks.find((task) =>
        task.taskId === taskId
      );
      return react && runtime
        ? [{ participantId: participant.participantId, taskId, react, runtime }]
        : [];
    });
  });
  const runtimeOnlyFailures =
    taskComparisons.filter((pair) =>
      pair.react.status === "correct" && pair.runtime.status !== "correct"
    ).length;
  const reactOnlyFailures =
    taskComparisons.filter((pair) =>
      pair.runtime.status === "correct" && pair.react.status !== "correct"
    ).length;
  const timePairs = taskComparisons.filter((pair) =>
    pair.react.status === "correct" && pair.runtime.status === "correct"
  );
  const timeRatios = timePairs.filter((pair) => pair.react.elapsedSeconds > 0)
    .map((pair) => pair.runtime.elapsedSeconds / pair.react.elapsedSeconds);
  const timeoutCounts = {
    react:
      taskComparisons.filter((pair) => pair.react.status === "timeout").length,
    runtime: taskComparisons.filter((pair) => pair.runtime.status === "timeout")
      .length,
  };
  const comprehensionPairs = completedCrossover.flatMap((participant) => {
    const sessions = Object.fromEntries(
      participant.sessions.map((session) => [session.arm, session]),
    ) as Record<Arm, Session>;
    const totals = (arm: Arm) => {
      const taskResults = expectedTasks.map((taskId) =>
        sessions[arm].tasks.find((task) => task.taskId === taskId)
      );
      if (
        taskResults.some((task) => !task || task.comprehension.length !== 5)
      ) return null;
      return taskResults.reduce(
        (sum, task) =>
          sum +
          task!.comprehension.reduce(
            (score, answer) => score + answer.score,
            0,
          ),
        0,
      ) / expectedTasks.length;
    };
    const react = totals("react");
    const runtime = totals("runtime");
    return react === null || runtime === null ? [] : [{
      participantId: participant.participantId,
      react,
      runtime,
      runtimeMinusReact: runtime - react,
    }];
  });
  const gateStatus = (ready: boolean, passes: boolean) =>
    !ready ? "INSUFFICIENT_DATA" : passes ? "PASS" : "FAIL";
  const quantitativeGates = {
    minimumSample: {
      completedCrossovers: completedCrossover.length,
      required: 6,
      status: completedCrossover.length >= 6 ? "PASS" : "INSUFFICIENT_DATA",
    },
    correctness: {
      taskPairs: taskComparisons.length,
      runtimeOnlyFailures,
      reactOnlyFailures,
      netRuntimeOnlyFailures: runtimeOnlyFailures - reactOnlyFailures,
      maximumAllowed: 1,
      status: gateStatus(
        completedCrossover.length >= 6,
        runtimeOnlyFailures - reactOnlyFailures <= 1,
      ),
    },
    comprehension: {
      pairedParticipants: comprehensionPairs.length,
      medianRuntimeMinusReact: median(
        comprehensionPairs.map((pair) => pair.runtimeMinusReact),
      ),
      participantsFavoringRuntime:
        comprehensionPairs.filter((pair) => pair.runtimeMinusReact > 0).length,
      participantsTied:
        comprehensionPairs.filter((pair) => pair.runtimeMinusReact === 0)
          .length,
      participantsFavoringReact:
        comprehensionPairs.filter((pair) => pair.runtimeMinusReact < 0).length,
      requiredMedianGain: 2,
      requiredFavoringCount: Math.ceil(comprehensionPairs.length * 0.75),
      status: gateStatus(
        comprehensionPairs.length >= 6,
        (median(comprehensionPairs.map((pair) => pair.runtimeMinusReact)) ??
              -Infinity) >= 2 &&
          comprehensionPairs.filter((pair) => pair.runtimeMinusReact > 0)
              .length >= Math.ceil(comprehensionPairs.length * 0.75),
      ),
    },
    completionTime: {
      bothCorrectTaskPairs: timePairs.length,
      medianRuntimeToReactRatio: median(timeRatios),
      maximumAllowedRatio: 1.1,
      timeouts: timeoutCounts,
      status: gateStatus(
        completedCrossover.length >= 6 && timeRatios.length > 0,
        (median(timeRatios) ?? Infinity) <= 1.1 &&
          timeoutCounts.runtime <= timeoutCounts.react,
      ),
    },
    humanReview:
      "Required: assess unresolved runtime-only lifecycle/identity defects and blinded patch-review/secondary measures before making any simplicity claim.",
  };
  return {
    schemaVersion: "developer-extension-study-v1-summary",
    studyVersion: data.studyVersion,
    participantsObserved: data.participants.length,
    completeCrossovers: completedCrossover.length,
    analysisStatus: data.participants.length === 0
      ? "NO_PARTICIPANT_DATA"
      : completedCrossover.length < 6
      ? "DESCRIPTIVE_CASE_STUDIES_ONLY_BELOW_MINIMUM"
      : "EXPLORATORY_PAIRED_SUMMARY",
    taskSummaries: tasks,
    quantitativeGates,
    interpretation:
      "Descriptive pilot analysis only. Do not claim simplicity unless all protocol decision gates and blinded-review checks pass. Time summaries include only pairs where both arms completed correctly; timeouts remain separately reported and are never imputed.",
  };
}

const inputPath = Deno.args[0] ?? "results/developer-study-v1-raw.json";
const outputPath = Deno.args[1];
const parsed: unknown = JSON.parse(await Deno.readTextFile(inputPath));
const design: StudySchedule = JSON.parse(
  await Deno.readTextFile("results/developer-study-v1-design.json"),
);
validate(parsed, design);
const output = `${JSON.stringify(summarize(parsed), null, 2)}\n`;
if (outputPath) await Deno.writeTextFile(outputPath, output);
console.log(output);
