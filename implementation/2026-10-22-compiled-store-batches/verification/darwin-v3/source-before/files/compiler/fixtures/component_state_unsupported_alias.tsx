import { useState as use } from "react";

export function AliasCounter() {
  const [count] = use(0);
  return <output>{count}</output>;
}
