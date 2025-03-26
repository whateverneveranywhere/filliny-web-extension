import { resolve } from "node:path";
import { withPageConfig } from "@extension/vite-config";

const rootDir = resolve(import.meta.dirname);
const srcDir = resolve(rootDir, "src");

export default withPageConfig({
  resolve: {
    alias: {
      "@src": srcDir,
    },
  },
  publicDir: resolve(rootDir, "public"),
  build: {
    lib: {
      name: "ContentRuntimeScript",
      fileName: "index",
      formats: ["iife"],
      entry: resolve(srcDir, "index.ts"),
    },
    outDir: resolve(rootDir, "..", "..", "dist", "content-runtime"),
    rollupOptions: {
      // Mark shared packages as external to prevent build errors
      external: [/^@extension\/shared(\/.*)?$/],
      output: {
        // Provide global variable names for externals
        globals: {
          "@extension/shared": "ExtensionShared",
          "@extension/shared/lib/utils/helpers": "ExtensionSharedHelpers",
        },
      },
    },
  },
});
