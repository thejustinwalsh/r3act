import assert from "node:assert/strict";
import {
  GENERATED_HOST_JSX_HEADER,
  generateHostJSXDeclarations,
} from "./host_jsx_declarations.ts";

const options = {
  namespaceModule: "./test-host.ts",
  intrinsicMapModule: "../src/three_intrinsic_types.ts",
  intrinsicMapExport: "ThreeIntrinsicElements",
  jsxImportSource: "@compiled-ui/runtime/three",
};

const expected = [
  GENERATED_HOST_JSX_HEADER,
  'import type { ThreeIntrinsicElements as __HostIntrinsicMap } from "../src/three_intrinsic_types.ts";',
  'type __GeneratedHostJSXIntrinsicElements = __HostIntrinsicMap<typeof import("./test-host.ts")>;',
  'import type {} from "@compiled-ui/runtime/three/jsx-runtime";',
  'import type {} from "@compiled-ui/runtime/three/jsx-dev-runtime";',
  'declare module "@compiled-ui/runtime/three/jsx-runtime" {',
  "  namespace JSX {",
  "    interface IntrinsicElements extends __GeneratedHostJSXIntrinsicElements {}",
  "  }",
  "}",
  'declare module "@compiled-ui/runtime/three/jsx-dev-runtime" {',
  "  namespace JSX {",
  "    interface IntrinsicElements extends __GeneratedHostJSXIntrinsicElements {}",
  "  }",
  "}",
  "",
].join("\n");

const generated = generateHostJSXDeclarations(options);
assert.equal(generated, expected, "the declaration output is stable and type-only");
assert.equal(generateHostJSXDeclarations(options), generated, "identical inputs are idempotent");
assert.equal(generated.split("\n", 1)[0], GENERATED_HOST_JSX_HEADER);
assert.match(generated, /typeof import\("\.\/test-host\.ts"\)/);
assert.match(generated, /jsx-runtime/);
assert.match(generated, /jsx-dev-runtime/);
assert.ok(
  generated.split("\n").filter((line) => line.startsWith("import "))
    .every((line) => line.startsWith("import type ")),
  "all generated imports are type-only",
);

assert.throws(
  () => generateHostJSXDeclarations({ ...options, namespaceModule: "  " }),
  /namespaceModule must be a non-empty module specifier/,
);
assert.throws(
  () => generateHostJSXDeclarations({ ...options, intrinsicMapModule: "bad\nmodule" }),
  /intrinsicMapModule must not contain control characters/,
);
assert.throws(
  () => generateHostJSXDeclarations({ ...options, jsxImportSource: "///" }),
  /jsxImportSource must include a package or module name/,
);
assert.throws(
  () => generateHostJSXDeclarations({ ...options, intrinsicMapExport: "not-valid" }),
  /intrinsicMapExport must be a valid non-reserved identifier/,
);
assert.throws(
  () => generateHostJSXDeclarations({ ...options, intrinsicMapExport: "class" }),
  /intrinsicMapExport must be a valid non-reserved identifier/,
);

console.log("host JSX declaration generator tests passed");
