import { mergeConfig, type Plugin } from "vite";
import base from "./vite.product-mixed-compiled-owner-row-fusion.config.ts";

const isolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
} as const;

const timingCalibration: Plugin = {
  name: "owner-row-fusion-timing-calibration",
  configurePreviewServer(server) {
    server.middlewares.use((_request, response, next) => {
      response.setHeader("Cross-Origin-Opener-Policy", isolationHeaders["Cross-Origin-Opener-Policy"]);
      response.setHeader("Cross-Origin-Embedder-Policy", isolationHeaders["Cross-Origin-Embedder-Policy"]);
      next();
    });
    server.middlewares.use("/__clock-calibration", (request, response) => {
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.statusCode = 405;
        response.setHeader("Allow", "GET, HEAD");
        response.end();
        return;
      }
      response.statusCode = 200;
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.setHeader("Cache-Control", "no-store");
      response.end(request.method === "HEAD" ? undefined :
        "<!doctype html><html><head><meta charset=\"utf-8\"><title>Clock calibration</title></head><body>Clock calibration only.</body></html>");
    });
  },
};

export default mergeConfig(base, {
  preview: { headers: isolationHeaders },
  plugins: [timingCalibration],
});
