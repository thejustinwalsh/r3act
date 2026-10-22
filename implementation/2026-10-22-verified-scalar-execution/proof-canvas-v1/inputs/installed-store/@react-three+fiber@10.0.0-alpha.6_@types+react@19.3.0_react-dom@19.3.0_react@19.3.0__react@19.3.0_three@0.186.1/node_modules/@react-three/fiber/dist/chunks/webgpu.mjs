import * as THREE from 'three/webgpu';
import { nodeObject, uniform } from 'three/tsl';

const webgpuSupport = {
  kind: "webgpu",
  three: THREE,
  Renderer: THREE.WebGPURenderer,
  RenderTarget: THREE.RenderTarget,
  CubeRenderTarget: THREE.CubeRenderTarget,
  CanvasTarget: THREE.CanvasTarget,
  // What the occlusion observer (core/visibility.ts) is built from
  occlusion: {
    Node: THREE.Node,
    NodeUpdateType: THREE.NodeUpdateType,
    MeshBasicNodeMaterial: THREE.MeshBasicNodeMaterial,
    uniform,
    nodeObject
  }
};

export { webgpuSupport };
