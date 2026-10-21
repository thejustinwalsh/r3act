import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "vite";

const output = process.argv[2];
if (!output) throw new Error("usage: node build-capture.mjs OUTPUT");
const root = process.cwd();
const transforms = [];
await build({
  root,
  configFile: path.join(root, "vite.config.ts"),
  build: { outDir: path.join(output, "dist"), emptyOutDir: true, minify: false },
  plugins: [{
    name: "held-reader-transform-capture",
    enforce: "post",
    async transform(code, id) {
      const source = id.split("?", 1)[0];
      if (!source.startsWith(`${root}${path.sep}`) || source.includes(`${path.sep}node_modules${path.sep}`) ||
          !/\.[cm]?[jt]sx?$/.test(source)) return null;
      const relative = path.relative(root, source).replaceAll(path.sep, "/");
      const target = path.join(output, "transforms", `${relative}.js`);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, code);
      transforms.push(relative);
      return null;
    },
  }],
});
await writeFile(path.join(output, "transforms.json"), JSON.stringify(transforms.sort(), null, 2) + "\n");
