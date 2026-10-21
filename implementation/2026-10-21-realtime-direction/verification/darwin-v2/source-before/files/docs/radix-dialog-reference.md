# Radix Dialog bridge reference

**Status:** private alpha, 19 October 2026. The Darwin package boundary and one real headless keyboard/portal workload pass; see [results and limits](../implementation/2026-10-19-radix-dialog/results.md). The selected library is exact `@radix-ui/react-dialog@1.3.1`. Other versions/components and general React-library compatibility are unverified. See the [integration contract](../implementation/2026-10-19-radix-dialog/design.md) and [review](../implementation/2026-10-19-radix-dialog/source-review.md) for execution status.

## Import and ownership

Install the selected peer alongside the optional React bridge and compatible React/React DOM peers. Import `RadixDialog` from `@r3act/react-bridge/radix-dialog` in compiled native TSX. The default bridge entry does not import Radix. Core also exposes the same module at `@r3act/core/react/radix-dialog`; both routes share the native owner/runtime graph. Packages remain unpublished and the namespace unreserved.

`RadixDialog` is a native component backed by one real React root using Radix Dialog. `ReactRadixDialog` is the same controlled view for ordinary React modules. The native compiler treats the island as opaque; this does not give React callbacks closed dependency metadata. Radix owns portal descendants, effects and focus behavior, while native owns the private island container. Its independent React commit may follow native accepted publication.

## Props

| Prop | Type | Meaning |
| --- | --- | --- |
| `open` | `boolean` | Controlled open state. |
| `onOpenChange` | `(open:boolean)=>void` | Feed requested state changes back to the owning Store/state. |
| `title` | `string` | Radix Title used by the dialog's accessible name. |
| `description` | `string` | Radix Description used by the dialog's description. |
| `triggerLabel` | `string` | Text of the React-owned trigger button. |
| `closeLabel` | `string?` | Close button text; defaults to `Close`. |
| `children` | `ReactNode?` | Real React content; native VNodes are not React children. |
| `portalContainer` | `HTMLElement|null?` | Caller-owned portal destination; omitted/null uses Radix's default body destination. |
| `className` | `string?` | Content class. |
| `overlayClassName` | `string?` | Overlay class. |
| `style` | `CSSProperties?` | Content style. |

The bridge always uses modal Dialog with actual Trigger/Portal/Overlay/Content/Title/Description/Close parts. It intentionally exposes no `asChild`, uncontrolled `defaultOpen`, forwarded native ref, force-mounted animation or arbitrary prop bag. Create React children in a React module using its JSX pipeline or `React.createElement`; keep providers and consumers together in that island.

## Native state example

```tsx
import { createStore, use } from "@r3act/core";
import { RadixDialog } from "@r3act/react-bridge/radix-dialog";

const openStore = createStore(false);
const onOpenChange = (open: boolean) => { openStore.dispatch(open); };
export function Settings() {
  const open = use(openStore);
  return <RadixDialog open={open} onOpenChange={onOpenChange}
    title="Settings" description="Application settings" triggerLabel="Open settings" />;
}
```

Native modules require the Rust/OXC Vite compiler. Ordinary Store updates deliver props after native acceptance. Discarded/stale candidates cannot update the island. Prop updates and stable keyed moves preserve its React lifetime; removing/replacing the owner unmounts the portal as well. A caller-owned portal container may outlive the island, but its DOM must remain available while the dialog uses it. Nested payloads and React children retain caller ownership rather than becoming immutable snapshots. Replace style objects and child elements when changing them, following [React’s prop immutability rules](https://react.dev/reference/rules/components-and-hooks-must-be-pure).

React schedules focus and portal changes independently. The adapter does not supply cross-renderer visual atomicity, shared React/native context or native Suspense for internal React async rendering. Handle React render errors inside React boundaries. Modal keyboard/aria/cleanup conformance in one headless workload is narrower than accessibility certification, OS focus/IME or every assistive technology.

The [official Dialog reference](https://www.radix-ui.com/primitives/docs/components/dialog) documents the primitive concepts; that page's version label differs from the pinned installed version. The installed 1.3.1 source and this bridge contract define this integration's tested scope. See the [general bridge reference](react-bridge-reference.md) for shared commit, lifetime and packaging limits.

The finite always-modal wrapper explicitly sets aria-modal="true" on Content. The [installed consumer example](../examples/installed-scene/README.md) verifies its current Darwin package bytes, real modal keyboard behavior, form retention and cleanup; its [results](../implementation/2026-10-19-installed-scene/results.md) preserve the missing-annotation finding and all evidence limits. This is not accessibility certification or general Radix compatibility.
