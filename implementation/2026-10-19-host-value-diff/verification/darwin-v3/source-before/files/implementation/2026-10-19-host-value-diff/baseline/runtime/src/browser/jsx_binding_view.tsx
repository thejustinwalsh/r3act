/** @jsxRuntime classic */
/** @jsx jsx */
/** @jsxFrag Fragment */
import { bind, Fragment, jsx, type RuntimeNode, type ScalarSource } from "../jsx_binding_runtime.ts";

export function BindingParticles({ sources }: { sources: ScalarSource[] }): RuntimeNode {
  return <div className="particle-layer">
    {sources.map((source, id) =>
      <div
        key={id}
        className="particle"
        style={{
          transform: bind(source, (value) => `translate3d(${value % 320}px, 0, 0)`),
          opacity: bind(source, (value) => (value % 100) / 100),
        }}
      />
    )}
  </div>;
}
