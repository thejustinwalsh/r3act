import {
  bindStatePropAt,
  bindStatePropsAt,
  ComponentStateRoot,
  defineComponent,
  useStateAt,
} from "./component_state_runtime.ts";
import { bindSources, jsx, ScalarSource } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const assertEquals = (actual: unknown, expected: unknown, message: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `${message}: expected ${String(expected)}, got ${String(actual)}`,
    );
  }
};

const program = (sinkId: string, sourceSites: readonly string[]) => ({
  schemaVersion: 1 as const,
  sinkId,
  sourceSites,
});

Deno.test("program host disposal stops later writers and releases root buffers", () => {
  let root!: ComponentStateRoot<MemoryNode, MemoryNode>;
  let update!: (value: number) => boolean;
  const writes: string[] = [];
  class Host extends MemoryVDOMHost {
    disposeDuringWrite = false;
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      super.setProp(node, name, value, previous);
      if (this.disposeDuringWrite) {
        writes.push(name);
        if (name === "first") root.dispose();
      }
    }
  }
  const host = new Host();
  const container = host.createContainer();
  root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("program-dispose", () => {
    const [, set] = useStateAt("value", 1);
    update = set;
    return jsx("output", {
      first: bindStatePropAt(
        "value",
        (value) => value,
        program("first", ["value"]),
      ),
      second: bindStatePropAt(
        "value",
        (value) => value * 2,
        program("second", ["value"]),
      ),
    });
  }, { propOnlySites: ["value"] });
  root.mount(jsx(Output, {}));
  host.disposeDuringWrite = true;
  update(2);
  root.flush();
  assertEquals(
    writes.join(","),
    "first",
    "disposed hosts receive no later writer",
  );
  assertEquals(container.children.length, 0, "host tree is removed");
  assertEquals(
    root.diagnostics().ownerCount,
    0,
    "disposed owner graph is empty",
  );
  assertEquals(
    root.diagnostics().pendingChangeCount,
    0,
    "pending work is released",
  );
});

Deno.test("numeric programs project a compound captured cut and share sources", () => {
  let setA!: (value: number) => boolean;
  let setB!: (value: number) => boolean;
  let sumWrites = 0;
  class Host extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      super.setProp(node, name, value, previous);
      if (name === "data-sum") sumWrites++;
    }
  }
  const host = new Host();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("numeric-program-compound", () => {
    const [, updateA] = useStateAt("a", 1);
    const [, updateB] = useStateAt("b", 2);
    setA = updateA;
    setB = updateB;
    return jsx("output", {
      "data-sum": bindStatePropsAt(
        ["a", "b"],
        ([a, b]) => a + b,
        program("output.data-sum", ["a", "b"]),
      ),
      "data-a2": bindStatePropAt(
        "a",
        (a) => a * 2,
        program("output.data-a2", ["a"]),
      ),
    });
  }, { propOnlySites: ["a", "b"] });
  try {
    root.mount(jsx(Output, {}));
    setA(4);
    setB(7);
    root.flush();
    const output = container.children[0];
    assertEquals(
      output.props["data-sum"],
      11,
      "compound sink sees both captured values",
    );
    assertEquals(
      output.props["data-a2"],
      8,
      "shared source also updates its unary sink",
    );
    const committedSumWrites = sumWrites;
    // Different source values with the same derived output should not write the sink.
    setA(2);
    setB(9);
    root.flush();
    assertEquals(
      output.props["data-sum"],
      11,
      "equal compound output remains stable",
    );
    assertEquals(
      sumWrites,
      committedSumWrites,
      "equal compound output skips host write",
    );
  } finally {
    root.dispose();
  }
});

Deno.test("numeric program reentry leaves newer source version pending", () => {
  let setA!: (value: number) => boolean;
  let setB!: (value: number) => boolean;
  class Host extends MemoryVDOMHost {
    reenter = false;
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      super.setProp(node, name, value, previous);
      if (this.reenter && name === "data-sum") {
        this.reenter = false;
        setB(9);
      }
    }
  }
  const host = new Host();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("numeric-program-reentry", () => {
    const [, updateA] = useStateAt("a", 1);
    const [, updateB] = useStateAt("b", 1);
    setA = updateA;
    setB = updateB;
    return jsx("output", {
      "data-sum": bindStatePropsAt(
        ["a", "b"],
        ([a, b]) => a + b,
        program("output.data-sum", ["a", "b"]),
      ),
    });
  }, { propOnlySites: ["a", "b"] });
  try {
    root.mount(jsx(Output, {}));
    setA(2);
    host.reenter = true;
    root.flush();
    const output = container.children[0];
    assertEquals(
      output.props["data-sum"],
      3,
      "first commit uses its captured cut",
    );
    root.flush();
    assertEquals(
      output.props["data-sum"],
      11,
      "reentrant version is committed next",
    );
  } finally {
    root.dispose();
  }
});

