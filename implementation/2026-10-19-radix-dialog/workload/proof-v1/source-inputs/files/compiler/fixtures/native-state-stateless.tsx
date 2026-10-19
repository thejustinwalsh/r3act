/* The words `from` and the fake specifier here are comments, not module syntax. */
import { jsx, createDOMRoot } from /* another `from` comment */ "native_runtime_api.ts";

export function App() {
  return <main data-kind="stateless">Ready</main>;
}
