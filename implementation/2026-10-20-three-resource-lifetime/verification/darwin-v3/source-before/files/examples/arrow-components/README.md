# Authored native arrow components

`app.tsx` and `scene.tsx` define native components as exported, capitalized,
module-level `const` arrows. `ArrowBadge` has an expression body; the other
components have block bodies. `main.ts` is the plain TypeScript controller for
one DOM root and one Three root sharing a World and Stores. The example uses
ordinary keyed array rows, row-local state, refs, events, a conditional
activation effect, Suspense, and coordinated Store publication.

Its queued generic stage and detail publications declare repeatable render preparation per operation because pending detail candidates can be discarded and retried. Direct local updates keep their ordinary root boundary.

The browser controller is exposed as `window.arrowComponents`. Its `snapshot`,
`click`, `reorder`, `urgent`, `publishStage`, `beginDetail`, `resolveDetail`,
`rejectDetail`, `resolveRetiredDetail`, `retireDetail`, and `dispose` methods make
the lifecycle stages inspectable. A new pending detail retains the accepted
view; a superseded provider may settle without publishing. HMR disposal
retires the controller and its pending work through the existing root and plan
revision authority. It does not preserve state selectively across a module
edit.

The arrow lowering accepts a synchronous, module-level, capitalized exported
`const` with one arrow initializer per declaration. It preserves the original
arrow value and its lexical `this` and `arguments`; unsupported expressions
still use the generic native path. Native `useEffect` is an activation
setup/cleanup site, with no dependency-array semantics.

For the repository's actual compiled execution proof, run
`node --experimental-transform-types compiler/native_arrow_components_execution_test.mjs`
from the project root after the explicit debug compiler has been built. The
fixture writes the authored, rewritten, transformed, and emitted source plus
hashes under `.cache/compiled-arrow-components-*`, checks the compiler binary
hash before and after, and exercises DOM/Three publication, stale work,
revision retirement, and balanced cleanup. This example supplies correctness
coverage; it does not establish runtime speed or platform qualification.
