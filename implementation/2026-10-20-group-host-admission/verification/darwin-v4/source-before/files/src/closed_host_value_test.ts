import {
  evaluateClosedHostValue, normalizeClosedHostValue, stabilizeHostTuple,
} from "./closed_host_value.ts";

const equal = (actual: unknown, expected: unknown, label: string) => {
  if (!Object.is(actual, expected)) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
};
const input = (index: number) => ({ kind: "input", index });
const tuple = (): any => ({ kind: "tuple", items: [input(0), input(1), input(2)] });
const style = (): any => ({ kind: "style", entries: [["color", input(0)], ["--offset", input(1)]] });

Deno.test("canonical host values snapshot tuples and styles per candidate", () => {
  const rawTuple = tuple();
  const rawStyle = style();
  const tupleProgram = normalizeClosedHostValue(rawTuple, "mesh", "position", 3, true)!;
  const styleProgram = normalizeClosedHostValue(rawStyle, "div", "style", 3, true)!;
  rawTuple.items[0].index = 2;
  rawStyle.entries[0][0] = "backgroundColor";
  const firstTuple = evaluateClosedHostValue(tupleProgram, [1, 2, 3]) as readonly number[];
  const nextTuple = evaluateClosedHostValue(tupleProgram, [4, 5, 6]) as readonly number[];
  const firstStyle = evaluateClosedHostValue(styleProgram, [1, 2, 3]) as Record<string, unknown>;
  const nextStyle = evaluateClosedHostValue(styleProgram, [4, 5, 6]) as Record<string, unknown>;
  equal(firstTuple[0], 1, "captured tuple input");
  equal(firstTuple[2], 3, "tuple arity");
  equal(firstStyle.color, 1, "captured style key");
  equal(firstStyle["--offset"], 2, "style value");
  equal(firstTuple === nextTuple, false, "fresh tuple");
  equal(firstStyle === nextStyle, false, "fresh style");
  equal(Object.isFrozen(firstTuple), true, "frozen tuple");
  equal(Object.isFrozen(firstStyle), true, "frozen style");
});

Deno.test("canonical host values reject malformed aggregate data", () => {
  const reject = (raw: unknown, tag: "mesh" | "div", name: string, label: string) =>
    equal(normalizeClosedHostValue(raw, tag, name, 3, true), null, label);
  const extraSymbol = tuple(); extraSymbol[Symbol("hidden")] = 1;
  reject(extraSymbol, "mesh", "position", "symbol field");
  const extraArraySymbol = tuple(); extraArraySymbol.items[Symbol("hidden")] = 1;
  reject(extraArraySymbol, "mesh", "position", "symbol item");
  const accessor = style();
  Object.defineProperty(accessor.entries[0], "1", { get() { throw new Error("read"); } });
  reject(accessor, "div", "style", "accessor");
  const cycle = tuple(); cycle.items[1] = cycle;
  reject(cycle, "mesh", "position", "cycle");
  const short = tuple(); short.items.pop();
  reject(short, "mesh", "position", "short tuple");
  const long = tuple(); long.items.push(input(0));
  reject(long, "mesh", "position", "long tuple");
  const duplicate = style(); duplicate.entries.push(["color", input(2)]);
  reject(duplicate, "div", "style", "duplicate style field");
  const unsafe = style(); unsafe.entries[0][0] = "__proto__";
  reject(unsafe, "div", "style", "unsafe style field");
  reject(tuple(), "div", "style", "wrong host aggregate");
  reject(style(), "mesh", "position", "wrong tuple aggregate");
  equal(normalizeClosedHostValue(tuple(), "mesh", "position", 3, false), null, "schema 2 aggregate");
  const nonfinite = normalizeClosedHostValue({ kind: "tuple", items: [
    input(0), input(1), { kind: "binary", operator: "/", left: { kind: "literal", value: 1 },
      right: { kind: "literal", value: 0 } },
  ] }, "mesh", "position", 3, true)!;
  equal(evaluateClosedHostValue(nonfinite, [1, 2, 3]), undefined, "nonfinite result");
});

Deno.test("compiler tuple stabilizer freezes its fresh array in place without validating generic values", () => {
  const typed: readonly [number, number, number] = stabilizeHostTuple([1, 2, 3]);
  equal(typed.length, 3, "literal tuple type and arity");
  const fresh = [1, Infinity, "generic"];
  const stabilized = stabilizeHostTuple(fresh);
  equal(stabilized, fresh, "same array");
  equal(Object.isFrozen(fresh), true, "frozen in place");
});
