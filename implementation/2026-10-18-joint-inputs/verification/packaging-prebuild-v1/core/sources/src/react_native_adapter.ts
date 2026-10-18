import {
  createElement,
  useLayoutEffect,
  useRef,
  type ComponentType as ReactComponentType,
} from "react";
import {
  createDOMRoot,
  jsx as nativeJsx,
  type ComponentType as NativeComponentType,
  type NativeRootOptions,
} from "./native_runtime_api.ts";

/**
 * Create a React component that owns one bounded native DOM root.
 *
 * The native component receives the React component's committed props. React
 * context, refs, portals, and React lifecycle semantics do not cross this
 * boundary. The native subtree owns only the contents of its private div.
 * An explicit rootId identifies one mounted adapter instance in its world;
 * use the automatic ID when mounting several instances of the same adapter.
 */
export function createReactNativeRootAdapter<P>(
  NativeComponent: NativeComponentType<P>,
  options?: NativeRootOptions,
): ReactComponentType<P> {
  // Root configuration is fixed for this adapter instance. In particular,
  // ordinary prop commits must not replace the root or reset native owners.
  const rootOptions = options === undefined ? undefined : { ...options };

  function ReactNativeRootAdapter(props: P) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const rootRef = useRef<ReturnType<typeof createDOMRoot> | null>(null);
    const skipInitialUpdateRef = useRef(true);

    // Keep root lifetime separate from prop commits. React StrictMode replays
    // this setup after cleanup, so replay creates and mounts one fresh root.
    useLayoutEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const root = createDOMRoot(container, rootOptions);
      rootRef.current = root;
      skipInitialUpdateRef.current = true;
      try {
        root.mount(nativeJsx(
          NativeComponent,
          props as unknown as Record<string, unknown>,
        ));
      } catch (error) {
        rootRef.current = null;
        try {
          root.dispose();
        } catch (disposeError) {
          throw new AggregateError(
            [error, disposeError],
            "Native root mount and cleanup both failed",
          );
        }
        throw error;
      }

      return () => {
        if (rootRef.current === root) rootRef.current = null;
        root.dispose();
      };
    }, []);

    // Runs after every later React commit so the native boundary sees committed
    // props without replacing its root or local owner state.
    useLayoutEffect(() => {
      if (skipInitialUpdateRef.current) {
        skipInitialUpdateRef.current = false;
        return;
      }
      rootRef.current?.update(nativeJsx(
        NativeComponent,
        props as unknown as Record<string, unknown>,
      ));
    });

    return createElement("div", { ref: containerRef });
  }

  return ReactNativeRootAdapter;
}
