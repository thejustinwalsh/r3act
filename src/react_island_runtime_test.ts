import { ComponentStateRoot } from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import type { ComponentType } from "./jsx_binding_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";
import {
  createNativeReactIslandComponent,
  type IslandRenderer,
} from "./react_island_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const same = (actual: unknown, expected: unknown, message: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: ${String(actual)} != ${String(expected)}`);
  }
};

type Props = { label: string };
type IslandRecord = {
  container: MemoryNode;
  renders: Props[];
  unmounts: number;
};

const harness = (
  world?: OwnerStateWorld,
  rootId?: string,
  shared?: { Island: ComponentType<Props>; records: IslandRecord[] },
) => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    ...(world ? { world } : {}),
    ...(rootId ? { rootId } : {}),
    scheduleCommit() {},
  });
  const records: IslandRecord[] = shared?.records ?? [];
  const renderer: IslandRenderer<Props, MemoryNode> = {
    accepts: (instance): instance is MemoryNode =>
      typeof instance === "object" && instance !== null &&
      (instance as MemoryNode).tag === "div",
    create(node) {
      const record = { container: node, renders: [] as Props[], unmounts: 0 };
      records.push(record);
      return {
        render(props) {
          record.renders.push(props);
        },
        unmount() {
          record.unmounts++;
        },
      };
    },
  };
  const Island = shared?.Island ?? createNativeReactIslandComponent(renderer);
  return { host, container, root, records, Island };
};

Deno.test("React island receives committed props and preserves its root through replacement and keyed move", () => {
  const app = harness();
  const first = { label: "first" };
  const candidate = app.root.prepare(jsx(app.Island, first), { renderPreparation: "repeatable" });
  first.label = "mutated after preparation";
  same(app.records.length, 0, "preparation created an island root");
  candidate.commitHost();
  same(app.records.length, 0, "host commit delivered island props");
  candidate.publish();
  same(app.records.length, 0, "publication ran refs early");
  candidate.runEffects();
  same(app.records.length, 1, "published ref did not mount island");
  same(app.records[0].renders[0].label, "first", "props were not captured");
  const node = app.container.children[0];

  app.root.render(jsx(app.Island, { label: "second" }));
  same(app.container.children[0], node, "prop replacement replaced the div");
  same(app.records.length, 1, "prop replacement replaced the island root");
  same(app.records[0].unmounts, 0, "ref replacement unmounted the root");
  same(app.records[0].renders.at(-1)?.label, "second", "new props were not delivered");

  app.root.render(jsx("section", {}, [
    jsx("i", { key: "left" }, "left"),
    jsx(app.Island, { key: "island", label: "moved" }),
  ]));
  const moved = app.container.children[0].children[1];
  app.root.render(jsx("section", {}, [
    jsx(app.Island, { key: "island", label: "moved again" }),
    jsx("i", { key: "left" }, "left"),
  ]));
  same(app.container.children[0].children[0], moved, "keyed move replaced div");
  same(app.records.at(-1)?.container, moved, "moved owner lost island root");
  same(app.records.at(-1)?.unmounts, 0, "keyed move unmounted island");
  app.root.dispose();
  assert(app.records.every((record) => record.unmounts === 1),
    "disposal did not unmount each created island exactly once");
});

Deno.test("stale and discarded candidates cannot deliver island props", () => {
  const app = harness();
  app.root.mount(jsx(app.Island, { label: "accepted" }));
  const stale = app.root.prepare(jsx(app.Island, { label: "stale" }), { renderPreparation: "repeatable" });
  const discarded = app.root.prepare(jsx(app.Island, { label: "discarded" }), { renderPreparation: "repeatable" });
  discarded.discard();
  app.root.render(jsx(app.Island, { label: "winner" }));
  assert(!stale.validate(), "old candidate stayed valid");
  stale.discard();
  same(app.records.length, 1, "rejected work created a root");
  same(app.records[0].renders.map((props) => props.label).join(","),
    "accepted,winner", "rejected work delivered props");
  app.root.dispose();
  same(app.records[0].unmounts, 1, "cleanup count");
});

