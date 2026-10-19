// 😀 Source edits must stay on UTF-16 boundaries.
import { useState, useEffect, jsx, Fragment, createDOMRoot } from "native_runtime_api.ts";

export function Counter({ step }: { step: number }) {
  const [count, setCount] = useState(0);
  if (step > 0) {
    useEffect(() => {
      document.title = `Count ${count}`;
    });
  }
  return <button onClick={() => setCount((value) => value + step)}>{count}</button>;
}

export function Badge() {
  const [size] = useState(12);
  return <div style={{ fontSize: size }} />;
}
