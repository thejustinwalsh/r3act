import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/react-panel.tsx");const useEffect = __vite__cjsImport0_react["useEffect"]; const useState = __vite__cjsImport0_react["useState"];const _jsxDEV = __vite__cjsImport1_react_jsxDevRuntime["jsxDEV"];/** @jsxImportSource react */
import __vite__cjsImport0_react from "/node_modules/.vite/deps/react.js?v=c6eb636d";
var _jsxFileName = "/private/var/folders/6p/79mr8_4n34d9_2m75n54r1qc0000gn/T/r3act-installed-hmr-himF6l/react-panel.tsx";
import __vite__cjsImport1_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=c6eb636d";
var _s = $RefreshSig$();
export function ReactPanel(props) {
	_s();
	const [clicks, setClicks] = useState(0);
	useEffect(() => {
		props.trace.mounts++;
		return () => {
			props.trace.cleanups++;
		};
	}, [props.trace]);
	return /* @__PURE__ */ _jsxDEV("div", {
		"data-react-revision": "react-v1",
		children: [/* @__PURE__ */ _jsxDEV("label", { children: ["Note ", /* @__PURE__ */ _jsxDEV("input", {
			"aria-label": "Dialog note",
			defaultValue: "seed"
		}, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 13,
			columnNumber: 17
		}, this)] }, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 13,
			columnNumber: 5
		}, this), /* @__PURE__ */ _jsxDEV("button", {
			type: "button",
			"data-dialog-local": clicks,
			onClick: () => setClicks((current) => current + 1),
			children: ["Local count: ", clicks]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 14,
			columnNumber: 5
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 12,
		columnNumber: 10
	}, this);
}
_s(ReactPanel, "3VY7VyQhW/20sHTxz7Bgz8AnmBY=");
_c = ReactPanel;
var _c;
$RefreshReg$(_c, "ReactPanel");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
import * as __vite_react_currentExports from "/react-panel.tsx";
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }

  const currentExports = __vite_react_currentExports;
  queueMicrotask(() => {
    RefreshRuntime.registerExportsForReactRefresh("/private/var/folders/6p/79mr8_4n34d9_2m75n54r1qc0000gn/T/r3act-installed-hmr-himF6l/react-panel.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/private/var/folders/6p/79mr8_4n34d9_2m75n54r1qc0000gn/T/r3act-installed-hmr-himF6l/react-panel.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) { return RefreshRuntime.register(type, "/private/var/folders/6p/79mr8_4n34d9_2m75n54r1qc0000gn/T/r3act-installed-hmr-himF6l/react-panel.tsx" + ' ' + id); }
function $RefreshSig$() { return RefreshRuntime.createSignatureFunctionForTransform(); }

//# sourceMappingURL=data:application/json;base64,eyJtYXBwaW5ncyI6IjtBQUNBLFNBQVMsV0FBVyxnQkFBZ0I7Ozs7QUFJcEMsT0FBTyxTQUFTLFdBQVcsT0FBK0I7O0NBQ3hELE1BQU0sQ0FBQyxRQUFRLGFBQWEsU0FBUyxDQUFDO0NBQ3RDLGdCQUFnQjtFQUNkLE1BQU0sTUFBTTtFQUNaLGFBQWE7R0FBRSxNQUFNLE1BQU07RUFBWTtDQUN6QyxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUM7Q0FDaEIsT0FBTyx3QkFBQyxPQUFEO0VBQUssdUJBQW9CO1lBQXpCLENBQ0wsd0JBQUMsU0FBRCxhQUFPLFNBQUssd0JBQUMsU0FBRDtHQUFPLGNBQVc7R0FBYyxjQUFhO0VBQVE7Ozs7VUFBUTs7OztZQUN6RSx3QkFBQyxVQUFEO0dBQVEsTUFBSztHQUFTLHFCQUFtQjtHQUN2QyxlQUFlLFdBQVcsWUFBWSxVQUFVLENBQUM7YUFEbkQsQ0FDc0QsaUJBQ3RDLE1BQ1I7Ozs7O1VBQ0w7Ozs7OztBQUNQIiwibmFtZXMiOltdLCJzb3VyY2VzIjpbInJlYWN0LXBhbmVsLnRzeCJdLCJ2ZXJzaW9uIjozLCJzb3VyY2VzQ29udGVudCI6WyIvKiogQGpzeEltcG9ydFNvdXJjZSByZWFjdCAqL1xuaW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xuXG5leHBvcnQgdHlwZSBEaWFsb2dUcmFjZSA9IHsgbW91bnRzOiBudW1iZXI7IGNsZWFudXBzOiBudW1iZXIgfTtcblxuZXhwb3J0IGZ1bmN0aW9uIFJlYWN0UGFuZWwocHJvcHM6IHsgdHJhY2U6IERpYWxvZ1RyYWNlIH0pIHtcbiAgY29uc3QgW2NsaWNrcywgc2V0Q2xpY2tzXSA9IHVzZVN0YXRlKDApO1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHByb3BzLnRyYWNlLm1vdW50cysrO1xuICAgIHJldHVybiAoKSA9PiB7IHByb3BzLnRyYWNlLmNsZWFudXBzKys7IH07XG4gIH0sIFtwcm9wcy50cmFjZV0pO1xuICByZXR1cm4gPGRpdiBkYXRhLXJlYWN0LXJldmlzaW9uPVwicmVhY3QtdjFcIj5cbiAgICA8bGFiZWw+Tm90ZSA8aW5wdXQgYXJpYS1sYWJlbD1cIkRpYWxvZyBub3RlXCIgZGVmYXVsdFZhbHVlPVwic2VlZFwiIC8+PC9sYWJlbD5cbiAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLWRpYWxvZy1sb2NhbD17Y2xpY2tzfVxuICAgICAgb25DbGljaz17KCkgPT4gc2V0Q2xpY2tzKChjdXJyZW50KSA9PiBjdXJyZW50ICsgMSl9PlxuICAgICAgTG9jYWwgY291bnQ6IHtjbGlja3N9XG4gICAgPC9idXR0b24+XG4gIDwvZGl2Pjtcbn1cbiJdfQ==