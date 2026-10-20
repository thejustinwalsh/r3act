import { mountNative } from "./native_arm.tsx";
import { installAuthoredLifecycle } from "./entry.ts";
installAuthoredLifecycle("native", mountNative);
