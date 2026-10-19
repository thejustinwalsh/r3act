import { verifyCompiledReactBridgeSource } from "./compiled_react_bridge_source_helpers.mjs";

await verifyCompiledReactBridgeSource({
  fixture: "compiler/fixtures/native-radix-dialog.tsx", appName: "NativeRadixApp",
  components: ["NativeRadixApp", "PendingGate"], bridgeImport: "@r3act/react-bridge/radix-dialog",
  bridgeSymbol: "RadixDialog", storeSites: [0, 1],
});
