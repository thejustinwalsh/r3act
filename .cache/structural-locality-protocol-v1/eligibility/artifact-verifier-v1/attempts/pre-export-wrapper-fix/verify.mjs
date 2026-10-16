import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL("./", import.meta.url));
const stage = path.resolve(here, "..");
const root = path.resolve(stage, "../../..");
const out = path.join(here, "verification-report.json");
const expected = Object.freeze({
  lock: "fe59755ce7b5949876cd43b3b17213a4bf9e0d296a6ba290db6fabbc1126ea09",
  failedReport: "d129832c1e57367b91ecb96f7df5c69e9e0cb4d007f32ff14212934cb7fb2166",
  binary: "74396ae694aa6203cc4d4b4900c3458ca31e25e9638c73160b51bcb4aede79c8",
  bundle: "256929be02a299e1e1a6681a1b800c463d1723993fafc9dc7648aa6404c1cdb1",
  emittedReact: "dbc5ec9463c49d41fd2512086d03aecc8225eafe15632d644019e42a9819335e",
});
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const bytes = (name) => readFile(path.join(stage, name));
const req = createRequire(import.meta.url);
const pluginPath = req.resolve("@vitejs/plugin-react", { paths: [root] });
const babel = createRequire(pluginPath)("@babel/core");
const parse = (source) => babel.parseSync(source, { sourceType: "unambiguous" });
assert.equal(typeof parse, "function");

const isId = (node, name) => node?.type === "Identifier" && node.name === name;
const isMember = (node, object, property) => node?.type === "MemberExpression" &&
  !node.computed && isId(node.object, object) && isId(node.property, property);
const isCall = (node, callee) => node?.type === "CallExpression" && isId(node.callee, callee);
const declarations = (program) => program.program.body.flatMap((statement) =>
  statement.type === "VariableDeclaration" ? statement.declarations : []);
const declaration = (program, name) => declarations(program).find((node) => isId(node.id, name));
const functionNamed = (program, name) => program.program.body.find((node) =>
  node.type === "FunctionDeclaration" && isId(node.id, name));
function walk(node, predicate) {
  if (!node || typeof node !== "object") return false;
  if (predicate(node)) return true;
  return Object.values(node).some((value) => Array.isArray(value)
    ? value.some((child) => walk(child, predicate))
    : value && typeof value === "object" && walk(value, predicate));
}
function directCacheSlot(program, functionName, kind) {
  const fn = functionNamed(program, functionName);
  assert.ok(fn, `missing ${functionName}`);
  const calls = fn.body.body.flatMap((statement) =>
    statement.type === "VariableDeclaration" ? statement.declarations : [])
    .filter((item) => isId(item.id, "$"))
    .map((item) => item.init)
    .filter((item) => item?.type === "CallExpression" && item.arguments.length === 1);
  assert.equal(calls.length, 1, `${functionName}: expected one direct local cache initializer`);
  const call = calls[0];
  if (kind === "raw") {
    assert.ok(isId(call.callee, "_c"), `${functionName}: emitted cache callee changed`);
  } else {
    assert.equal(call.callee.type, "SequenceExpression", `${functionName}: bundle callee shape`);
    assert.equal(call.callee.expressions.length, 2);
    assert.equal(call.callee.expressions[0].type, "NumericLiteral");
    assert.equal(call.callee.expressions[0].value, 0);
    assert.ok(isMember(call.callee.expressions[1], "import_compiler_runtime", "c"),
      `${functionName}: bundle cache callee is not compiler runtime c`);
  }
  const size = call.arguments[0];
  assert.equal(size.type, "NumericLiteral", `${functionName}: cache slots must be literal`);
  assert.ok(Number.isSafeInteger(size.value) && size.value > 0);
  return size.value;
}
function callbackOfCommonJs(program, name) {
  const binding = declaration(program, name);
  assert.ok(binding && isCall(binding.init, "__commonJSMin"), `${name}: missing commonJS binding`);
  const callback = binding.init.arguments[0];
  assert.ok(callback?.type === "ArrowFunctionExpression" && callback.body.type === "BlockStatement");
  return callback;
}
function verifyCompilerRuntimeBinding(program) {
  const imported = declaration(program, "import_compiler_runtime");
  assert.ok(imported && isCall(imported.init, "require_compiler_runtime"),
    "import_compiler_runtime must call require_compiler_runtime");
  const bridge = callbackOfCommonJs(program, "require_compiler_runtime");
  assert.ok(walk(bridge.body, (node) => node.type === "AssignmentExpression" &&
    isMember(node.left, "module", "exports") &&
    isCall(node.right, "require_react_compiler_runtime_production")),
  "compiler runtime bridge must bind the React runtime module");
  const runtime = callbackOfCommonJs(program, "require_react_compiler_runtime_production");
  assert.ok(walk(runtime.body, (node) => node.type === "AssignmentExpression" &&
    isMember(node.left, "exports", "c") &&
    node.right?.type === "FunctionExpression" &&
    walk(node.right.body, (child) => child.type === "CallExpression" &&
      child.callee?.type === "MemberExpression" && !child.callee.computed &&
      isId(child.callee.property, "useMemoCache") &&
      isMember(child.callee.object, "ReactSharedInternals", "H"))),
  "React runtime c must call useMemoCache");
}

