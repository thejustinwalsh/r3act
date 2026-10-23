import { AsyncResource, type AsyncResourceStatus } from "./async_resource_runtime.ts";
import { asyncTask, type AuthoredAsyncTask } from "./async_task_plan.ts";
import { AsyncTaskDemandScope, defineProviderDemand,
  definePureDerivedDemand } from "./async_task_demand.ts";
import { invalidateCompiledSemanticPlan,
  registerCompiledSemanticPlan } from "./compiled_semantic_plan.ts";
import {
  createTaskExecution,
  createTaskExecutionFromDefinition,
  prepareNativeTaskDefinition,
} from "./native_task_execution.ts";

const assertEquals = (
  actual: unknown,
  expected: unknown,
  message = "Values differ",
) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
};

const assert = (value: unknown, message = "Assertion failed") => {
  if (!value) throw new Error(message);
};

const deferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

const waitForResource = <T>(resource: AsyncResource<T>) => {
  if (resource.status.status !== "pending") return Promise.resolve(resource.status);
  return new Promise<AsyncResourceStatus<T>>((resolve) => {
    resource.subscribe((_resource, status) => resolve(status));
  });
};

const assertRejected = async (promise: Promise<unknown>, expected: unknown) => {
  let actual: unknown;
  try {
    await promise;
  } catch (error) {
    actual = error;
  }
  assert(actual === expected, "Promise did not reject with the expected cause");
};

Deno.test("native task execution exposes typed stable resources with early DAG outputs", async () => {
  const profile = deferred<{ name: string }>();
  const feed = deferred<string>();
  const tasks = [
    asyncTask("profile", () => profile.promise),
    asyncTask("feed", () => feed.promise),
    asyncTask("header", ["profile"] as const, (values) => {
      const person = values.get("profile") as { name: string };
      return `Hello ${person.name}`;
    }),
    asyncTask("page", ["profile", "feed"] as const, (values) => {
      const person = values.get("profile") as { name: string };
      return `${person.name}:${values.get("feed")}`;
    }),
  ] as const;
  const execution = createTaskExecution(tasks, {});
  const profileResource: AsyncResource<{ name: string }> = execution.resource("profile");
  const headerResource: AsyncResource<string> = execution.resource("header");
  assertEquals(execution.snapshot().started, ["profile", "feed"]);
  assertEquals(profileResource.status.status, "pending");
  // @ts-expect-error unknown task IDs are rejected by the typed accessor.
  const invalidResourceAccessor = () => execution.resource("missing");
  void invalidResourceAccessor;

  profile.resolve({ name: "Ada" });
  await waitForResource(headerResource);
  assertEquals(headerResource.read(), "Hello Ada");
  assertEquals(execution.resource("page").status.status, "pending");
  assertEquals(execution.snapshot().started, ["profile", "feed", "header"]);

  feed.resolve("news");
  const result = await execution.completion;
  assertEquals(result.status, "complete");
  assertEquals(execution.resource("page").read(), "Ada:news");
  assertEquals(execution.snapshot().completedValues.get("page"), "Ada:news");
});

Deno.test("explicit provider demand shares fork interest and aborts only after the last owner", async () => {
  const scope = new AsyncTaskDemandScope();
  const first = deferred<string>(), changed = deferred<string>();
  const signals: AbortSignal[] = [];
  const provider = defineProviderDemand({}, "demand-v1", (captures, signal) => {
    signals.push(signal);
    return captures[0].value === "same" ? first.promise : changed.promise;
  });
  const tasks = [asyncTask("load", ["$query"], () => {
    throw new Error("opaque callback must not run for explicit provider demand");
  })] as const;
  const demands = new Map([["load", provider]]);
  const a = createTaskExecution(tasks, { $query: "same" }, { demandScope: scope, demands });
  const b = createTaskExecution(tasks, { $query: "same" }, { demandScope: scope, demands });
  assertEquals(signals.length, 1);
  a.cancel("fork detached");
  assertEquals((await a.completion).status, "aborted");
  assertEquals(signals[0].aborted, false);
  first.resolve("shared");
  assertEquals((await b.completion).status, "complete");
  assertEquals(b.resource("load").read(), "shared");
  const c = createTaskExecution(tasks, { $query: "changed" },
    { demandScope: scope, demands });
  assertEquals(signals.length, 2);
  c.cancel("last owner left");
  assertEquals((await c.completion).status, "aborted");
  assertEquals(signals[1].aborted, true);
  changed.resolve("late");
  assertEquals(scope.size, 0);
  scope.dispose();
});

