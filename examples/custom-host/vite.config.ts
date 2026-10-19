import { defineConfig } from "vite";
import { nativeModulePlugin } from "@r3act/vite";

export default defineConfig({ plugins: [nativeModulePlugin()], base: "./" });
