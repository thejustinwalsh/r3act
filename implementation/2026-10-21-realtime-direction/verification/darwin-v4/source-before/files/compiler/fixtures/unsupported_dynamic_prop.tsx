import { bind } from "../../src/jsx_binding_runtime.ts";

type ScalarSource = { id: number; value: number; label: string };

export function Scene({ nodes }: { nodes: ScalarSource[] }) {
  return <section className="scene">
    {nodes.map((node, index) =>
      <span
        key={index}
        title={node.label}
        style={{ transform: bind(node, (value) => `translateX(${value}px)`) }}
      />
    )}
  </section>;
}
