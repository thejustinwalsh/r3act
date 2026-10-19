import { bind } from "../../src/jsx_binding_runtime.ts";

type Node = { id: number; x: number; y: number };

export function Scene({ nodes }: { nodes: Node[] }) {
  return <section className="scene">
    {nodes.map((node, index) =>
      <span
        key={index}
        className="scene-node"
        style={{
          transform: bind(node.x, (value) => `translateX(${value}px)`),
          left: bind(node.x, (value) => `${value}px`),
          opacity: bind(node.y, (value) => Math.max(0, Math.min(1, value))),
        }}
      />
    )}
  </section>;
}