Deno.test("shared-world native roots keep separate React island lifetimes", () => {
  const world = new OwnerStateWorld();
  const left = harness(world, "island-left");
  const right = harness(world, "island-right", left);
  left.root.mount(jsx(left.Island, { label: "left" }));
  right.root.mount(jsx(right.Island, { label: "right" }));
  left.root.dispose();
  same(left.records[0].unmounts, 1, "left island cleanup");
  same(right.records[1].unmounts, 0, "left disposal reached right island");
  right.root.render(jsx(right.Island, { label: "still right" }));
  same(right.records[1].renders.at(-1)?.label, "still right", "right root stopped");
  right.root.dispose();
  same(right.records[1].unmounts, 1, "right island cleanup");
});

Deno.test("grouped native roots publish both accepted owners before either island renders", () => {
  const world = new OwnerStateWorld();
  const left = harness(world, "grouped-island-left");
  const right = harness(world, "grouped-island-right", left);
  const seen: Array<[number, number, number, number]> = [];
  const Island = createNativeReactIslandComponent<Props, MemoryNode>({
    accepts: (instance): instance is MemoryNode =>
      typeof instance === "object" && instance !== null,
    create() {
      return {
        render() {
          seen.push([
            left.root.publicationVersion,
            right.root.publicationVersion,
            left.root.diagnostics().ownerCount,
            right.root.diagnostics().ownerCount,
          ]);
        },
        unmount() {},
      };
    },
  });
  const a = left.root.prepare(jsx(Island, { label: "left" }), { renderPreparation: "repeatable" });
  const b = right.root.prepare(jsx(Island, { label: "right" }), { renderPreparation: "repeatable" });
  a.commitHost();
  b.commitHost();
  same(seen.length, 0, "host phase delivered island props");
  a.publish();
  b.publish();
  same(seen.length, 0, "accepted publication ran refs early");
  a.runEffects();
  b.runEffects();
  same(seen.length, 2, "group did not deliver both island props");
  assert(seen.every(([leftVersion, rightVersion, leftOwners, rightOwners]) =>
    leftVersion === 1 && rightVersion === 1 &&
    leftOwners === 1 && rightOwners === 1),
  "island observed a partially accepted native group");
  left.root.dispose();
  right.root.dispose();
});

Deno.test("removing and reinserting an owner creates a fresh island lifetime", () => {
  const app = harness();
  const tree = (show: boolean) => jsx("section", {}, show
    ? jsx(app.Island, { key: "island", label: "present" })
    : null);
  app.root.mount(tree(true));
  const original = app.records[0].container;
  app.root.render(tree(false));
  same(app.records[0].unmounts, 1, "removed owner did not clean up");
  app.root.render(tree(true));
  same(app.records.length, 2, "reinsertion reused the removed island");
  assert(app.records[1].container !== original,
    "reinsertion reused the removed host div");
  same(app.records[1].unmounts, 0, "new island was already unmounted");
  app.root.dispose();
  same(app.records[0].unmounts, 1, "old island cleanup repeated");
  same(app.records[1].unmounts, 1, "new island cleanup missing");
});

Deno.test("host failure before ref publication does not create an island root", () => {
  class FailingHost extends MemoryVDOMHost {
    override place(_parent: MemoryNode, _node: MemoryNode, _before: MemoryNode | null) {
      throw new Error("host place failed");
    }
  }
  const host = new FailingHost();
  const container = host.createContainer();
  let creates = 0;
  const Island = createNativeReactIslandComponent<Props, MemoryNode>({
    accepts: (instance): instance is MemoryNode =>
      typeof instance === "object" && instance !== null,
    create() {
      creates++;
      return { render() {}, unmount() {} };
    },
  });
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const candidate = root.prepare(jsx(Island, { label: "uncommitted" }), { renderPreparation: "repeatable" });
  let failed = false;
  try {
    candidate.commitHost();
  } catch {
    failed = true;
  }
  assert(failed, "controlled host failure did not occur");
  same(creates, 0, "failed host commit attached island");
  root.dispose();
});

