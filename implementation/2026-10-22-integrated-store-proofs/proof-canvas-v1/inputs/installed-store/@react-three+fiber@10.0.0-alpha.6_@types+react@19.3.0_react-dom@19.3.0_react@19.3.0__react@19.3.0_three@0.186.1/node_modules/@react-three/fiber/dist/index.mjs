import { jsx } from 'react/jsx-runtime';
import { c as createRoot$1, C as Canvas$1 } from './shared/fiber.BuWl08aJ.mjs';
export { s as Environment, p as EnvironmentCube, E as EnvironmentMap, q as EnvironmentPortal, ah as FROM_REF, I as IsObject, ak as ONCE, P as Portal, S as REACT_INTERNAL_PROPS, a0 as RESERVED_PROPS, T as Texture, _ as _roots, d as addAfterEffect, b as addEffect, e as addTail, f as advance, a5 as applyProps, a2 as attach, W as buildGraph, N as calculateDpr, y as createEvents, a as createPointerEvents, M as createPortal, l as createStore, a3 as detach, a4 as diffProps, X as dispose, a as events, H as extend, U as findInitialRoot, K as flushSync, ai as fromRef, Y as getInstanceProps, h as getPrimary, k as getPrimaryIds, V as getRootState, m as getThree, O as getUuidPrefix, ag as hasConstructor, j as hasPrimary, n as hasThree, i as invalidate, $ as invalidateInstance, a6 as is, a9 as isColorRepresentation, af as isCopyable, aj as isFromRef, ac as isLayers, aa as isObject3D, am as isOnce, a7 as isOrthographicCamera, a8 as isRef, g as isRenderer, ab as isTexture, ad as isUniform, ae as isVectorLike, al as once, Z as prepare, t as presetsObj, J as reconciler, r as registerPrimary, x as removeInteractivity, a1 as resolve, v as swapInteractivity, L as unmountComponentAtNode, u as unregisterPrimary, Q as updateCamera, R as updateFrustum, G as useEnvironment, A as useGraph, z as useInstanceHandle, B as useLoader, D as useTexture, F as useTextures, w as waitForPrimary, o as whenThree } from './shared/fiber.BuWl08aJ.mjs';
import { a as asWebGPUCanvas } from './shared/fiber.DEWBFQJe.mjs';
export { b as useFrame, c as useRenderTarget, u as useThree } from './shared/fiber.DEWBFQJe.mjs';
export { B as Block, E as ErrorBoundary, c as context, r as registerRootExtension, s as setRenderOverride, f as useBridge, d as useIsomorphicLayoutEffect, e as useMutableCallback, u as useStore } from './shared/fiber.C-3TIsF8.mjs';
export { Scheduler, getScheduler } from '@pmndrs/scheduler';

const R3F_BUILD_LEGACY = false;
const R3F_BUILD_WEBGPU = true;
const provider = {
  webgpu: () => import('./chunks/webgpu.mjs').then((m) => m.webgpuSupport)
};
function createRoot(canvas) {
  return createRoot$1(canvas, provider);
}
const Canvas = asWebGPUCanvas((props) => /* @__PURE__ */ jsx(Canvas$1, { ...props, provider }));

export { Canvas, R3F_BUILD_LEGACY, R3F_BUILD_WEBGPU, createRoot };
