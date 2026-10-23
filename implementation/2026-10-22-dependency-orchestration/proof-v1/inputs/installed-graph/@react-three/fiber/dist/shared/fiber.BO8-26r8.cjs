'use strict';

const React = require('react');
const jsxRuntime = require('react/jsx-runtime');
const itsFine = require('its-fine');
const scheduler = require('@pmndrs/scheduler');

function _interopNamespaceCompat(e) {
  if (e && typeof e === 'object' && 'default' in e) return e;
  const n = Object.create(null);
  if (e) {
    for (const k in e) {
      n[k] = e[k];
    }
  }
  n.default = e;
  return n;
}

const React__namespace = /*#__PURE__*/_interopNamespaceCompat(React);

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const useIsomorphicLayoutEffect = /* @__PURE__ */ (() => typeof window !== "undefined" && (window.document?.createElement || window.navigator?.product === "ReactNative"))() ? React__namespace.useLayoutEffect : React__namespace.useEffect;
function useMutableCallback(fn) {
  const ref = React__namespace.useRef(fn);
  useIsomorphicLayoutEffect(() => void (ref.current = fn), [fn]);
  return ref;
}
const useActivityBridge = React__namespace["Activity"] ? itsFine.useActivityBridge : () => React__namespace.Fragment;
function useBridge() {
  const fiber = itsFine.useFiber();
  const ContextBridge = itsFine.useContextBridge();
  const ActivityBridge = useActivityBridge();
  return React__namespace.useMemo(
    () => ({ children }) => {
      const strict = !!itsFine.traverseFiber(fiber, true, (node) => node.type === React__namespace.StrictMode);
      const Root = strict ? React__namespace.StrictMode : React__namespace.Fragment;
      return /* @__PURE__ */ jsxRuntime.jsx(Root, { children: /* @__PURE__ */ jsxRuntime.jsx(ActivityBridge, { children: /* @__PURE__ */ jsxRuntime.jsx(ContextBridge, { children }) }) });
    },
    [fiber, ContextBridge, ActivityBridge]
  );
}
function Block({ set }) {
  useIsomorphicLayoutEffect(() => {
    set(new Promise(() => null));
    return () => set(false);
  }, [set]);
  return null;
}
const ErrorBoundary = /* @__PURE__ */ (() => {
  var _a;
  return _a = class extends React__namespace.Component {
    constructor() {
      super(...arguments);
      __publicField(this, "state", { error: false });
    }
    componentDidCatch(err) {
      this.props.set(err);
    }
    render() {
      return this.state.error ? null : this.props.children;
    }
  }, __publicField(_a, "getDerivedStateFromError", () => ({ error: true })), _a;
})();
const noop = () => {
};
function Gate({ promise, onSettled }) {
  React__namespace.use(promise);
  useIsomorphicLayoutEffect(onSettled, [onSettled]);
  return null;
}
function useGate() {
  const [promise, setPromise] = React__namespace.useState(null);
  const onSettled = React__namespace.useCallback(() => setPromise(null), []);
  const waitFor = React__namespace.useCallback(
    (next) => setPromise((current) => current ?? Promise.resolve(next).then(noop, noop)),
    []
  );
  const gate = promise ? /* @__PURE__ */ jsxRuntime.jsx(React__namespace.Suspense, { fallback: null, children: /* @__PURE__ */ jsxRuntime.jsx(Gate, { promise, onSettled }) }) : null;
  return [gate, waitFor];
}