Deno.test("partial host failure cannot deliver candidate props to an accepted island", () => {
  class FailingWriterHost extends MemoryVDOMHost {
    fail = false;
    override setProp(
      node: MemoryNode, name: string, value: unknown, previous?: unknown,
    ) {
      if (this.fail && name === "data-step" && value === "candidate") {
        throw new Error("sibling writer failed");
      }
      super.setProp(node, name, value, previous);
    }
  }
  const host = new FailingWriterHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const renders: string[] = [];
  let creates = 0, unmounts = 0;
  const Island = createNativeReactIslandComponent<Props, MemoryNode>({
    accepts: (instance): instance is MemoryNode =>
      typeof instance === "object" && instance !== null &&
      (instance as MemoryNode).tag === "div",
    create() {
      creates++;
      return {
        render(props) {
          renders.push(props.label);
        },
        unmount() {
          unmounts++;
        },
      };
    },
  });
  const tree = (label: string, step: string) => jsx("section", {}, [
    jsx(Island, { key: "island", label }),
    jsx("aside", { key: "writer", "data-step": step }),
  ]);
  root.mount(tree("accepted", "accepted"));
  const acceptedVersion = root.publicationVersion;
  const acceptedOwners = root.diagnostics().ownerCount;
  same(renders.join(","), "accepted", "initial island props");
  host.fail = true;
  const candidate = root.prepare(tree("candidate", "candidate"), { renderPreparation: "repeatable" });
  let failure: unknown;
  try {
    candidate.commitHost();
  } catch (error) {
    failure = error;
  }
  assert(failure, "controlled sibling writer did not fail");
  candidate.failGroup(failure);
  same(renders.join(","), "accepted", "failed candidate delivered island props");
  same(root.publicationVersion, acceptedVersion,
    "failed host batch advanced accepted history");
  same(root.diagnostics().ownerCount, acceptedOwners,
    "failed host batch replaced accepted owners");
  let terminal = false;
  try {
    root.prepare(tree("replay", "accepted"), { renderPreparation: "repeatable" });
  } catch {
    terminal = true;
  }
  assert(terminal, "partial host failure permitted speculative replay");
  same(creates, 1, "failed batch created another React root");
  root.dispose();
  same(unmounts, 1, "accepted island was not unmounted exactly once");
});

Deno.test("failed old-container unmount closes the island lifetime", () => {
  class RebindingHost extends MemoryVDOMHost {
    getPublicInstance(node: MemoryNode): unknown {
      return { node };
    }
  }
  const host = new RebindingHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const unmountError = new Error("old island unmount failed");
  let creates = 0, unmounts = 0;
  const Island = createNativeReactIslandComponent<Props, object>({
    accepts: (instance): instance is object =>
      typeof instance === "object" && instance !== null,
    create() {
      creates++;
      return {
        render() {},
        unmount() {
          unmounts++;
          throw unmountError;
        },
      };
    },
  });
  root.mount(jsx(Island, { label: "first" }));
  let failure: unknown;
  try {
    root.render(jsx(Island, { label: "second" }));
  } catch (error) {
    failure = error;
  }
  const flatten = (error: unknown): unknown[] => error instanceof AggregateError
    ? error.errors.flatMap(flatten)
    : [error];
  assert(flatten(failure).includes(unmountError),
    "old-container failure was masked");
  root.render(jsx(Island, { label: "third" }));
  same(creates, 1, "failed lifetime started a replacement root");
  root.dispose();
  same(unmounts, 1, "failed old root was unmounted again");
});

Deno.test("initial ref reentry and failed render release the React root exactly once", () => {
  for (const phase of ["create", "render", "render-and-unmount"] as const) {
    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    let root!: ComponentStateRoot<MemoryNode, MemoryNode>;
    let created = 0, unmounted = 0;
    const renderError = new Error("render failed");
    const unmountError = new Error("unmount failed");
    const Island = createNativeReactIslandComponent<Props, MemoryNode>({
      accepts: (instance): instance is MemoryNode =>
        typeof instance === "object" && instance !== null,
      create() {
        created++;
        if (phase === "create") root.dispose();
        return {
          render() {
            if (phase === "render") root.dispose();
            if (phase === "render-and-unmount") throw renderError;
          },
          unmount() {
            unmounted++;
            if (phase === "render-and-unmount") throw unmountError;
          },
        };
      },
    });
    root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
    let caught: unknown;
    try {
      root.mount(jsx(Island, { label: phase }));
    } catch (error) {
      caught = error;
    }
    same(created, 1, `${phase} root creation`);
    same(unmounted, 1, `${phase} cleanup count`);
    if (phase === "render-and-unmount") {
      assert(caught instanceof AggregateError,
        "render failure did not retain cleanup error");
      const flatten = (error: unknown): unknown[] => error instanceof AggregateError
        ? error.errors.flatMap(flatten)
        : [error];
      const failures = flatten(caught);
      assert(failures.includes(renderError) && failures.includes(unmountError),
        "render/cleanup aggregate lost an original error identity");
    }
    try {
      root.dispose();
    } catch {
      // The controlled cleanup error was already captured above.
    }
    same(unmounted, 1, `${phase} cleanup repeated`);
  }
});
