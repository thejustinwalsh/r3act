import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react({
    exclude: [
      /\/src\/developer_study\/generated_.*\.tsx$/,
      /\/compiler\/fixtures\/developer_study_task_b\.tsx$/,
      /\/developer-study\/starter\/runtime\/task-b\.tsx$/,
    ],
    babel: (id) => ({
      plugins: id.endsWith("/src/developer_study/task_a_react.tsx") ||
          id.endsWith("/src/developer_study/task_b_react.tsx") ||
          id.endsWith("/developer-study/starter/react/task-a.tsx") ||
          id.endsWith("/developer-study/starter/react/task-b.tsx") ||
          id.endsWith("/developer-study/starter/react/counter.tsx")
        ? [["babel-plugin-react-compiler", { target: "19" }]]
        : [],
    }),
  })],
  build: {
    outDir: "dist-developer-study",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        taskA: fileURLToPath(new URL("./developer-study-task-a.html", import.meta.url)),
        taskACheck: fileURLToPath(new URL("./developer-study-task-a-check.html", import.meta.url)),
        taskB: fileURLToPath(new URL("./developer-study-task-b.html", import.meta.url)),
        taskBCheck: fileURLToPath(new URL("./developer-study-task-b-check.html", import.meta.url)),
        warmup: fileURLToPath(new URL("./developer-study-warmup.html", import.meta.url)),
      },
    },
  },
});
