import { normalizeClosedStoreHostProgram } from "./closed_store_host_program.ts";
import { proveClosedScalarNumericKernel } from "./closed_scalar_kernel_proof.ts";

const equal = (actual: unknown, expected: unknown) => {
  if (!Object.is(actual, expected)) throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
};
const input = (index: number) => ({ kind: "input", index });
const literal = (value: number | string | boolean) => ({ kind: "literal", value });
const binary = (operator: string, left: unknown, right: unknown) =>
  ({ kind: "binary", operator, left, right });
const raw = (props: unknown[] = [
  ["name", literal("marker")],
  ["position-x", binary("+", binary("*", input(0), literal(.01)), input(2))],
  ["visible", literal(true)],
  ["position-y", input(1)],
]) => ({
  schemaVersion: 7, componentProgramId: "motion", moduleRevision: "rev",
  inputs: [{ storeUseSiteId: "frame", storeProp: "clock", paths: [["phase"], ["epoch"]] }],
  stateSites: ["offset"], effectSites: ["effect"], retainedChildProp: "children",
  host: { tag: "group", key: "motion", child: null, props },
});
const host = () => normalizeClosedStoreHostProgram(raw())!;
const accepted = (candidate: unknown, program = host()) => {
  const proof = proveClosedScalarNumericKernel(candidate, program);
  equal(proof.kind, "verified");
  return proof;
};
const rejected = (candidate: unknown, program = host()) => {
  const proof = proveClosedScalarNumericKernel(candidate, program);
  equal(proof.kind, "rejected");
  if (proof.kind === "rejected") equal(/^[a-z-]+$/.test(proof.reason), true);
};

Deno.test("proof accepts actual compact and alpha-renamed arithmetic without invoking it", () => {
  const kernel = (a: readonly number[], b: number[]) => {
    const $r3actDag0 = (a[0] * 1e-2);
    b[0] = ($r3actDag0 + a[2]);
    b[1] = a[1];
  };
  const proof = accepted(kernel);
  if (proof.kind === "verified") {
    equal(proof.kernel, kernel);
    equal(proof.numericPropIndices.join(","), "1,3");
    equal(Object.isFrozen(proof.numericPropIndices), true);
  }
  accepted(function f(x: readonly number[], y: number[]) {
    "use strict";
    /* one immutable alias */ const z = x[0] * 0.01;
    y[0] = z + x[2];
    y[1] = x[1];
  });
  accepted((x: readonly number[], y: number[]) => (y[0] = x[0] * .01 + x[2], y[1] = x[1]));
});

Deno.test("proof rejects an observable candidate without invoking it", () => {
  let calls = 0;
  const impure = (i: readonly number[], o: number[]) => {
    calls++;
    o[0] = i[0] * .01 + i[2];
    o[1] = i[1];
  };
  rejected(impure);
  equal(calls, 0);
});

Deno.test("proof accepts schema-5 literal props around dense numeric slots", () => {
  const program = normalizeClosedStoreHostProgram({
    schemaVersion: 5, componentProgramId: "marker", moduleRevision: "rev",
    inputs: [{ storeUseSiteId: "frame", storeProp: "clock", paths: [["epoch"]] }],
    host: { tag: "group", key: "marker", children: [], props: [
      ["name", literal("phase-anchor")], ["visible", literal(true)],
      ["position-x", input(0)],
    ] },
  })!;
  const proof = accepted((i: readonly number[], o: number[]) => { o[0] = i[0]; }, program);
  if (proof.kind === "verified") equal(proof.numericPropIndices.join(","), "2");
  accepted((e: readonly number[], t: number[]) => t[0] = e[0], program);
});

Deno.test("proof accepts bounded compact comma lists and prior SSA aliases", () => {
  accepted((e: readonly number[], t: number[]) => {
    const a = e[0] * .01, b = a + e[2];
    t[0] = b, t[1] = e[1];
  });
  accepted(function compact(e: readonly number[], t: number[]) {
    var a = e[0], b = a * .01;
    t[0] = b + e[2], t[1] = e[1];
  });
  accepted((e: readonly number[], t: number[]) => { t[0] = e[0] * .01 + e[2], t[1] = e[1]; });
});

Deno.test("proof rejects comma extras, duplicate declarators and named self-reference", () => {
  rejected(new Function("i", "o", "o[0]=i[0]*.01+i[2],evil(),o[1]=i[1]"));
  rejected(new Function("i", "o", "const a=i[0],b=evil();o[0]=a*.01+i[2],o[1]=i[1]"));
  rejected(new Function("i", "o", "var a=i[0],a=i[1];o[0]=a*.01+i[2],o[1]=i[1]"));
  rejected(new Function("i", "o", "o[0]=(i[0],evil())*.01+i[2],o[1]=i[1]"));
  rejected(function self(i: readonly number[], o: number[]) {
    o[0] = self as unknown as number;
    o[1] = i[1];
  });
});

