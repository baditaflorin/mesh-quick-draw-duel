import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-quick-draw-duel",
  description:
    "A browser-local two-peer drawing race with a shared timer and accessible fallback controls.",
  accentHex: "#71c9ce",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
