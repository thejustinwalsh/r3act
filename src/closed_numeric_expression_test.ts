import {
  evaluateClosedNumericExpression,
  normalizeClosedNumericExpression,
} from "./closed_numeric_expression.ts";

const equal = (actual: unknown, expected: unknown, message: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `${message}: expected ${String(expected)}, got ${String(actual)}`,
    );
  }
};

Deno.test("closed expression snapshots descriptor data before evaluation", () => {
  let reads = 0;
  const left = { kind: "input", index: 0 };
  const descriptor = {
    kind: "binary",
    operator: "+",
    left,
    right: { kind: "literal", value: 2 },
  };
  const expression = normalizeClosedNumericExpression(descriptor, 1);
  equal(!!expression, true, "descriptor normalizes");
  Object.defineProperty(left, "index", {
    get: () => {
      reads++;
      return 0;
    },
  });
  descriptor.right.value = 99;
  equal(
    evaluateClosedNumericExpression(expression!, [3]),
    5,
    "frozen cut evaluates",
  );
  equal(reads, 0, "evaluation does not read authored getters");
  equal(Object.isFrozen(expression), true, "normalized root is frozen");
});

Deno.test("closed expression preserves primitive coercion and branch choice", () => {
  const expression = normalizeClosedNumericExpression({
    kind: "conditional",
    test: { kind: "input", index: 0 },
    consequent: {
      kind: "template",
      parts: ["x=", ""],
      expressions: [{ kind: "input", index: 1 }],
    },
    alternate: {
      kind: "binary",
      operator: "/",
      left: { kind: "literal", value: 0 },
      right: { kind: "literal", value: 0 },
    },
  }, 2);
  equal(!!expression, true, "expression normalizes");
  equal(
    evaluateClosedNumericExpression(expression!, [1, -0]),
    "x=0",
    "template coercion",
  );
  equal(
    Number.isNaN(evaluateClosedNumericExpression(expression!, [0, 4])),
    true,
    "numeric NaN preserved",
  );
});

Deno.test("closed expression rejects accessors, cycles, and boundedness violations", () => {
  const accessor = { kind: "input" } as { kind: string; index?: number };
  Object.defineProperty(accessor, "index", { get: () => 0 });
  equal(
    normalizeClosedNumericExpression(accessor, 1),
    null,
    "accessor declined",
  );
  const cycle: { kind: string; argument?: unknown; operator: string } = {
    kind: "unary",
    operator: "+",
  };
  cycle.argument = cycle;
  equal(normalizeClosedNumericExpression(cycle, 1), null, "cycle declined");
  equal(
    normalizeClosedNumericExpression({ kind: "input", index: 1 }, 1),
    null,
    "out of range source declined",
  );
  let deep: unknown = { kind: "literal", value: 1 };
  for (let index = 0; index < 40; index++) {
    deep = { kind: "unary", operator: "+", argument: deep };
  }
  equal(normalizeClosedNumericExpression(deep, 1), null, "deep tree declined");
});
