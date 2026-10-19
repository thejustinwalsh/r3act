import { verifyCompiledReactBridgeSource } from "./compiled_react_bridge_source_helpers.mjs";

await verifyCompiledReactBridgeSource({
  fixture: "compiler/fixtures/native-react-island.tsx", appName: "NativeIslandApp",
  components: ["NativeIslandApp", "PendingGate"], bridgeImport: "@r3act/react-bridge",
  bridgeSymbol: "createNativeReactRootAdapter", adapterTarget: "ReactLeaf", storeSites: [0],
});
