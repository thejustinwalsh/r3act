/** @jsxImportSource @r3act/core */
// @native-ui
import { useState } from "@r3act/core";
import { createDOMRoot } from "@r3act/host-dom";

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

createDOMRoot(document.getElementById("app")!).mount(<Counter />);
