import { extname } from "node:path";
export const VITEXEC_TIMEOUT_MS = 10 * 60 * 1000;
export function validateRunOptions(options) {
    if (options.recordPath && extname(options.recordPath).toLowerCase() !== ".mp4") {
        throw new Error(`Recording path must end in .mp4: ${options.recordPath}`);
    }
    if (options.recordFps !== undefined && (!Number.isInteger(options.recordFps) || options.recordFps <= 0)) {
        throw new Error("recording frame rate must be a positive integer");
    }
    if (options.timeoutMs !== undefined && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) {
        throw new Error("timeoutMs must be a finite positive number");
    }
    parseViewport(options.viewport);
}
export function parseViewport(value) {
    if (!value)
        return null;
    const match = /^(\d+)x(\d+)$/.exec(value.trim());
    if (!match)
        throw new Error(`invalid --viewport "${value}" — expected WIDTHxHEIGHT, e.g. 390x844`);
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
        throw new Error("invalid --viewport: dimensions must be positive integers");
    }
    return { width, height };
}
//# sourceMappingURL=options.js.map