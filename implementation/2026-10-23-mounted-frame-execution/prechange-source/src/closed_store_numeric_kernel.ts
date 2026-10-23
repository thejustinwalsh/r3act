import {
  closedStoreHostValueCount, type ClosedStoreHostProgram,
} from "./closed_store_host_program.ts";
import {
  closedDataArray, closedDataRecord, exactClosedFields,
} from "./closed_host_value.ts";
import type { ClosedNumericExpression } from "./closed_numeric_expression.ts";

/** Compiler-proven numeric leaf outputs over row-major Store projections. */
export type ClosedStoreNumericKernel = Readonly<{
  schemaVersion: 1;
  componentProgramId: string;
  moduleRevision: string;
  inputCount: number;
  propNames: readonly string[];
  executeRange: (
    inputValues: readonly number[], inputStart: number, rowCount: number,
    outputValues: number[], outputStart: number,
  ) => number;
}>;

const numericExpression = (value: ClosedNumericExpression): boolean => {
  switch (value.kind) {
    case "input": return true;
    case "literal": return typeof value.value === "number" && Number.isFinite(value.value);
    case "unary":
      return value.operator !== "!" && numericExpression(value.argument);
    case "binary":
      return !["==", "!=", "===", "!==", "<", "<=", ">", ">="].includes(
        value.operator,
      ) && numericExpression(value.left) && numericExpression(value.right);
    default: return false;
  }
};

/** Match executable metadata to the already normalized Store host program. */
export const normalizeClosedStoreNumericKernel = (
  raw: unknown, host: ClosedStoreHostProgram,
): ClosedStoreNumericKernel | null => {
  try {
    if (host.schemaVersion === 4 || host.schemaVersion === 5) return null;
    const data = closedDataRecord(raw);
    if (!data || !exactClosedFields(data, [
      "schemaVersion", "componentProgramId", "moduleRevision", "inputCount",
      "propNames", "executeRange",
    ]) || data.schemaVersion !== 1 ||
      data.componentProgramId !== host.componentProgramId ||
      data.moduleRevision !== host.moduleRevision ||
      data.inputCount !== closedStoreHostValueCount(host) ||
      typeof data.executeRange !== "function") return null;
    const propNames = closedDataArray(data.propNames);
    if (!propNames || propNames.length !== host.host.props.length ||
      !propNames.every((name, index) =>
        name === host.host.props[index][0] &&
        host.host.props[index][1].kind !== "tuple" &&
        host.host.props[index][1].kind !== "style" &&
        numericExpression(host.host.props[index][1] as ClosedNumericExpression))) {
      return null;
    }
    return Object.freeze({
      schemaVersion: 1,
      componentProgramId: data.componentProgramId,
      moduleRevision: data.moduleRevision,
      inputCount: data.inputCount,
      propNames: Object.freeze(propNames as string[]),
      executeRange: data.executeRange as ClosedStoreNumericKernel["executeRange"],
    });
  } catch {
    return null;
  }
};
