export type RowState = {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
};

export type ProgramMix = "homogeneous" | "heterogeneous";
export type DirtyShape = "one" | "bucket32" | "all";
export type DirtyPlacement = "contiguous" | "scattered";

export const selectDirtyIds = (
  size: number,
  shape: DirtyShape,
  placement: DirtyPlacement,
  frame: number,
): number[] => {
  const count = shape === "one" ? 1 : shape === "bucket32" ? Math.min(32, size) : size;
  const selected: number[] = [];
  if (placement === "contiguous") {
    const first = count === size ? 0 : (frame * 17) % (size - count + 1);
    for (let offset = 0; offset < count; offset++) selected.push(first + offset);
  } else {
    const first = (frame * 137) % size;
    for (let offset = 0; offset < count; offset++) selected.push((first + offset * 997) % size);
  }
  return selected;
};

export type HighFrequencyDiagnostics = {
  readonly mounts: number;
  readonly cleanups: number;
  readonly writers: number;
};

export interface HighFrequencyController {
  mount(): void;
  /** The caller prepares identical dirtyIds before timing this call. */
  step(frame: number, dirtyIds: readonly number[]): void;
  diagnostics(): HighFrequencyDiagnostics;
  dispose(): void;
  probeDeadSetters(frame: number): number;
}

export type HighFrequencyFactory = (
  container: HTMLElement,
  ids: readonly number[],
  programs: ProgramMix,
) => HighFrequencyController;

export const highFrequencyState = (id: number, frame: number): RowState => ({
  x: (id * 17 + frame * 2) % 1000,
  y: (id * 29 + frame * 3) % 700,
  rotation: (id * 7 + frame * 4) % 360,
});
