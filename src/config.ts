import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-quick-draw-duel",
  displayName: "Quick Draw",
  visualProfile: "play",
  shellLayout: "inset",
  description:
    "A focused shared sketch sprint: draw a mark, finish honestly, and see the live order together.",
  accentHex: "#e7b851",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
