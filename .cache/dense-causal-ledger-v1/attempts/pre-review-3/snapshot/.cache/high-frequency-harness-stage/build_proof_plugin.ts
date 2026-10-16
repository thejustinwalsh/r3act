import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import type { Plugin } from "vite";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

type RowAssertion = {
  readonly name: string;
  readonly componentId?: string | null;
  readonly programId?: string | null;
  readonly emittedComponent?: boolean;
  readonly programIdMatchesComponent?: boolean;
  readonly stateLayout?: boolean;
  readonly threeStateSites?: boolean;
  readonly present?: boolean;
  readonly memoCacheAllocation?: boolean;
  readonly memoCacheReadWrite?: boolean;
  readonly ownerUpdateKernelIndex?: number | null;
  readonly ownerUpdateKernelTable?: string | null;
  readonly ownerUpdateProgram?: boolean;
  readonly ownerUpdateSchemaVersion?: number | null;
  readonly ownerUpdateProgramId?: string | null;
  readonly ownerUpdateProgramIdMatchesComponent?: boolean;
  readonly ownerUpdateSlotCount?: number | null;
  readonly ownerUpdateSinkCount?: number;
  readonly ownerUpdateSixArgs?: boolean;
};
type TransformRecord = {
  readonly source: string;
  readonly transformOutput: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly rowComponentNames: readonly string[];
  readonly assertions: readonly RowAssertion[];
  readonly nativeRegistrations?: readonly NativeRegistration[];
  readonly nativeOwnerUpdateKernels?: readonly NativeOwnerUpdateKernel[];
  readonly conditionalMapsBothNativeRows?: boolean;
};
type CompilerEventCapture = { readonly filename: string | null; readonly event: unknown };
type NativeRegistration = {
  readonly componentId: string;
  readonly programId: string | null;
  readonly schemaVersion: number | null;
  readonly slots: readonly { readonly siteId: string | null; readonly slot: number | null }[];
  readonly ownerUpdateKernelTable: string | null;
  readonly ownerUpdateKernelIndex: number | null;
};
type NativeOwnerUpdateKernel = {
  readonly tableName: string;
  readonly index: number;
  readonly programId: string | null;
  readonly schemaVersion: number | null;
  readonly slotCount: number | null;
  readonly sinkIds: readonly string[];
  readonly executeCutParameters: readonly string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const nodeType = (value: unknown, type: string): value is Record<string, unknown> =>
  isRecord(value) && value.type === type;
const objectProperty = (value: unknown, name: string): unknown => {
  if (!nodeType(value, "ObjectExpression") || !Array.isArray(value.properties)) return undefined;
  const property = value.properties.find((candidate) => {
    if (!nodeType(candidate, "ObjectProperty")) return false;
    const key = candidate.key;
    return (nodeType(key, "Identifier") && key.name === name) ||
      (nodeType(key, "StringLiteral") && key.value === name);
  });
  return nodeType(property, "ObjectProperty") ? property.value : undefined;
};
const stringValue = (value: unknown): string | null =>
  nodeType(value, "StringLiteral") && typeof value.value === "string" ? value.value : null;
const numberValue = (value: unknown): number | null =>
  nodeType(value, "NumericLiteral") && typeof value.value === "number" ? value.value : null;
const identifierValue = (value: unknown): string | null =>
  nodeType(value, "Identifier") && typeof value.name === "string" ? value.name : null;
const arrayValues = (value: unknown): unknown[] =>
  nodeType(value, "ArrayExpression") && Array.isArray(value.elements) ? value.elements : [];
const nativeOwnerUpdateKernelReference = (value: unknown): { tableName: string | null; index: number | null } =>
  nodeType(value, "MemberExpression") && value.computed === true
    ? { tableName: identifierValue(value.object), index: numberValue(value.property) }
    : { tableName: null, index: null };
const nativeOwnerUpdateKernels = (body: unknown[]): NativeOwnerUpdateKernel[] => {
  const rows: NativeOwnerUpdateKernel[] = [];
  for (const statement of body) {
    if (!nodeType(statement, "VariableDeclaration") || !Array.isArray(statement.declarations)) continue;
    for (const declaration of statement.declarations) {
      if (!nodeType(declaration, "VariableDeclarator")) continue;
      const tableName = identifierValue(declaration.id);
      if (tableName === null) continue;
      for (const [index, candidate] of arrayValues(declaration.init).entries()) {
        if (!nodeType(candidate, "ObjectExpression")) continue;
        const executeCut = objectProperty(candidate, "executeCut");
        if (!nodeType(executeCut, "FunctionExpression") || !Array.isArray(executeCut.params)) continue;
        const programId = stringValue(objectProperty(candidate, "programId"));
        if (programId === null) continue;
        const parameters = executeCut.params.map(identifierValue).filter((name): name is string => typeof name === "string");
        rows.push({
          tableName,
          index,
          programId,
          schemaVersion: numberValue(objectProperty(candidate, "schemaVersion")),
          slotCount: numberValue(objectProperty(candidate, "slotCount")),
          sinkIds: arrayValues(objectProperty(candidate, "sinkIds"))
            .map((sinkId) => stringValue(sinkId))
            .filter((sinkId): sinkId is string => typeof sinkId === "string"),
          executeCutParameters: parameters,
        });
      }
    }
  }
  return rows;
};
const emittedNativeRegistrations = (code: string): {
  readonly registrations: readonly NativeRegistration[];
  readonly kernels: readonly NativeOwnerUpdateKernel[];
} => {
  const parsed: unknown = parse(code, { sourceType: "module", plugins: ["jsx", "typescript"] });
  const program = isRecord(parsed) && isRecord(parsed.program) ? parsed.program : null;
  const body = program && Array.isArray(program.body) ? program.body : [];
  const kernels = nativeOwnerUpdateKernels(body);
  const registrations: NativeRegistration[] = [];
  for (const statement of body) {
    if (!nodeType(statement, "ExpressionStatement") || !nodeType(statement.expression, "CallExpression")) continue;
    const call = statement.expression;
    if (!nodeType(call.callee, "Identifier") || call.callee.name !== "__nativeDefineComponent" || !Array.isArray(call.arguments)) continue;
    const componentId = stringValue(call.arguments[0]);
    if (componentId === null) continue;
    const layout = call.arguments[2] === undefined ? undefined : objectProperty(call.arguments[2], "stateLayout");
    const ownerUpdateProgram = call.arguments[2] === undefined
      ? undefined
      : objectProperty(call.arguments[2], "ownerUpdateProgram");
    const kernelReference = nativeOwnerUpdateKernelReference(ownerUpdateProgram);
    const slotsNode = objectProperty(layout, "slots");
    const slots = nodeType(slotsNode, "ArrayExpression") && Array.isArray(slotsNode.elements)
      ? slotsNode.elements.map((element) => ({
        siteId: stringValue(objectProperty(element, "siteId")),
        slot: numberValue(objectProperty(element, "slot")),
      }))
      : [];
    registrations.push({
      componentId,
      programId: stringValue(objectProperty(layout, "programId")),
      schemaVersion: numberValue(objectProperty(layout, "schemaVersion")),
      slots,
      ownerUpdateKernelTable: kernelReference.tableName,
      ownerUpdateKernelIndex: kernelReference.index,
    });
  }
  return { registrations, kernels };
};
const reactMemoSuccesses = (events: readonly CompilerEventCapture[]) =>
  events.flatMap(({ filename, event }) => {
    if (!isRecord(event) || event.kind !== "CompileSuccess" || typeof event.fnName !== "string") return [];
    return [{ filename, fnName: event.fnName, memoSlots: event.memoSlots }];
  });

export const highFrequencyBuildProofPlugin = (
  stage: string,
  proofDirectory: string,
  compilerEvents: readonly CompilerEventCapture[],
): Plugin => {
  const expected = new Map([
    [path.resolve(stage, "src/browser/native_high_frequency_arm.tsx"), "native"],
    [path.resolve(stage, "src/browser/react_high_frequency_arm.tsx"), "react"],
  ]);
  const records = new Map<string, TransformRecord>();
  return {
    name: "high-frequency-build-proof",
    enforce: "post",
    transform(code, id) {
      const sourceId = path.resolve(id.split("?", 1)[0]);
      const arm = expected.get(sourceId);
      if (!arm) return null;
      const filename = `${arm}-transformed.js`;
      mkdirSync(proofDirectory, { recursive: true });
      writeFileSync(path.join(proofDirectory, filename), code, { flag: "wx" });
      const rowComponentNames = arm === "native" ? ["NativeRowA", "NativeRowB"] : ["ReactRowA", "ReactRowB"];
      const nativeProgram = arm === "native" ? emittedNativeRegistrations(code) : null;
      const registrations = nativeProgram?.registrations ?? [];
      const ownerUpdateKernels = nativeProgram?.kernels ?? [];
      const assertions = arm === "native"
        ? rowComponentNames.map((name) => {
          const registration = registrations.find((row) => row.componentId.endsWith(`#component:${name}`));
          const componentId = registration?.componentId ?? null;
          const kernelIndex = registration?.ownerUpdateKernelIndex ?? null;
          const kernel = kernelIndex === null || registration === undefined || registration.ownerUpdateKernelTable === null
            ? undefined
            : ownerUpdateKernels.find((candidate) =>
              candidate.tableName === registration.ownerUpdateKernelTable && candidate.index === kernelIndex);
          return {
            name,
            componentId,
            programId: registration?.programId ?? null,
            emittedComponent: registration !== undefined,
            programIdMatchesComponent: registration !== undefined && registration.programId === registration.componentId,
            stateLayout: registration?.schemaVersion === 1 && registration.slots.length === 3,
            threeStateSites: registration?.slots.every((slot, index) =>
              slot.siteId === `${registration.componentId}#state:${index}` && slot.slot === index) ?? false,
            ownerUpdateKernelIndex: kernelIndex,
            ownerUpdateKernelTable: registration?.ownerUpdateKernelTable ?? null,
            ownerUpdateProgram: kernel !== undefined,
            ownerUpdateSchemaVersion: kernel?.schemaVersion ?? null,
            ownerUpdateProgramId: kernel?.programId ?? null,
            ownerUpdateProgramIdMatchesComponent: kernel !== undefined && kernel.programId === componentId,
            ownerUpdateSlotCount: kernel?.slotCount ?? null,
            ownerUpdateSinkCount: kernel?.sinkIds.length ?? 0,
            ownerUpdateSixArgs: kernel?.executeCutParameters.length === 6 &&
              kernel.executeCutParameters.join(",") === "changedSlots,changeCount,rowStates,stagedInputIndices,stagedSinkIds,stagedValues",
          };
        })
        : rowComponentNames.map((name) => {
          const start = code.indexOf(`function ${name}(`);
          const end = start < 0 ? -1 : code.indexOf("\nfunction ", start + 1);
          const component = start < 0 ? "" : code.slice(start, end < 0 ? code.length : end);
          return {
            name,
            present: start >= 0,
            memoCacheAllocation: /_c\(\d+\)/.test(component),
            memoCacheReadWrite: /\$\[\d+\]/.test(component),
          };
        });
      records.set(arm, {
        source: sourceId,
        transformOutput: filename,
        sha256: sha256(code),
        bytes: Buffer.byteLength(code),
        rowComponentNames,
        assertions,
        nativeRegistrations: arm === "native" ? registrations : undefined,
        nativeOwnerUpdateKernels: arm === "native" ? ownerUpdateKernels : undefined,
        conditionalMapsBothNativeRows: arm === "native"
          ? code.includes("programs === \"heterogeneous\"") && code.includes("NativeRowB") && code.includes("NativeRowA")
          : undefined,
      });
      return null;
    },
    closeBundle() {
      const native = records.get("native");
      const react = records.get("react");
      if (!native || !react) throw new Error("Build proof missed a native or React arm transform");
      writeFileSync(
        path.join(proofDirectory, "react-compiler-events.json"),
        `${JSON.stringify(compilerEvents, null, 2)}\n`,
        { flag: "wx" },
      );
      const nativeRows = native.assertions;
      const reactRows = react.assertions;
      if (!nativeRows.every((row) => row.emittedComponent && row.programIdMatchesComponent && row.stateLayout && row.threeStateSites)) {
        throw new Error(`Native transform did not emit both row layouts: ${JSON.stringify(nativeRows)}`);
      }
      if (!nativeRows.every((row) =>
        row.ownerUpdateProgram &&
        row.ownerUpdateSchemaVersion === 2 &&
        row.ownerUpdateProgramIdMatchesComponent &&
        row.ownerUpdateSlotCount === 3 &&
        (row.ownerUpdateSinkCount ?? 0) > 0 &&
        row.ownerUpdateSixArgs
      )) {
        throw new Error(`Native transform did not emit schema-2 six-argument owner-update programs for both rows: ${JSON.stringify(nativeRows)}`);
      }
      if (native.conditionalMapsBothNativeRows !== true) {
        throw new Error("Native program-mix conditional does not map both compiled rows");
      }
      if (!reactRows.every((row) => row.present && row.memoCacheAllocation && row.memoCacheReadWrite)) {
        throw new Error(`React Compiler row memo-cache evidence is missing: ${JSON.stringify(reactRows)}`);
      }
      const rowCompilerSuccesses = reactMemoSuccesses(compilerEvents).filter((event) =>
        event.fnName === "ReactRowA" || event.fnName === "ReactRowB");
      if (!rowCompilerSuccesses.some((event) => event.fnName === "ReactRowA" && Number(event.memoSlots) > 0) ||
        !rowCompilerSuccesses.some((event) => event.fnName === "ReactRowB" && Number(event.memoSlots) > 0)) {
        throw new Error(`React Compiler did not report memoized compilation for both row components: ${JSON.stringify(rowCompilerSuccesses)}`);
      }
      const rustOwnerUpdatePath = "compiler/oxc-spike/src/owner_update_program.rs";
      const rustOwnerUpdateSource = readFileSync(path.resolve(stage, "../..", rustOwnerUpdatePath));
      const result = {
        schemaVersion: "high-frequency-build-proof-v2",
        status: "PASS",
        productionBuild: true,
        transforms: { native, react },
        reactRowCompilerSuccesses: rowCompilerSuccesses,
        sourceHashLock: {
          path: rustOwnerUpdatePath,
          sha256: sha256(rustOwnerUpdateSource.toString("utf8")),
          bytes: rustOwnerUpdateSource.byteLength,
        },
        compilerPath: "Rust/OXC nativeModulePlugin and babel-plugin-react-compiler from stage Vite config",
        evidence: "captured actual per-module post-transform code; assertions inspect emitted owner layouts and schema-2 six-argument update kernels plus React row-local memo-cache operations, not minified bundle text",
      };
      writeFileSync(path.join(proofDirectory, "build-proof.json"), `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
    },
  };
};
