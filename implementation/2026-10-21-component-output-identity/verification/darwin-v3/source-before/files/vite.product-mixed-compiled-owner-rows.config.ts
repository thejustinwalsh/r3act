import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { nativeModulePlugin } from "./compiler/vite_native_plugin.ts";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

function extractBalanced(text: string, openIndex: number, open: string, close: string): string | null {
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = openIndex; index < text.length; index++) {
    const character = text[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === open) depth++;
    else if (character === close && --depth === 0) return text.slice(openIndex + 1, index);
  }
  return null;
}

function topLevelObjects(text: string): string[] {
  const objects: string[] = [];
  for (let index = 0; index < text.length; index++) {
    if (text[index] !== "{") continue;
    const object = extractBalanced(text, index, "{", "}");
    if (object === null) return [];
    objects.push(object);
    index += object.length + 1;
  }
  return objects;
}

function ownerRowProof(code: string, row: string) {
  const define = code.match(/__nativeDefineComponent\(\s*"([^"]+#component:ProductMixedRow)"\s*,\s*ProductMixedRow\s*,\s*\{/);
  let options: string | null = null;
  if (define?.index !== undefined) {
    const open = code.indexOf("{", define.index);
    options = extractBalanced(code, open, "{", "}");
  }
  const layoutKey = options?.indexOf("stateLayout:") ?? -1;
  const layoutOpen = layoutKey < 0 ? -1 : options!.indexOf("{", layoutKey);
  const layout = layoutOpen < 0 ? null : extractBalanced(options!, layoutOpen, "{", "}");
  const ownerProgramId = define?.[1] ?? null;
  const stateLayoutProgramId = layout?.match(/\bprogramId:\s*"([^"]+)"/)?.[1] ?? null;
  const slotsBody = layout?.match(/\bslots:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
  const slots = [...slotsBody.matchAll(/\{\s*siteId:\s*"([^"]+)"\s*,\s*slot:\s*(\d+)\s*\}/g)]
    .map(([, siteId, slot]) => ({ siteId, slot: Number(slot) }));
  const tableKey = code.indexOf("const __nativeNumericPrograms");
  const tableOpen = tableKey < 0 ? -1 : code.indexOf("[", tableKey);
  const tableBody = tableOpen < 0 ? null : extractBalanced(code, tableOpen, "[", "]");
  const descriptors = tableBody === null ? [] : topLevelObjects(tableBody).map((descriptor) => ({
    schemaVersion: Number(descriptor.match(/\bschemaVersion:\s*(\d+)/)?.[1] ?? NaN),
    ownerProgramId: descriptor.match(/\bownerProgramId:\s*"([^"]+)"/)?.[1] ?? null,
    sinkId: descriptor.match(/\bsinkId:\s*"([^"]+)"/)?.[1] ?? null,
    sourceSites: (descriptor.match(/\bsourceSites:\s*\[([^\]]*)\]/)?.[1] ?? "")
      .match(/"([^"]+)"/g)?.map((site) => site.slice(1, -1)) ?? [],
  }));
  const bindings = [...row.matchAll(/__nativeBindStatePropAt\(\s*"([^"]+#state:\d+)"\s*,[\s\S]*?__nativeNumericPrograms\[(\d+)\]\s*\)/g)]
    .map(([, siteId, programIndex]) => ({ siteId, programIndex: Number(programIndex) }));
  const expectedSites = [0, 1, 2].map((slot) => `${ownerProgramId}#state:${slot}`);
  const denseSlots = slots.length === 3 && slots.every((slot, index) =>
    slot.siteId === expectedSites[index] && slot.slot === index
  );
  const validDescriptors = descriptors.length === 3 && descriptors.every((descriptor, index) =>
    descriptor.schemaVersion === 2 &&
    descriptor.ownerProgramId === ownerProgramId &&
    typeof descriptor.sinkId === "string" && descriptor.sinkId.length > 0 &&
    descriptor.sourceSites.length === 1 && descriptor.sourceSites[0] === expectedSites[index]
  ) && new Set(descriptors.map(({ sinkId }) => sinkId)).size === 3;
  const validBindings = bindings.length === 3 && bindings.every((binding, index) =>
    binding.siteId === expectedSites[index] && binding.programIndex === index
  );
  return {
    ownerProgramId,
    stateLayoutProgramId,
    slots,
    denseSlots,
    numericDescriptors: descriptors,
    validDescriptors,
    bindings,
    validBindings,
    matchesOwnerProgram: ownerProgramId !== null && ownerProgramId === stateLayoutProgramId,
  };
}

const compilerProof: Plugin = {
  name: "product-mixed-compiled-owner-rows-compiler-proof",
  enforce: "post",
  async transform(code, id) {
    const reactArm = id.endsWith("/src/browser/product_mixed_react_arm.tsx");
    const nativeArm = id.endsWith("/src/browser/native_product_mixed_arm.tsx");
    if (!reactArm && !nativeArm) return null;
    const row = code.slice(code.indexOf(reactArm ? "function ReactRow(" : "function ProductMixedRow("), code.indexOf(reactArm ? "function ReactBoard(" : "function ProductMixedBoard("));
    const board = code.slice(code.indexOf(reactArm ? "function ReactBoard(" : "function ProductMixedBoard("), code.indexOf(reactArm ? "const createProductMixedReact" : "const applyEdit"));
    const proof = reactArm
      ? { arm: "react", compiled: /react\/compiler-runtime|react-compiler-runtime/.test(code), rowMemoCache: /\b_c\(/.test(row), boardMemoCache: /\b_c\(/.test(board) }
      : { arm: "native", compiled: /__nativeDefineComponent\([^\n]*ProductMixedRow/.test(code), bindings: (row.match(/__nativeBindStateProps?At\(/g) ?? []).length, deltas: /__nativeRenderCollectionAt\(/.test(board), propOnly: /ProductMixedRow, \{ propOnlySites: \[[^\]]+#state:/.test(code), deltaFallback: /requiresOwnerRender:\s*true/.test(board), ownerRow: ownerRowProof(code, row) };
    await mkdir(".cache/product-mixed-compiled-owner-rows/compiler-proof", { recursive: true });
    await writeFile(`.cache/product-mixed-compiled-owner-rows/compiler-proof/${proof.arm}.json`, JSON.stringify(proof, null, 2) + "\n");
    await writeFile(`.cache/product-mixed-compiled-owner-rows/compiler-proof/${proof.arm}.js`, code);
    if (!proof.compiled || (reactArm && (!("rowMemoCache" in proof) || !proof.rowMemoCache || !proof.boardMemoCache)) || (nativeArm && (!("bindings" in proof) || (proof.bindings ?? 0) < 3 || !proof.deltas || !proof.propOnly || proof.deltaFallback || !proof.ownerRow.matchesOwnerProgram || !proof.ownerRow.denseSlots || !proof.ownerRow.validDescriptors || !proof.ownerRow.validBindings))) {
      throw new Error(`Required compiled owner-row arm missing: ${JSON.stringify(proof)}`);
    }
    return null;
  },
};

export default defineConfig({
  server: { ...(process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : {}), ...(process.env.HOST ? { host: process.env.HOST } : {}) },
  preview: { ...(process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : {}), ...(process.env.HOST ? { host: process.env.HOST } : {}) },
  plugins: [
    nativeModulePlugin(),
    react({ exclude: /native_product_mixed_arm\.tsx$/, babel: id => ({ plugins: id.endsWith("/product_mixed_react_arm.tsx") ? [["babel-plugin-react-compiler", { target: "19" }]] : [] }) }),
    compilerProof,
  ],
  build: { outDir: "dist-product-mixed-compiled-owner-rows", rollupOptions: { input: fileURLToPath(new URL("./product-mixed-v2.html", import.meta.url)) } },
});
