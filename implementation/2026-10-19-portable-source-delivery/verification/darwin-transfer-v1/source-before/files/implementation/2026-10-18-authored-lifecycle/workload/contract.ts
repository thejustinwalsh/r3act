export const ROW_COUNT = 256;
export const UPDATE_COUNT = 60;
export type Arm = "native" | "react";
export const initialRows = (): readonly number[] => Array.from({ length: ROW_COUNT }, (_, id) => id);
export const editedRows = (): readonly number[] => [...initialRows().slice(2), ROW_COUNT, 0];
export type SceneDiagnostics = Readonly<{
  arm: Arm;
  rowSetups: number;
  rowCleanups: number;
  detailFallbackSetups: number;
  detailFallbackCleanups: number;
  healthFallbackSetups: number;
  healthFallbackCleanups: number;
  storeListeners: number;
  storeReaders: number | null;
  ownerCount: number | null;
  pendingChangeCount: number | null;
  disposed: boolean;
}>;
export type SceneController = Readonly<{
  updateStep(step: number): void;
  editRows(): void;
  settleDetail(): void;
  settleHealth(): void;
  diagnostics(): SceneDiagnostics;
  dispose(): SceneDiagnostics;
}>;
