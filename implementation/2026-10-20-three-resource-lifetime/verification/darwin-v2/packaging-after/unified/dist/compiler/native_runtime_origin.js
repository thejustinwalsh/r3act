import path from "node:path";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
export const publicRuntimeModules = [
    "@r3act/core", "@compiled-ui/runtime", "@compiled-ui/runtime/core",
];
const sourceRuntime = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/native_runtime_api.ts");
const realFile = (filename) => {
    try {
        return realpathSync(filename);
    }
    catch {
        return undefined;
    }
};
const sourceIdentity = realFile(sourceRuntime);
const hasModuleSuffix = (specifier) => specifier.includes("?") || specifier.includes("#");
const moduleFile = (specifier, importer) => {
    if (hasModuleSuffix(specifier))
        return undefined;
    if (specifier.startsWith("file:")) {
        try {
            return fileURLToPath(specifier);
        }
        catch {
            return undefined;
        }
    }
    if (path.isAbsolute(specifier))
        return specifier;
    if (specifier.startsWith("./") || specifier.startsWith("../")) {
        return path.resolve(path.dirname(importer), specifier);
    }
    return undefined;
};
const isCorePackageEntry = (filename) => {
    let directory = path.dirname(filename);
    while (true) {
        const manifest = path.join(directory, "package.json");
        if (existsSync(manifest)) {
            try {
                const metadata = JSON.parse(readFileSync(manifest, "utf8"));
                if (metadata.name !== "@r3act/core")
                    return false;
                const entry = metadata.exports?.["."]?.import;
                return typeof entry === "string" && realFile(path.resolve(directory, entry)) === filename;
            }
            catch {
                return false;
            }
        }
        const parent = path.dirname(directory);
        if (parent === directory)
            return false;
        directory = parent;
    }
};
export const isRuntimeOriginFile = (filename) => {
    if (hasModuleSuffix(filename))
        return false;
    const pathname = filename.startsWith("file:")
        ? (() => { try {
            return fileURLToPath(filename);
        }
        catch {
            return "";
        } })()
        : filename;
    const actual = realFile(pathname);
    return Boolean(actual && (actual === sourceIdentity || isCorePackageEntry(actual)));
};
export const isStaticRuntimeImport = (specifier, importer) => {
    if (hasModuleSuffix(specifier))
        return false;
    if (publicRuntimeModules.includes(specifier))
        return true;
    const filename = moduleFile(specifier, importer);
    return Boolean(filename && isRuntimeOriginFile(filename));
};
export const isResolvedRuntimeImport = (specifier, importer, resolved, hasResolver = true) => {
    if (hasModuleSuffix(specifier) || (resolved && hasModuleSuffix(resolved.id)))
        return false;
    if (resolved?.external) {
        return publicRuntimeModules.includes(specifier) &&
            resolved.id === specifier;
    }
    if (resolved?.id)
        return isRuntimeOriginFile(resolved.id);
    return !hasResolver && isStaticRuntimeImport(specifier, importer);
};
//# sourceMappingURL=native_runtime_origin.js.map