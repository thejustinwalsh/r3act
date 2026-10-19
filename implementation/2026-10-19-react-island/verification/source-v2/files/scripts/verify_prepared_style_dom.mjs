import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { openBrowser } from "vitexec/cli";

const output = ".cache/prepared-style-writer-milestone";
await mkdir(output, { recursive: true });
const bridge = `${output}/dom-probe.ts`;
const bundled = `${output}/dom-probe.mjs`;
await writeFile(bridge,
  `import { DOMVDOMHost } from ${JSON.stringify(new URL("../src/vdom_snapshot_runtime.ts", import.meta.url).href)};\n` +
  `globalThis.__preparedDOMHost = DOMVDOMHost;\n`);
execFileSync("deno", ["bundle", "--platform=browser", bridge, "-o", bundled], { stdio: "ignore" });
const browser = await openBrowser({ headless: false, gpu: false });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("about:blank");
  await page.addScriptTag({ type: "module", content: await readFile(bundled, "utf8") });
  await page.waitForFunction(() => typeof globalThis.__preparedDOMHost === "function");
  const result = await page.evaluate(() => {
    const Host = globalThis.__preparedDOMHost;
    const host = new Host();
    const cases = [];
    for (const kind of ["html", "svg"]) {
      const node = kind === "html" ? document.createElement("div")
        : document.createElementNS("http://www.w3.org/2000/svg", "rect");
      const style = node.style;
      let styleReads = 0;
      Object.defineProperty(node, "style", { configurable: true,
        get() { styleReads++; return style; } });
      style.color = "red";
      const left = host.prepareStyleProp(node, "left");
      const custom = host.prepareStyleProp(node, "--amount");
      const opacity = host.prepareStyleProp(node, "opacity");
      if (!left || !custom || !opacity) throw new Error(`Missing ${kind} writer`);
      const activationReads = styleReads;
      left("12px", undefined);
      left("24px", "12px");
      const leftValue = style.left;
      left(null, "24px");
      custom(3, undefined);
      const customValue = style.getPropertyValue("--amount");
      custom(undefined, 3);
      opacity(0, undefined);
      const sentinel = new Error("coercion");
      let threwSame = false;
      try { left({ toString() { throw sentinel; } }); }
      catch (error) { threwSame = error === sentinel; }
      cases.push({ kind, leftValue, leftCleared: style.left,
        customValue, customCleared: style.getPropertyValue("--amount"),
        opacity: style.opacity, untouchedColor: style.color, threwSame,
        activationReads, readsAfterWrites: styleReads });
    }
    class OverrideHost extends Host { setStyleProp() { throw new Error("override"); } }
    return { cases, overrideDeclined: new OverrideHost().prepareStyleProp(document.createElement("div"), "left") === undefined,
      nonElementDeclined: host.prepareStyleProp(document.createTextNode("text"), "left") === undefined };
  });
  for (const row of result.cases) {
    assert.deepEqual(row, { kind: row.kind, leftValue: "24px", leftCleared: "",
      customValue: "3", customCleared: "", opacity: "0", untouchedColor: "red",
      threwSame: true, activationReads: 3, readsAfterWrites: 3 });
  }
  assert.equal(result.overrideDeclined, true);
  assert.equal(result.nonElementDeclined, true);
  assert.deepEqual(errors, []);
  await writeFile(`${output}/dom-proof.json`, JSON.stringify({ status: "PASS", result,
    scope: "Current source in real browser DOM; HTML/SVG CSS field semantics and activation-time style lookup, not application timing" }, null, 2) + "\n");
  console.log("PASS prepared DOM style: HTML/SVG ordinary/custom properties, nullish clearing, coercion errors, one style lookup per activation, subclass and unsupported-handle fallback.");
} finally {
  await browser.close();
}
