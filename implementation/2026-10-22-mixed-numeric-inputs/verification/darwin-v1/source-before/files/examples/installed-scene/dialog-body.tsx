import { createElement, useEffect, useState } from "react";

export type DialogTrace = { mounts: number; cleanups: number };

export function DialogBody(props: { trace: DialogTrace }) {
  const [clicks, setClicks] = useState(0);
  useEffect(() => {
    props.trace.mounts++;
    return () => { props.trace.cleanups++; };
  }, [props.trace]);
  return createElement("div", { "data-dialog-body": "true" },
    createElement("label", null, "Note ", createElement("input", {
      "aria-label": "Dialog note", defaultValue: "seed",
    })),
    createElement("button", { type: "button", "data-dialog-local": clicks,
      onClick: () => setClicks((current) => current + 1),
    }, `Local count: ${clicks}`));
}
