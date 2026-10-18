import { useEffect } from "react";

export function DependencyEffect() {
  useEffect(() => {}, []);
  return <output />;
}