Deno.test("proof preserves signed zero, grouping, operator order and nonfinite intermediates", () => {
  const signed = normalizeClosedStoreHostProgram(raw([
    ["position-x", literal(-0)],
    ["position-y", { kind: "unary", operator: "~", argument:
      binary("*", input(0), literal(1e308)) }],
  ]))!;
  accepted((i: readonly number[], o: number[]) => {
    o[0] = -0.0;
    o[1] = ~(i[0] * 1e308);
  }, signed);
  rejected((i: readonly number[], o: number[]) => {
    o[0] = 0;
    o[1] = ~(i[0] * 1e308);
  }, signed);
  rejected((i: readonly number[], o: number[]) => {
    o[0] = -0;
    o[1] = ~(1e308 * i[0]);
  }, signed);
  const grouping = normalizeClosedStoreHostProgram(raw([
    ["position-x", binary("*", binary("+", input(0), input(1)), input(2))],
  ]))!;
  accepted((i: readonly number[], o: number[]) => { o[0] = (i[0] + i[1]) * i[2]; }, grouping);
  rejected((i: readonly number[], o: number[]) => { o[0] = i[0] + i[1] * i[2]; }, grouping);
});

Deno.test("proof declines legacy leading-zero numeric spelling", () => {
  const eight = normalizeClosedStoreHostProgram(raw([["position-x", literal(8)]]))!;
  rejected(new Function("i", "o", "o[0]=010"), eight);
});

Deno.test("proof treats every ECMAScript line terminator as ending a line comment", () => {
  for (const terminator of ["\n", "\r", "\u2028", "\u2029"]) {
    const innocent = new Function("i", "o",
      `o[0]=i[0]*.01+i[2];//comment${terminator}o[1]=i[1]`);
    accepted(innocent);
    const hostile = new Function("i", "o",
      `o[0]=i[0]*.01+i[2];//comment${terminator}evil();\no[1]=i[1]`);
    rejected(hostile);
  }
});

Deno.test("proof declines unsupported automatic semicolon insertion and trailing bodies", () => {
  rejected(new Function("i", "o", "o[0]=i[0]*.01+i[2]\ro[1]=i[1]"));
  rejected(new Function("i", "o", "o[0]=i[0]*.01+i[2];o[1]=i[1];\rthrow 1"));
});

Deno.test("proof declines untrusted host, source-hidden callables and candidate properties", () => {
  let getterCalls = 0;
  const malicious = () => { throw new Error("candidate ran"); };
  Object.defineProperty(malicious, "toString", { get() { getterCalls++; throw new Error("property"); } });
  rejected(malicious);
  equal(getterCalls, 0);
  const good = (i: readonly number[], o: number[]) => { o[0] = i[0] * .01 + i[2]; o[1] = i[1]; };
  rejected(good, raw() as never);
  rejected(good.bind(null));
  rejected(new Proxy(good, {}));
  const { proxy, revoke } = Proxy.revocable(good, {});
  revoke();
  rejected(proxy);
  rejected(Array.prototype.push);
});

Deno.test("proof rejects effects, hidden reads and all unconsumed syntax", () => {
  const bad = [
    (i: readonly number[], o: number[]) => { o[0] = evil(i[0]); o[1] = i[1]; },
    (i: readonly number[], o: number[]) => { o[0] = i["0"] * .01 + i[2]; o[1] = i[1]; },
    (i: readonly number[], o: number[]) => { o[0] = i[0] * .01 + i[2]; o[1] = o[0]; },
    (i: readonly number[], o: number[]) => { o[0] = i[0] * .01 + i[2]; o[1] = i[1]; return; },
    new Function("i", "o", "o[0]=i[0]*.01+i[2];o[1]=i[1];globalThis.x=1"),
    (i: readonly number[], o: number[]) => { o[0] = i[0] * .01 + i[2]; o[1] = i[1]; if (i[0]) o[1] = 2; },
    (i: readonly number[], o: number[]) => { o[0] = i[0] * .01 + i[2]; o[1] = i[1]; (() => 1)(); },
    (i: readonly number[], o: number[]) => { o[0] = i[0] * .01 + i[2]; o[1] = i[1]; new Date(); },
    new Function("i", "o", "o[0]=i[0]*.01+i[2];o[1]=i[1];this"),
  ];
  for (const item of bad) rejected(item);
});

Deno.test("proof rejects alias mutation, forward reads and output reordering", () => {
  rejected((i: readonly number[], o: number[]) => { let a = i[0]; a = i[1]; o[0] = a * .01 + i[2]; o[1] = i[1]; });
  rejected(new Function("i", "o", "const a=b;const b=i[0];o[0]=a*.01+i[2];o[1]=i[1]"));
  rejected((i: readonly number[], o: number[]) => { o[1] = i[1]; o[0] = i[0] * .01 + i[2]; });
  rejected((i: readonly number[], o: number[]) => { o[0] = i[0] * .01 + i[2]; o[0] = i[1]; });
  rejected((i: readonly number[], o: number[]) => { const a = i[0]; const a2 = i[1]; o[0] = a * .01 + i[2]; o[1] = a2; o[2] = 0; });
});

Deno.test("proof bounds source, local count, tokens and depth", () => {
  const tiny = (i: readonly number[], o: number[]) => { o[0] = i[0] * .01 + i[2]; o[1] = i[1]; };
  const oversized = new Function("i", "o", `/*${"x".repeat(32769)}*/ o[0]=i[0]*.01+i[2];o[1]=i[1]`);
  rejected(oversized);
  const deep = new Function("i", "o", `o[0]=${"(".repeat(129)}i[0]*.01+i[2]${")".repeat(129)};o[1]=i[1]`);
  rejected(deep);
  const locals = new Function("i", "o", `${Array.from({ length: 129 }, (_, n) => `const a${n}=${n ? `a${n - 1}` : "i[0]"};`).join("")}o[0]=a128*.01+i[2];o[1]=i[1]`);
  rejected(locals);
  accepted(tiny);
});

function evil(_value: number): number { throw new Error("must not run"); }
