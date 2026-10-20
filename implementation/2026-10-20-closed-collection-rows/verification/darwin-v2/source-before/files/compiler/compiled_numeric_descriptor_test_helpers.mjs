import { parse } from "@babel/parser";

const unwrap = (node) => {
  while (node && ["TSAsExpression", "TSSatisfiesExpression", "ParenthesizedExpression"]
    .includes(node.type)) node = node.expression;
  return node;
};

const property = (object, name) => object?.properties?.find((entry) =>
  entry.type === "ObjectProperty" && !entry.computed &&
  (entry.key.name ?? entry.key.value) === name
)?.value;

const stringValue = (node) => node?.type === "StringLiteral" ? node.value : null;

const kinds = (node, result = new Set()) => {
  node = unwrap(node);
  if (node?.type !== "ObjectExpression") return result;
  const kind = stringValue(property(node, "kind"));
  if (kind) result.add(kind);
  for (const entry of node.properties) {
    if (entry.type !== "ObjectProperty") continue;
    const value = unwrap(entry.value);
    if (value?.type === "ObjectExpression") kinds(value, result);
    if (value?.type === "ArrayExpression") {
      for (const item of value.elements) kinds(item, result);
    }
  }
  return result;
};

/** Inspect compiler-emitted descriptor literals without evaluating generated code. */
export const compiledNumericDescriptors = (source) => {
  const ast = parse(source, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });
  const descriptors = [];
  for (const statement of ast.program.body) {
    if (statement.type !== "VariableDeclaration") continue;
    for (const declaration of statement.declarations) {
      if (declaration.id.type !== "Identifier" ||
        !declaration.id.name.startsWith("__nativeNumericPrograms")) continue;
      const table = unwrap(declaration.init);
      if (table?.type !== "ArrayExpression") continue;
      for (const item of table.elements) {
        const descriptor = unwrap(item);
        if (descriptor?.type !== "ObjectExpression") continue;
        const schemaVersion = property(descriptor, "schemaVersion");
        if (schemaVersion?.type !== "NumericLiteral" || schemaVersion.value !== 2) {
          continue;
        }
        const sites = unwrap(property(descriptor, "sourceSites"));
        descriptors.push({
          ownerProgramId: stringValue(property(descriptor, "ownerProgramId")),
          sinkId: stringValue(property(descriptor, "sinkId")),
          sourceSites: sites?.type === "ArrayExpression"
            ? sites.elements.map(stringValue)
            : null,
          closedExpressionKinds: [...kinds(property(descriptor, "closedExpression"))],
        });
      }
    }
  }
  return descriptors;
};
