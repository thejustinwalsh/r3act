import { bind } from "../../src/jsx_binding_runtime.ts";

type ScalarSource = { id: number; value: number };

export function Scene({ nodes }: { nodes: ScalarSource[] }) {
  return <section className="scene">
    {nodes.map((node, index) =>
      <span
        key={index}
        className="scene-node"
        role="img"
        style={{
          transform: bind(node, (value) => `translateX(${value}px)`),
          opacity: bind(node, (value) => Math.max(0, Math.min(1, value))),
        }}
      />
    )}
  </section>;
}
