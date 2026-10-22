import { aN as FrameNextCallback, J as RootStore } from './shared/fiber.DQTSZ24m.cjs';
export { aE as Act, aF as Bridge, U as Camera, a1 as ComputeFunction, aK as Disposable, Z as DomEvent, D as Dpr, aJ as EquConfig, $ as EventHandlers, a3 as EventManager, _ as Events, a0 as FilterFunction, aO as FrameCallback, aL as FrameNextState, aM as FrameState, F as Frameloop, I as InternalState, K as Intersection, W as IntersectionEvent, aC as IsAllOptional, aB as IsOptional, aA as Mutable, ax as NonFunctionKeys, aI as ObjectMap, ay as Overwrite, B as Performance, a4 as PointerCaptureTarget, P as PointerState, az as Properties, x as R3FRenderer, A as RenderCallback, v as RootExtension, H as RootState, aG as SetBlock, y as Size, S as Subscription, aD as ThreeCamera, Y as ThreeEvent, aH as UnblockProps, z as Viewport, a5 as VisibilityEntry, X as XRManager, a2 as XRPointerConfig, w as context, t as registerRootExtension, u as setRenderOverride, a$ as useStore, b0 as useThree } from './shared/fiber.DQTSZ24m.cjs';
import { UseFrameNextOptions, FrameNextControls } from '@pmndrs/scheduler';
export { AddPhaseOptions, FrameControls, FrameNextControls, FrameTimingState, RootOptions, SchedulerApi, UseFrameNextOptions, UseFrameOptions } from '@pmndrs/scheduler';
import { Texture } from 'three';
import 'three/webgpu';
import 'react';
import 'zustand';
import 'zustand/traditional';
import 'three/tsl';

/**
 * Frame hook with phase-based ordering, priority, and FPS throttling.
 *
 * Always delivers full RootState — works both inside and outside Canvas context:
 * - Inside Canvas: Full RootState (renderer, scene, camera, etc.)
 * - Outside Canvas: The job registers immediately but the callback is held until a
 *   Canvas adopts it, then runs with full RootState. For hostless / standalone
 *   frame loops with no Canvas, use `@pmndrs/scheduler` directly.
 *
 * Returns a controls object for manual stepping, pausing, and resuming.
 *
 * @param callback - Function called each frame with (state, delta). Optional if you only need scheduler access.
 * @param priorityOrOptions - Either a priority number (backwards compat) or options object
 * @returns Controls object with step(), stepAll(), invalidate(), pause(), resume(), isPaused, id, rootId, scheduler
 *
 * @example
 * // Simple priority (backwards compat)
 * useFrame((state, delta) => { ... }, 5)
 *
 * @example
 * // With phase-based ordering
 * useFrame((state, delta) => { ... }, { phase: 'physics' })
 *
 * @example
 * // Outside Canvas - callback waits for a Canvas, then always has full state
 * function UI() {
 *   useFrame((state, delta) => { syncUI(state.camera) });
 *   return <button>...</button>;
 * }
 *
 * @example
 * // Hostless / standalone loop (no Canvas) - use @pmndrs/scheduler directly
 * import { getScheduler } from '@pmndrs/scheduler'
 * getScheduler().register((state, delta) => { updateGame(delta) })
 *
 * @example
 * // Scheduler-only access (no callback)
 * const { scheduler } = useFrame()
 * scheduler.pauseJob('some-job-id')
 *
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#useframe
 */
declare function useFrame(callback?: FrameNextCallback, priorityOrOptions?: number | UseFrameNextOptions): FrameNextControls;

/**
 * The texture registry as a reader during render should see it: registered textures, plus those a
 * `useTexture` earlier in this render loaded but has not registered yet. Returns the registry Map
 * itself when nothing is staged. Read-only: register through `useTexture` / `useTextures().add`.
 */
declare function getTextureView(store: RootStore): ReadonlyMap<string, Texture>;

export { FrameNextCallback, RootStore, getTextureView, useFrame };
