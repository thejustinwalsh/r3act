/** @jsxImportSource react */
import { useState } from "react";
import { createRoot } from "react-dom/client";

function Readout(props: { count: number }) {
  return <output data-count={props.count}>{props.count}</output>;
}

function Counter() {
  const [count, setCount] = useState(0);
  return <main data-count={count}>
    <h1>Installed counter</h1>
    <button type="button" onClick={() => setCount(count + 1)}>Increment</button>
    <Readout count={count} />
  </main>;
}

createRoot(document.getElementById("app")!).render(<Counter />);
