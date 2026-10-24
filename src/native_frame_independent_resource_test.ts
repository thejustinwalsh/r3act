import { assertEquals } from "jsr:@std/assert";
import { AsyncResource } from "./async_resource_runtime.ts";
import {
  ComponentStateRoot, defineComponent, Suspense, useAt, useFrameAt,
} from "./component_state_runtime.ts";
import { createNativeFrameLoop } from "./native_frame_loop.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

Deno.test("frame publication progresses beside an unrelated pending resource", async () => {
  let resolveHealth!: (value: number) => void;
  const health = new AsyncResource(new Promise<number>((resolve) => {
    resolveHealth = resolve;
  }));
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId: "frame-independent-health", scheduleCommit() {},
  });
  const Motion = defineComponent("frame-independent-motion", () => {
    const frame = useFrameAt("frame-independent-clock");
    return jsx("output", { key: "motion", "data-time": frame.timeMs });
  });
  const Health = defineComponent("frame-independent-health", () =>
    jsx("output", { key: "health", "data-health": useAt("health-read", health) }));
  const Scene = defineComponent("frame-independent-scene", () =>
    jsx("section", { key: "scene" }, [
      jsx(Motion, {}), jsx(Suspense, {
        fallback: jsx("output", { key: "loading", "data-health": "pending" }),
        children: jsx(Health, {}),
      }),
    ]));
  root.mount(jsx(Scene, {}));
  const scene = container.children[0], motion = scene.children[0];
  const drawn: number[] = [];
  const loop = createNativeFrameLoop({ roots: [{ root, stores: [] }],
    declarative: true, draw(frame) {
      assertEquals(motion.props["data-time"], frame.timeMs);
      drawn.push(frame.timeMs);
    },
  });
  try {
    assertEquals(loop.advance(1000).status, "drawn");
    assertEquals(loop.advance(1016).status, "drawn");
    assertEquals(scene.children[1].props["data-health"], "pending");
    resolveHealth(100);
    await Promise.resolve();
    await Promise.resolve();
    assertEquals(loop.advance(1032).status, "drawn");
    assertEquals(scene.children[1].props["data-health"], 100);
    assertEquals(drawn, [1000, 1016, 1032]);
  } finally {
    loop.dispose();
    root.dispose();
    resolveHealth(100);
  }
});
