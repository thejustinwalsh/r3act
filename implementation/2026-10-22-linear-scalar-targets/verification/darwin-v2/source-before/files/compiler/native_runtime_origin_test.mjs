import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import { transformWithOxc } from "vite";
import { createNativeRoot, createWorld, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const fixtureRoot = path.join(root, "compiler/fixtures/native-runtime-origin");
const runtimePath = path.join(root, "src/native_runtime_api.ts");
const runtimeUrl = pathToFileURL(runtimePath).href;
const binaryArg = process.argv.indexOf("--compiler-binary");
const binary = binaryArg < 0
  ? path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike")
  : process.argv[binaryArg + 1];
assert.ok(binary, "--compiler-binary requires a path");
const moduleArg = process.argv.indexOf("--compiler-module");
const compilerModule = moduleArg < 0
  ? path.join(root, "compiler/vite_native_module.ts")
  : process.argv[moduleArg + 1];
assert.ok(compilerModule, "--compiler-module requires a path");
const { nativeModuleCompilerPlugin } = await import(pathToFileURL(path.resolve(compilerModule)).href);
const expectOldBug = process.argv.includes("--expect-old-bug");
const artifact = path.join(root, ".cache", `compiled-runtime-origin-classification-${randomUUID()}`);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const plugin = nativeModuleCompilerPlugin({ root, compilerBinary: binary });
const inputs = [];
const resolver = {
  addWatchFile() {},
  error(message) { throw new Error(String(message)); },
  async resolve(specifier, importer) {
    if (specifier === "@r3act/core" || specifier === "@alias/native") {
      return { id: runtimePath };
    }
    if (specifier.startsWith("file:")) return { id: fileURLToPath(specifier) };
    if (specifier.startsWith(".")) {
      return { id: path.resolve(path.dirname(importer.split("?", 1)[0]), specifier) };
    }
    return null;
  },
};
const noResolver = { addWatchFile() {}, error: resolver.error };
const compile = async (name, source, id, context = resolver) => {
  inputs.push({ name, id, sha256: sha(source) });
  const result = await plugin.transform.call(context, source, id);
  if (result?.code) {
    await writeFile(path.join(artifact, `${name}.transformed.tsx`), result.code,
      { flag: "wx" });
  }
  return result;
};

try {
  await mkdir(artifact, { recursive: true });
  const fixture = async name => readFile(path.join(fixtureRoot, name), "utf8");
  const fake = await compile("fake", await fixture("fake-app.tsx"),
    path.join(fixtureRoot, "fake-app.tsx"));
  const substring = await compile("substring", await fixture("substring-app.tsx"),
    path.join(fixtureRoot, "substring-app.tsx"));
  if (expectOldBug) {
    assert.ok(fake?.code, "Old basename recognition no longer reproduces");
    assert.match(fake.code, /__nativeUseAt\s*\(/);
    const fakeRuntimeSource = (await fixture("fake/native_runtime_api.ts"))
      .replaceAll('"@r3act/core"', JSON.stringify(runtimeUrl));
    const fakeRuntime = await transformWithOxc(fakeRuntimeSource,
      path.join(fixtureRoot, "fake/native_runtime_api.ts"), { lang: "ts" });
    const fakeModulePath = path.join(artifact, "fake-runtime.mjs");
    await writeFile(fakeModulePath, fakeRuntime.code, { flag: "wx" });
    const fakeRuntimeUrl = pathToFileURL(fakeModulePath).href;
    const executableSource = fake.code.replace(
      /(["'])\.\/fake\/native_runtime_api\.ts\1/g,
      JSON.stringify(fakeRuntimeUrl));
    const emitted = await transformWithOxc(executableSource,
      path.join(fixtureRoot, "fake-app.tsx"),
      { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
    const executable = `import { jsx, Fragment } from ${JSON.stringify(runtimeUrl)};\n${emitted.code}`;
    const executablePath = path.join(artifact, "fake-app.mjs");
    await writeFile(executablePath, executable, { flag: "wx" });
    const fakeApp = await import(pathToFileURL(executablePath).href);
    const fakeRuntimeModule = await import(fakeRuntimeUrl);
    const host = new MemoryVDOMHost(), container = host.createContainer();
    const mounted = createNativeRoot(host, container, {
      rootId: "old-origin-bug", world: createWorld(), scheduleCommit() {},
    });
    try {
      mounted.mount(jsx(fakeApp.App, {}));
      assert.equal(container.children[0]?.tag, "output");
      assert.equal(container.children[0].children.map((node) => node.text ?? "").join(""),
        "probe", "Old compiler did not silently invoke the native Store hook");
    } finally { mounted.dispose(); }
    assert.equal(fakeRuntimeModule.observations.calls, 0,
      "Old compiler unexpectedly called the wrapper's custom use");
    console.log(JSON.stringify({ status: "EXPECTED_BUG_REPRODUCED", artifact,
      fakeTransformed: true, renderedText: "probe", customUseCalls: 0 }));
  } else {
    assert.equal(fake, null, "Nested fake native_runtime_api.ts activated native compilation");
    assert.equal(substring, null,
      "Substring native_runtime_api wrapper activated native compilation");
    const authored = await fixture("app.tsx");
    const spoofedResolver = {
      ...resolver,
      async resolve(specifier, importer) {
        if (specifier === "@r3act/core") {
          return { id: path.join(fixtureRoot, "my_native_runtime_api.ts") };
        }
        return resolver.resolve(specifier, importer);
      },
    };
    const spoofed = await compile("spoofed-public", authored,
      path.join(fixtureRoot, "app.tsx"), spoofedResolver);
    assert.equal(spoofed, null,
      "Canonical package spelling resolved to wrapper activated compilation");
    const canonical = await compile("canonical", authored,
      path.join(fixtureRoot, "app.tsx"));
    assert.ok(canonical?.code, "Public native import did not activate compilation");
    assert.match(canonical.code, /__nativeUseStateAt/);
    assert.match(canonical.code, /wrapperUse\(count\)/);
    assert.doesNotMatch(canonical.code, /__nativeUseAt\s*\(/);
    assert.match(canonical.code, /registerCompiledSemanticPlan/);
    const source = `/** @jsxImportSource @r3act/core */\nimport { useState } from ${JSON.stringify(runtimeUrl)};\nexport function Source(){ const [count] = useState(2); return <output>{count}</output>; }\n`;
    const sourceUrl = await compile("source-url", source,
      path.join(fixtureRoot, "source-url.tsx"), noResolver);
    assert.ok(sourceUrl?.code, "Canonical runtime source URL did not activate compilation");
    assert.match(sourceUrl.code, /__nativeUseStateAt/);
    const mixed = source.replace("export function Source", `import { use as wrapperUse } from "@r3act/core";\nexport function Source`)
      .replace("<output>{count}</output>", "<output>{wrapperUse(count)}</output>");
    const mixedResult = await compile("mixed-origin", mixed,
      path.join(fixtureRoot, "mixed-origin.tsx"), spoofedResolver);
    assert.ok(mixedResult?.code, "Trusted source hook was lost beside spoofed package import");
    assert.match(mixedResult.code, /__nativeUseStateAt/);
    assert.match(mixedResult.code, /wrapperUse\(count\)/);
    assert.doesNotMatch(mixedResult.code, /__nativeUseAt\s*\(/);
    const aliased = source.replace(JSON.stringify(runtimeUrl), '"@alias/native"')
      .replace("function Source", "function Aliased");
    const alias = await compile("alias", aliased,
      path.join(fixtureRoot, "alias.tsx"));
    assert.ok(alias?.code, "Resolver-confirmed native alias did not compile");
    assert.match(alias.code, /__nativeUseStateAt/);
    const revisionSource = source.replace("export function Source",
      'import { createStore } from "@alias/native";\nexport function Source');
    const revisionId = path.join(fixtureRoot, "origin-revision.tsx");
    const revisionTrusted = await compile("revision-trusted", revisionSource,
      revisionId, resolver);
    const spoofedAliasResolver = {
      ...resolver,
      async resolve(specifier, importer) {
        if (specifier === "@alias/native") {
          return { id: path.join(fixtureRoot, "my_native_runtime_api.ts") };
        }
        return resolver.resolve(specifier, importer);
      },
    };
    const revisionUntrusted = await compile("revision-untrusted", revisionSource,
      revisionId, spoofedAliasResolver);
    assert.ok(revisionTrusted?.code && revisionUntrusted?.code,
      "Canonical source hook did not compile under both resolver authorities");
    const revision = (code) => code.match(/"module_revision"\s*:\s*"(native-v1-[^"]+)"/)?.[1];
    assert.ok(revision(revisionTrusted.code));
    assert.ok(revision(revisionUntrusted.code));
    assert.notEqual(revision(revisionTrusted.code), revision(revisionUntrusted.code),
      "Changing trusted import origins left the semantic module revision unchanged");
    const fakeUrl = source.replace(JSON.stringify(runtimeUrl),
      JSON.stringify(pathToFileURL(path.join(fixtureRoot, "fake/native_runtime_api.ts")).href));
    const fakeSource = await compile("fake-url", fakeUrl,
      path.join(fixtureRoot, "fake-url.tsx"), noResolver);
    assert.equal(fakeSource, null, "Fake exact-basename URL was trusted without resolution");
    const querySource = source.replace(JSON.stringify(runtimeUrl),
      JSON.stringify(`${runtimeUrl}?raw`));
    assert.equal(await compile("runtime-query", querySource,
      path.join(fixtureRoot, "runtime-query.tsx"), noResolver), null,
    "Runtime import with ?raw was trusted");
    const queriedResolver = {
      ...resolver,
      async resolve(specifier, importer) {
        if (specifier === "@alias/native") return { id: `${runtimePath}?url` };
        return resolver.resolve(specifier, importer);
      },
    };
    const queriedAlias = source.replace(JSON.stringify(runtimeUrl), '"@alias/native"');
    assert.equal(await compile("resolved-query", queriedAlias,
      path.join(fixtureRoot, "resolved-query.tsx"), queriedResolver), null,
    "Resolved runtime module with ?url was trusted");
    const hot = await compile("hot", authored,
      `${path.join(fixtureRoot, "app.tsx")}?t=origin-refresh`);
    assert.ok(hot?.code, "Normal HMR query lost the canonical native boundary");
    assert.match(hot.code, /__nativeUseStateAt/);
    const hotSpoofed = await compile("hot-spoofed", authored,
      `${path.join(fixtureRoot, "app.tsx")}?t=origin-spoof`, spoofedResolver);
    assert.equal(hotSpoofed, null,
      "HMR transform kept the native boundary after resolver origin changed");
    for (const mode of ["missing", "mismatched"]) {
      const fakeBinary = path.join(artifact, `stale-compiler-${mode}.mjs`);
      const echo = mode === "missing" ? "" :
        ', trusted_runtime_modules: ["@r3act/core", "@alias/native"]';
      const fakeSource = `#!${process.execPath}\nlet buffer = "";\nprocess.stdin.setEncoding("utf8");\nprocess.stdin.on("data", chunk => {\n  buffer += chunk;\n  while (buffer.includes("\\n")) {\n    const cut = buffer.indexOf("\\n");\n    const line = buffer.slice(0, cut);\n    buffer = buffer.slice(cut + 1);\n    if (!line.trim()) continue;\n    const request = JSON.parse(line);\n    process.stdout.write(JSON.stringify({ id: request.id, code: request.source, plan: {}, edits: []${echo} }) + "\\n");\n  }\n});\n`;
      await writeFile(fakeBinary, fakeSource, { flag: "wx" });
      await chmod(fakeBinary, 0o755);
      const stalePlugin = nativeModuleCompilerPlugin({ root, compilerBinary: fakeBinary });
      try {
        await assert.rejects(() => stalePlugin.transform.call(resolver, authored,
          path.join(fixtureRoot, `stale-${mode}.tsx`)),
        /trusted runtime-origin protocol/);
      } finally {
        await stalePlugin.closeBundle?.();
      }
    }
    console.log(JSON.stringify({ status: "PASS", artifact,
      canonical: true, sourceUrl: true, alias: true, hmr: true,
      fake: false, substring: false, spoofed: false, queried: false }));
  }
  const fixtureNames = ["app.tsx", "fake-app.tsx", "substring-app.tsx",
    "fake/native_runtime_api.ts", "my_native_runtime_api.ts"];
  const fixtureHashes = Object.fromEntries(await Promise.all(fixtureNames.map(
    async (name) => [name, sha(await fixture(name))],
  )));
  await writeFile(path.join(artifact, "provenance.json"), JSON.stringify({
    compilerSha256: sha(await readFile(binary)),
    compilerModule: path.resolve(compilerModule),
    compilerModuleSha256: sha(await readFile(compilerModule)),
    fixtureRoot, fixtureHashes, inputs,
  }, null, 2) + "\n", { flag: "wx" });
} finally {
  await plugin.closeBundle?.();
}
