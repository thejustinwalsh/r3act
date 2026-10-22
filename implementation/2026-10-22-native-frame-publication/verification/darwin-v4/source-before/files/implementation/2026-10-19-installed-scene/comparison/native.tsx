import { createDOMRoot, createStore, storeRecord, use } from "@r3act/core";
import { RadixDialog } from "@r3act/react-bridge/radix-dialog";

const state = createStore(storeRecord({ open: false }));
function Dialog() {
  const value = use(state);
  return <RadixDialog open={value.open}
    onOpenChange={(open) => state.dispatch(storeRecord({ open }))}
    title="Settings" description="Edit settings" triggerLabel="Open settings"
    closeLabel="Close settings" />;
}
createDOMRoot(document.getElementById("app")!).mount(<Dialog />);
