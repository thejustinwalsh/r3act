import { bind } from "../../src/jsx_binding_runtime.ts";

type Node = { id: number; x: number };

export function Scene(props: { nodes: Node[] }) {
  const localTheme = { alpha: 0.5 };
  return <section>
    {props.nodes.map((node, index) =>
      <span key={index} style={{ opacity: bind(localTheme.alpha, (value) => value) }} />
    )}
  </section>;
}
