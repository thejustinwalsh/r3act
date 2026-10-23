import { assertEquals, assertThrows } from "jsr:@std/assert";
import { createAsyncStore } from "./async_store_runtime.ts";
import {
  ComponentStateRoot,
  defineComponent,
  useEffectAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";

Deno.test("host disposal failure still releases native effects, stores and root namespace", () => {
  class Host extends MemoryVDOMHost {
    override remove(_parent: MemoryNode, _node: MemoryNode): void {
      throw new Error("host remove failed");
    }
  }
  const host = new Host();
  const world = new OwnerStateWorld();
  const root = new ComponentStateRoot(host, host.createContainer(), {
    rootId: "dispose-failure",
    world,
    scheduleCommit() {},
  });
  const store = createAsyncStore(1);
  let active = 0;
  const View = defineComponent("dispose-failure-view", () => {
    const value = useStoreAt("value", store);
    useEffectAt("effect", () => {
      active++;
      return () => {
        active--;
      };
    });
    return jsx("button", { onClick: () => {} }, String(value));
  });
  root.mount(jsx(View, {}));
  assertEquals(active, 1);
  assertThrows(() => root.dispose(), AggregateError);
  assertEquals(active, 0);
  assertEquals(root.diagnostics().ownerCount, 0);
  assertEquals(store.diagnostics().roots, 0);
  assertEquals(store.diagnostics().readers, 0);
  root.dispose();
  // Recovery uses a fresh root/host, not replaying uncertain host side effects.
  const nextHost = new MemoryVDOMHost();
  const next = new ComponentStateRoot(nextHost, nextHost.createContainer(), {
    rootId: "dispose-failure",
    world,
    scheduleCommit() {},
  });
  next.mount(jsx("p", {}, "Recovered"));
  next.dispose();
});
