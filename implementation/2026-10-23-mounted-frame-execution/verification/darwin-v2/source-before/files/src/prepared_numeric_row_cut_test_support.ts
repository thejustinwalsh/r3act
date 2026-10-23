import type {
  PreparedNumericRowCut,
  PreparedNumericRowProgram,
} from "./vdom_snapshot_runtime.ts";

type NumericCutRoot = {
  prepareNumericRowCut(
    tokens: readonly (PreparedNumericRowProgram | undefined)[],
    rows: Uint32Array,
    slots: Uint32Array,
    values: readonly number[],
    count: number,
  ): PreparedNumericRowCut | null;
  executePreparedNumericRowCut(cut: PreparedNumericRowCut): boolean;
};

/** Exercise the current preflight and admitted execution contract in tests. */
export const executeNumericRowCut = (
  root: NumericCutRoot,
  tokens: readonly (PreparedNumericRowProgram | undefined)[],
  rows: Uint32Array,
  slots: Uint32Array,
  values: readonly number[],
  count: number,
): boolean | null => {
  const cut = root.prepareNumericRowCut(tokens, rows, slots, values, count);
  return cut ? root.executePreparedNumericRowCut(cut) : null;
};
