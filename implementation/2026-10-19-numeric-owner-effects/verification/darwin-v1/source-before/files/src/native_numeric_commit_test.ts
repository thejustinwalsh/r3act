import {
  bindStatePropsAt,
  ComponentStateRoot,
  defineComponent,
  useEffectAt,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { createAsyncStore } from "./async_store_runtime.ts";
import { Fragment, jsx, type ScalarSource } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const equal = (actual: unknown, expected: unknown, message: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
};

const rootFor = (host = new MemoryVDOMHost()) => {
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  return { root, container };
};

Deno.test("candidate numeric writes are visible to refs and effects with store work", () => {
  const store = createAsyncStore(0, (state: number, action: number) => state + action);
  let setValue!: (value: number) => boolean;
  const outputRef: { current: MemoryNode | null } = { current: null };
  const seen: number[] = [];
  const refSeen: number[] = [];
  const Observer = defineComponent("numeric-commit-observer", () => {
    useEffectAt("observe-numeric", () => {
      if (outputRef.current) {
        seen.push(outputRef.current.props["data-value"] as number);
      }
    });
    return jsx("i", { ref: (node: MemoryNode | null) => {
      if (node && outputRef.current) refSeen.push(outputRef.current.props["data-value"] as number);
    } }, "observer");
  });
  const Direct = defineComponent("numeric-commit-direct", () => {
    const [value, set] = useStateAt("value", 1);
    setValue = set;
    return jsx("output", {
      ref: outputRef,
      "data-value": bindStatePropsAt(["value"], ([next]) => next),
    });
  }, { propOnlySites: ["value"] });
  const Reader = defineComponent("numeric-commit-reader", () => {
    const version = useStoreAt("version", store);
    return jsx(Fragment, {}, [jsx("span", {}, String(version)), version
      ? jsx(Observer, {})
      : null]);
  });
  const { root } = rootFor();
  root.mount(jsx(Fragment, {}, [jsx(Direct, {}), jsx(Reader, {})]));
  setValue(8);
  store.dispatch(1);
  root.flush();
  equal(outputRef.current?.props["data-value"], 8, "ref observes candidate prop");
  equal(seen.join(","), "8", "effects observe staged numeric prop");
  equal(refSeen.join(","), "8", "new ref callback observes staged numeric prop");
  root.dispose();
});

Deno.test("candidate numeric writes precede effects and refs on structural work", () => {
  let setValue!: (value: number) => boolean;
  let add!: (value: boolean) => boolean;
  const outputRef: { current: MemoryNode | null } = { current: null };
  const seen: number[] = [];
  const Observer = defineComponent("numeric-structural-observer", () => {
    useEffectAt("observe-structural", () => {
      if (outputRef.current) {
        seen.push(outputRef.current.props["data-value"] as number);
      }
    });
    return jsx("i", {}, "observer");
  });
  const Direct = defineComponent("numeric-structural-direct", () => {
    const [value, set] = useStateAt("value", 2);
    setValue = set;
    return jsx("output", {
      ref: outputRef,
      "data-value": bindStatePropsAt(["value"], ([next]) => next),
    });
  }, { propOnlySites: ["value"] });
  const Structure = defineComponent("numeric-structural-owner", () => {
    const [extra, set] = useStateAt("extra", false);
    add = set;
    return jsx("section", {}, extra ? jsx(Observer, {}) : null);
  });
  const { root } = rootFor();
  root.mount(jsx(Fragment, {}, [jsx(Direct, {}), jsx(Structure, {})]));
  setValue(9);
  add(true);
  root.flush();
  equal(outputRef.current?.props["data-value"], 9, "structural candidate prop");
  equal(seen.join(","), "9", "structural effects observe staged prop");
  root.dispose();
});

Deno.test("candidate skips a numeric sink removed by the same update", () => {
  let remove!: (value: boolean) => boolean;
  let setValue!: (value: number) => boolean;
  const Direct = defineComponent("numeric-removal-direct", () => {
    const [value, set] = useStateAt("value", 0);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropsAt(["value"], ([next]) => next),
    });
  }, { propOnlySites: ["value"] });
  const Parent = defineComponent("numeric-removal-parent", () => {
    const [hidden, set] = useStateAt("hidden", false);
    remove = set;
    return hidden ? null : jsx(Direct, {});
  });
  const { root, container } = rootFor();
  root.mount(jsx(Parent, {}));
  setValue(5);
  remove(true);
  root.flush();
  equal(container.children.length, 0, "removed numeric subtree");
  root.dispose();
});

