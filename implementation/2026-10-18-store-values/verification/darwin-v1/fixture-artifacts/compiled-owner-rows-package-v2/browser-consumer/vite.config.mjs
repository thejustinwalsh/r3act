import { defineConfig } from "vite";
import { nativeModulePlugin } from "@compiled-ui/runtime/vite";

export default defineConfig({ plugins: [nativeModulePlugin()] });
