import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const stageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const emittedPath = process.argv[2];
assert.ok(emittedPath, "pass one transformed TSX module path");
const source = await readFile(path.resolve(emittedPath), "utf8");
const declarationStart = source.indexOf("const __nativeOwnerCutKernels = ");
assert.notEqual(declarationStart, -1, "emitted module lacks the owner kernel table");
const declarationEnd = source.indexOf("\n__nativeDefineComponent(", declarationStart);
assert.notEqual(declarationEnd, -1, "kernel table is not followed by component registration");
const declaration = source.slice(declarationStart, declarationEnd).trim();
assert.match(declaration, /slotCount:\s*\d+/);
const outputDirectory = path.join(stageRoot, "proof", "results");
await mkdir(outputDirectory, { recursive: true });
const attemptId = `${Date.now()}-${process.pid}`;
const typeImport = `import type { CompiledOwnerUpdateProgram } from "../../src/compiled_state_layout.ts";\n`;
const uncontextualPath = path.join(outputDirectory, `kernel-uncontextual-${attemptId}.ts`);
const contextualPath = path.join(outputDirectory, `kernel-contextual-${attemptId}.ts`);
await writeFile(uncontextualPath, `${typeImport}${declaration}\n`, { flag: "wx" });
const contextualDeclaration = declaration.replace(
  "const __nativeOwnerCutKernels =",
  "const __nativeOwnerCutKernels: readonly CompiledOwnerUpdateProgram[] =",
);
await writeFile(contextualPath, `${typeImport}${contextualDeclaration}\n`, { flag: "wx" });
console.log(JSON.stringify({ uncontextualPath, contextualPath }));
