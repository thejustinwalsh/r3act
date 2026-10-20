import assert from "node:assert/strict";
import { createNativeRoot, jsx } from "./source/src/native_runtime_api.ts";
import { MemoryVDOMHost } from "./source/src/vdom_snapshot_runtime.ts";

const host = new MemoryVDOMHost();
const aContainer = host.createContainer(), bContainer = host.createContainer();
const options = rootId => ({ rootId, scheduleCommit() {} });
const a = createNativeRoot(host, aContainer, options("old-domain-a"));
const b = createNativeRoot(host, bContainer, options("old-domain-b"));
const tree = phase => jsx("output", { phase });
const trace = [];
let primary;
try {
  a.mount(tree(0)); b.mount(tree(0));
  const bAccepted = b.publicationVersion;
  const write = host.setProp.bind(host);
  host.setProp = (node, name, value, previous) => {
    if (node === aContainer.children[0] && name === "phase" && value === 1) {
      trace.push("a-enter");
      b.update(tree(1));
      assert.equal(b.publicationVersion, bAccepted + 1);
      trace.push("a-throws-after-b-accepted");
      throw new Error("old-domain-a-writer-failed");
    }
    if (node === bContainer.children[0] && name === "phase" && value === 1) trace.push("b-nested-write");
    write(node, name, value, previous);
  };
  assert.throws(() => a.update(tree(1)), /old-domain-a-writer-failed/);
  assert.deepEqual(trace, ["a-enter", "b-nested-write", "a-throws-after-b-accepted"]);
  b.update(tree(2));
  assert.equal(bContainer.children[0].props.phase, 2);
} catch (error) { primary = error; }
const cleanup = [];
for (const root of [a, b]) try { root.dispose(); } catch (error) { cleanup.push(error); }
if (primary) throw cleanup.length ? new AggregateError([primary, ...cleanup]) : primary;
if (cleanup.length) throw new AggregateError(cleanup);
console.log(JSON.stringify({ status: "PASS_OLD_DEFECT_CHARACTERIZATION", trace,
  nestedSharedHostWrite: true, otherRootAcceptedBeforeFailingWriterReturned: true,
  otherRootNotQuarantined: true }));