const shownNotices = /* @__PURE__ */ new Set();
function notifyDepreciated({ heading, body, link }) {
  if (typeof process !== "undefined" && (process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== void 0) && process.env.R3F_SHOW_DEPRECATION_WARNINGS !== "true") {
    return;
  }
  if (shownNotices.has(heading)) return;
  shownNotices.add(heading);
  const caller = getCallerFrame();
  if (caller) {
    console.log();
  }
  const boxStyle = "background: #ff9800; color: #1a1a1a; padding: 8px 12px; border-radius: 4px; font-weight: 500;";
  if (caller) {
    console.log(`%c\u26A0\uFE0F ${heading}`, boxStyle);
  }
  if (body || link) {
    let message = "";
    if (body) message += body;
    if (link) message += (body ? "\n\n" : "") + `More info: ${link}`;
    console.warn(`%c${message}`, "font-weight: bold;");
  }
}
function getCallerFrame(depth = 3) {
  const stack = new Error().stack;
  if (!stack) return null;
  const lines = stack.split("\n");
  const frame = lines[depth];
  if (!frame) return null;
  let match = frame.match(/^\s*at (?:(.+?) )?\(?(.+?):(\d+):(\d+)\)?$/);
  if (!match) {
    match = frame.match(/^(?:(.+?)@)?(.+?):(\d+):(\d+)$/);
  }
  if (!match) return null;
  const [, fn, url, line] = match;
  return {
    functionName: fn ?? "<anonymous>",
    location: formatLocation(url, Number(line))
  };
}
function formatLocation(url, line) {
  const clean = url.split("?")[0];
  const file = clean.split("/").pop() ?? clean;
  return `${file}:${line}`;
}
function notifyAlpha({ message, link }) {
  if (typeof process !== "undefined" && (process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== void 0) && process.env.R3F_SHOW_ALPHA_WARNINGS !== "true") {
    return;
  }
  if (shownNotices.has(message)) return;
  shownNotices.add(message);
  const boxStyle = "background: #6366f1; color: #ffffff; padding: 6px 10px; border-radius: 4px; font-weight: 500;";
  console.log(`%c\u{1F52C} ${message}`, boxStyle);
  {
    console.log(`%cMore info: ${link}`, "color: #6366f1; font-weight: normal;");
  }
}
function isDevelopment() {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return true;
  }
}

const INTERNAL_LIB_MARKERS = [
  "zustand",
  "setState",
  "Object.assign",
  "@pmndrs/scheduler",
  "Scheduler.tickRoot",
  "Scheduler.stepJob"
];
function isInternalRendererAccess(stack, callerDepth = 2) {
  if (!stack) return false;
  const caller = stack.split("\n")[callerDepth] ?? "";
  return INTERNAL_LIB_MARKERS.some((m) => caller.includes(m));
}

