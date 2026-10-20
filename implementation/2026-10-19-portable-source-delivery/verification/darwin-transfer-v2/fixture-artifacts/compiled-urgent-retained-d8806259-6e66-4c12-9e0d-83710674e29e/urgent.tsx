/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { Suspense, use, createStore, useState, useEffect, jsx } from "file:///private/tmp/r3act-native-transfer-v2-3kH8UO/stagedroot/src/native_runtime_api.ts";
export function deferred() {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
}
export const firstA = deferred();
export const nextA = deferred();
export const mode = createStore(0, (_state, action) => action);
export const trace = {
  controls: Object.create(null),
  activations: Object.create(null),
  cleanups: Object.create(null),
};
export function A() {
  const selected = use(mode) === 0 ? firstA.promise : nextA.promise;
  const value = use(selected);
  return <div key="a-host" data-a="primary">{value}</div>;
}
export function B(props) {
  const id = props.id;
  const [level, setLevel] = useState(1);
  useEffect(() => {
    trace.controls[id] = setLevel;
    trace.activations[id] = (trace.activations[id] || 0) + 1;
    return () => {
      trace.cleanups[id] = (trace.cleanups[id] || 0) + 1;
      if (trace.controls[id] === setLevel) delete trace.controls[id];
    };
  });
  return <output key="b-host" data-root={id} data-level={level}
    style={{ opacity: level / 10 }} />;
}
export function App(props) {
  return <section>
    <Suspense fallback={<div key="a-host">a-loading</div>}>
      <A key="a-child" />
    </Suspense>
    <B key="b-child" id={props.id} />
  </section>;
}
