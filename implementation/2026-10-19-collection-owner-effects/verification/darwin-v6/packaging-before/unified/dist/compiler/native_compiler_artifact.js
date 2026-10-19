import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
const execFileAsync = promisify(execFile);
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const runtimeDefaults = () => {
    if (process.platform !== "linux")
        return { platform: process.platform, arch: process.arch };
    let linuxLibc = "unknown";
    try {
        const report = process.report?.getReport();
        if (isRecord(report) && isRecord(report.header) &&
            typeof report.header.glibcVersionRuntime === "string")
            linuxLibc = "gnu";
    }
    catch { /* No libc proof is conservative. */ }
    return { platform: process.platform, arch: process.arch, linuxLibc };
};
const targetMatchesRuntime = (artifact, runtime) => {
    if (artifact.platform !== runtime.platform || artifact.arch !== runtime.arch)
        return false;
    const targetArches = runtime.arch === "x64" ? ["x86_64"]
        : runtime.arch === "arm64" ? ["aarch64"]
            : runtime.arch === "ia32" ? ["i686", "i586"] : [];
    if (!targetArches.some((arch) => artifact.target.startsWith(`${arch}-`)))
        return false;
    if (runtime.platform === "linux") {
        if (!runtime.linuxLibc || runtime.linuxLibc === "unknown")
            return false;
        return artifact.target.endsWith(`-unknown-linux-${runtime.linuxLibc}`);
    }
    if (runtime.platform === "darwin")
        return artifact.target.endsWith("-apple-darwin");
    if (runtime.platform === "win32")
        return artifact.target.endsWith("-pc-windows-msvc") ||
            artifact.target.endsWith("-pc-windows-gnu");
    return false;
};
/** Resolve one verified bundled compiler, or undefined when no bin directory exists. */
export const resolvePackagedNativeCompiler = async (binDirectory, runtime = runtimeDefaults()) => {
    let root;
    try {
        root = await realpath(binDirectory);
    }
    catch (error) {
        if (error.code === "ENOENT")
            return undefined;
        throw error;
    }
    const manifestPath = path.join(root, "manifest.json");
    let document;
    try {
        if (await realpath(manifestPath) !== manifestPath) {
            throw new Error("manifest symlink is not allowed");
        }
        document = JSON.parse(await readFile(manifestPath, "utf8"));
    }
    catch (error) {
        throw new Error(`Invalid packaged native compiler manifest at ${manifestPath}: ${String(error)}`);
    }
    if (!isRecord(document) || document.schemaVersion !== 1 ||
        document.protocolVersion !== 1 || !Array.isArray(document.artifacts) ||
        Object.keys(document).sort().join(",") !== "artifacts,protocolVersion,schemaVersion" ||
        document.artifacts.length < 1 || document.artifacts.length > 32) {
        throw new Error("Unsupported packaged native compiler manifest schema or protocol");
    }
    const artifacts = [];
    const targets = new Set();
    const files = new Set();
    for (const item of document.artifacts) {
        if (!isRecord(item) || typeof item.target !== "string" ||
            Object.keys(item).sort().join(",") !== "arch,bytes,file,platform,sha256,target" ||
            !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(item.target) ||
            typeof item.platform !== "string" || typeof item.arch !== "string" ||
            typeof item.file !== "string" || typeof item.sha256 !== "string" ||
            !/^[a-f0-9]{64}$/.test(item.sha256) ||
            !Number.isSafeInteger(item.bytes) || item.bytes <= 0) {
            throw new Error("Malformed packaged native compiler artifact entry");
        }
        const expectedFile = `${item.target}/ui-graph-compiler-spike${item.platform === "win32" ? ".exe" : ""}`;
        if (item.file !== expectedFile || targets.has(item.target) || files.has(item.file)) {
            throw new Error("Duplicate or nonconforming packaged native compiler artifact path");
        }
        targets.add(item.target);
        files.add(item.file);
        const artifact = {
            target: item.target, platform: item.platform, arch: item.arch,
            file: item.file, sha256: item.sha256, bytes: item.bytes,
        };
        const filename = path.join(root, artifact.file);
        const actual = await realpath(filename);
        if (!actual.startsWith(`${root}${path.sep}`) ||
            !(await lstat(actual)).isFile()) {
            throw new Error(`Packaged native compiler escapes bin directory: ${artifact.file}`);
        }
        const data = await readFile(actual);
        if (data.length !== artifact.bytes ||
            createHash("sha256").update(data).digest("hex") !== artifact.sha256) {
            throw new Error(`Packaged native compiler integrity mismatch: ${artifact.file}`);
        }
        artifacts.push(artifact);
    }
    const eligible = artifacts.filter((artifact) => targetMatchesRuntime(artifact, runtime));
    if (eligible.length !== 1) {
        throw new Error(eligible.length === 0
            ? `No compatible packaged native compiler for ${runtime.platform}-${runtime.arch}${runtime.platform === "linux" ? ` (${runtime.linuxLibc ?? "unknown"} libc)` : ""}; provide compilerBinary`
            : `Ambiguous packaged native compiler for ${runtime.platform}-${runtime.arch}`);
    }
    return { binaryPath: path.join(root, eligible[0].file), artifact: eligible[0] };
};
/** Check the selected executable's protocol identity before starting its service. */
export const verifyPackagedNativeCompiler = async (binaryPath, artifact) => {
    let stdout;
    try {
        const result = await execFileAsync(binaryPath, ["--compiler-info"], {
            timeout: 3000, killSignal: "SIGKILL", maxBuffer: 8192,
            encoding: "utf8", windowsHide: true,
        });
        stdout = String(result.stdout);
    }
    catch (error) {
        throw new Error(`Packaged native compiler info query failed: ${String(error)}`);
    }
    let info;
    try {
        info = JSON.parse(stdout.trim());
    }
    catch {
        throw new Error("Packaged native compiler returned invalid --compiler-info JSON");
    }
    if (!isRecord(info) || info.schemaVersion !== 1 || info.protocolVersion !== 1 ||
        Object.keys(info).sort().join(",") !== "arch,platform,protocolVersion,schemaVersion,target,version" ||
        info.target !== artifact.target || info.platform !== artifact.platform ||
        info.arch !== artifact.arch || typeof info.version !== "string" || !info.version) {
        throw new Error("Packaged native compiler identity or protocol mismatch");
    }
};
//# sourceMappingURL=native_compiler_artifact.js.map