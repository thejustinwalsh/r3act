import {
  bindStatePropsAt,
  ComponentStateRoot,
  defineComponent,
  useEffectAt,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const equal = (actual: unknown, expected: unknown, label: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${label}: ${actual} != ${expected}`);
  }
};

Deno.test("store region publication stages numeric writes before new refs and conditional effects", () => {
  const store = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  const hotRef = { current: null as MemoryNode | null };
  const observations: number[] = [], refObservations: number[] = [];
  let setValue!: (value: number) => boolean;
  let renders = 0, setups = 0, cleanups = 0;
  const Hot = defineComponent("sparse-publish-hot", () => {
    renders++;
    const [value, set] = useStateAt("value", 0);
    setValue = set;
    return jsx("output", {
      ref: hotRef,
      "data-value": bindStatePropsAt(["value"], ([next]) => next),
    });
  }, { propOnlySites: ["value"], hostLeafOutput: true });
  const Reader = defineComponent("sparse-publish-reader", () => {
    const phase = useStoreAt("phase", store);
    if (phase > 0) {
      useEffectAt("fresh", () => {
        setups++;
        observations.push(hotRef.current!.props["data-value"] as number);
        return () => {
          cleanups++;
        };
      });
    }
    return jsx(
      "section",
      { "data-phase": phase },
      phase > 0
        ? jsx("i", {
          ref: (node: MemoryNode | null) => {
            if (node) {
              refObservations.push(
                hotRef.current!.props["data-value"] as number,
              );
            }
          },
        }, "ready")
        : null,
    );
  }, { propOnlySites: [], hostLeafOutput: true });
  const App = defineComponent(
    "sparse-publish-app",
    () => jsx("main", {}, [jsx(Hot, {}), jsx(Reader, {})]),
  );
  const host = new MemoryVDOMHost(), container = host.createContainer();
  let sparseCommitted = false;
  const root = new ComponentStateRoot(host, container, {
    scheduleCommit() {},
    profileCounter(counters) {
      sparseCommitted ||= counters["store.sparse.reader-owner-renders"] === 1;
    },
  });
  root.mount(jsx(App, {}));
  const retained = hotRef.current;
  setValue(8);
  store.dispatch(1);
  root.flush();
  equal(hotRef.current, retained, "cached numeric host identity");
  equal(renders, 1, "cached numeric owner");
  equal(sparseCommitted, true, "fixture exercised sparse publication");
  equal(
    observations.join(","),
    "8",
    "new conditional effect reads current numeric props",
  );
  equal(refObservations.join(","), "8", "new ref reads current numeric props");
  setValue(0);
  root.flush();
  equal(
    hotRef.current!.props["data-value"],
    0,
    "numeric history advances through sparse store publication",
  );
  equal(setups, 1, "numeric updates do not reactivate effects");
  store.dispatch(1);
  root.flush();
  equal(setups, 1, "retained store effects remain mount-only");
  root.dispose();
  equal(cleanups, 1, "conditional effect cleans once");
  equal(store.diagnostics().readers, 0, "store readers released");
});

Deno.test("urgent store region publication invalidates an older prepared root candidate", () => {
  const store = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  let effects = 0, cleanups = 0;
  const Reader = defineComponent("sparse-stale-reader", () => {
    const value = useStoreAt("value", store);
    return jsx("output", { "data-value": value }, String(value));
  }, { propOnlySites: [], hostLeafOutput: true });
  const Pending = defineComponent("sparse-stale-pending", () => {
    useEffectAt("pending", () => {
      effects++;
      return () => {
        cleanups++;
      };
    });
    return jsx("aside", {}, "pending");
  });
  const App = defineComponent(
    "sparse-stale-app",
    ({ pending }: { pending: boolean }) =>
      jsx("main", {}, [jsx(Reader, {}), pending ? jsx(Pending, {}) : null]),
  );
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "sparse-stale-root",
    scheduleCommit() {},
  });
  root.mount(jsx(App, { pending: false }));
  const candidate = root.prepare(jsx(App, { pending: true }), { renderPreparation: "repeatable" });
  equal(candidate.validate(), true, "older preparation initially valid");
  store.dispatch(1);
  root.flush();
  equal(
    container.children[0].children[0].props["data-value"],
    1,
    "urgent store projection",
  );
  equal(
    candidate.validate(),
    false,
    "older preparation stale after urgent publication",
  );
  let stale = false;
  try {
    candidate.commitHost();
  } catch (error) {
    stale = error instanceof Error && error.message.includes("stale");
  }
  equal(stale, true, "stale candidate cannot touch host");
  candidate.discard();
  equal(effects, 0, "abandoned owner effect never activates");
  equal(
    container.children[0].children.length,
    1,
    "abandoned owner never mounts",
  );
  store.dispatch(1);
  root.flush();
  equal(
    container.children[0].children[0].props["data-value"],
    2,
    "root remains usable after stale candidate",
  );
  root.dispose();
  equal(cleanups, 0, "abandoned effect has no cleanup");
  equal(store.diagnostics().roots, 0, "candidate store interests released");
});

Deno.test("store-region preparation propagates user errors without a hidden rerender", () => {
  const store = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  const failure = new Error("reader failed once");
  let failOnce = false, renders = 0;
  const Reader = defineComponent("sparse-error-reader", () => {
    renders++;
    const value = useStoreAt("value", store);
    if (failOnce) {
      failOnce = false;
      throw failure;
    }
    return jsx("output", { "data-value": value });
  }, { propOnlySites: [], hostLeafOutput: true });
  const App = defineComponent(
    "sparse-error-app",
    () => jsx("main", {}, jsx(Reader, {})),
  );
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  root.mount(jsx(App, {}));
  failOnce = true;
  store.dispatch(1);
  let caught: unknown;
  try {
    root.flush();
  } catch (error) {
    caught = error;
  }
  equal(caught, failure, "original render error identity");
  equal(renders, 2, "failed reader was not secretly rendered again");
  equal(
    container.children[0].children[0].props["data-value"],
    0,
    "failed preparation never changed host",
  );
  root.flush();
  equal(
    container.children[0].children[0].props["data-value"],
    1,
    "a later explicit retry can publish",
  );
  root.dispose();
  equal(
    store.diagnostics().roots,
    0,
    "failed transaction leaves no root interest after teardown",
  );
});

Deno.test("store-region commit removes a numeric sink before staged numeric writers", () => {
  const store = createAsyncStore(
    0,
    (state: number, action: number) => state + action,
  );
  let setValue!: (value: number) => boolean;
  let seen: unknown = "not observed";
  const ref = { current: null as MemoryNode | null };
  class TrackingHost extends MemoryVDOMHost {
    numericWrites: unknown[] = [];
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous: unknown,
    ) {
      if (name === "data-value" && value !== undefined) {
        this.numericWrites.push(value);
      }
      super.setProp(node, name, value, previous);
    }
  }
  const Reader = defineComponent("sparse-removed-numeric-reader", () => {
    const phase = useStoreAt("phase", store);
    const [value, set] = useStateAt("value", 0);
    setValue = set;
    if (phase > 0) {
      useEffectAt("removed", () => {
        seen = ref.current!.props["data-value"];
      });
    }
    return jsx("output", {
      ref,
      ...(phase === 0
        ? {
          "data-value": bindStatePropsAt(["value"], ([next]) => next),
        }
        : {}),
    });
  }, { propOnlySites: ["value"], hostLeafOutput: true });
  const App = defineComponent(
    "sparse-removed-numeric-app",
    () => jsx("main", {}, jsx(Reader, {})),
  );
  const host = new TrackingHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  root.mount(jsx(App, {}));
  host.numericWrites.length = 0;
  setValue(4);
  store.dispatch(1);
  root.flush();
  equal(
    host.numericWrites.length,
    0,
    "numeric writer did not target the removed sink",
  );
  equal(seen, undefined, "new effect sees removed prop");
  root.dispose();
});
