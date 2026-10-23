import React, { useCallback, useSyncExternalStore } from "react";

export interface ReactParticleStore {
  get(id: number): number;
  subscribe(id: number, listener: () => void): () => void;
}

export function ReactParticle({ id, store }: { id: number; store: ReactParticleStore }) {
  const subscribe = useCallback((listener: () => void) => store.subscribe(id, listener), [id, store]);
  const getSnapshot = useCallback(() => store.get(id), [id, store]);
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return <div className="particle" style={{ transform: `translate3d(${value % 320}px, 0, 0)`, opacity: (value % 100) / 100 }} />;
}
