import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // Inline the workspace package (published as TypeScript source) so the deploy
  // artifact is self-contained; third-party dependencies stay external.
  noExternal: ["@beyond-social/env"],
});
