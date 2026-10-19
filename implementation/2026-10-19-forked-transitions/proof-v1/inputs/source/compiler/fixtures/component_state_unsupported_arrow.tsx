import { useState } from "react";

export const ArrowCounter = () => {
  const [count] = useState(0);
  return <output>{count}</output>;
};
