'use strict';

const THREE = require('three/webgpu');
const tsl = require('three/tsl');

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

const webgpuSupport = {
  kind: "webgpu",
  three: THREE__namespace,
  Renderer: THREE__namespace.WebGPURenderer,
  RenderTarget: THREE__namespace.RenderTarget,
  CubeRenderTarget: THREE__namespace.CubeRenderTarget,
  CanvasTarget: THREE__namespace.CanvasTarget,
  // What the occlusion observer (core/visibility.ts) is built from
  occlusion: {
    Node: THREE__namespace.Node,
    NodeUpdateType: THREE__namespace.NodeUpdateType,
    MeshBasicNodeMaterial: THREE__namespace.MeshBasicNodeMaterial,
    uniform: tsl.uniform,
    nodeObject: tsl.nodeObject
  }
};

exports.webgpuSupport = webgpuSupport;
