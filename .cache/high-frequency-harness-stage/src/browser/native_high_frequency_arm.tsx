import {
  createDOMRoot,
  useEffect,
  useState,
} from "../../../../src/native_runtime_api.ts";
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

function NativeRowA({ id, session }: RowProps) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [rotation, setRotation] = useState(0);
  useEffect(() => {
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
  });
  return <i className="row" data-row-id={id} style={{ left: `${x}px`, top: `${y}px`, transform: `rotate(${rotation}deg)` }} />;
}

function NativeRowB({ id, session }: RowProps) {
  const [rotation, setRotation] = useState(0);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  useEffect(() => {
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
  });
  return <i className="row" data-row-id={id} style={{ left: `${x}px`, top: `${y}px`, transform: `rotate(${rotation}deg)` }} />;
}

function NativeBoard({ ids, session, programs }: { ids: readonly number[]; session: Session; programs: ProgramMix }) {
  return (
    <div className="board">
      {ids.map((id) => programs === "heterogeneous" && id % 2 === 1
        ? <NativeRowB key={id} id={id} session={session} />
        : <NativeRowA key={id} id={id} session={session} />)}
    </div>
  );
}

export const createHighFrequencyNative: HighFrequencyFactory = (
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
  let root: ReturnType<typeof createDOMRoot> | null = createDOMRoot(container, {
    scheduleCommit: () => {},
  });
  let disposed = false;
  let staleSetters: FrameSetter[] = [];
  const diagnostics = (): HighFrequencyDiagnostics => ({
    mounts,
    cleanups,
    writers: session.setters.size,
  });
  const controller: HighFrequencyController = {
    mount() {
      if (disposed || !root) throw new Error("Cannot mount a disposed native arm");
      root.mount(<NativeBoard ids={ids} session={session} programs={programs} />);
      root.flush();
      for (const setter of session.setters.values()) setter(0);
      root.flush();
    },
    step(frame, dirtyIds) {
      if (disposed || !root) throw new Error("Cannot step a disposed native arm");
      for (const id of dirtyIds) {
        const setter = session.setters.get(id);
        if (!setter) throw new Error(`Missing native row setter ${id}`);
        setter(frame);
      }
      root.flush();
    },
    diagnostics,
    dispose() {
      if (disposed) return;
      disposed = true;
      staleSetters = [...session.setters.values()];
      root?.dispose();
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
