import { useState } from "native_runtime_api.ts";

export async function AsyncApp() {
  const [value] = useState(1);
  return <main>{value}</main>;
}
