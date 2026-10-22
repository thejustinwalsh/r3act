'use strict';

const jsxRuntime = require('react/jsx-runtime');
const Canvas$1 = require('./shared/fiber.TRm3lZ7I.cjs');
const THREE = require('three');
const textureStaging = require('./shared/fiber.BO8-26r8.cjs');
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

const THREE__namespace = /*#__PURE__*/_interopNamespaceCompat(THREE);

const webglSupport = {
  kind: "webgl",
  three: THREE__namespace,
  Renderer: THREE__namespace.WebGLRenderer,
  RenderTarget: THREE__namespace.WebGLRenderTarget,
  CubeRenderTarget: THREE__namespace.WebGLCubeRenderTarget
};

const R3F_BUILD_LEGACY = true;
const R3F_BUILD_WEBGPU = false;
const provider = {
  webgl: () => webglSupport
};
function createRoot(canvas) {
  return Canvas$1.createRoot(canvas, provider);
}
const useThree = textureStaging.useThree;
const useFrame = textureStaging.useFrame;
const useRenderTarget = Canvas$1.useRenderTarget;
const Canvas = ((props) => /* @__PURE__ */ jsxRuntime.jsx(Canvas$1.Canvas, { ...props, provider }));

exports.Environment = Canvas$1.Environment;
exports.EnvironmentCube = Canvas$1.EnvironmentCube;
exports.EnvironmentMap = Canvas$1.EnvironmentMap;
exports.EnvironmentPortal = Canvas$1.EnvironmentPortal;
exports.FROM_REF = Canvas$1.FROM_REF;
exports.IsObject = Canvas$1.IsObject;
exports.ONCE = Canvas$1.ONCE;
exports.Portal = Canvas$1.Portal;
exports.REACT_INTERNAL_PROPS = Canvas$1.REACT_INTERNAL_PROPS;
exports.RESERVED_PROPS = Canvas$1.RESERVED_PROPS;
exports.Texture = Canvas$1.Texture;
exports._roots = Canvas$1._roots;
exports.addAfterEffect = Canvas$1.addAfterEffect;
exports.addEffect = Canvas$1.addEffect;
exports.addTail = Canvas$1.addTail;
exports.advance = Canvas$1.advance;
exports.applyProps = Canvas$1.applyProps;
exports.attach = Canvas$1.attach;
exports.buildGraph = Canvas$1.buildGraph;
exports.calculateDpr = Canvas$1.calculateDpr;
exports.createEvents = Canvas$1.createEvents;
exports.createPointerEvents = Canvas$1.createPointerEvents;
exports.createPortal = Canvas$1.createPortal;
exports.createStore = Canvas$1.createStore;
exports.detach = Canvas$1.detach;
exports.diffProps = Canvas$1.diffProps;
exports.dispose = Canvas$1.dispose;
exports.events = Canvas$1.createPointerEvents;
exports.extend = Canvas$1.extend;
exports.findInitialRoot = Canvas$1.findInitialRoot;
exports.flushSync = Canvas$1.flushSync;
exports.fromRef = Canvas$1.fromRef;
exports.getInstanceProps = Canvas$1.getInstanceProps;
exports.getPrimary = Canvas$1.getPrimary;
exports.getPrimaryIds = Canvas$1.getPrimaryIds;
exports.getRootState = Canvas$1.getRootState;
exports.getThree = Canvas$1.getThree;
exports.getUuidPrefix = Canvas$1.getUuidPrefix;
exports.hasConstructor = Canvas$1.hasConstructor;
exports.hasPrimary = Canvas$1.hasPrimary;
exports.hasThree = Canvas$1.hasThree;
exports.invalidate = Canvas$1.invalidate;
exports.invalidateInstance = Canvas$1.invalidateInstance;
exports.is = Canvas$1.is;
exports.isColorRepresentation = Canvas$1.isColorRepresentation;
exports.isCopyable = Canvas$1.isCopyable;
exports.isFromRef = Canvas$1.isFromRef;
exports.isLayers = Canvas$1.isLayers;
exports.isObject3D = Canvas$1.isObject3D;
exports.isOnce = Canvas$1.isOnce;
exports.isOrthographicCamera = Canvas$1.isOrthographicCamera;
exports.isRef = Canvas$1.isRef;
exports.isRenderer = Canvas$1.isRenderer;
exports.isTexture = Canvas$1.isTexture;
exports.isUniform = Canvas$1.isUniform;
exports.isVectorLike = Canvas$1.isVectorLike;
exports.once = Canvas$1.once;
exports.prepare = Canvas$1.prepare;
exports.presetsObj = Canvas$1.presetsObj;
exports.reconciler = Canvas$1.reconciler;
exports.registerPrimary = Canvas$1.registerPrimary;
exports.removeInteractivity = Canvas$1.removeInteractivity;
exports.resolve = Canvas$1.resolve;
exports.swapInteractivity = Canvas$1.swapInteractivity;
exports.unmountComponentAtNode = Canvas$1.unmountComponentAtNode;
exports.unregisterPrimary = Canvas$1.unregisterPrimary;
exports.updateCamera = Canvas$1.updateCamera;
exports.updateFrustum = Canvas$1.updateFrustum;
exports.useEnvironment = Canvas$1.useEnvironment;
exports.useGraph = Canvas$1.useGraph;
exports.useInstanceHandle = Canvas$1.useInstanceHandle;
exports.useLoader = Canvas$1.useLoader;
exports.useTexture = Canvas$1.useTexture;
exports.useTextures = Canvas$1.useTextures;
exports.waitForPrimary = Canvas$1.waitForPrimary;
exports.whenThree = Canvas$1.whenThree;
exports.Block = textureStaging.Block;
exports.ErrorBoundary = textureStaging.ErrorBoundary;
exports.context = textureStaging.context;
exports.registerRootExtension = textureStaging.registerRootExtension;
exports.setRenderOverride = textureStaging.setRenderOverride;
exports.useBridge = textureStaging.useBridge;
exports.useIsomorphicLayoutEffect = textureStaging.useIsomorphicLayoutEffect;
exports.useMutableCallback = textureStaging.useMutableCallback;
exports.useStore = textureStaging.useStore;
exports.Scheduler = scheduler.Scheduler;
exports.getScheduler = scheduler.getScheduler;
exports.Canvas = Canvas;
exports.R3F_BUILD_LEGACY = R3F_BUILD_LEGACY;
exports.R3F_BUILD_WEBGPU = R3F_BUILD_WEBGPU;
exports.createRoot = createRoot;
exports.useFrame = useFrame;
exports.useRenderTarget = useRenderTarget;
exports.useThree = useThree;
