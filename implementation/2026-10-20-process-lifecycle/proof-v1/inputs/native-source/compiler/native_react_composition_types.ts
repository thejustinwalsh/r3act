import react from "@vitejs/plugin-react";
import { nativeReactPlugins } from "./vite_native_plugin.ts";

nativeReactPlugins(react, {
  root: ".",
  reactOptions: {
    jsxImportSource: "react",
    jsxRuntime: "automatic",
    babel: { plugins: [] },
    exclude: [/external\.tsx$/],
  },
});

nativeReactPlugins(react, {
  root: ".",
  reactOptions: {
    // @ts-expect-error React does not accept this option.
    unknownReactOption: true,
  },
});

nativeReactPlugins(react, {
  root: ".",
  reactOptions: {
    // @ts-expect-error React requires a string JSX import source.
    jsxImportSource: 1,
  },
});

nativeReactPlugins(react, {
  root: ".",
  reactOptions: {
    // @ts-expect-error React excludes must be strings or regular expressions.
    exclude: [1],
  },
});
