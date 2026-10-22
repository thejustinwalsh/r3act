import { normalizeClosedStoreHostProgram } from "./closed_store_host_program.ts";
import {
  executeVerifiedClosedStoreBatch, proveClosedStoreBatchKernel,
} from "./closed_store_batch_kernel_proof.ts";

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
const host = (props?: unknown[]) => normalizeClosedStoreHostProgram(raw(props))!;
const accepted = (candidate: unknown, program = host()) => {
  const proof = proveClosedStoreBatchKernel(candidate, program);
  equal(proof.kind, "verified");
  return proof;
};
const rejected = (candidate: unknown, program = host()) => {
  const proof = proveClosedStoreBatchKernel(candidate, program);
  equal(proof.kind, "rejected");
};

Deno.test("batch proof accepts shared and varying arithmetic and exact full prop positions", () => {
  const kernel = (s: readonly number[], v: readonly number[], o: number[][], n: number) => {
    const shared = (s[0] * .01);
    for (let r = 0; r < n; r++) {
      const row = o[r];
      row[1] = shared + v[r * 1 + 0];
      row[3] = s[1];
    }
  };
  const proof = accepted(kernel);
  if (proof.kind !== "verified") throw new Error("proof");
  equal(proof.numericPropIndices.join(","), "1,3");
  equal(proof.sharedInputCount, 2);
  equal(proof.varyingInputCount, 1);
  equal(Object.isFrozen(proof), true);
  const outputs = [[NaN, NaN, NaN, NaN], [NaN, NaN, NaN, NaN]];
  executeVerifiedClosedStoreBatch(proof, [100, 2], [3, 4], outputs, 2);
  equal(outputs[0][1], 4);
  equal(outputs[1][1], 5);
  equal(outputs[0][3], 2);
  accepted((a: readonly number[], b: readonly number[], c: number[][], d: number) => {
    for (let i = 0; i < d; ++i) {
      c[i][1] = a[0] * .01 + b[i];
      c[i][3] = a[1];
    }
  });
});

Deno.test("batch proof accepts the preserved Vite minifier lexical renames", () => {
  const marker = normalizeClosedStoreHostProgram({
    schemaVersion: 5, componentProgramId: "marker-minified", moduleRevision: "rev",
    inputs: [{ storeUseSiteId: "frame", storeProp: "clock", paths: [["epoch"]] }],
    host: { tag: "group", key: "marker", children: [], props: [
      ["name", literal("phase-anchor")], ["position-x", input(0)],
    ] },
  })!;
  accepted(new Function("e", "t", "n", "r",
    "for(let t=0;t<r;t++){let r=n[t];r[1]=e[0]}"), marker);
  const position = normalizeClosedStoreHostProgram({
    schemaVersion: 7, componentProgramId: "position-minified", moduleRevision: "rev",
    inputs: [{ storeUseSiteId: "frame", storeProp: "clock", paths: [["phase"]] }],
    stateSites: ["offset"], effectSites: ["effect"], retainedChildProp: "children",
    host: { tag: "group", key: "motion", child: null, props: [
      ["position-x", binary("+", binary("*", input(0), literal(.01)), input(1))],
      ["position-y", binary("+", binary("*", input(0), literal(.005)),
        binary("*", input(1), literal(.5)))],
      ["rotation-z", binary("+", binary("*", input(0), literal(.0001)),
        binary("*", input(1), literal(.01)))],
    ] },
  })!;
  const minified = "let i=e[0]*1e-4,a=e[0]*.005,o=e[0]*.01;" +
    "for(let e=0;e<r;e++){let r=n[e];" +
    "r[0]=o+t[e*1+0],r[1]=a+t[e*1+0]*.5,r[2]=i+t[e*1+0]*.01}";
  accepted(new Function("e", "t", "n", "r", minified), position);
  rejected(new Function("e", "t", "n", "r", minified.replace("for(let e=", "for(var e=")), position);
  rejected(new Function("e", "t", "n", "r", minified.replace("{let r=n[e]", "{var r=n[e]")), position);
  rejected(new Function("e", "t", "n", "r", minified.replace("r[0]=o+", "r[0]=e[0]*.01+")), position);
  rejected(new Function("e", "t", "n", "r",
    "for(let t=0;t<r;t++){let r=n[t];r[1]=t[0]}"), marker);
});

Deno.test("batch proof accepts schema-5 marker and signed-zero literal slots", () => {
  const marker = normalizeClosedStoreHostProgram({
    schemaVersion: 5, componentProgramId: "marker", moduleRevision: "rev",
    inputs: [{ storeUseSiteId: "frame", storeProp: "clock", paths: [["epoch"]] }],
    host: { tag: "group", key: "marker", children: [], props: [
      ["name", literal("phase-anchor")], ["visible", literal(true)],
      ["position-x", input(0)], ["position-y", literal(-0)],
    ] },
  })!;
  const proof = accepted((s: readonly number[], _v: readonly number[], o: number[][], n: number) => {
    for (let r = 0; r < n; r++) {
      o[r][2] = s[0];
      o[r][3] = -0;
    }
  }, marker);
  if (proof.kind === "verified") equal(proof.numericPropIndices.join(","), "2,3");
  rejected((s: readonly number[], _v: readonly number[], o: number[][], n: number) => {
    for (let r = 0; r < n; r++) { o[r][2] = s[0]; o[r][3] = 0; }
  }, marker);
});

