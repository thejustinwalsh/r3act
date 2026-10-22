import { bind } from "../../src/jsx_binding_runtime.ts";

type Segment = { x: number; y: number };

export function SnakeScene(props: { segments: Segment[] }) {
  return <div className="snake-board">
    {props.segments.map((segment, index) =>
      <i
        key={index}
        className="snake-segment"
        style={{
          left: bind(segment.x, (value) => `${value}px`),
          top: bind(segment.y, (value) => `${value}px`),
        }}
      />
    )}
  </div>;
}
