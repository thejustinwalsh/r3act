import { useState } from "native_runtime_api.ts";

export const ArrowApp = () => {
  const [value] = useState(1);
  return <main>{value}</main>;
};
