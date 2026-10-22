import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nativeModulePlugin } from "./vite_native_plugin.ts";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(path.join(project, ".cache"), { recursive: true });
const root = mkdtempSync(path.join(project, ".cache/host-jsx-"));
const schema = {
  namespaceModule: "./custom-host.ts",
  intrinsicMapModule: "../../src/three_intrinsic_types.ts",
  intrinsicMapExport: "ThreeIntrinsicElements",
  jsxImportSource: "test-three",
  declarationFile: "host-jsx.d.ts",
};
const configure = (jsxHosts) => nativeModulePlugin({ jsxHosts }).configResolved.call({}, { root });
try {
  writeFileSync(path.join(root, "custom-host.ts"), `import { Object3D } from "three";
export class CustomActor extends Object3D {
  mode: "active" | "idle" = "idle";
  constructor(public speed: number) { super(); }
}
export const unrelated = 123;
`);
  configure([schema]);
  const generated = path.join(root, schema.declarationFile);
  const code = readFileSync(generated, "utf8");
  const modified = statSync(generated).mtimeMs;
  configure([schema]);
  assert.equal(readFileSync(generated, "utf8"), code);
  assert.equal(statSync(generated).mtimeMs, modified, "unchanged declarations must not trigger a watch cycle");
  assert.throws(() => configure([schema, schema]), /Duplicate JSX/);
  assert.throws(() => configure([{ ...schema, declarationFile: "../escaped.d.ts" }]), /inside/);
  assert.throws(() => configure([{ ...schema, declarationFile: "host.ts" }]), /\.d\.ts/);
  writeFileSync(path.join(root, "authored.d.ts"), "// authored\n");
  assert.throws(() => configure([{ ...schema, declarationFile: "authored.d.ts" }]), /overwrite authored/);
  assert.equal(readFileSync(path.join(root, "authored.d.ts"), "utf8"), "// authored\n");

  mkdirSync(path.join(root, "widgets"));
  for (const name of ["jsx-runtime", "jsx-dev-runtime"]) {
    writeFileSync(path.join(root, "widgets", `${name}.d.ts`), `export namespace JSX {
  type Element = {};
  type ElementType = keyof IntrinsicElements;
  interface IntrinsicElements {}
}
export declare function jsx(type: string, props: unknown): JSX.Element;
export declare const jsxDEV: typeof jsx;
`);
  }
  writeFileSync(path.join(root, "widgets.ts"), `export class Widget { constructor(public label: string) {} }`);
  writeFileSync(path.join(root, "widget-map.ts"), `export type WidgetElements<Namespace> = {
  [K in keyof Namespace & string as Namespace[K] extends new (...args: any[]) => any ? Uncapitalize<K> : never]:
    Namespace[K] extends new (...args: infer Args) => infer Instance ? { args: Args; value?: Instance } : never;
};`);
  configure([{ namespaceModule: "./widgets.ts", intrinsicMapModule: "./widget-map.ts", intrinsicMapExport: "WidgetElements", jsxImportSource: "./widgets", declarationFile: "widget-jsx.d.ts" }]);
  writeFileSync(path.join(root, "widget-consumer.tsx"), `/** @jsxImportSource ./widgets */
export const good = <widget args={["hello"]} />;
// @ts-expect-error A non-Three host owns its constructor signature too.
export const bad = <widget args={[123]} />;
// @ts-expect-error Host schemas do not leak across JSX import sources.
export const foreign = <customActor args={[1]} />;
`);

  writeFileSync(path.join(root, "consumer.tsx"), `import { CustomActor } from "./custom-host.ts";
export const valid = <group position={[1, 2, 3]}><customActor args={[2]} mode="active" ref={(actor) => { const a: CustomActor | null = actor; void a; }} /></group>;
export const primitive = <primitive object={new CustomActor(1)} />;
// @ts-expect-error Required constructor arguments remain required.
export const missing = <customActor />;
// @ts-expect-error Constructor arguments are inferred.
export const badArgs = <customActor args={["fast"]} />;
// @ts-expect-error Literal data values are inferred.
export const badMode = <customActor args={[1]} mode="broken" />;
// @ts-expect-error Methods cannot be props.
export const method = <customActor args={[1]} updateMatrixWorld={true} />;
// @ts-expect-error Non-constructors do not become JSX tags.
export const unrelated = <unrelated />;
// @ts-expect-error Unknown props are rejected.
export const unknown = <customActor args={[1]} mystery={2} />;
`);
  const check = (jsx) => {
    const config = {
      compilerOptions: {
        target: "ES2023", lib: ["ES2023", "DOM"], module: "ESNext",
        moduleResolution: "Bundler", allowImportingTsExtensions: true,
        strict: true, noEmit: true, types: ["node"], jsx, jsxImportSource: "test-three",
        paths: {
          "test-three/jsx-runtime": ["../../src/three_jsx_runtime.ts"],
          "test-three/jsx-dev-runtime": ["../../src/three_jsx_dev_runtime.ts"],
        },
      },
      files: ["host-jsx.d.ts", "custom-host.ts", "consumer.tsx", "widget-jsx.d.ts", "widget-consumer.tsx"],
    };
    writeFileSync(path.join(root, "tsconfig.json"), JSON.stringify(config));
    const result = spawnSync(path.join(project, "node_modules/.bin/tsgo"), ["-p", path.join(root, "tsconfig.json")], { cwd: project, encoding: "utf8" });
    assert.equal(result.status, 0, `${jsx}: ${result.stdout}\n${result.stderr}\n${result.error ?? ""}`);
  };
  check("react-jsx");
  check("react-jsxdev");
  // Declaration files reference the live namespace rather than copying its old props.
  writeFileSync(path.join(root, "custom-host.ts"), readFileSync(path.join(root, "custom-host.ts"), "utf8").replace('"active" | "idle"', '"idle"'));
  const result = spawnSync(path.join(project, "node_modules/.bin/tsgo"), ["-p", path.join(root, "tsconfig.json")], { cwd: project, encoding: "utf8" });
  assert.notEqual(result.status, 0, "editing the constructor namespace updates types without regeneration");
  assert.match(result.stdout, /active/);
  console.log("Vite-generated host JSX types passed for production and development JSX");
} finally {
  rmSync(root, { recursive: true, force: true });
}
