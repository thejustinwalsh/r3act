export type RowState = {
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
};

export type ProgramMix = "homogeneous" | "heterogeneous";
export type DirtyShape = "one" | "bucket32" | "all";
export type DirtyPlacement = "contiguous" | "scattered";

export type HighFrequencyDiagnostics = {
  readonly mounts: number;
  readonly cleanups: number;
  readonly writers: number;
};

export interface HighFrequencyController {
  /** The caller prepares identical dirtyIds before timing this call. */
  step(frame: number, dirtyIds: readonly number[]): void;
  diagnostics(): HighFrequencyDiagnostics;
  dispose(): void;
  probeDeadSetters(frame: number): void;
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