Deno.test("batch proof covers one and thirty-two exact numeric prop slots", () => {
  for (const count of [1, 32]) {
    const program = normalizeClosedStoreHostProgram({
      schemaVersion: 3, componentProgramId: `width-${count}`, moduleRevision: "rev",
      inputs: [{ storeUseSiteId: "frame", storeProp: "clock" }],
      host: { tag: "div", key: `width-${count}`, child: null,
        props: Array.from({ length: count }, (_, index) => [`data-p${index}`, input(0)]) },
    })!;
    const assignments = Array.from({ length: count }, (_, index) => `o[r][${index}]=s[0];`).join("");
    const proof = accepted(new Function("s", "v", "o", "n",
      `for(let r=0;r<n;r++){${assignments}}`), program);
    if (proof.kind === "verified") equal(proof.numericPropIndices.length, count);
  }
});

Deno.test("batch proof preserves grouping, exponent order and finite final overflow arithmetic", () => {
  const program = host([
    ["position-x", binary("-", input(0), binary("-", input(1), input(2)))],
    ["position-y", binary("/", literal(1), binary("*", input(0), literal(1e308)))],
  ]);
  accepted((s: readonly number[], v: readonly number[], o: number[][], n: number) => {
    const denominator = s[0] * 1e308;
    for (let r = 0; r < n; r++) {
      o[r][0] = s[0] - (s[1] - v[r]);
      o[r][1] = 1 / denominator;
    }
  }, program);
  rejected((s: readonly number[], v: readonly number[], o: number[][], n: number) => {
    for (let r = 0; r < n; r++) {
      o[r][0] = (s[0] - s[1]) - v[r];
      o[r][1] = 1 / (s[0] * 1e308);
    }
  }, program);
});

Deno.test("batch proof rejects skipped duplicate or out-of-range writes and altered loop bounds", () => {
  rejected(new Function("s", "v", "o", "n", "for(let r=0;r<n;r++){o[r][1]=s[0]*.01+v[r];o[r][1]=s[1]}"));
  rejected(new Function("s", "v", "o", "n", "for(let r=0;r<n;r++){o[r][1]=s[0]*.01+v[r];o[r][4]=s[1]}"));
  rejected(new Function("s", "v", "o", "n", "for(let r=1;r<n;r++){o[r][1]=s[0]*.01+v[r];o[r][3]=s[1]}"));
  rejected(new Function("s", "v", "o", "n", "for(let r=0;r<=n;r++){o[r][1]=s[0]*.01+v[r];o[r][3]=s[1]}"));
  rejected(new Function("s", "v", "o", "n", "for(let r=0;r<n;r+=2){o[r][1]=s[0]*.01+v[r];o[r][3]=s[1]}"));
  rejected(new Function("s", "v", "o", "n", "for(let r=0;r<n;r++){o[r][1]=s[0]*.01+v[r*2];o[r][3]=s[1]}"));
  rejected(new Function("s", "v", "o", "n", "n++;for(let r=0;r<n;r++){o[r][1]=s[0]*.01+v[r];o[r][3]=s[1]}"));
  rejected(new Function("s", "v", "o", "n", "for(const r=0;r<n;r++){o[r][1]=s[0]*.01+v[r];o[r][3]=s[1]}"));
  rejected(new Function("s", "v", "o", "n", "for(let r=0;r<n;r++){var x=o[r];var x=1;x[1]=s[0]*.01+v[r];x[3]=s[1]}"));
});

Deno.test("batch proof rejects hidden calls, input mutation, output reads and early exits", () => {
  const bad = [
    new Function("s", "v", "o", "n", "for(let r=0;r<n;r++){o[r][1]=evil();o[r][3]=s[1]}"),
    new Function("s", "v", "o", "n", "for(let r=0;r<n;r++){s[0]=1;o[r][1]=s[0]*.01+v[r];o[r][3]=s[1]}"),
    new Function("s", "v", "o", "n", "for(let r=0;r<n;r++){o[r][1]=s[0]*.01+v[r];o[r][3]=o[r][1]}"),
    new Function("s", "v", "o", "n", "for(let r=0;r<n;r++){if(r)break;o[r][1]=s[0]*.01+v[r];o[r][3]=s[1]}"),
    new Function("s", "v", "o", "n", "const alias=()=>s[0];for(let r=0;r<n;r++){o[r][1]=alias()* .01+v[r];o[r][3]=s[1]}"),
  ];
  for (const candidate of bad) rejected(candidate);
});

Deno.test("forged proof and excessive runtime rows never call the candidate", () => {
  let calls = 0;
  const kernel = (s: readonly number[], v: readonly number[], o: number[][], n: number) => {
    calls++;
    for (let r = 0; r < n; r++) { o[r][1] = s[0] * .01 + v[r]; o[r][3] = s[1]; }
  };
  rejected(kernel);
  equal(calls, 0);
  const verified = accepted((s: readonly number[], v: readonly number[], o: number[][], n: number) => {
    for (let r = 0; r < n; r++) { o[r][1] = s[0] * .01 + v[r]; o[r][3] = s[1]; }
  });
  const forged = Object.create(Object.getPrototypeOf(verified));
  for (const fake of [{ kind: "verified", numericPropIndices: [1, 3], sharedInputCount: 2,
    varyingInputCount: 1 }, forged, new Proxy(verified, {})]) {
    let threw = false;
    try { executeVerifiedClosedStoreBatch(fake as never, [1, 2], [3], [[0, 0, 0, 0]], 1); }
    catch { threw = true; }
    equal(threw, true);
  }
  let threw = false;
  try { executeVerifiedClosedStoreBatch(verified, [1, 2], [], [], 4097); }
  catch { threw = true; }
  equal(threw, true);
});