function inspectReact(bundleCode, emittedCode) {
  const bundle = parse(bundleCode);
  const emitted = parse(emittedCode);
  assert.ok(bundle && emitted, "Babel parser returned no AST");
  verifyCompilerRuntimeBinding(bundle);
  const slots = {};
  for (const name of ["ReactRow", "ReactArrayBoard"]) {
    const raw = directCacheSlot(emitted, name, "raw");
    const bundled = directCacheSlot(bundle, name, "bundle");
    assert.equal(bundled, raw, `${name}: bundled slot count changed`);
    slots[name] = bundled;
  }
  assert.deepEqual(slots, { ReactRow: 8, ReactArrayBoard: 12 });
  return slots;
}

const report = {
  schemaVersion: "structural-eligibility-artifact-verifier-v1",
  status: "FAIL",
  conclusion: "Original build gate remains FAIL; runtime delta unverified; local assets unserved",
  hashes: expected,
  synthetic: [],
  checks: [],
  errors: [],
};
function check(name, condition) {
  assert.ok(condition, name);
  report.checks.push(name);
}
function replaceOnce(source, from, to) {
  assert.ok(source.includes(from), `synthetic marker absent: ${from}`);
  return source.replace(from, to);
}
try {
  const lockBytes = await bytes("input-lock.json");
  const failedBytes = await bytes("build-gate-report.json");
  const binaryBytes = await bytes("cargo-target/debug/ui-graph-compiler-spike");
  const bundleName = "dist-positive/assets/positive-_6D6Yd-j.js";
  const bundleBytes = await bytes(bundleName);
  const emittedBytes = await bytes("proof/react_array.tsx.emitted.txt");
  check("exact frozen artifact hashes", sha(lockBytes) === expected.lock &&
    sha(failedBytes) === expected.failedReport && sha(binaryBytes) === expected.binary &&
    sha(bundleBytes) === expected.bundle && sha(emittedBytes) === expected.emittedReact);
  const lock = JSON.parse(lockBytes);
  const original = JSON.parse(failedBytes);
  check("original failure identity", original.status === "FAIL" &&
    original.sourceLockSha256 === expected.lock &&
    original.errors.length === 1 &&
    original.errors[0] === "Error: local bundle lacks compiler/native JSX/source-map provenance");
  check("413 sorted locked inputs", lock.inputs.length === 413 &&
    lock.inputs.every((entry, index) => index === 0 || lock.inputs[index - 1].path < entry.path));
  const recorded = new Map(original.inputs.map((item) => [`${item.phase}:${item.path}`, item]));
  check("before/after ledger size", original.inputs.length === 826 && recorded.size === 826);
  for (const entry of lock.inputs) {
    check(`input ${entry.path}`, sha(await readFile(path.join(root, entry.path))) === entry.sha256 &&
      ["before", "after"].every((phase) => {
        const item = recorded.get(`${phase}:${entry.path}`);
        return item?.expected === entry.sha256 && item.actual === entry.sha256;
      }));
  }
  check("binary and raw compiler proof", original.compiler?.binarySha256 === expected.binary &&
    original.proof.native?.compilerDeltaEligible === true &&
    original.proof.native?.emittedContainsSites === true &&
    original.proof.native?.nativeJsxLowered === true &&
    original.proof.generic?.emittedContainsSites === true &&
    original.proof.generic?.nativeJsxLowered === true &&
    original.proof.react?.rowMemoCache === true &&
    original.proof.react?.boardMemoCache === true &&
    original.proof.react?.emittedSha256 === expected.emittedReact &&
    original.proof.negative?.nonzeroExit === true &&
    original.proof.negative?.explicitIndexDiagnostic === true);
  for (const [name, proof] of [["native_collection", original.proof.native],
    ["native_generic", original.proof.generic]]) {
    check(`${name} emitted artifact`,
      sha(await bytes(`proof/${name}.tsx.emitted.txt`)) === proof.emittedSha256);
  }
  check("three command exits", ["cargo-build", "positive-build", "negative-build"].every((name) => {
    const command = original.commands.find((item) => item.label === name);
    return command && command.exit.signal === null &&
      command.exit.code === (name === "negative-build" ? 1 : 0);
  }));
  for (const command of original.commands) {
    check(`command receipts ${command.label}`,
      sha(await bytes(`${command.label}.stdout.log`)) === command.stdoutSha256 &&
      sha(await bytes(`${command.label}.stderr.log`)) === command.stderrSha256);
  }
  for (const request of original.rustRequests ?? []) {
    const raw = await bytes(`rust-${request.filename}.stdout.jsonl`);
    const err = await bytes(`rust-${request.filename}.stderr.log`);
    const response = JSON.parse(raw.toString("utf8"));
    check(`Rust response ${request.filename}`, request.exit.code === 0 &&
      request.exit.signal === null && sha(raw) === request.stdoutSha256 &&
      sha(err) === request.stderrSha256 &&
      sha(Buffer.from(JSON.stringify(response.plan))) === request.planSha256);
  }
  const local = original.proof.localBundle;
  check("sole false bundle assertion", local?.reactMemoCache === false &&
    Object.entries(local).every(([key, value]) => key === "reactMemoCache" || value !== false));
  for (const file of original.localBuildFiles) {
    check(`local file ${file.path}`, sha(await bytes(file.path)) === file.sha256);
  }
  check("exact bundled JS recorded", original.localBuildFiles.some((file) =>
    file.path === bundleName && file.sha256 === expected.bundle));
  const map = JSON.parse((await bytes(`${bundleName}.map`)).toString("utf8"));
  check("compiler runtime and native JSX source-map provenance",
    map.sources.some((source) => source.includes("compiler-runtime")) &&
    map.sources.some((source) => source.includes("jsx_binding_runtime")));
  const bundleCode = bundleBytes.toString("utf8");
  const emittedCode = emittedBytes.toString("utf8");
  report.slots = inspectReact(bundleCode, emittedCode);
  check("per-function bound cache calls", true);
  const cases = [
    ["missing-row-cache", replaceOnce(bundleCode,
      "const $ = (0, import_compiler_runtime.c)(8);",
      "const $ = Math.max(8);"), emittedCode],
    ["wrong-callee", replaceOnce(bundleCode,
      "const $ = (0, import_compiler_runtime.c)(8);",
      "const $ = (0, unrelated.c)(8);"), emittedCode],
    ["wrong-slot-count", replaceOnce(bundleCode,
      "const $ = (0, import_compiler_runtime.c)(8);",
      "const $ = (0, import_compiler_runtime.c)(7);"), emittedCode],
    ["module-binding-changed", replaceOnce(bundleCode,
      "var import_compiler_runtime = require_compiler_runtime();",
      "var import_compiler_runtime = require_unrelated();"), emittedCode],
    ["unrelated-string-only", replaceOnce(bundleCode,
      "const $ = (0, import_compiler_runtime.c)(8);",
      "const $ = Math.max(8);") + '\nconst unrelatedCacheText = "_c(8) import_compiler_runtime.c(8)";', emittedCode],
  ];
  for (const [name, candidateBundle, candidateEmitted] of cases) {
    let rejected = false;
    try { inspectReact(candidateBundle, candidateEmitted); }
    catch { rejected = true; }
    check(`synthetic rejects ${name}`, rejected);
    report.synthetic.push({ name, rejected });
  }
  report.status = "CORRECTED_ARTIFACT_CHECK_PASS_BUILD_PROVENANCE_ONLY";
  report.conclusion = "Original build gate remains FAIL. Corrected AST check supports this exact local build's React Compiler provenance. Runtime delta is UNVERIFIED; assets are unserved.";
} catch (error) {
  report.errors.push(String(error));
} finally {
  await writeFile(out, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
}
if (report.status !== "CORRECTED_ARTIFACT_CHECK_PASS_BUILD_PROVENANCE_ONLY") process.exitCode = 1;