Deno.test("explicit pure derivation shares matching primitive dependency cuts", async () => {
  const scope = new AsyncTaskDemandScope();
  let derives = 0;
  const derived = definePureDerivedDemand({}, "derive-v1", (captures) => {
    derives++;
    return Number(captures[0].value) * 2;
  });
  const tasks = [asyncTask("double", ["$value"], () => {
    throw new Error("opaque callback must not run for explicit derivation");
  })] as const;
  const demands = new Map([["double", derived]]);
  const a = createTaskExecution(tasks, { $value: 2 }, { demandScope: scope, demands });
  const b = createTaskExecution(tasks, { $value: 2 }, { demandScope: scope, demands });
  await Promise.all([a.completion, b.completion]);
  assertEquals(derives, 1);
  assertEquals([a.resource("double").read(), b.resource("double").read()], [4, 4]);
  const c = createTaskExecution(tasks, { $value: 3 }, { demandScope: scope, demands });
  await c.completion;
  assertEquals(derives, 2);
  assertEquals(c.resource("double").read(), 6);
  scope.dispose();
});

Deno.test("retired compiler task revision cannot start a prepared execution", () => {
  const sourceFile = "native-task-execution/stale.tsx", moduleRevision = "stale-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: moduleRevision, owners: [], sources: [], sinks: [],
    operations: [{ site_id: `${sourceFile}#async-task:load`, owner_site_id: null,
      kind: "async-task", provenance: "opaque", source_sites: ["$query"] }],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  let starts = 0;
  const task = asyncTask("load", ["$query"], () => { starts++; return "late"; }, {
    sourceFile, moduleRevision, siteId: `${sourceFile}#async-task:load`,
    hardPrerequisites: [], controlInputs: ["query"], discovery: "candidate-local",
  });
  const definition = prepareNativeTaskDefinition([task] as const);
  assert(invalidateCompiledSemanticPlan(sourceFile, moduleRevision));
  let rejected = false;
  try { createTaskExecutionFromDefinition(definition, { $query: "old" }); }
  catch (error) { rejected = String(error).includes("stale"); }
  assert(rejected);
  assertEquals(starts, 0);
});

Deno.test("compiler invalidation releases a pending execution's provider interest", async () => {
  const sourceFile = "native-task-execution/hmr-pending.tsx";
  const moduleRevision = "hmr-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: moduleRevision, owners: [], sources: [], sinks: [],
    operations: [{ site_id: `${sourceFile}#async-task:load`, owner_site_id: null,
      kind: "async-task", provenance: "opaque", source_sites: ["$query"] }],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const task = asyncTask("load", ["$query"], () => {
    throw new Error("opaque callback must not run");
  }, { sourceFile, moduleRevision, siteId: `${sourceFile}#async-task:load`,
    hardPrerequisites: [], controlInputs: ["query"], discovery: "candidate-local" });
  let providerSignal: AbortSignal | undefined;
  const provider = defineProviderDemand({}, "hmr-v1", (_captures, signal) => {
    providerSignal = signal;
    return new Promise<string>(() => {});
  });
  const scope = new AsyncTaskDemandScope();
  const execution = createTaskExecution([task] as const, { $query: "old" },
    { demandScope: scope, demands: new Map([["load", provider]]) });
  assertEquals(scope.size, 1);
  assert(invalidateCompiledSemanticPlan(sourceFile, moduleRevision));
  assertEquals((await execution.completion).status, "aborted");
  assertEquals(providerSignal?.aborted, true);
  assertEquals(scope.size, 0);
  assertEquals(execution.resource("load").status.status, "rejected");
  scope.dispose();
});

