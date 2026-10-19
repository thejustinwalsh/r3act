import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = path.join(root, "compiler/fixtures/native-react-island.tsx");
const compiler = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const artifact = path.join(root, ".cache", `compiled-react-island-source-${randomUUID()}`);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const original = await readFile(fixture, "utf8");
const compilerHash = sha(await readFile(compiler));
assert.match(original, /from "@r3act\/core"/, "fixture must use the public native package");
assert.match(original, /from "@r3act\/react-bridge"/, "fixture must use the public bridge package");
assert.match(original, /createNativeReactRootAdapter\(ReactLeaf\)/,
  "fixture must wrap the actual React component through the public bridge");
await mkdir(artifact, { recursive: true });
const sourcePath = path.join(artifact, "native-react-island.tsx");
await writeFile(sourcePath, original, { flag: "wx" });
const plugin = nativeModuleCompilerPlugin({ root, compilerBinary: compiler });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
let transformed, report, primaryError;
try {
  transformed = await plugin.transform.call(context, original, fixture);
  assert.ok(transformed?.code, "actual Rust/OXC native transform missing");
  await writeFile(path.join(artifact, "native-react-island.transformed.tsx"), transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const aliases = new Map();
  for (const statement of ast.program.body) if (statement.type === "ImportDeclaration")
    for (const specifier of statement.specifiers) if (specifier.type === "ImportSpecifier")
      aliases.set(specifier.imported.name ?? specifier.imported.value, specifier.local.name);
  for (const name of ["defineComponent", "useAt", "useStateAt"]) {
    assert.equal(typeof aliases.get(name), "string", `missing native helper import: ${name}`);
  }
  const calls = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "CallExpression") calls.push(node);
    for (const [key, value] of Object.entries(node)) {
      if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  };
  visit(ast);
  const definitions = calls.filter(call => call.callee.name === aliases.get("defineComponent"));
  const literal = node => node?.type === "StringLiteral" ? node.value : null;
  for (const name of ["NativeIslandApp", "PendingGate"]) assert.ok(definitions.some(call =>
    literal(call.arguments[0])?.endsWith(`#component:${name}`)), `${name} lacks actual compiled registration`);
  const app = ast.program.body.map(node => node.type === "ExportNamedDeclaration" ? node.declaration : node)
    .find(node => node?.type === "FunctionDeclaration" && node.id?.name === "NativeIslandApp");
  assert.ok(app, "authored native app missing in transformed module");
  const appCalls = [];
  const collect = node => {
    if (!node || typeof node !== "object") return;
    if (node.type === "CallExpression") appCalls.push(node.callee.name);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === "object") collect(value);
    }
  };
  collect(app.body);
  assert.ok(appCalls.includes(aliases.get("useAt")), "Store read was not lowered to a native call site");
  assert.ok(appCalls.includes(aliases.get("useStateAt")), "native local state was not lowered to a native call site");
  assert.ok(transformed.code.includes("createNativeReactRootAdapter") && transformed.code.includes("ReactLeaf"),
    "bridge adapter or actual React component was removed by native transform");
  report = { status: "PASS_AST_SOURCE_PROOF_ONLY", meaning: "Actual Rust/OXC native source transform; real ReactDOM behavior is covered by the bounded browser workload",
    fixture: path.relative(root, fixture), transformedSourceId: path.relative(root, fixture), fixtureSha256: sha(original), compiler: path.relative(root, compiler),
    compilerSha256: compilerHash, transformedSha256: sha(transformed.code),
    registrations: ["NativeIslandApp", "PendingGate"], loweredCalls: ["useAt", "useStateAt"],
    publicImports: ["@r3act/core", "@r3act/react-bridge"] };
} catch (error) { primaryError = error; }
const cleanupErrors = [];
try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
let compilerHashAfter = null;
try {
  compilerHashAfter = sha(await readFile(compiler));
  assert.equal(compilerHashAfter, compilerHash, "compiler binary changed during source proof");
} catch (error) { cleanupErrors.push(error); }
if (primaryError || cleanupErrors.length) {
  await writeFile(path.join(artifact, "failure.json"), JSON.stringify({ status: "FAILED",
    primaryError: primaryError ? String(primaryError?.stack ?? primaryError) : null,
    cleanupErrors: cleanupErrors.map(error => String(error?.stack ?? error)),
    fixtureSha256: sha(original), compilerSha256Before: compilerHash,
    compilerSha256After: compilerHashAfter }, null, 2) + "\n", { flag: "wx" });
  throw new AggregateError([...(primaryError ? [primaryError] : []), ...cleanupErrors],
    "Compiled React island source proof failed");
}
report.compilerSha256After = compilerHashAfter;
report.compilerClosed = true;
await writeFile(path.join(artifact, "source-proof.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ artifact, ...report }));
