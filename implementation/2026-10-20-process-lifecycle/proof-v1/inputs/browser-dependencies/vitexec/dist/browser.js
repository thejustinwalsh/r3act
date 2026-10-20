import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import spawn from "nano-spawn";
import { validateRunOptions, VITEXEC_TIMEOUT_MS } from "./options.js";
export const VITEXEC_DEFAULT_REMOTE_EXPOSE_NETWORK = "<loopback>";
export const VITEXEC_LOCAL_GPU_BROWSER_ARGS = [
    "--enable-gpu",
    "--ignore-gpu-blocklist",
    "--enable-unsafe-webgpu"
];
export const VITEXEC_REMOTE_GPU_BROWSER_ARGS = [
    ...VITEXEC_LOCAL_GPU_BROWSER_ARGS
];
/** Create or connect to Chromium. The caller closes the returned browser. */
export async function openBrowser(options = {}) {
    validateRunOptions(options);
    const { chromium } = await import("playwright");
    const timeout = options.timeoutMs ?? VITEXEC_TIMEOUT_MS;
    const args = createBrowserArgs(options);
    const launchOptions = {
        headless: options.headless ?? true,
        args,
        timeout,
        handleSIGINT: options.handleSignals,
        handleSIGTERM: options.handleSignals,
        handleSIGHUP: options.handleSignals,
        ...(options.audio !== false ? { ignoreDefaultArgs: ["--mute-audio"] } : {})
    };
    if (options.browserWsEndpoint) {
        return chromium.connect(options.browserWsEndpoint, {
            timeout,
            exposeNetwork: options.browserExposeNetwork ?? VITEXEC_DEFAULT_REMOTE_EXPOSE_NETWORK,
            headers: { "x-playwright-launch-options": JSON.stringify(launchOptions) }
        });
    }
    await ensureChromiumInstalled({ log: options.log });
    return chromium.launch({ channel: "chromium", ...launchOptions });
}
export function createRemoteBrowserHeaders(options) {
    const args = createBrowserArgs(options);
    return {
        "x-playwright-launch-options": JSON.stringify({
            args,
            ...(options.audioOutput || recordsAudio(options) ? { ignoreDefaultArgs: ["--mute-audio"] } : {})
        })
    };
}
function recordsAudio(options) {
    return Boolean(options.recordPath) && options.recordAudio !== false;
}
export function createBrowserArgs(options) {
    return [
        ...(options.gpu === false ? ["--disable-gpu"] : VITEXEC_LOCAL_GPU_BROWSER_ARGS),
        ...(options.audioOutput === true ? [] : ["--disable-audio-output"]),
        ...(options.browserArgs ?? [])
    ];
}
export async function ensureChromiumInstalled(options = {}) {
    const { chromium } = await import("playwright");
    const executablePath = options.executablePath ?? (() => chromium.executablePath());
    const fileExists = options.fileExists ?? pathExists;
    const install = options.install ?? installPlaywrightChromium;
    if (await fileExists(executablePath()))
        return;
    options.log?.("[playwright] installing Chromium browser...");
    await install();
}
async function pathExists(path) {
    try {
        await access(path);
        return true;
    }
    catch (error) {
        if (error instanceof Error && "code" in error && (error.code === "ENOENT" || error.code === "ENOTDIR"))
            return false;
        throw error;
    }
}
async function installPlaywrightChromium() {
    try {
        await spawn("playwright", ["install", "chromium"], {
            cwd: packageRoot(),
            preferLocal: true,
            stdin: "ignore"
        });
    }
    catch (error) {
        const details = outputFromSubprocessError(error);
        const suffix = details ? `\n${details}` : "";
        throw new Error(`Playwright failed to install Chromium.${suffix}`);
    }
}
function packageRoot() {
    return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}
function outputFromSubprocessError(error) {
    if (typeof error !== "object" || error === null || !("output" in error))
        return "";
    const output = error.output;
    return typeof output === "string" ? output.trim() : "";
}
//# sourceMappingURL=browser.js.map