Deno.test("compiled same-definition retry reuses completed independent work only with its prior receipt", async () => {
  const sourceFile = "native-task-execution/retry.tsx", moduleRevision = "retry-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: sourceFile,
    module_revision: moduleRevision, owners: [], sources: [], sinks: [],
    operations: [
      { site_id: `${sourceFile}#async-task:load`, owner_site_id: null,
        kind: "async-task", provenance: "opaque", source_sites: ["$query"] },
      { site_id: `${sourceFile}#async-task:catalog`, owner_site_id: null,
        kind: "async-task", provenance: "opaque", source_sites: [] },
    ], graph: { coverage: "proven-sinks-only", source_to_sinks: {},
      execution_order: [] } });
  const metadata = (id: string, controlInputs: string[]) => ({
    sourceFile, moduleRevision, siteId: `${sourceFile}#async-task:${id}`,
    hardPrerequisites: [], controlInputs, discovery: "candidate-local" as const,
  });
  const old = deferred<string>();
  let catalogRuns = 0;
  const tasks = [asyncTask("load", ["$query"], (values) =>
    values.get("$query") === "old" ? old.promise : "fresh",
  metadata("load", ["query"])),
  asyncTask("catalog", [], () => { catalogRuns++; return "catalog"; },
    metadata("catalog", []))] as const;
  const definition = prepareNativeTaskDefinition(tasks);
  const first = createTaskExecutionFromDefinition(definition, { $query: "old" });
  await waitForResource(first.resource("catalog"));
  const prior = first.snapshot();
  const reuseCompleted = { values: prior.completedValues,
    completed: prior.completed, changedInputs: ["$query"] };
  let rejected = false;
  try { createTaskExecutionFromDefinition(definition, { $query: "new" },
    { reuseCompleted }); }
  catch (error) { rejected = String(error).includes("provenance"); }
  assert(rejected);
  const next = createTaskExecutionFromDefinition(definition, { $query: "new" },
    { reuseCompleted, reuseFrom: first });
  assertEquals((await next.completion).status, "complete");
  assertEquals(next.snapshot().reused, ["catalog"]);
  assertEquals(catalogRuns, 1);
  assertEquals(next.resource("load").read(), "fresh");
  first.cancel("superseded");
  await first.completion;
  old.resolve("obsolete");
});

Deno.test("native task execution publishes reused outputs once and reruns invalidated closure", async () => {
  const started: string[] = [];
  const cachedValues = new Map<string, unknown>([
    ["lookup", "cached lookup"],
    ["derive", "cached derive"],
    ["catalog", "cached catalog"],
  ]);
  const tasks = [
    asyncTask("lookup", ["$query"] as const, (values) => {
      started.push("lookup");
      return `lookup:${values.get("$query")}`;
    }),
    asyncTask("derive", ["lookup"] as const, (values) => {
      started.push("derive");
      return `derive:${values.get("lookup")}`;
    }),
    asyncTask("catalog", ["$locale"] as const, (values) => {
      started.push("catalog");
      return `catalog:${values.get("$locale")}`;
    }),
  ] as const;
  const execution = createTaskExecution(
    tasks,
    { $query: "new", $locale: "en" },
    {
      reuseCompleted: {
        values: cachedValues,
        completed: ["lookup", "derive", "catalog"],
        changedInputs: ["$query"],
      },
      onObserverError: (error) => {
        throw error;
      },
    },
  );
  // Reused outputs publish during synchronous startup, before fresh task work.
  const catalog = execution.resource("catalog");
  await waitForResource(catalog);
  assertEquals(catalog.status.status, "fulfilled");
  assertEquals(catalog.read(), "cached catalog");
  assertEquals(started, ["lookup"]);
  await execution.completion;
  assertEquals(started, ["lookup", "derive"]);
  assertEquals(execution.snapshot().reused, ["catalog"]);
  assertEquals(execution.resource("lookup").read(), "lookup:new");
  assertEquals(execution.resource("derive").read(), "derive:lookup:new");
});

