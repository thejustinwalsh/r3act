import {
  bindCompiledColumn,
  NumericColumn,
  readBoundValue,
} from "./jsx_binding_runtime.ts";

const equal = (actual: unknown, expected: unknown, label: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
};

const throwsRangeError = (action: () => void, label: string) => {
  let thrown: unknown;
  try {
    action();
  } catch (error) {
    thrown = error;
  }
  equal(thrown instanceof RangeError, true, label);
};

Deno.test("NumericColumn reserve is an identity-preserving no-op when capacity suffices", () => {
  const column = new NumericColumn(17, 4, new Float64Array([2, 3, 5]));
  const source = column.source;
  const values = column.values;

  column.reserve(3);
  column.reserve(0);

  equal(column.values, values, "sufficient reserve reuses the values array");
  equal(column.source, source, "source identity stays stable");
  equal(column.id, 17, "column id stays stable");
  equal(column.sourceSlot, 4, "source slot stays stable");
});

Deno.test("NumericColumn reserve accepts zero capacity and rejects invalid capacities", () => {
  const column = new NumericColumn(1, 0, new Float64Array());
  const values = column.values;
  column.reserve(0);
  equal(column.values, values, "zero-capacity reserve is a no-op");

  for (const invalid of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53]) {
    throwsRangeError(() => column.reserve(invalid), `rejects ${String(invalid)}`);
  }
  equal(column.values, values, "invalid requests do not replace storage");
});

Deno.test("NumericColumn reserve grows geometrically, copies values, and zeroes its new tail", () => {
  const column = new NumericColumn(2, 1, new Float64Array([11, -7]));
  const source = column.source;
  column.reserve(3);

  equal(column.values.length, 4, "capacity doubles when it exceeds the request");
  equal(column.values[0], 11, "first prefix value is preserved");
  equal(column.values[1], -7, "second prefix value is preserved");
  equal(column.values[2], 0, "first new slot is zero initialized");
  equal(column.values[3], 0, "remaining new slot is zero initialized");
  equal(column.source, source, "source identity stays stable across growth");
  equal(column.id, 2, "column id stays stable across growth");
  equal(column.sourceSlot, 1, "source slot stays stable across growth");

  const empty = new NumericColumn(3, 2, new Float64Array());
  empty.reserve(3);
  equal(empty.values.length, 3, "growth from empty storage meets requested capacity");
  equal([...empty.values].join(","), "0,0,0", "new storage starts zeroed");
});

Deno.test("existing compiled-column bindings read the current replacement values array", () => {
  const column = new NumericColumn(8, 2, new Float64Array([4]));
  const binding = bindCompiledColumn(column, 0, 71, (value) => value * 3);
  equal(readBoundValue(binding), 12, "binding reads initial column values");

  column.values = new Float64Array([9]);
  equal(readBoundValue(binding), 27, "binding follows caller-replaced values array");
  column.reserve(2);
  equal(column.values.length, 2, "reserve replaces insufficient caller storage");
  equal(readBoundValue(binding), 27, "binding follows reserve replacement");
  column.values[0] = 10;
  equal(readBoundValue(binding), 30, "binding observes later writes to new storage");
});
