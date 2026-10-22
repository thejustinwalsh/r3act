import { useState } from "react";

export function Counter(props: { initial: number }) {
  const [level, setLevel] = useState(props.initial);
  return <button key="counter" data-level={level}
    onClick={() => setLevel((previous) => previous + 1)}>level {level}</button>;
}
