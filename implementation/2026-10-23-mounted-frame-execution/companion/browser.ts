import { createDOMRoot } from '@r3act/core';
import { OrthographicCamera, WebGLRenderer } from 'three';
import { runGameLifecycle } from './game';
const container = document.querySelector('#hud')!;
const hud = createDOMRoot(container, { rootId: 'mounted-game-hud', scheduleCommit() {} });
const renderer = new WebGLRenderer({ canvas: document.querySelector('canvas')!, antialias: false,
  preserveDrawingBuffer: true });
renderer.setSize(128, 128, false);
const camera = new OrthographicCamera(-6, 6, 6, -6, .1, 100);
camera.position.z = 20;
try {
  const result = runGameLifecycle(hud, () => Number(container.querySelector('output')?.getAttribute('data-tick')),
    scene => {
      renderer.render(scene, camera);
      const gl = renderer.getContext(), pixels = new Uint8Array(128 * 128 * 4);
      gl.readPixels(0, 0, 128, 128, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let litPixels = 0;
      for (let index = 0; index < pixels.length; index += 4)
        if (pixels[index] || pixels[index + 1] || pixels[index + 2]) litPixels++;
      if (!litPixels) throw new Error('Game fixture produced no visible pixels');
      return { litPixels, version: String(gl.getParameter(gl.VERSION)) };
    });
  Object.assign(window, { gameLifecycleResult: result });
} finally { renderer.dispose(); renderer.forceContextLoss(); }