Deno.test("candidate numeric writer failure is terminal and effects do not run", () => {
  class ThrowingHost extends MemoryVDOMHost {
    fail = false;
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      if (this.fail && name === "data-value" && Object.is(value, 7)) {
        // This is also the VDOM's missing-source diagnostic. It must remain a
        // user writer failure because the source is known to be bound.
        throw new Error("Scalar source is not bound in this VDOM root");
      }
      super.setProp(node, name, value, previous);
    }
  }
  let setValue!: (value: number) => boolean;
  let setShape!: (value: boolean) => boolean;
  let effects = 0;
  let candidateEffects = 0;
  let candidateRefs = 0;
  const NewObserver = defineComponent("numeric-failure-new-observer", () => {
    useEffectAt("new-effect", () => { candidateEffects++; });
    return jsx("i", { ref: (node: MemoryNode | null) => { if (node) candidateRefs++; } });
  });
  const Direct = defineComponent("numeric-failure-direct", () => {
    const [value, set] = useStateAt("value", 1);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropsAt(["value"], ([next]) => next),
    });
  }, { propOnlySites: ["value"] });
  const Shape = defineComponent("numeric-failure-shape", () => {
    const [extra, set] = useStateAt("extra", false);
    setShape = set;
    useEffectAt("failure-effect", () => {
      effects++;
    });
    return jsx("section", {}, extra ? jsx(NewObserver, {}) : null);
  });
  const host = new ThrowingHost();
  const { root, container } = rootFor(host);
  root.mount(jsx(Fragment, {}, [jsx(Direct, {}), jsx(Shape, {})]));
  host.fail = true;
  setValue(7);
  setShape(true);
  let message = "";
  try {
    root.flush();
  } catch (error) {
    message = String(error);
  }
  equal(
    message.includes("Scalar source is not bound in this VDOM root"),
    true,
    "writer error with the same text as the missing-source diagnostic",
  );
  equal(effects, 1, "candidate effects did not publish");
  equal(candidateEffects, 0, "new effect must not activate after a writer failure");
  equal(candidateRefs, 0, "new ref must not attach after a writer failure");
  let terminal = "";
  try {
    root.update(null);
  } catch (error) {
    terminal = String(error);
  }
  equal(terminal.includes("cannot continue after a host commit failure"), true, "terminal root");
  root.dispose();
  equal(container.children.length, 0, "failed numeric candidate releases its host tree");
  equal(candidateRefs, 0, "teardown does not publish an abandoned ref");
});

Deno.test("numeric plan recaptures state after a reentrant stale store read", () => {
  const first = createAsyncStore(0, (state: number, action: number) => state + action);
  const second = createAsyncStore(0, (state: number, action: number) => state + action);
  let reenter = false;
  const selection = first.select((state) => {
    if (reenter) {
      reenter = false;
      setValue(6);
      second.dispatch(1);
    }
    return state;
  });
  let setValue!: (value: number) => boolean;
  const host = new class extends MemoryVDOMHost {
    writes: unknown[] = [];
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (name === "data-value") this.writes.push(value);
      super.setProp(node, name, value, previous);
    }
  }();
  const Direct = defineComponent("numeric-reentrant-direct", () => {
    const [value, set] = useStateAt("value", 0);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropsAt(["value"], ([next]) => next),
    });
  }, { propOnlySites: ["value"] });
  const Reader = defineComponent("numeric-reentrant-reader", () => {
    const left = useStoreAt("left", selection);
    const right = useStoreAt("right", second);
    return jsx("span", {}, `${left}:${right}`);
  });
  const { root } = rootFor(host);
  root.mount(jsx(Fragment, {}, [jsx(Direct, {}), jsx(Reader, {})]));
  host.writes.length = 0;
  reenter = true;
  setValue(4);
  first.dispatch(1);
  root.flush();
  root.flush();
  equal(host.writes.join(","), "6", "retry recaptured the newest state and wrote once");
  root.dispose();
});

Deno.test("numeric-only host writer reentry survives and flushes on the next pass", () => {
  let setValue!: (value: number) => boolean;
  let source!: ScalarSource;
  let reenter = false;
  const host = new class extends MemoryVDOMHost {
    writes: number[] = [];
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (name === "data-value") {
        this.writes.push(value as number);
        if (reenter) {
          reenter = false;
          setValue(9);
        }
      }
      super.setProp(node, name, value, previous);
    }
  }();
  const Direct = defineComponent("numeric-fastpath-reentrant-direct", () => {
    const [, set] = useStateAt("value", 0);
    setValue = set;
    const binding = bindStatePropsAt(["value"], ([value]) => value);
    source = binding.source;
    return jsx("output", { "data-value": binding });
  }, { propOnlySites: ["value"] });
  const { root, container } = rootFor(host);
  root.mount(jsx(Direct, {}));
  host.writes.length = 0;
  setValue(2);
  reenter = true;
  root.flush();
  equal(host.writes.join(","), "2", "first numeric-only pass writes its captured value");
  equal(source.value, 9, "first pass preserves the newer source value");
  equal(root.diagnostics().pendingChangeCount, 1, "newer change remains pending");
  root.flush();
  equal(host.writes.join(","), "2,9", "next pass writes the reentrant value");
  equal(container.children[0].props["data-value"], 9, "host receives newest value");
  equal(root.diagnostics().pendingChangeCount, 0, "newest change is acknowledged");
  root.dispose();
});

