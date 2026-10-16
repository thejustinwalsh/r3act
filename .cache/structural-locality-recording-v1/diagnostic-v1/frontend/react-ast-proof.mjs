import assert from "node:assert/strict";
import { createRequire } from "node:module";

const req = createRequire(import.meta.url);
export function verifyReactCompilerAst(bundleCode, emittedCode, root) {
  const pluginPath = req.resolve("@vitejs/plugin-react", { paths: [root] });
  const pluginReq = createRequire(pluginPath);
  const babelPath = pluginReq.resolve("@babel/core");
  const babel = pluginReq("@babel/core");
  const parse = (source) => babel.parseSync(source, {
    sourceType: "unambiguous", babelrc: false, configFile: false,
  });
  const bundle = parse(bundleCode), emitted = parse(emittedCode);
  assert.ok(bundle && emitted);
  const isId = (node, name) => node?.type === "Identifier" && node.name === name;
  const member = (node, object, property) => node?.type === "MemberExpression" &&
    !node.computed && isId(node.object, object) && isId(node.property, property);
  const call = (node, name) => node?.type === "CallExpression" && isId(node.callee, name);
  const declarations = (ast) => ast.program.body.flatMap((statement) =>
    statement.type === "VariableDeclaration" ? statement.declarations : []);
  const declaration = (ast, name) => declarations(ast).find((node) => isId(node.id, name));
  const functionNamed = (ast, name) => ast.program.body
    .map((node) => node.type === "ExportNamedDeclaration" ||
      node.type === "ExportDefaultDeclaration" ? node.declaration : node)
    .find((node) => node?.type === "FunctionDeclaration" && isId(node.id, name));
  const walk = (node, predicate) => {
    if (!node || typeof node !== "object") return false;
    if (predicate(node)) return true;
    return Object.values(node).some((value) => Array.isArray(value)
      ? value.some((child) => walk(child, predicate))
      : value && typeof value === "object" && walk(value, predicate));
  };
  function cacheSlot(ast, name, raw) {
    const fn = functionNamed(ast, name);
    assert.ok(fn, `${name}: function absent`);
    const candidates = fn.body.body.flatMap((statement) =>
      statement.type === "VariableDeclaration" ? statement.declarations : [])
      .filter((item) => isId(item.id, "$"))
      .map((item) => item.init)
      .filter((item) => item?.type === "CallExpression" && item.arguments.length === 1);
    assert.equal(candidates.length, 1, `${name}: expected one local memo initializer`);
    const cacheCall = candidates[0];
    if (raw) assert.ok(isId(cacheCall.callee, "_c"), `${name}: raw compiler callee`);
    else {
      assert.equal(cacheCall.callee.type, "SequenceExpression");
      assert.equal(cacheCall.callee.expressions.length, 2);
      assert.equal(cacheCall.callee.expressions[0].value, 0);
      assert.ok(member(cacheCall.callee.expressions[1], "import_compiler_runtime", "c"));
    }
    assert.equal(cacheCall.arguments[0].type, "NumericLiteral");
    assert.ok(Number.isSafeInteger(cacheCall.arguments[0].value) &&
      cacheCall.arguments[0].value > 0);
    return cacheCall.arguments[0].value;
  }
  const imported = declaration(bundle, "import_compiler_runtime");
  assert.ok(imported && call(imported.init, "require_compiler_runtime"));
  const bridge = declaration(bundle, "require_compiler_runtime");
  assert.ok(bridge && call(bridge.init, "__commonJSMin"));
  assert.ok(walk(bridge.init, (node) => node.type === "AssignmentExpression" &&
    member(node.left, "module", "exports") &&
    call(node.right, "require_react_compiler_runtime_production")));
  const runtime = declaration(bundle, "require_react_compiler_runtime_production");
  assert.ok(runtime && call(runtime.init, "__commonJSMin"));
  assert.ok(walk(runtime.init, (node) => node.type === "AssignmentExpression" &&
    member(node.left, "exports", "c") &&
    walk(node.right, (child) => child.type === "CallExpression" &&
      child.callee?.type === "MemberExpression" &&
      isId(child.callee.property, "useMemoCache"))));
  const slots = {};
  for (const name of ["ReactRow", "ReactArrayBoard"]) {
    const raw = cacheSlot(emitted, name, true);
    const bundled = cacheSlot(bundle, name, false);
    assert.equal(raw, bundled, `${name}: bundled cache slots differ`);
    slots[name] = bundled;
  }
  assert.deepEqual(slots, { ReactRow: 8, ReactArrayBoard: 12 });
  return { slots, parser: { pluginPath, babelPath, babelVersion: babel.version,
    options: { babelrc: false, configFile: false, sourceType: "unambiguous" } } };
}
