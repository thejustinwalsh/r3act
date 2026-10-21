import { createElement, useState } from "react";
import { createRoot } from "react-dom/client";

function Counter() {
  const [count, setCount] = useState(0);
  return createElement(
    "button",
    { onClick: () => setCount((value) => value + 1) },
    `Count ${count}`,
  );
}

const container = document.querySelector("#app");
if (!container) throw new Error("Missing #app mount node");
createRoot(container).render(createElement(Counter));
