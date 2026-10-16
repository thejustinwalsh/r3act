declare module "react" {
  export type ComponentType<P = {}> = (props: P) => unknown;
  export interface RefObject<T> { current: T; }
  export function createElement(type: string, props: { ref: RefObject<unknown> }): unknown;
  export function useRef<T>(initial: T): RefObject<T>;
  export function useLayoutEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
}
