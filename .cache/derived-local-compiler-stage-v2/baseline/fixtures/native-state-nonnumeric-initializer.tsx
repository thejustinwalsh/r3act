import { useState } from "native_runtime_api.ts";

const Infinity = "not actually numeric";

export function MisleadingInitializer() {
  const [value] = useState(Infinity);
  return <div data-value={value} />;
}