Deno.test("bindings without a numeric descriptor keep the generic path", () => {
  let setValue!: (value: number) => boolean;
  const host = new MemoryVDOMHost();
  const rootContainer = host.createContainer();
  const root = new ComponentStateRoot(host, rootContainer, {
    scheduleCommit() {},
  });
  const Output = defineComponent("numeric-program-generic", () => {
    const [, update] = useStateAt("value", 1);
    setValue = update;
    return jsx("output", {
      value: bindStatePropsAt(["value"], ([value]) => value * 3),
    });
  }, { propOnlySites: ["value"] });
  try {
    root.mount(jsx(Output, {}));
    setValue(4);
    root.flush();
    assertEquals(
      rootContainer.children[0].props.value,
      12,
      "generic binding still updates",
    );
  } finally {
    root.dispose();
  }
});

Deno.test("one unannotated shared sink demotes the source to generic updates", () => {
  let setValue!: (value: number) => boolean;
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("numeric-program-demotion", () => {
    const [, update] = useStateAt("value", 1);
    setValue = update;
    return jsx("output", {
      "data-program": bindStatePropAt(
        "value",
        (value) => value * 2,
        program("output.data-program", ["value"]),
      ),
      "data-generic": bindStatePropAt("value", (value) => value * 3),
    });
  }, { propOnlySites: ["value"] });
  try {
    root.mount(jsx(Output, {}));
    setValue(4);
    root.flush();
    const output = container.children[0];
    assertEquals(
      output.props["data-program"],
      8,
      "program sink updates after demotion",
    );
    assertEquals(
      output.props["data-generic"],
      12,
      "generic shared sink remains coherent",
    );
  } finally {
    root.dispose();
  }
});

Deno.test("validated program descriptors are frozen for retained eligibility", () => {
  let setValue!: (value: number) => boolean;
  const descriptor = program("output.value", ["value"]);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("numeric-program-frozen", () => {
    const [, update] = useStateAt("value", 2);
    setValue = update;
    return jsx("output", {
      value: bindStatePropAt("value", (value) => value * 2, descriptor),
    });
  }, { propOnlySites: ["value"] });
  try {
    root.mount(jsx(Output, {}));
    assertEquals(
      Object.isFrozen(descriptor),
      true,
      "descriptor is frozen at validation",
    );
    assertEquals(
      Object.isFrozen(descriptor.sourceSites),
      true,
      "source site list is frozen at validation",
    );
    let rejected = false;
    try {
      (descriptor as { sinkId: string }).sinkId = "changed";
    } catch {
      rejected = true;
    }
    assertEquals(rejected, true, "manual descriptor mutation is rejected");
    setValue(5);
    root.flush();
    assertEquals(
      container.children[0].props.value,
      10,
      "retained program remains valid",
    );
  } finally {
    root.dispose();
  }
});

Deno.test("only descriptor-backed compound bindings reuse their input array", () => {
  const left = new ScalarSource(1, 2);
  const right = new ScalarSource(2, 3);
  const legacy = bindSources([left, right], (values) => values);
  const legacyFirst = legacy.read!() as readonly number[];
  left.value = 5;
  const legacySecond = legacy.read!() as readonly number[];
  assertEquals(
    legacyFirst === legacySecond,
    false,
    "legacy reads allocate independent arrays",
  );
  assertEquals(legacyFirst[0], 2, "retained legacy input remains unchanged");
  assertEquals(
    legacySecond[0],
    5,
    "next legacy input captures the new source value",
  );

  const compiled = bindSources(
    [left, right],
    (values) => values,
    program("compiled.pair", ["left", "right"]),
  );
  const compiledFirst = compiled.read!() as readonly number[];
  right.value = 8;
  const compiledSecond = compiled.read!() as readonly number[];
  assertEquals(
    compiledFirst === compiledSecond,
    true,
    "compiled reads reuse one activation buffer",
  );
  assertEquals(
    compiledFirst[1],
    8,
    "reused compiled buffer reflects current canonical sources",
  );
});

Deno.test("root numeric source scratch arrays retain high-water length", () => {
  let setA!: (value: number) => boolean;
  let setB!: (value: number) => boolean;
  const flushCounters: Record<string, number>[] = [];
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    scheduleCommit() {},
    profileCounter: (counters) => flushCounters.push(counters),
  });
  const Output = defineComponent("numeric-program-buffer-capacity", () => {
    const [, updateA] = useStateAt("a", 1);
    const [, updateB] = useStateAt("b", 2);
    setA = updateA;
    setB = updateB;
    return jsx("output", {
      "data-a": bindStatePropAt("a", (value) => value, program("out.a", ["a"])),
      "data-b": bindStatePropAt("b", (value) => value, program("out.b", ["b"])),
    });
  }, { propOnlySites: ["a", "b"] });
  try {
    root.mount(jsx(Output, {}));
    setA(3);
    root.flush();
    setA(4);
    setB(5);
    root.flush();
    setA(6);
    root.flush();
    const capacities = flushCounters.map((counters) =>
      counters["numeric.program-source-buffer-capacity"]
    );
    assertEquals(
      capacities.join(","),
      "1,2,2",
      "source buffer length follows its high-water mark",
    );
  } finally {
    root.dispose();
  }
});