Deno.test("native task execution cancellation rejects resources and ignores late providers", async () => {
  const gate = deferred<string>();
  const tasks = [asyncTask("slow", () => gate.promise)] as const;
  const execution = createTaskExecution(tasks, {});
  const resource = execution.resource("slow");
  const reason = new Error("superseded");
  execution.cancel(reason);
  const result = await execution.completion;
  assertEquals(result.status, "aborted");
  assertEquals(execution.snapshot().status, "aborted");
  assertEquals(resource.status.status, "rejected");
  if (resource.status.status === "rejected") assert(resource.status.reason === reason);

  gate.resolve("late value");
  await Promise.resolve();
  assertEquals(resource.status.status, "rejected");
});

Deno.test("native task execution relays an external abort signal", async () => {
  const gate = deferred<string>();
  const controller = new AbortController();
  const tasks = [asyncTask("slow", () => gate.promise)] as const;
  const execution = createTaskExecution(tasks, {}, { signal: controller.signal });
  const resource = execution.resource("slow");
  const reason = new Error("route changed");
  controller.abort(reason);
  assertEquals((await execution.completion).status, "aborted");
  assertEquals(resource.status.status, "rejected");
  if (resource.status.status === "rejected") assert(resource.status.reason === reason);
  gate.resolve("late");
  await Promise.resolve();
  assertEquals(resource.status.status, "rejected");
});

Deno.test("native task failure rejects every outstanding resource with one cause", async () => {
  const completed = deferred<string>();
  const failed = deferred<string>();
  const cause = new Error("provider failed");
  const dependentStarted: string[] = [];
  const tasks = [
    asyncTask("ready", () => completed.promise),
    asyncTask("broken", () => failed.promise),
    asyncTask("dependent", ["broken"] as const, () => {
      dependentStarted.push("dependent");
      return "unreachable";
    }),
  ] as const;
  const execution = createTaskExecution(tasks, {});
  const ready = execution.resource("ready");
  const broken = execution.resource("broken");
  const dependent = execution.resource("dependent");
  completed.resolve("kept");
  await waitForResource(ready);
  failed.reject(cause);
  await assertRejected(execution.completion, cause);

  assertEquals(ready.read(), "kept");
  for (const resource of [broken, dependent]) {
    assertEquals(resource.status.status, "rejected");
    if (resource.status.status === "rejected") assert(resource.status.reason === cause);
  }
  assertEquals(dependentStarted, []);
  assertEquals(execution.snapshot().status, "failed");
  assert(execution.snapshot().error === cause);
});

Deno.test("native task execution snapshots inputs and task edges before startup", async () => {
  const deps = ["$query"];
  const input = { $query: "original" };
  const gate = deferred<string>();
  let observed: unknown;
  const task: AuthoredAsyncTask<"lookup", string, readonly string[]> = {
    id: "lookup",
    dependsOn: deps,
    run: (values) => {
      observed = values.get("$query");
      return gate.promise.then(() => String(values.get("$query")));
    },
  };
  const tasks = [task];
  const execution = createTaskExecution(tasks, input);
  deps[0] = "$other";
  input.$query = "mutated";
  Object.assign(task, { id: "mutated" });
  gate.resolve("go");
  await execution.completion;

  assertEquals(observed, "original");
  assertEquals(execution.resource("lookup").read(), "original");
});

