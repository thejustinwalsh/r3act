import { useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type {
  HighFrequencyController,
  HighFrequencyDiagnostics,
  HighFrequencyFactory,
  ProgramMix,
} from "./high_frequency_contract";
import { highFrequencyState } from "./high_frequency_contract";

type FrameSetter = (frame: number) => void;
type Session = {
  readonly setters: Map<number, FrameSetter>;
  registerSetter(id: number, setter: FrameSetter): void;
  removeSetter(id: number, setter: FrameSetter): void;
  registerMount(): void;
  registerCleanup(): void;
};
type RowProps = { id: number; session: Session };

function ReactRowA({ id, session }: RowProps) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [rotation, setRotation] = useState(0);
  useLayoutEffect(() => {
    const setter: FrameSetter = (frame) => {
      const state = highFrequencyState(id, frame);
      setX(state.x);
      setY(state.y);
      setRotation(state.rotation);
    };
    session.registerSetter(id, setter);
    session.registerMount();
    return () => {
      session.removeSetter(id, setter);
      session.registerCleanup();
    };
  }, [id, session]);
  return <i className="row" data-row-id={id} style={{ left: `${x}px`, top: `${y}px`, transform: `rotate(${rotation}deg)` }} />;
}

function ReactRowB({ id, session }: RowProps) {
  const [rotation, setRotation] = useState(0);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  useLayoutEffect(() => {
    const setter: FrameSetter = (frame) => {
      const state = highFrequencyState(id, frame);
      setX(state.x);
      setY(state.y);
      setRotation(state.rotation);
    };
    session.registerSetter(id, setter);
    session.registerMount();
    return () => {
      session.removeSetter(id, setter);
      session.registerCleanup();
    };
  }, [id, session]);
  return <i className="row" data-row-id={id} style={{ left: `${x}px`, top: `${y}px`, transform: `rotate(${rotation}deg)` }} />;
}

function ReactBoard({ ids, session, programs }: { ids: readonly number[]; session: Session; programs: ProgramMix }) {
  return (
    <div className="board">
      {ids.map((id) => programs === "heterogeneous" && id % 2 === 1
        ? <ReactRowB key={id} id={id} session={session} />
        : <ReactRowA key={id} id={id} session={session} />)}
    </div>
  );
}

export const createHighFrequencyReact: HighFrequencyFactory = (
  container,
  ids,
  programs,
) => {
  let mounts = 0;
  let cleanups = 0;
  const setters = new Map<number, FrameSetter>();
  const session: Session = {
    setters,
    registerSetter(id, setter) { setters.set(id, setter); },
    removeSetter(id, setter) { if (setters.get(id) === setter) setters.delete(id); },
    registerMount() { mounts++; },
    registerCleanup() { cleanups++; },
  };
  let root: Root | null = createRoot(container);
  let disposed = false;
  let staleSetters: FrameSetter[] = [];
  const diagnostics = (): HighFrequencyDiagnostics => ({
    mounts,
    cleanups,
    writers: session.setters.size,
  });
  const controller: HighFrequencyController = {
    mount() {
      if (disposed || !root) throw new Error("Cannot mount a disposed React arm");
      flushSync(() => root!.render(<ReactBoard ids={ids} session={session} programs={programs} />));
      flushSync(() => {
        for (const setter of session.setters.values()) setter(0);
      });
    },
    step(frame, dirtyIds) {
      if (disposed || !root) throw new Error("Cannot step a disposed React arm");
      const ledger = (globalThis as typeof globalThis & {__denseLedger?: {mark(s:string):void;count(s:string,n?:number):void}}).__denseLedger;
      ledger?.mark("react.flushSync.start");
      ledger?.count("react.setter.calls", dirtyIds.length);
      flushSync(() => {
        ledger?.mark("react.dispatch.start");
        for (const id of dirtyIds) {
          const setter = session.setters.get(id);
          if (!setter) throw new Error(`Missing React row setter ${id}`);
          setter(frame);
        }
        ledger?.mark("react.dispatch.end");
      });
      ledger?.mark("react.flushSync.end");
    },
    diagnostics,
    dispose() {
      if (disposed) return;
      disposed = true;
      staleSetters = [...session.setters.values()];
      const activeRoot = root;
      if (activeRoot) flushSync(() => activeRoot.unmount());
      root = null;
    },
    probeDeadSetters(frame) {
      let thrown = 0;
      for (const setter of staleSetters) {
        try {
          setter(frame);
        } catch {
          thrown++;
        }
      }
      return thrown;
    },
  };
  return controller;
};
