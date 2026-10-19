import { useLayoutEffect, useState, type ReactNode } from "react";
// @ts-expect-error ReactDOM runtime is installed without react-dom declarations in this project.
import { flushSync } from "react-dom";
// @ts-expect-error ReactDOM runtime is installed without react-dom declarations in this project.
import { createRoot } from "react-dom/client";
import type {
  ProductMixedController,
  ProductMixedDiagnostics,
  ProductMixedEdit,
  ProductMixedFactory,
} from "./product_mixed_contract";
import { productMixedState } from "./product_mixed_contract";

type FrameSetter = (frame: number) => void;
type ReactRoot = { render(children: ReactNode): void; unmount(): void };

type ProductMixedSession = {
  readonly setters: Map<number, FrameSetter>;
  registerSetter(id: number, setter: FrameSetter): void;
  removeSetter(id: number, setter: FrameSetter): void;
  registerMount(): void;
  registerCleanup(): void;
  registerIdsSetter(setter: (ids: number[]) => void): void;
  removeIdsSetter(setter: (ids: number[]) => void): void;
};

function ReactRow({ id, session }: { id: number; session: ProductMixedSession }) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [rotation, setRotation] = useState(0);

  useLayoutEffect(() => {
    const setFrame = (frame: number) => {
      const state = productMixedState(id, frame);
      setX(state.x);
      setY(state.y);
      setRotation(state.rotation);
    };
    session.registerSetter(id, setFrame);
    session.registerMount();
    return () => {
      session.removeSetter(id, setFrame);
      session.registerCleanup();
    };
  }, [id, session]);

  return (
    <i
      className="entity"
      data-id={id}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: `rotate(${rotation}deg)`,
      }}
    />
  );
}

function ReactBoard({ initialIds, session }: { initialIds: readonly number[]; session: ProductMixedSession }) {
  const [ids, setIds] = useState<number[]>(() => [...initialIds]);

  useLayoutEffect(() => {
    session.registerIdsSetter(setIds);
    return () => {
      session.removeIdsSetter(setIds);
    };
  }, [session]);

  return (
    <div className="board">
      {ids.map((id) => <ReactRow key={id} id={id} session={session} />)}
    </div>
  );
}

export const createProductMixedReact: ProductMixedFactory = (container, initialIds) => {
  let mounts = 0;
  let cleanups = 0;
  let setIds: ((ids: number[]) => void) | null = null;
  const setters = new Map<number, FrameSetter>();
  const session: ProductMixedSession = {
    setters,
    registerSetter(id, setter) { setters.set(id, setter); },
    removeSetter(id, setter) {
      if (setters.get(id) === setter) setters.delete(id);
    },
    registerMount() { mounts++; },
    registerCleanup() { cleanups++; },
    registerIdsSetter(setter) { setIds = setter; },
    removeIdsSetter(setter) { if (setIds === setter) setIds = null; },
  };
  let root: ReactRoot | null = createRoot(container);
  let disposed = false;

  flushSync(() => {
    root!.render(<ReactBoard initialIds={initialIds} session={session} />);
  });
  flushSync(() => {
    for (const setFrame of session.setters.values()) setFrame(0);
  });

  const controller: ProductMixedController = {
    step(frame: number, edit?: ProductMixedEdit) {
      if (disposed || !root) throw new Error("Cannot step a disposed React product arm");

      flushSync(() => {
        if (edit) {
          const removed = new Set(edit.removed);
          for (const [id, setFrame] of session.setters) {
            if (!removed.has(id)) setFrame(frame);
          }
          setIds?.([...edit.ids]);
        } else {
          for (const setFrame of session.setters.values()) setFrame(frame);
        }
      });

      // A newly mounted row initializes at frame 0. Match the native arm's
      // two-phase structural path by advancing only newly inserted rows.
      if (edit) {
        flushSync(() => {
          for (const id of edit.inserted) session.setters.get(id)?.(frame);
        });
      }
    },

    diagnostics(): ProductMixedDiagnostics {
      return {
        // React Compiler removes impure render-time counters; the shared
        // harness validates committed output and lifecycle counts instead.
        renders: -1,
        mounts,
        cleanups,
        writers: session.setters.size,
      };
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      const activeRoot = root;
      if (activeRoot) flushSync(() => activeRoot.unmount());
      root = null;
      setIds = null;
      session.setters.clear();
    },
  };

  return controller;
};
