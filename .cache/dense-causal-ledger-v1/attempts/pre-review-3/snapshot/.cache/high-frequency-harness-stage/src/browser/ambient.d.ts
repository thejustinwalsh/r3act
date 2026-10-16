/// <reference types="vite/client" />

declare module "*.css" {}

declare module "react-dom" {
  export function flushSync<T>(callback: () => T): T;
}

declare module "react-dom/client" {
  import type { ReactNode } from "react";
  import type { RuntimeElement } from "../../../../src/jsx_binding_runtime.ts";

  export interface Root {
    render(children: ReactNode | RuntimeElement): void;
    unmount(): void;
  }

  export function createRoot(container: Element | DocumentFragment): Root;
}