const isAccessorDescriptor = (descriptor) => !!descriptor && (descriptor.get !== void 0 || descriptor.set !== void 0);
const isAccessor = (object, key) => isAccessorDescriptor(Object.getOwnPropertyDescriptor(object, key));
function cloneState(...sources) {
  const target = {};
  for (const source of sources) {
    if (source) Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
  }
  return target;
}
function preserveAccessors(rawSet, get) {
  return ((partial, replace) => {
    const previous = get();
    const patch = typeof partial === "function" ? partial(previous) : partial;
    if (replace || !previous || patch == null || Object.is(patch, previous)) {
      return rawSet(patch, replace);
    }
    const next = cloneState(previous);
    const viaSetter = [];
    for (const key of Reflect.ownKeys(patch)) {
      const descriptor = Object.getOwnPropertyDescriptor(patch, key);
      if (!descriptor.enumerable) continue;
      if (isAccessorDescriptor(descriptor)) {
        Object.defineProperty(next, key, descriptor);
      } else if (isAccessor(next, key)) {
        viaSetter.push(key);
      } else {
        Object.defineProperty(next, key, {
          value: descriptor.value,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
    }
    for (const key of viaSetter) next[key] = patch[key];
    rawSet(next, true);
  });
}
const keepAccessors = (initializer) => (rawSet, get, api) => {
  const set = preserveAccessors(rawSet, get);
  api.setState = set;
  return initializer(set, get, api);
};
let glNoticeShown = false;
const schedulerViews = /* @__PURE__ */ new WeakMap();
function stateForScheduler(state) {
  let view = schedulerViews.get(state);
  if (!view) {
    view = cloneState(state);
    Object.defineProperty(view, "gl", {
      get() {
        return this.internal?.actualRenderer;
      },
      set(value) {
        this.internal.actualRenderer = value;
      },
      enumerable: true,
      configurable: true
    });
    schedulerViews.set(state, view);
  }
  return view;
}
function defineRendererAccessors(state) {
  Object.defineProperty(state, "gl", {
    get() {
      const renderer = this.internal?.actualRenderer;
      if (!glNoticeShown && renderer && !this.isLegacy) {
        const stack = new Error().stack || "";
        if (!isInternalRendererAccess(stack)) {
          glNoticeShown = true;
          const cleanedStack = stack.split("\n").slice(2).join("\n") || "Stack trace unavailable";
          notifyDepreciated({
            heading: "Accessing state.gl in WebGPU mode",
            body: "Please use state.renderer instead. state.gl is deprecated and will be removed in future versions.\n\nFor backwards compatibility, state.gl currently maps to state.renderer, but this may cause issues with libraries expecting WebGLRenderer.\n\nAccessed from:\n" + cleanedStack
          });
        }
      }
      return renderer;
    },
    set(value) {
      this.internal.actualRenderer = value;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(state, "renderer", {
    get() {
      return this.internal?.actualRenderer;
    },
    set(value) {
      this.internal.actualRenderer = value;
    },
    enumerable: true,
    configurable: true
  });
}

const R3F_CONTEXT = Symbol.for("@react-three/fiber.context");
const context = globalThis[R3F_CONTEXT] ?? (globalThis[R3F_CONTEXT] = React__namespace.createContext(null));

const R3F_EXTENSIONS = Symbol.for("@react-three/fiber.extensions");
function getRegistry() {
  return globalThis[R3F_EXTENSIONS] ?? (globalThis[R3F_EXTENSIONS] = {
    extensions: /* @__PURE__ */ new Map(),
    roots: /* @__PURE__ */ new Set(),
    applied: /* @__PURE__ */ new WeakMap()
  });
}
function setupRoot(registry, store, extension) {
  let applied = registry.applied.get(store);
  if (!applied) registry.applied.set(store, applied = /* @__PURE__ */ new Map());
  if (applied.has(extension.name)) return;
  applied.set(extension.name, extension);
  const patch = extension.setup?.(store);
  if (patch) store.setState(patch);
}
function registerRootExtension(extension) {
  const registry = getRegistry();
  registry.extensions.set(extension.name, extension);
  for (const store of registry.roots) setupRoot(registry, store, extension);
  return () => {
    if (registry.extensions.get(extension.name) === extension) registry.extensions.delete(extension.name);
  };
}
function setRenderOverride(store, render) {
  store.getState().internal.renderOverride = render;
}
function attachRootExtensions(store) {
  const registry = getRegistry();
  registry.roots.add(store);
  for (const extension of registry.extensions.values()) setupRoot(registry, store, extension);
}
function current(registry, setUpBy) {
  return registry.extensions.get(setUpBy.name) ?? setUpBy;
}
function detachRootExtensions(store) {
  const registry = getRegistry();
  if (!registry.roots.delete(store)) return;
  const applied = registry.applied.get(store);
  registry.applied.delete(store);
  if (!applied) return;
  for (const setUpBy of applied.values()) current(registry, setUpBy).dispose?.(store);
}
function notifyRootExtensionsHmr(store) {
  const registry = getRegistry();
  const applied = registry.applied.get(store);
  if (!applied) return;
  for (const setUpBy of applied.values()) current(registry, setUpBy).hmr?.(store);
}

function useStore() {
  const store = React.useContext(context);
  if (!store) throw new Error("R3F: Hooks can only be used within the Canvas component!");
  return store;
}
function useThree(selector = (state) => state, equalityFn) {
  return useStore()(selector, equalityFn);
}

function useFrame(callback, priorityOrOptions) {
  const store = React__namespace.useContext(context);
  const isInsideCanvas = store !== null;
  const scheduler$1 = scheduler.getScheduler();
  const optionsKey = typeof priorityOrOptions === "number" ? `p:${priorityOrOptions}` : priorityOrOptions ? JSON.stringify({
    id: priorityOrOptions.id,
    phase: priorityOrOptions.phase,
    priority: priorityOrOptions.priority,
    fps: priorityOrOptions.fps,
    drop: priorityOrOptions.drop,
    enabled: priorityOrOptions.enabled,
    before: priorityOrOptions.before,
    after: priorityOrOptions.after
  }) : "";
  const options = React__namespace.useMemo(() => {
    return typeof priorityOrOptions === "number" ? { priority: priorityOrOptions } : priorityOrOptions ?? {};
  }, [optionsKey]);
  const [generatedId] = React__namespace.useState(() => scheduler$1.generateJobId());
  const id = options.id ?? generatedId;
  const callbackRef = useMutableCallback(callback);
  const isLegacyPriority = typeof priorityOrOptions === "number" && priorityOrOptions > 0;
  const isLegacyOrdering = typeof priorityOrOptions === "number" && priorityOrOptions < 0;
  useIsomorphicLayoutEffect(() => {
    if (!callback) return;
    if (isLegacyOrdering) {
      notifyDepreciated({
        heading: "useFrame numeric priority order is reversed in v10",
        body: "useFrame(callback, number) is deprecated and its ordering direction is reversed from v9: v9 ran lower numbers first, v10 maps the number to { priority } and runs higher numbers first, so a negative priority now runs after default-priority jobs.\n\nUse { before, after } to name the dependency, or { priority } with the v10 direction (higher = earlier).",
        link: "https://docs.pmnd.rs/react-three-fiber/api/hooks#useframe"
      });
    }
    if (isInsideCanvas) {
      const state = store.getState();
      const rootId = state.internal.rootId;
      if (isLegacyPriority) {
        state.internal.priority++;
        let parentRoot = state.previousRoot;
        while (parentRoot) {
          const parentState = parentRoot.getState();
          if (parentState?.internal) parentState.internal.priority++;
          parentRoot = parentState?.previousRoot;
        }
        notifyDepreciated({
          heading: "useFrame with numeric priority is deprecated",
          body: 'Using useFrame(callback, number) to control render order is deprecated.\n\nFor custom rendering, use: useFrame(callback, { phase: "render" })\nFor execution order within a phase, use: useFrame(callback, { priority: number }) \u2014 higher runs first, the reverse of v9',
          link: "https://docs.pmnd.rs/react-three-fiber/api/hooks#useframe"
        });
      }
      const wrappedCallback = (frameState, delta) => {
        const mergedState = cloneState(store.getState());
        mergedState.time = frameState.time;
        mergedState.delta = frameState.delta;
        mergedState.elapsed = frameState.elapsed;
        mergedState.frame = frameState.frame;
        mergedState.overstep = frameState.overstep;
        callbackRef.current?.(mergedState, delta);
      };
      const unregister = scheduler$1.register(wrappedCallback, {
        id,
        rootId,
        ...options
      });
      return () => {
        unregister();
        if (isLegacyPriority) {
          const currentState = store.getState();
          if (currentState.internal) {
            currentState.internal.priority--;
            let parentRoot = currentState.previousRoot;
            while (parentRoot) {
              const parentState = parentRoot.getState();
              if (parentState?.internal) parentState.internal.priority--;
              parentRoot = parentState?.previousRoot;
            }
          }
        }
      };
    } else {
      return scheduler$1.register(
        (state, delta) => {
          const frameState = state;
          if (!frameState.renderer) return;
          callbackRef.current?.(frameState, delta);
        },
        { id, ...options }
      );
    }
  }, [store, scheduler$1, id, optionsKey, isLegacyPriority, isLegacyOrdering, isInsideCanvas]);
  const isPaused = React__namespace.useSyncExternalStore(
    // Subscribe function
    React__namespace.useCallback(
      (onStoreChange) => {
        return scheduler.getScheduler().subscribeJobState(id, onStoreChange);
      },
      [id]
    ),
    // getSnapshot function
    React__namespace.useCallback(() => scheduler.getScheduler().isJobPaused(id), [id]),
    // getServerSnapshot function (SSR)
    React__namespace.useCallback(() => false, [])
  );
  const controls = React__namespace.useMemo(() => {
    const scheduler2 = scheduler.getScheduler();
    return {
      /** The job's unique ID */
      id,
      /**
       * Access to the global scheduler for frame loop control.
       * Use for controlling the entire frame loop, adding phases, etc.
       */
      scheduler: scheduler2,
      /**
       * The root that currently owns this job. Resolve on access because ambient
       * jobs can be adopted by a Canvas after the controls object is created.
       */
      get rootId() {
        return scheduler.getScheduler().getJobRootId(id);
      },
      /**
       * Manually step this job only.
       * Bypasses FPS limiting - always runs.
       * @param timestamp Optional timestamp (defaults to performance.now())
       */
      step: (timestamp) => {
        scheduler.getScheduler().stepJob(id, timestamp);
      },
      /**
       * Manually step ALL jobs in the scheduler.
       * Useful for frameloop='never' mode.
       * @param timestamp Optional timestamp (defaults to performance.now())
       */
      stepAll: (timestamp) => {
        scheduler.getScheduler().step(timestamp);
      },
      /**
       * Request frames for this job's owning root without waking sibling roots.
       */
      invalidate: (frames, stackFrames) => {
        const scheduler3 = scheduler.getScheduler();
        const rootId = scheduler3.getJobRootId(id);
        if (rootId) scheduler3.invalidateRoot(rootId, frames, stackFrames);
      },
      /**
       * Pause this job (set enabled=false).
       * Job remains registered but won't run.
       */
      pause: () => {
        scheduler.getScheduler().pauseJob(id);
      },
      /**
       * Resume this job (set enabled=true).
       */
      resume: () => {
        scheduler.getScheduler().resumeJob(id);
      },
      /**
       * Reactive paused state - automatically updates when pause/resume is called.
       * No need for forceUpdate() in your components.
       */
      isPaused
    };
  }, [id, isPaused]);
  return controls;
}

const R3F_STAGED_TEXTURES = Symbol.for("@react-three/fiber.stagedTextures");
const globalStaging = globalThis;
const staging = globalStaging[R3F_STAGED_TEXTURES] ?? (globalStaging[R3F_STAGED_TEXTURES] = /* @__PURE__ */ new WeakMap());
function stageTextures(store, entries) {
  const registered = store.getState().textures;
  let staged = staging.get(store);
  for (const [url, texture] of entries) {
    if (registered.has(url)) continue;
    if (!staged) staging.set(store, staged = /* @__PURE__ */ new Map());
    staged.set(url, texture);
  }
}
function unstageTextures(store, urls) {
  const staged = staging.get(store);
  if (!staged) return;
  for (const url of urls) staged.delete(url);
  if (staged.size === 0) staging.delete(store);
}
function getTextureView(store) {
  const registered = store.getState().textures;
  const staged = staging.get(store);
  if (!staged) return registered;
  const view = new Map(registered);
  for (const [url, texture] of staged) if (!view.has(url)) view.set(url, texture);
  return view;
}

exports.Block = Block;
exports.ErrorBoundary = ErrorBoundary;
exports.attachRootExtensions = attachRootExtensions;
exports.cloneState = cloneState;
exports.context = context;
exports.defineRendererAccessors = defineRendererAccessors;
exports.detachRootExtensions = detachRootExtensions;
exports.getTextureView = getTextureView;
exports.isAccessor = isAccessor;
exports.isDevelopment = isDevelopment;
exports.keepAccessors = keepAccessors;
exports.notifyAlpha = notifyAlpha;
exports.notifyDepreciated = notifyDepreciated;
exports.notifyRootExtensionsHmr = notifyRootExtensionsHmr;
exports.preserveAccessors = preserveAccessors;
exports.registerRootExtension = registerRootExtension;
exports.setRenderOverride = setRenderOverride;
exports.stageTextures = stageTextures;
exports.stateForScheduler = stateForScheduler;
exports.unstageTextures = unstageTextures;
exports.useBridge = useBridge;
exports.useFrame = useFrame;
exports.useGate = useGate;
exports.useIsomorphicLayoutEffect = useIsomorphicLayoutEffect;
exports.useMutableCallback = useMutableCallback;
exports.useStore = useStore;
exports.useThree = useThree;
