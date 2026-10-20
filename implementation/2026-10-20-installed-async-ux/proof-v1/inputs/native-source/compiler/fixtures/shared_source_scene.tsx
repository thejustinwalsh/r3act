import { bind } from "../../src/jsx_binding_runtime.ts";

type Node = { id: number; x: number };

export function Scene(props: { nodes: Node[]; alpha: number }) {
  return <section className="scene">
    {props.nodes.map((node, index) =>
      <span
        key={index}
        className="scene-node"
        style={{
          left: bind(node.x, (value) => `${value}px`),
          transform: bind(node.x, (value) => `translateX(${value}px)`),
          opacity: bind(props.alpha, (value) => value),
        }}
      />
    )}
  </section>;
}
