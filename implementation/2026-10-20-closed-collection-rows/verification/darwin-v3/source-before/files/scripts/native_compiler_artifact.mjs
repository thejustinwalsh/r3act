import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const commandOutput = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", timeout: 10_000,
    killSignal: "SIGKILL", maxBuffer: 64 * 1024 });
  if (result.error || result.signal || result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.error ?? result.stderr ?? result.signal ?? result.status}`);
  }
  return result.stdout.trim();
};
const rustSourceSnapshot = async (root, rustRoot, cargoTargetDirectory) => {
  const files = [];
  const visit = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "target") continue;
      const filename = path.join(directory, entry.name);
      if (filename === cargoTargetDirectory) continue;
      if (entry.isDirectory()) await visit(filename);
      else if (entry.isFile()) files.push(filename);
      else throw new Error(`Unsupported Rust source entry: ${filename}`);
    }
  };
  await visit(rustRoot);
  const digest = createHash("sha256");
  const entries = [];
  for (const filename of files.sort()) {
    const relative = path.relative(root, filename).split(path.sep).join("/");
    const bytes = await readFile(filename);
    entries.push({ path: relative, sha256: sha256(bytes), bytes: bytes.length });
    digest.update(`${relative.length}:${relative}${bytes.length}:`);
    digest.update(bytes);
  }
  return { sha256: digest.digest("hex"), files: entries };
};

export async function buildNativeCompilerArtifact({ root, binRoot }) {
  const rustRoot = path.join(root, "compiler/oxc-spike");
  const cargoTargetDirectory = path.resolve(root, process.env.CARGO_TARGET_DIR ?? "compiler/oxc-spike/target");
  const host = /^host: ([A-Za-z0-9_.-]+)$/m.exec(commandOutput("rustc", ["-vV"], root))?.[1];
  const rustTarget = process.env.CARGO_BUILD_TARGET || host;
  if (!rustTarget || !/^[A-Za-z0-9_.-]+$/.test(rustTarget)) throw new Error("Invalid Cargo build target");
  const cargoManifest = await readFile(path.join(rustRoot, "Cargo.toml"), "utf8");
  const packageSection = cargoManifest.split(/^\[/m).find((section) => section.startsWith("package]"));
  const crateVersion = /^version\s*=\s*"([^"]+)"\s*$/m.exec(packageSection ?? "")?.[1];
  if (!crateVersion) throw new Error("Unable to read compiler crate version");
  const rustSource = await rustSourceSnapshot(root, rustRoot, cargoTargetDirectory);
  const build = spawnSync("cargo", ["build", "--locked", "--release", "--target", rustTarget,
    "--target-dir", cargoTargetDirectory, "--manifest-path", "compiler/oxc-spike/Cargo.toml",
    "--bin", "ui-graph-compiler-spike"], {
    cwd: root, env: { ...process.env, CARGO_HOME: process.env.CARGO_HOME ?? path.join(root, ".cache/cargo") },
    stdio: "inherit",
  });
  if (build.error || build.signal || build.status !== 0) {
    throw new Error(`Cargo compiler build failed: ${build.error ?? build.signal ?? build.status}`);
  }
  if ((await rustSourceSnapshot(root, rustRoot, cargoTargetDirectory)).sha256 !== rustSource.sha256) {
    throw new Error("Rust/Cargo sources changed during build");
  }
  const binaryName = `ui-graph-compiler-spike${process.platform === "win32" ? ".exe" : ""}`;
  const builtBinary = path.join(cargoTargetDirectory, rustTarget, "release", binaryName);
  const rawInfo = commandOutput(builtBinary, ["--compiler-info"], root);
  let compilerInfo;
  try { compilerInfo = JSON.parse(rawInfo); }
  catch { throw new Error("Compiler identity is not JSON"); }
  if (!compilerInfo || typeof compilerInfo !== "object" || Array.isArray(compilerInfo) ||
    Object.keys(compilerInfo).sort().join(",") !== "arch,platform,protocolVersion,schemaVersion,target,version" ||
    compilerInfo.schemaVersion !== 1 || compilerInfo.protocolVersion !== 1 ||
    compilerInfo.target !== rustTarget || compilerInfo.platform !== process.platform ||
    compilerInfo.arch !== process.arch || compilerInfo.version !== crateVersion) {
    throw new Error(`Compiler identity does not match selected Cargo target and packager: ${rawInfo}`);
  }
  const file = `${rustTarget}/${binaryName}`;
  const binaryPath = path.join(binRoot, file);
  await mkdir(path.dirname(binaryPath), { recursive: true });
  await copyFile(builtBinary, binaryPath);
  await chmod(binaryPath, 0o755);
  const bytes = await readFile(binaryPath);
  const artifact = { target: rustTarget, platform: compilerInfo.platform, arch: compilerInfo.arch,
    file, sha256: sha256(bytes), bytes: bytes.length };
  await writeFile(path.join(binRoot, "manifest.json"),
    JSON.stringify({ schemaVersion: 1, protocolVersion: 1, artifacts: [artifact] }, null, 2) + "\n");
  return { rustTarget, compilerInfo, rustSource, artifact, binaryPath };
}
