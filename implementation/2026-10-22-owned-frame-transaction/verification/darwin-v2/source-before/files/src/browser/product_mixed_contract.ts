/** Shared authored workload contract. No renderer internals or timed diagnostics. */
export type ProductMixedEdit = {
  readonly removed: readonly number[];
  readonly inserted: readonly number[];
  readonly ids: readonly number[];
};
export type ProductMixedDiagnostics = {
  readonly renders: number;
  readonly mounts: number;
  readonly cleanups: number;
  readonly writers: number;
  readonly extra?: unknown;
};
export interface ProductMixedController {
  /** Synchronous state-to-host commit, including lifecycle work. */
  step(frame: number, edit?: ProductMixedEdit): void;
  diagnostics(): ProductMixedDiagnostics;
  dispose(): void;
}
export type ProductMixedFactory = (
  container: HTMLElement,
  ids: readonly number[],
) => ProductMixedController;
export const productMixedState = (id: number, frame: number) => ({
  x: (id * 17 + frame * 2) % 760,
  y: (id * 29 + frame * 3) % 500,
  rotation: (id * 7 + frame * 4) % 360,
});
