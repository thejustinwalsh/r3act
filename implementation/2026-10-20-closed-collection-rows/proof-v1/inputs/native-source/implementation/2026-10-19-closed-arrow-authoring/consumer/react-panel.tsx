/** @jsxImportSource react */
import { useEffect, useState } from "react";

export type DialogTrace = { mounts: number; cleanups: number };

export function ReactPanel(props: { trace: DialogTrace }) {
  const [clicks, setClicks] = useState(0);
  useEffect(() => {
    props.trace.mounts++;
    return () => { props.trace.cleanups++; };
  }, [props.trace]);
  return <div data-react-revision="react-v1">
    <label>Note <input aria-label="Dialog note" defaultValue="seed" /></label>
    <button type="button" data-dialog-local={clicks}
      onClick={() => setClicks((current) => current + 1)}>
      Local count: {clicks}
    </button>
  </div>;
}
