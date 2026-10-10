// Static build for GitHub Pages (served from /shagun-panda-pal/).
// Usage: bunx vite build --config vite.pages.config.ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: { base: "/shagun-panda-pal/" },
  tanstackStart: {
    server: { entry: "server" },
    spa: { enabled: true },
  },
});
