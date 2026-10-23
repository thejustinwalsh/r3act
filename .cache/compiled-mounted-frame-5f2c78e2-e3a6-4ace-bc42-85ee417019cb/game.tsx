/** @jsxImportSource @r3act/host-three */
// @native-ui
import { createDOMRoot, createNativeFrameLoop, createStore, storeRecord, jsx,
  use, useEffect, useState, type RuntimeNode, type StoreSource } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { createThreeNativeRoot } from "file:///Volumes/Depot/Developer/r3act/src/three_host.ts";
import { Scene, Mesh, type Object3D } from 'three';
import { Hud } from './hud.mjs';

const COUNT = 1024;
type Frame = Readonly<{ phase: number }>;
type MotionProps = { id: number; clock: StoreSource<Frame>; children?: RuntimeNode };
const controls: Array<((value: number) => void) | undefined> = [];
let activations = 0, retirements = 0;
function Motion(props: MotionProps) {
  const frame = use(props.clock);
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    activations++; controls[props.id] = setOffset;
    return () => { retirements++; controls[props.id] = undefined; };
  });
  return <group key="motion" position-x={frame.phase * .01 + offset}
    position-y={frame.phase * .005} rotation-z={frame.phase * .001}>
    {props.children}
  </group>;
}
function Game(props: { clock: StoreSource<Frame>; ids: readonly number[] }) {
  return <group key="entities" name="entities">{props.ids.map(id =>
    <group key={id} name={`entity-${id}`} position-x={(id % 32 - 15.5) * .3}
      position-y={(Math.floor(id / 32) - 15.5) * .3}>
      <Motion id={id} clock={props.clock}><mesh>
        <boxGeometry args={[.12, .12, .12]} /><meshBasicMaterial color="orange" />
      </mesh></Motion>
    </group>)}</group>;
}
const check: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

export function runGameLifecycle(hud: ReturnType<typeof createDOMRoot>, readHud: () => number,
  render?: (scene: Scene) => unknown) {
  const clock = createStore<Frame>(storeRecord({ phase: 0 })), ticks = createStore(0);
  const scene = new Scene(), game = createThreeNativeRoot(scene, {
    rootOptions: { rootId: 'mounted-game-companion', scheduleCommit() {} },
  });
  let ids: readonly number[] = Object.freeze(Array.from({ length: COUNT }, (_, id) => id));
  const tree = () => <Game clock={clock} ids={ids} />;
  const resources = new Set<object>(), disposed = new Set<object>();
  let disposalEvents = 0, phase = 0, draws = 0, coherentDraws = 0;
  const offsets = new Map<number, number>();
  const refs = new Map<number, readonly object[]>();
  const object = (id: number) => scene.getObjectByName(`entity-${id}`)!;
  const capture = (id: number) => {
    const outer = object(id), motion = outer.children[0], mesh = motion.children[0] as Mesh;
    check(mesh instanceof Mesh && !Array.isArray(mesh.material), 'mesh resource shape');
    const ref = [outer, motion, mesh, mesh.geometry, mesh.material] as const;
    for (const resource of [mesh.geometry, mesh.material]) if (!resources.has(resource)) {
      resources.add(resource);
      resource.addEventListener('dispose', () => { disposalEvents++; disposed.add(resource); });
    }
    return ref;
  };
  const verify = () => {
    check(scene.getObjectByName('entities')!.children.length === ids.length, 'membership');
    for (const id of ids) {
      const actual = capture(id), previous = refs.get(id);
      if (previous) check(actual.every((entry, index) => entry === previous[index]), `identity ${id}`);
      const motion = actual[1] as Object3D;
      check(Math.abs(motion.position.x - (phase * .01 + (offsets.get(id) ?? 0))) < 1e-10,
        `position ${id}`);
      check(Math.abs(motion.position.y - phase * .005) < 1e-10, `position-y ${id}`);
      check(Math.abs(motion.rotation.z - phase * .001) < 1e-10, `rotation ${id}`);
      refs.set(id, actual);
    }
  };
  const loop = createNativeFrameLoop({ roots: [{ root: game.root, stores: [clock] }],
    update() { clock.dispatch(() => storeRecord({ phase })); }, draw() { draws++; } });
  let coherent: ReturnType<typeof createNativeFrameLoop> | undefined;
  try {
    hud.mount(jsx(Hud, { ticks })); game.root.mount(tree()); verify();
    check(controls.filter(Boolean).length === COUNT, 'all controls mounted');
    const saved = game.root.snapshot, savedBytes = JSON.stringify(saved);
    for (const id of [0, 127, 1023]) { offsets.set(id, id + .5); controls[id]!(id + .5); }
    check(game.root.flush(), 'sparse local publication'); verify();
    for (const id of [0, 127, 1023]) { offsets.set(id, 0); controls[id]!(0); }
    check(game.root.flush(), 'sparse reset');
    for (phase = 1; phase <= 12; phase++) {
      check(loop.advance(phase * 16).status === 'drawn', 'shared clock publication'); verify();
      if (phase % 4 === 0) { ticks.dispatch(phase); check(hud.flush(), 'independent HUD'); }
      check(readHud() === Math.floor(phase / 4) * 4, 'independent DOM cadence');
    }
    phase = 12;
    const removed = [1, 512, 1022], retiredRefs = removed.map(id => refs.get(id)!);
    ids = Object.freeze(ids.filter(id => !removed.includes(id)));
    game.root.render(tree()); verify();
    check(disposed.size === 6 && retirements === 3, 'removed resources/effects retired');
    ids = Object.freeze([...ids].reverse()); game.root.render(tree()); verify();
    for (const id of removed) { refs.delete(id); offsets.set(id, 0); }
    ids = Object.freeze([...ids, ...removed]); game.root.render(tree()); verify();
    removed.forEach((id, index) => check(refs.get(id)![0] !== retiredRefs[index][0], 'new incarnation'));
    check(controls.filter(Boolean).length === COUNT, 'controls after reinsert');
    coherent = createNativeFrameLoop({ roots: [
      { root: game.root, stores: [clock] }, { root: hud, stores: [ticks] },
    ], update() { clock.dispatch(() => storeRecord({ phase })); ticks.dispatch(phase); },
    draw() { verify(); check(readHud() === phase, 'coherent DOM/Three cut'); coherentDraws++; } });
    phase = 20;
    check(coherent.advance(400).status === 'drawn', 'coherent group publication');
    check(JSON.stringify(saved) === savedBytes, 'old accepted snapshot changed');
    const rendering = render?.(scene);
    check(draws === 12 && coherentDraws === 1, 'draw counts');
    coherent.dispose(); loop.dispose(); game.dispose(); hud.dispose();
    check(scene.children.length === 0, 'scene cleanup');
    check(controls.filter(Boolean).length === 0 && activations === retirements, 'effect cleanup');
    check(resources.size === 2054 && disposed.size === resources.size && disposalEvents === resources.size,
      'exact resource disposal');
    return { status: 'PASS', owners: COUNT, sparseOwners: 3, sharedFrames: draws,
      coherentFrames: coherentDraws, independentHudCommits: 3, structuralEdits: 3,
      resources: resources.size, disposals: disposalEvents, activations, retirements,
      oldSnapshotImmutable: true, rendering };
  } finally { coherent?.dispose(); loop.dispose(); game.dispose(); hud.dispose(); }
}