Deno.test("native task execution validates inputs and cycles before any task starts", () => {
  let started = 0;
  const task = asyncTask("lookup", ["$query"] as const, () => {
    started++;
    return "value";
  });
  let missingRejected = false;
  try {
    createTaskExecution([task] as const, {});
  } catch (error) {
    missingRejected = error instanceof Error && error.message.includes("missing");
  }
  let extraRejected = false;
  try {
    createTaskExecution([task] as const, { $query: "q", extra: true });
  } catch (error) {
    extraRejected = error instanceof Error && error.message.includes("extra");
  }
  const cyclic = [
    asyncTask("left", ["right"] as const, () => {
      started++;
      return "left";
    }),
    asyncTask("right", ["left"] as const, () => {
      started++;
      return "right";
    }),
  ] as const;
  let cycleRejected = false;
  try {
    createTaskExecution(cyclic, {});
  } catch (error) {
    cycleRejected = error instanceof Error && error.message.includes("cycle");
  }
  assertEquals([missingRejected, extraRejected, cycleRejected, started], [true, true, true, 0]);
});

Deno.test("prepared native task definitions keep exact input keys and candidate resource ownership", async () => {
  const firstGate = deferred<string>();
  const secondGate = deferred<string>();
  const started: string[] = [];
  const definition = prepareNativeTaskDefinition([
    asyncTask("load", ["$query"] as const, (values) => {
      const query = String(values.get("$query"));
      started.push(query);
      return query === "first" ? firstGate.promise : secondGate.promise;
    }),
  ] as const);
  let missing = false, extra = false;
  try { createTaskExecutionFromDefinition(definition, {}); }
  catch (error) { missing = error instanceof Error && error.message.includes("missing"); }
  try { createTaskExecutionFromDefinition(definition, { $query: "first", extra: true }); }
  catch (error) { extra = error instanceof Error && error.message.includes("extra"); }
  assertEquals([missing, extra, started], [true, true, []]);

  const first = createTaskExecutionFromDefinition(definition, { $query: "first" });
  const second = createTaskExecutionFromDefinition(definition, { $query: "second" });
  const firstResource = first.resource("load");
  const secondResource = second.resource("load");
  assert(firstResource !== secondResource);
  assertEquals(started, ["first", "second"]);
  assertEquals([first.snapshot().started, second.snapshot().started], [["load"], ["load"]]);

  const reason = new Error("first candidate superseded");
  first.cancel(reason);
  assertEquals((await first.completion).status, "aborted");
  assertEquals(firstResource.status.status, "rejected");
  if (firstResource.status.status === "rejected") assert(firstResource.status.reason === reason);
  assertEquals(secondResource.status.status, "pending");
  firstGate.resolve("late first");
  secondGate.resolve("accepted second");
  assertEquals((await second.completion).status, "complete");
  assertEquals(secondResource.read(), "accepted second");
  assertEquals(firstResource.status.status, "rejected");
});

Deno.test("native task execution disposal preserves held fulfilled resources and is idempotent", async () => {
  const tasks = [asyncTask("ready", () => 42)] as const;
  const execution = createTaskExecution(tasks, {});
  const resource = execution.resource("ready");
  await execution.completion;
  execution.dispose();
  execution.dispose();
  assertEquals(resource.read(), 42);
  assertEquals(execution.snapshot().status, "complete");
  let disposedResourceRejected = false;
  try {
    execution.resource("ready");
  } catch (error) {
    disposedResourceRejected = error instanceof Error && error.message.includes("disposed");
  }
  assert(disposedResourceRejected);

  const gate = deferred<string>();
  const pendingExecution = createTaskExecution(
    [asyncTask("pending", () => gate.promise)] as const,
    {},
  );
  const pendingResource = pendingExecution.resource("pending");
  pendingExecution.dispose();
  pendingExecution.dispose();
  assertEquals((await pendingExecution.completion).status, "aborted");
  assertEquals(pendingResource.status.status, "rejected");
  gate.resolve("late after dispose");
  await Promise.resolve();
  assertEquals(pendingResource.status.status, "rejected");
});
