# Forked async UX consumer

`native.html` and `react.html` load separate application graphs. Each page installs
`window.__forkedUX` with `selectedArm`, `mount()`, `action(name)`, `snapshot()`,
and `dispose()`. `mount()` creates the arm controller and the real `#urgent`
button. Urgent input is delivered through that button's click listener.

Actions are `beginB`, `catchUpFork`, `beginC`, `resolveA`, `resolveB`,
`resolveC`, `cancel`, and `urgent`. `action(name)` awaits the selected
controller method and returns its own result. `snapshot()` and `dispose()`
return each arm's original result shape. After disposal, provider resolution
actions can still reach the retired controller to test late settlement.

The Native app, scene, and controller are byte copies of
`examples/forked-transitions/{app.tsx,scene.tsx,main.ts}`. `main.ts` only
auto-mounts when `#app` exists; these pages use `#mount` to keep mount timing
under the collector's control. The React comparator is copied from
`implementation/2026-10-19-forked-transitions/comparison/react_arm.tsx`
with only a React JSX pragma added.
