import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ReactRadixDialog } from "@r3act/react-bridge/radix-dialog";

function Dialog() {
  const [open, setOpen] = useState(false);
  return <ReactRadixDialog open={open} onOpenChange={setOpen}
    title="Settings" description="Edit settings" triggerLabel="Open settings"
    closeLabel="Close settings" />;
}
createRoot(document.getElementById("app")!).render(<Dialog />);
