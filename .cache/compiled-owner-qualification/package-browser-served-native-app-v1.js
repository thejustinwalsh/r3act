const _jsxDEV = __vite__cjsImport1_react_jsxDevRuntime["jsxDEV"];import { createStore, use, useEffect, useState } from "/node_modules/.vite/deps/@compiled-ui_runtime.js?v=2294894e";
var _jsxFileName = "/Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/.cache/compiled-owner-rows-package-v1/browser-consumer/src/native_app.tsx";
import __vite__cjsImport1_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=335e684a";
export const buildToken = "v1";
export const labelStore = createStore("ready");
export const lifecycle = {
	activeEffects: 0,
	setups: 0,
	cleanups: 0
};
export function NativePanel({ label }) {
	const [count, setCount] = useState(0);
	const storeValue = use(labelStore);
	useEffect(() => {
		lifecycle.activeEffects++;
		lifecycle.setups++;
		return () => {
			lifecycle.activeEffects--;
			lifecycle.cleanups++;
		};
	});
	return /* @__PURE__ */ _jsxDEV("button", {
		"data-native-panel": label,
		onClick: () => setCount((value) => value + 1),
		children: [
			buildToken,
			":",
			label,
			":",
			storeValue,
			":",
			count
		]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 18,
		columnNumber: 10
	}, this);
}

//# sourceMappingURL=data:application/json;base64,eyJtYXBwaW5ncyI6IkFBQUEsU0FBUyxhQUFhLEtBQUssV0FBVyxnQkFBZ0I7OztBQUV0RCxPQUFPLE1BQU0sYUFBYTtBQUMxQixPQUFPLE1BQU0sYUFBYSxZQUFZLE9BQU87QUFDN0MsT0FBTyxNQUFNLFlBQVk7Q0FBRSxlQUFlO0NBQUcsUUFBUTtDQUFHLFVBQVU7QUFBRTtBQUVwRSxPQUFPLFNBQVMsWUFBWSxFQUFFLFNBQTRCO0NBQ3hELE1BQU0sQ0FBQyxPQUFPLFlBQVksU0FBUyxDQUFDO0NBQ3BDLE1BQU0sYUFBYSxJQUFJLFVBQVU7Q0FDakMsZ0JBQWdCO0VBQ2QsVUFBVTtFQUNWLFVBQVU7RUFDVixhQUFhO0dBQ1gsVUFBVTtHQUNWLFVBQVU7RUFDWjtDQUNGLENBQUM7Q0FDRCxPQUFPLHdCQUFDLFVBQUQ7RUFBUSxxQkFBbUI7RUFBTyxlQUFlLFVBQVUsVUFBVSxRQUFRLENBQUM7WUFBOUU7R0FBa0Y7R0FBVztHQUFFO0dBQU07R0FBRTtHQUFXO0dBQUU7RUFBYzs7Ozs7O0FBQzNJIiwibmFtZXMiOltdLCJzb3VyY2VzIjpbIm5hdGl2ZV9hcHAudHN4Il0sInZlcnNpb24iOjMsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZVN0b3JlLCB1c2UsIHVzZUVmZmVjdCwgdXNlU3RhdGUgfSBmcm9tIFwiQGNvbXBpbGVkLXVpL3J1bnRpbWVcIjtcblxuZXhwb3J0IGNvbnN0IGJ1aWxkVG9rZW4gPSBcInYxXCI7XG5leHBvcnQgY29uc3QgbGFiZWxTdG9yZSA9IGNyZWF0ZVN0b3JlKFwicmVhZHlcIik7XG5leHBvcnQgY29uc3QgbGlmZWN5Y2xlID0geyBhY3RpdmVFZmZlY3RzOiAwLCBzZXR1cHM6IDAsIGNsZWFudXBzOiAwIH07XG5cbmV4cG9ydCBmdW5jdGlvbiBOYXRpdmVQYW5lbCh7IGxhYmVsIH06IHsgbGFiZWw6IHN0cmluZyB9KSB7XG4gIGNvbnN0IFtjb3VudCwgc2V0Q291bnRdID0gdXNlU3RhdGUoMCk7XG4gIGNvbnN0IHN0b3JlVmFsdWUgPSB1c2UobGFiZWxTdG9yZSk7XG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgbGlmZWN5Y2xlLmFjdGl2ZUVmZmVjdHMrKztcbiAgICBsaWZlY3ljbGUuc2V0dXBzKys7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGxpZmVjeWNsZS5hY3RpdmVFZmZlY3RzLS07XG4gICAgICBsaWZlY3ljbGUuY2xlYW51cHMrKztcbiAgICB9O1xuICB9KTtcbiAgcmV0dXJuIDxidXR0b24gZGF0YS1uYXRpdmUtcGFuZWw9e2xhYmVsfSBvbkNsaWNrPXsoKSA9PiBzZXRDb3VudCgodmFsdWUpID0+IHZhbHVlICsgMSl9PntidWlsZFRva2VufTp7bGFiZWx9OntzdG9yZVZhbHVlfTp7Y291bnR9PC9idXR0b24+O1xufVxuIl19