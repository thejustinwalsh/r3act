import {
  ComponentStateRoot,
  defineComponent,
  useStateAt,
} from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";
import {
  invalidateCompiledSemanticPlan,
  registerCompiledSemanticPlan,
  type CompiledSemanticPlan,
} from "./compiled_semantic_plan.ts";

const plan = (sourceFile: string, moduleRevision: string): CompiledSemanticPlan => ({
  schema_version: 1,
  source_file: sourceFile,
  module_revision: moduleRevision,
  owners: [],
  sources: [],
  sinks: [],
  operations: [],
  graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
});
const assert = (value: unknown, label: string) => {
  if (!value) throw new Error(label);
};

Deno.test("a prepared compiled owner cannot publish after its module revision changes", () => {
  const sourceFile = "revision-contract/prepared-owner.tsx";
  registerCompiledSemanticPlan(plan(sourceFile, "revision-a"));
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "revision-prepared-owner",
    scheduleCommit() {},
  });
  try {
    const Old = defineComponent(`${sourceFile}#component:Old`, () => jsx("span", {}, "old"));
    const candidate = root.prepare(jsx(Old, {}));
    assert(candidate.validate(), "initial candidate should validate");
    registerCompiledSemanticPlan(plan(sourceFile, "revision-b"));
    assert(!candidate.validate(), "revision change must stale prepared candidate");
    let rejected = false;
    try { candidate.commitHost(); } catch { rejected = true; }
    assert(rejected, "stale candidate reached host application");
    assert(container.children.length === 0, "stale candidate wrote to host");
    candidate.discard();
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("HMR invalidates mounted nonnumeric owners before direct root work", () => {
  const sourceFile = "revision-contract/mounted-owner.tsx";
  registerCompiledSemanticPlan(plan(sourceFile, "revision-a"));
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "revision-mounted-owner",
    scheduleCommit() {},
  });
  try {
    const Old = defineComponent(`${sourceFile}#component:Old`, () => {
      const [value] = useStateAt("value", 1);
      return jsx("span", {}, String(value));
    });
    root.mount(jsx(Old, {}));
    const acceptedVersion = root.version;
    assert(container.children.length === 1, "initial owner did not mount");
    assert(invalidateCompiledSemanticPlan(sourceFile, "revision-a"), "HMR invalidation missed module");
    let rejected = false;
    try { root.flush(); } catch (error) {
      rejected = /module changed|remount/i.test(String(error));
    }
    assert(rejected, "obsolete mounted root continued direct work");
    assert(root.version === acceptedVersion, "obsolete root advanced its version");
  } finally {
    root.dispose();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});
