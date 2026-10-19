import {
  AsyncResource,
  asyncTask,
  createStore,
  createTaskExecution,
  use,
  useStore,
} from "./native_runtime_api.ts";

// Deno checks this body's inferred public types without executing authored hooks.
function checkPublicReadTypes() {
  const store = createStore({ score: 1 });
  const state: { score: number } = use(store);
  const score: number = use(store.select((value) => value.score));
  const promise = Promise.resolve("ready");
  const promiseStore = createStore(promise);
  const stored: Promise<string> = use(promiseStore);
  const unwrapped: string = use(use(promiseStore));
  const resolved: string = use(promise);
  const resourceValue: string = use(new AsyncResource(promise));
  const legacy: Promise<string> = useStore(promiseStore);
  // @ts-expect-error Store reads preserve Promise values; they do not unwrap.
  const invalid: string = use(promiseStore);
  // @ts-expect-error Plain values are not readable sources.
  use(42);
  return {
    state,
    score,
    stored,
    unwrapped,
    resolved,
    resourceValue,
    legacy,
    invalid,
  };
}

Deno.test("public use types distinguish store values from async resource reads", () => {
  if (typeof checkPublicReadTypes !== "function") {
    throw new Error("Missing type fixture");
  }
});

Deno.test("authored use requires compiler lowering", () => {
  try {
    use(createStore(1));
  } catch (error) {
    if (
      error instanceof Error && error.message.includes("native compiled hook")
    ) return;
    throw error;
  }
  throw new Error("Uncompiled authored use unexpectedly executed");
});

Deno.test("native inferred task declarations require compilation", () => {
  try {
    asyncTask("uncompiled", () => 42);
  } catch (error) {
    if (
      error instanceof Error && error.message.includes("native compiled hook")
    ) return;
    throw error;
  }
  throw new Error("Uncompiled inferred task unexpectedly executed");
});

Deno.test("explicit native tasks expose typed output resources", async () => {
  const tasks = [asyncTask("count", [], () => 42)] as const;
  const execution = createTaskExecution(tasks, {});
  const output: AsyncResource<number> = execution.resource("count");
  await execution.completion;
  if (output.read() !== 42) throw new Error("Task result was lost");
  execution.dispose();
});
