/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, use, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
export const clock = createStore(storeRecord({ phase: 0 }));
export const control = createStore(storeRecord({ ids: ["a", "b", "c"] }));
export function Motion(props) {
  const frame = use(props.clock);
  return <group key="motion" position-x={frame.phase * 2}>{props.children}</group>;
}
export function Alternate(props) {
  const frame = use(props.clock);
  return <group key="motion" position-x={frame.phase * 3}>{props.children}</group>;
}
export function Marker(props) {
  const frame = use(props.clock);
  return <group key="frame-marker" name="accepted-frame" position-x={frame.phase} />;
}
export function Scene(props) {
  const state = use(props.control);
  return <group key="scene">
    <Marker key="marker-owner" clock={props.clock} />
    {state.ids.map(id => <section key={"slot-" + id} name={"slot-" + id}>
      {id === "b" || id === "d"
        ? <Alternate key={"owner-" + id} clock={props.clock}>
            <mesh key={"child-" + id} name={"retained-" + id} />
          </Alternate>
        : <Motion key={"owner-" + id} clock={props.clock}>
            <mesh key={"child-" + id} name={"retained-" + id} />
          </Motion>}
    </section>)}
  </group>;
}