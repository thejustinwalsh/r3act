import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const literal = node => node?.type === "StringLiteral" ? node.value : null;
const property = (node, name) => node?.type === "ObjectExpression" ? node.properties.find(entry =>
  entry.type === "ObjectProperty" && (entry.key.name ?? entry.key.value) === name)?.value : null;
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(item => visit(item, callback));
    else if (value && typeof value === "object") visit(value, callback);
  }
};

/** Actual native source proof only; real React DOM behavior needs browser execution. */
export async function verifyCompiledReactBridgeSource({ fixture, appName, components,
  bridgeImport, bridgeSymbol, adapterTarget, storeSites }) {
  const compiler = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
  const artifact = path.join(root, ".cache", `compiled-${path.basename(fixture, ".tsx")}-source-${randomUUID()}`);
  const original = await readFile(path.join(root, fixture), "utf8");
  const compilerHash = sha(await readFile(compiler));
  const authored = parse(original, { sourceType: "module", plugins: ["typescript", "jsx"] }).program;
  assert.ok(authored.body.some(node => node.type === "ImportDeclaration" && node.source.value === "@r3act/core"));
  const bridgeDeclaration = authored.body.find(node => node.type === "ImportDeclaration" && node.source.value === bridgeImport);
  const bridgeAlias = bridgeDeclaration?.specifiers.find(specifier => specifier.type === "ImportSpecifier" &&
    (specifier.imported.name ?? specifier.imported.value) === bridgeSymbol)?.local.name;
  assert.equal(typeof bridgeAlias, "string", "fixture must import its public bridge symbol");
  if (adapterTarget) {
    let wrapsTarget = false;
    visit(authored, node => { if (node.type === "CallExpression" && node.callee.name === bridgeAlias &&
      node.arguments[0]?.name === adapterTarget) wrapsTarget = true; });
    assert.ok(wrapsTarget, "fixture must wrap its actual React component");
  }
  await mkdir(artifact, { recursive: true });
  await writeFile(path.join(artifact, path.basename(fixture)), original, { flag: "wx" });
  const plugin = nativeModuleCompilerPlugin({ root, compilerBinary: compiler });
  const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
  let report, primaryError, primaryFailed = false;
  try {
    const transformed = await plugin.transform.call(context, original, path.join(root, fixture));
    assert.ok(transformed?.code, "actual Rust/OXC native transform missing");
    await writeFile(path.join(artifact, "transformed.tsx"), transformed.code, { flag: "wx" });
    const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] }).program;
    const aliases = new Map();
    for (const statement of ast.body) if (statement.type === "ImportDeclaration" && statement.source.value === "@r3act/core")
      for (const specifier of statement.specifiers) if (specifier.type === "ImportSpecifier")
        aliases.set(specifier.imported.name ?? specifier.imported.value, specifier.local.name);
    for (const helper of ["defineComponent", "useAt", "useStateAt"])
      assert.equal(typeof aliases.get(helper), "string", `missing native helper import: ${helper}`);
    const calls = [];
    visit(ast, node => { if (node.type === "CallExpression") calls.push(node); });
    const definitions = calls.filter(call => call.callee.name === aliases.get("defineComponent"));
    for (const name of components) assert.ok(definitions.some(call =>
      literal(call.arguments[0]) === `${fixture}#component:${name}`), `${name} lacks actual registration`);
    const definition = definitions.find(call => literal(call.arguments[0]) === `${fixture}#component:${appName}`);
    const metadata = definition?.arguments[2], sites = property(metadata, "propOnlySites");
    assert.ok(sites?.type === "ArrayExpression" && sites.elements.length === 0, "bridge must remain opaque");
    for (const name of ["closedStoreHostProgram", "closedResourceHostProgram", "closedComponentForwardProgram"])
      assert.equal(property(metadata, name), undefined, `opaque bridge gained ${name}`);
    const app = ast.body.map(node => node.type === "ExportNamedDeclaration" ? node.declaration : node)
      .find(node => node?.type === "FunctionDeclaration" && node.id?.name === appName);
    assert.ok(app, "authored app function is missing");
    const appCalls = [];
    visit(app.body, node => { if (node.type === "CallExpression") appCalls.push(node); });
    for (const site of [...storeSites.map(index => ["useAt", `store:${index}`]), ["useStateAt", "state:0"]])
      assert.ok(appCalls.some(call => call.callee.name === aliases.get(site[0]) &&
        literal(call.arguments[0]) === `${fixture}#component:${appName}#${site[1]}`), `missing scoped ${site[1]}`);
    assert.ok(transformed.code.includes(bridgeSymbol), "bridge symbol removed by transform");
    report = { status: "PASS_AST_SOURCE_PROOF_ONLY", meaning: "Rust/OXC source/AST proof; real React DOM is separate browser evidence",
      fixture, transformedSourceId: fixture, fixtureSha256: sha(original), compiler: path.relative(root, compiler),
      compilerSha256: compilerHash, transformedSha256: sha(transformed.code), registrations: components,
      loweredCalls: ["useAt", "useStateAt"], storeSites, opaque: true, publicImports: ["@r3act/core", bridgeImport] };
  } catch (error) { primaryFailed = true; primaryError = error; }
  const cleanupErrors = [];
  try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
  let compilerHashAfter = null;
  try {
    compilerHashAfter = sha(await readFile(compiler));
    assert.equal(compilerHashAfter, compilerHash, "compiler binary changed during source proof");
  } catch (error) { cleanupErrors.push(error); }
  if (primaryFailed || cleanupErrors.length) {
    await writeFile(path.join(artifact, "failure.json"), JSON.stringify({ status: "FAILED",
      primaryError: primaryFailed ? String(primaryError?.stack ?? primaryError) : null,
      cleanupErrors: cleanupErrors.map(error => String(error?.stack ?? error)), compilerSha256Before: compilerHash,
      compilerSha256After: compilerHashAfter }, null, 2) + "\n", { flag: "wx" });
    throw new AggregateError([...(primaryFailed ? [primaryError] : []), ...cleanupErrors], "Compiled React bridge source proof failed");
  }
  Object.assign(report, { compilerSha256After: compilerHashAfter, compilerClosed: true });
  await writeFile(path.join(artifact, "source-proof.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ artifact, ...report }));
}