Deno.test("numeric-only host writer failure preserves a reentrant source value", () => {
  let setValue!: (value: number) => boolean;
  let source!: ScalarSource;
  let reenter = false;
  const host = new class extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (reenter && name === "data-value") {
        reenter = false;
        setValue(9);
        throw new Error("numeric-only writer failed");
      }
      super.setProp(node, name, value, previous);
    }
  }();
  const Direct = defineComponent("numeric-fastpath-throwing-direct", () => {
    const [, set] = useStateAt("value", 0);
    setValue = set;
    const binding = bindStatePropsAt(["value"], ([value]) => value);
    source = binding.source;
    return jsx("output", { "data-value": binding });
  }, { propOnlySites: ["value"] });
  const { root } = rootFor(host);
  root.mount(jsx(Direct, {}));
  setValue(2);
  reenter = true;
  let failure = "";
  try {
    root.flush();
  } catch (error) {
    failure = String(error);
  }
  equal(failure.includes("numeric-only writer failed"), true, "writer error propagates");
  equal(source.value, 9, "failure cleanup preserves the reentrant value");
  equal(root.diagnostics().pendingChangeCount, 1, "failed pass leaves change pending");
  root.dispose();
});

Deno.test("candidate batches compound numeric sources before writing a shared prop", () => {
  const store = createAsyncStore(false);
  let setX!: (value: number) => boolean;
  let setY!: (value: number) => boolean;
  let renders = 0;
  const host = new class extends MemoryVDOMHost {
    writes: unknown[] = [];
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (name === "data-total") this.writes.push(value);
      super.setProp(node, name, value, previous);
    }
  }();
  const Direct = defineComponent("numeric-batch-direct", () => {
    renders++;
    const [, x] = useStateAt("x", 0);
    const [, y] = useStateAt("y", 0);
    setX = x;
    setY = y;
    return jsx("output", {
      "data-total": bindStatePropsAt(["x", "y"], ([a, b]) => a + b),
    });
  }, { propOnlySites: ["x", "y"] });
  const Reader = defineComponent("numeric-batch-reader", () =>
    jsx("span", {}, String(useStoreAt("state", store)))
  );
  const { root, container } = rootFor(host);
  root.mount(jsx(Fragment, {}, [jsx(Direct, {}), jsx(Reader, {})]));
  host.writes.length = 0;
  setX(3);
  setY(5);
  store.dispatch(true);
  root.flush();
  equal(renders, 1, "compound writer owner stays cached");
  equal(host.writes.join(","), "8", "shared prop writes the complete tuple once");
  equal(container.children[0].props["data-total"], 8, "compound prop projection");
  root.dispose();
  equal(store.diagnostics().roots, 0, "compound store root cleanup");
});

Deno.test("state mutation during a staged host writer publishes captured output and preserves the newer source", () => {
  let setValue!: (value: number) => boolean;
  let setShow!: (value: boolean) => boolean;
  let source!: ScalarSource;
  let reenter = false;
  let effects = 0;
  let refs = 0;
  const host = new class extends MemoryVDOMHost {
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      if (reenter && name === "data-value") {
        reenter = false;
        setValue(9);
      }
      super.setProp(node, name, value, previous);
    }
  }();
  const Direct = defineComponent("numeric-host-reentry-direct", () => {
    const [, set] = useStateAt("value", 0);
    setValue = set;
    const binding = bindStatePropsAt(["value"], ([value]) => value);
    source = binding.source;
    return jsx("output", { "data-value": binding });
  }, { propOnlySites: ["value"] });
  const Observer = defineComponent("numeric-host-reentry-observer", () => {
    useEffectAt("observe", () => { effects++; });
    return jsx("i", { ref: (node: MemoryNode | null) => { if (node) refs++; } });
  });
  const Shape = defineComponent("numeric-host-reentry-shape", () => {
    const [show, set] = useStateAt("show", false);
    setShow = set;
    return jsx("section", {}, show ? jsx(Observer, {}) : null);
  });
  const { root, container } = rootFor(host);
  root.mount(jsx(Fragment, {}, [jsx(Direct, {}), jsx(Shape, {})]));
  setValue(2);
  setShow(true);
  reenter = true;
  equal(root.flush(), true, "captured structural candidate publishes");
  equal(source.value, 9, "captured acknowledgement must not overwrite reentrant state");
  equal(container.children[0].props["data-value"], 2,
    "accepted host output retains the captured value");
  equal(effects, 1, "accepted candidate effect runs");
  equal(refs, 1, "accepted candidate ref attaches");
  equal(root.diagnostics().pendingChangeCount, 1, "newer host action stays pending");
  equal(root.flush(), true, "newer host action publishes on a later pass");
  equal(container.children[0].props["data-value"], 9,
    "later pass displays the newer value");
  equal(root.diagnostics().pendingChangeCount, 0, "later pass acknowledges newer action");
  root.dispose();
  equal(container.children.length, 0, "disposed root releases its host tree");
});
