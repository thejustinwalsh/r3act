import { mountReact } from "./react_arm.tsx";
import { installAuthoredLifecycle } from "./entry.ts";
installAuthoredLifecycle("react", mountReact);
