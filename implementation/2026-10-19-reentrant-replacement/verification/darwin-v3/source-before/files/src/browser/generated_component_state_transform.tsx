/** @jsx jsx */
/** @jsxFrag Fragment */
import { defineComponent as __uiDefineComponent, useStateAt as __uiUseStateAt, useEffectAt as __uiUseEffectAt } from "../component_state_runtime.ts";
import { jsx, Fragment } from "../jsx_binding_runtime.ts";

export const ConditionalPanel = __uiDefineComponent("compiler/fixtures/component_state_sites.tsx#component:ConditionalPanel", function ConditionalPanel({ show }: { show: boolean }) {
  let conditional = "hidden";
  let increment: JSX.Element | null = null;
  if (show) {
    const [count, setCount] = __uiUseStateAt("compiler/fixtures/component_state_sites.tsx#component:ConditionalPanel#state:0", 0);
    conditional = String(count);
    increment = <button data-action="increment" onClick={() => setCount((previous) => previous + 1)}>+</button>;
  }
  const [label] = __uiUseStateAt("compiler/fixtures/component_state_sites.tsx#component:ConditionalPanel#state:1", "tail");
  return <output>{conditional}:{label}{increment}</output>;
});

export const Counter = __uiDefineComponent("compiler/fixtures/component_state_sites.tsx#component:Counter", function Counter() {
  const [count, setCount] = __uiUseStateAt("compiler/fixtures/component_state_sites.tsx#component:Counter#state:0", 0);
  return <button data-count={count} onClick={() => setCount((previous) => previous + 1)}>{count}</button>;
});

export const BenchmarkItem = __uiDefineComponent("compiler/fixtures/component_state_sites.tsx#component:BenchmarkItem", function BenchmarkItem({ id, onRender }: { id: number; onRender: () => void }) {
  onRender();
  const [selected, setSelected] = __uiUseStateAt("compiler/fixtures/component_state_sites.tsx#component:BenchmarkItem#state:0", false);
  return <span data-id={id} data-selected={String(selected)} onClick={() => setSelected((previous) => !previous)}>{String(selected)}</span>;
});

export const KeyedRow = __uiDefineComponent("compiler/fixtures/component_state_sites.tsx#component:KeyedRow", function KeyedRow({ id }: { id: string }) {
  const [selected, setSelected] = __uiUseStateAt("compiler/fixtures/component_state_sites.tsx#component:KeyedRow#state:0", false);
  return <li data-id={id} data-selected={String(selected)} onClick={() => setSelected((previous) => !previous)}>{id}</li>;
});

export const EffectProbe = __uiDefineComponent("compiler/fixtures/component_state_sites.tsx#component:EffectProbe", function EffectProbe({
  active,
  label,
  onSetup,
  onCleanup,
  fail = false,
}: {
  active: boolean;
  label: string;
  onSetup: (label: string) => void;
  onCleanup: (label: string) => void;
  fail?: boolean;
}) {
  const [count, setCount] = __uiUseStateAt("compiler/fixtures/component_state_sites.tsx#component:EffectProbe#state:0", 0);
  if (active) {
    __uiUseEffectAt("compiler/fixtures/component_state_sites.tsx#component:EffectProbe#effect:0", () => {
      onSetup(label);
      return () => onCleanup(label);
    });
  }
  if (fail) throw new Error("effect candidate failed");
  return <button onClick={() => setCount((previous) => previous + 1)}>{count}</button>;
});
