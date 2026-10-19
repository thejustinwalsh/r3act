import { createDOMStylePropWriter } from "./dom_style_writer.ts";

const equal = (
  actual: unknown,
  expected: unknown,
  message = "Values differ",
) => {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `${message}: expected ${String(expected)}, received ${String(actual)}`,
    );
  }
};

const throwsSame = (
  action: () => unknown,
  expectedError: unknown,
  message: string,
) => {
  let actualError: unknown;
  try {
    action();
  } catch (error) {
    actualError = error;
  }
  equal(actualError, expectedError, message);
};

type MockStyle = CSSStyleDeclaration & Record<string, unknown> & {
  calls: Array<readonly [string, string | null, "set" | "remove"]>;
};

const mockStyle = (): MockStyle => {
  const style = {
    calls: [] as Array<readonly [string, string | null, "set" | "remove"]>,
    setProperty(this: MockStyle, name: string, value: string | null) {
      equal(this, style, "setProperty receiver");
      this.calls.push([name, value, "set"]);
    },
    removeProperty(this: MockStyle, name: string) {
      equal(this, style, "removeProperty receiver");
      this.calls.push([name, null, "remove"]);
      return "";
    },
  };
  return style as unknown as MockStyle;
};

Deno.test("ordinary style writer stringifies values and clears nullish values", () => {
  const style = mockStyle();
  const write = createDOMStylePropWriter(style, "width");

  write(12, undefined);
  equal(style.width, "12");
  write(false, "old");
  equal(style.width, "false");
  write("auto", false);
  equal(style.width, "auto");
  write(null, "auto");
  equal(style.width, "");
  write(undefined, "");
  equal(style.width, "");
});

Deno.test("custom property writer uses set and remove methods with style receiver", () => {
  const style = mockStyle();
  const write = createDOMStylePropWriter(style, "--gap");

  write(14, undefined);
  write(false, 14);
  write({ toString: () => "calc(1px + 2px)" }, false);
  write(null, "old");
  write(undefined, null);

  equal(style.calls.length, 5);
  equal(style.calls[0][0], "--gap");
  equal(style.calls[0][1], "14");
  equal(style.calls[0][2], "set");
  equal(style.calls[1][1], "false");
  equal(style.calls[2][1], "calc(1px + 2px)");
  equal(style.calls[3][1], null);
  equal(style.calls[3][2], "remove");
  equal(style.calls[4][1], null);
  equal(style.calls[4][2], "remove");
});

Deno.test("custom property methods are looked up on every write", () => {
  const style = mockStyle();
  const write = createDOMStylePropWriter(style, "--live");
  let setCalls = 0;
  let removeCalls = 0;
  style.setProperty = function (this: MockStyle, name, value) {
    equal(this, style, "replacement setProperty receiver");
    equal(name, "--live");
    equal(value, "next");
    setCalls++;
  };
  style.removeProperty = function (this: MockStyle, name) {
    equal(this, style, "replacement removeProperty receiver");
    equal(name, "--live");
    removeCalls++;
    return "previous";
  };

  write("next", undefined);
  write(null, "next");
  equal(setCalls, 1);
  equal(removeCalls, 1);
});

Deno.test("writer propagates value coercion exceptions", () => {
  const style = mockStyle();
  const ordinary = createDOMStylePropWriter(style, "color");
  const custom = createDOMStylePropWriter(style, "--color");
  const expectedError = new Error("coercion failed");
  const value = {
    [Symbol.toPrimitive]() {
      throw expectedError;
    },
  };

  throwsSame(
    () => ordinary(value, undefined),
    expectedError,
    "ordinary coercion error",
  );
  throwsSame(
    () => custom(value, undefined),
    expectedError,
    "custom coercion error",
  );
  equal(style.calls.length, 0, "Failed coercion reached a custom style method");
});
