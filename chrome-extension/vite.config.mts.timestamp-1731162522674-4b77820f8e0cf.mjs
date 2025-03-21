// vite.config.mts
import { resolve as resolve2 } from "node:path";
import { defineConfig } from "file:///Users/avabagherzadeh/Desktop/projects/personal/filliny-web-extension/node_modules/.pnpm/vite@5.4.9_@types+node@20.16.10_sass@1.79.4_terser@5.34.1/node_modules/vite/dist/node/index.js";
import libAssetsPlugin from "file:///Users/avabagherzadeh/Desktop/projects/personal/filliny-web-extension/node_modules/.pnpm/@laynezh+vite-plugin-lib-assets@0.5.24_vite@5.4.9_@types+node@22.7.4_sass@1.79.4_terser@5.34.1_/node_modules/@laynezh/vite-plugin-lib-assets/dist/index.js";

// utils/plugins/make-manifest-plugin.ts
import fs from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
import {
  colorLog,
  ManifestParser,
} from "file:///Users/avabagherzadeh/Desktop/projects/personal/filliny-web-extension/packages/dev-utils/dist/index.js";
var __vite_injected_original_dirname =
  "/Users/avabagherzadeh/Desktop/projects/personal/filliny-web-extension/chrome-extension/utils/plugins";
var rootDir = resolve(__vite_injected_original_dirname, "..", "..");
var manifestFile = resolve(rootDir, "manifest.js");
var getManifestWithCacheBurst = () => {
  const withCacheBurst = path => `${path}?${Date.now().toString()}`;
  if (process.platform === "win32") {
    return import(withCacheBurst(pathToFileURL(manifestFile).href));
  }
  return import(withCacheBurst(manifestFile));
};
function makeManifestPlugin(config) {
  function makeManifest(manifest, to) {
    if (!fs.existsSync(to)) {
      fs.mkdirSync(to);
    }
    const manifestPath = resolve(to, "manifest.json");
    const isFirefox = process.env.__FIREFOX__ === "true";
    fs.writeFileSync(manifestPath, ManifestParser.convertManifestToString(manifest, isFirefox ? "firefox" : "chrome"));
    colorLog(`Manifest file copy complete: ${manifestPath}`, "success");
  }
  return {
    name: "make-manifest",
    buildStart() {
      this.addWatchFile(manifestFile);
    },
    async writeBundle() {
      const outDir2 = config.outDir;
      const manifest = await getManifestWithCacheBurst();
      makeManifest(manifest.default, outDir2);
    },
  };
}

// vite.config.mts
import {
  watchPublicPlugin,
  watchRebuildPlugin,
} from "file:///Users/avabagherzadeh/Desktop/projects/personal/filliny-web-extension/packages/hmr/dist/index.js";
import {
  isDev,
  isProduction,
  watchOption,
} from "file:///Users/avabagherzadeh/Desktop/projects/personal/filliny-web-extension/packages/vite-config/index.mjs";
var __vite_injected_original_dirname2 =
  "/Users/avabagherzadeh/Desktop/projects/personal/filliny-web-extension/chrome-extension";
var rootDir2 = resolve2(__vite_injected_original_dirname2);
var srcDir = resolve2(rootDir2, "src");
var outDir = resolve2(rootDir2, "..", "dist");
var vite_config_default = defineConfig({
  resolve: {
    alias: {
      "@root": rootDir2,
      "@src": srcDir,
      "@assets": resolve2(srcDir, "assets"),
    },
  },
  plugins: [
    libAssetsPlugin({
      outputPath: outDir,
    }),
    watchPublicPlugin(),
    makeManifestPlugin({ outDir }),
    isDev && watchRebuildPlugin({ reload: true }),
  ],
  publicDir: resolve2(rootDir2, "public"),
  build: {
    lib: {
      formats: ["iife"],
      entry: resolve2(__vite_injected_original_dirname2, "src/background/index.ts"),
      name: "BackgroundScript",
      fileName: "background",
    },
    outDir,
    emptyOutDir: false,
    sourcemap: isDev,
    minify: isProduction,
    reportCompressedSize: isProduction,
    watch: watchOption,
    rollupOptions: {
      external: ["chrome"],
    },
  },
  envDir: "../",
});
export { vite_config_default as default };
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubXRzIiwgInV0aWxzL3BsdWdpbnMvbWFrZS1tYW5pZmVzdC1wbHVnaW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYXZhYmFnaGVyemFkZWgvRGVza3RvcC9wcm9qZWN0cy9wZXJzb25hbC9maWxsaW55LXdlYi1leHRlbnNpb24vY2hyb21lLWV4dGVuc2lvblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2F2YWJhZ2hlcnphZGVoL0Rlc2t0b3AvcHJvamVjdHMvcGVyc29uYWwvZmlsbGlueS13ZWItZXh0ZW5zaW9uL2Nocm9tZS1leHRlbnNpb24vdml0ZS5jb25maWcubXRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9hdmFiYWdoZXJ6YWRlaC9EZXNrdG9wL3Byb2plY3RzL3BlcnNvbmFsL2ZpbGxpbnktd2ViLWV4dGVuc2lvbi9jaHJvbWUtZXh0ZW5zaW9uL3ZpdGUuY29uZmlnLm10c1wiO2ltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnLCB0eXBlIFBsdWdpbk9wdGlvbiB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgbGliQXNzZXRzUGx1Z2luIGZyb20gJ0BsYXluZXpoL3ZpdGUtcGx1Z2luLWxpYi1hc3NldHMnO1xuaW1wb3J0IG1ha2VNYW5pZmVzdFBsdWdpbiBmcm9tICcuL3V0aWxzL3BsdWdpbnMvbWFrZS1tYW5pZmVzdC1wbHVnaW4nO1xuaW1wb3J0IHsgd2F0Y2hQdWJsaWNQbHVnaW4sIHdhdGNoUmVidWlsZFBsdWdpbiB9IGZyb20gJ0BleHRlbnNpb24vaG1yJztcbmltcG9ydCB7IGlzRGV2LCBpc1Byb2R1Y3Rpb24sIHdhdGNoT3B0aW9uIH0gZnJvbSAnQGV4dGVuc2lvbi92aXRlLWNvbmZpZyc7XG5cbmNvbnN0IHJvb3REaXIgPSByZXNvbHZlKF9fZGlybmFtZSk7XG5jb25zdCBzcmNEaXIgPSByZXNvbHZlKHJvb3REaXIsICdzcmMnKTtcblxuY29uc3Qgb3V0RGlyID0gcmVzb2x2ZShyb290RGlyLCAnLi4nLCAnZGlzdCcpO1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQHJvb3QnOiByb290RGlyLFxuICAgICAgJ0BzcmMnOiBzcmNEaXIsXG4gICAgICAnQGFzc2V0cyc6IHJlc29sdmUoc3JjRGlyLCAnYXNzZXRzJyksXG4gICAgfSxcbiAgfSxcbiAgcGx1Z2luczogW1xuICAgIGxpYkFzc2V0c1BsdWdpbih7XG4gICAgICBvdXRwdXRQYXRoOiBvdXREaXIsXG4gICAgfSkgYXMgUGx1Z2luT3B0aW9uLFxuICAgIHdhdGNoUHVibGljUGx1Z2luKCksXG4gICAgbWFrZU1hbmlmZXN0UGx1Z2luKHsgb3V0RGlyIH0pLFxuICAgIGlzRGV2ICYmIHdhdGNoUmVidWlsZFBsdWdpbih7IHJlbG9hZDogdHJ1ZSB9KSxcbiAgXSxcbiAgcHVibGljRGlyOiByZXNvbHZlKHJvb3REaXIsICdwdWJsaWMnKSxcbiAgYnVpbGQ6IHtcbiAgICBsaWI6IHtcbiAgICAgIGZvcm1hdHM6IFsnaWlmZSddLFxuICAgICAgZW50cnk6IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2JhY2tncm91bmQvaW5kZXgudHMnKSxcbiAgICAgIG5hbWU6ICdCYWNrZ3JvdW5kU2NyaXB0JyxcbiAgICAgIGZpbGVOYW1lOiAnYmFja2dyb3VuZCcsXG4gICAgfSxcbiAgICBvdXREaXIsXG4gICAgZW1wdHlPdXREaXI6IGZhbHNlLFxuICAgIHNvdXJjZW1hcDogaXNEZXYsXG4gICAgbWluaWZ5OiBpc1Byb2R1Y3Rpb24sXG4gICAgcmVwb3J0Q29tcHJlc3NlZFNpemU6IGlzUHJvZHVjdGlvbixcbiAgICB3YXRjaDogd2F0Y2hPcHRpb24sXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgZXh0ZXJuYWw6IFsnY2hyb21lJ10sXG4gICAgfSxcbiAgfSxcbiAgZW52RGlyOiAnLi4vJyxcbn0pO1xuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYXZhYmFnaGVyemFkZWgvRGVza3RvcC9wcm9qZWN0cy9wZXJzb25hbC9maWxsaW55LXdlYi1leHRlbnNpb24vY2hyb21lLWV4dGVuc2lvbi91dGlscy9wbHVnaW5zXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvYXZhYmFnaGVyemFkZWgvRGVza3RvcC9wcm9qZWN0cy9wZXJzb25hbC9maWxsaW55LXdlYi1leHRlbnNpb24vY2hyb21lLWV4dGVuc2lvbi91dGlscy9wbHVnaW5zL21ha2UtbWFuaWZlc3QtcGx1Z2luLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9hdmFiYWdoZXJ6YWRlaC9EZXNrdG9wL3Byb2plY3RzL3BlcnNvbmFsL2ZpbGxpbnktd2ViLWV4dGVuc2lvbi9jaHJvbWUtZXh0ZW5zaW9uL3V0aWxzL3BsdWdpbnMvbWFrZS1tYW5pZmVzdC1wbHVnaW4udHNcIjtpbXBvcnQgZnMgZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IHBhdGhUb0ZpbGVVUkwgfSBmcm9tICdub2RlOnVybCc7XG5pbXBvcnQgcHJvY2VzcyBmcm9tICdub2RlOnByb2Nlc3MnO1xuaW1wb3J0IHsgY29sb3JMb2csIE1hbmlmZXN0UGFyc2VyIH0gZnJvbSAnQGV4dGVuc2lvbi9kZXYtdXRpbHMnO1xuaW1wb3J0IHR5cGUgeyBQbHVnaW5PcHRpb24gfSBmcm9tICd2aXRlJztcblxuY29uc3Qgcm9vdERpciA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAnLi4nKTtcbmNvbnN0IG1hbmlmZXN0RmlsZSA9IHJlc29sdmUocm9vdERpciwgJ21hbmlmZXN0LmpzJyk7XG5cbmNvbnN0IGdldE1hbmlmZXN0V2l0aENhY2hlQnVyc3QgPSAoKTogUHJvbWlzZTx7IGRlZmF1bHQ6IGNocm9tZS5ydW50aW1lLk1hbmlmZXN0VjMgfT4gPT4ge1xuICBjb25zdCB3aXRoQ2FjaGVCdXJzdCA9IChwYXRoOiBzdHJpbmcpID0+IGAke3BhdGh9PyR7RGF0ZS5ub3coKS50b1N0cmluZygpfWA7XG4gIC8qKlxuICAgKiBJbiBXaW5kb3dzLCBpbXBvcnQoKSBkb2Vzbid0IHdvcmsgd2l0aG91dCBmaWxlOi8vIHByb3RvY29sLlxuICAgKiBTbywgd2UgbmVlZCB0byBjb252ZXJ0IHBhdGggdG8gZmlsZTovLyBwcm90b2NvbC4gKHVybC5wYXRoVG9GaWxlVVJMKVxuICAgKi9cbiAgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgICByZXR1cm4gaW1wb3J0KHdpdGhDYWNoZUJ1cnN0KHBhdGhUb0ZpbGVVUkwobWFuaWZlc3RGaWxlKS5ocmVmKSk7XG4gIH1cblxuICByZXR1cm4gaW1wb3J0KHdpdGhDYWNoZUJ1cnN0KG1hbmlmZXN0RmlsZSkpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gbWFrZU1hbmlmZXN0UGx1Z2luKGNvbmZpZzogeyBvdXREaXI6IHN0cmluZyB9KTogUGx1Z2luT3B0aW9uIHtcbiAgZnVuY3Rpb24gbWFrZU1hbmlmZXN0KG1hbmlmZXN0OiBjaHJvbWUucnVudGltZS5NYW5pZmVzdFYzLCB0bzogc3RyaW5nKSB7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKHRvKSkge1xuICAgICAgZnMubWtkaXJTeW5jKHRvKTtcbiAgICB9XG4gICAgY29uc3QgbWFuaWZlc3RQYXRoID0gcmVzb2x2ZSh0bywgJ21hbmlmZXN0Lmpzb24nKTtcblxuICAgIGNvbnN0IGlzRmlyZWZveCA9IHByb2Nlc3MuZW52Ll9fRklSRUZPWF9fID09PSAndHJ1ZSc7XG4gICAgZnMud3JpdGVGaWxlU3luYyhtYW5pZmVzdFBhdGgsIE1hbmlmZXN0UGFyc2VyLmNvbnZlcnRNYW5pZmVzdFRvU3RyaW5nKG1hbmlmZXN0LCBpc0ZpcmVmb3ggPyAnZmlyZWZveCcgOiAnY2hyb21lJykpO1xuXG4gICAgY29sb3JMb2coYE1hbmlmZXN0IGZpbGUgY29weSBjb21wbGV0ZTogJHttYW5pZmVzdFBhdGh9YCwgJ3N1Y2Nlc3MnKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgbmFtZTogJ21ha2UtbWFuaWZlc3QnLFxuICAgIGJ1aWxkU3RhcnQoKSB7XG4gICAgICB0aGlzLmFkZFdhdGNoRmlsZShtYW5pZmVzdEZpbGUpO1xuICAgIH0sXG4gICAgYXN5bmMgd3JpdGVCdW5kbGUoKSB7XG4gICAgICBjb25zdCBvdXREaXIgPSBjb25maWcub3V0RGlyO1xuICAgICAgY29uc3QgbWFuaWZlc3QgPSBhd2FpdCBnZXRNYW5pZmVzdFdpdGhDYWNoZUJ1cnN0KCk7XG4gICAgICBtYWtlTWFuaWZlc3QobWFuaWZlc3QuZGVmYXVsdCwgb3V0RGlyKTtcbiAgICB9LFxuICB9O1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFzYixTQUFTLFdBQUFBLGdCQUFlO0FBQzljLFNBQVMsb0JBQXVDO0FBQ2hELE9BQU8scUJBQXFCOzs7QUNGb2QsT0FBTyxRQUFRO0FBQy9mLFNBQVMsZUFBZTtBQUN4QixTQUFTLHFCQUFxQjtBQUM5QixPQUFPLGFBQWE7QUFDcEIsU0FBUyxVQUFVLHNCQUFzQjtBQUp6QyxJQUFNLG1DQUFtQztBQU96QyxJQUFNLFVBQVUsUUFBUSxrQ0FBVyxNQUFNLElBQUk7QUFDN0MsSUFBTSxlQUFlLFFBQVEsU0FBUyxhQUFhO0FBRW5ELElBQU0sNEJBQTRCLE1BQXVEO0FBQ3ZGLFFBQU0saUJBQWlCLENBQUMsU0FBaUIsR0FBRyxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUUsU0FBUyxDQUFDO0FBS3pFLE1BQUksUUFBUSxhQUFhLFNBQVM7QUFDaEMsV0FBTyxPQUFPLGVBQWUsY0FBYyxZQUFZLEVBQUUsSUFBSTtBQUFBLEVBQy9EO0FBRUEsU0FBTyxPQUFPLGVBQWUsWUFBWTtBQUMzQztBQUVlLFNBQVIsbUJBQW9DLFFBQTBDO0FBQ25GLFdBQVMsYUFBYSxVQUFxQyxJQUFZO0FBQ3JFLFFBQUksQ0FBQyxHQUFHLFdBQVcsRUFBRSxHQUFHO0FBQ3RCLFNBQUcsVUFBVSxFQUFFO0FBQUEsSUFDakI7QUFDQSxVQUFNLGVBQWUsUUFBUSxJQUFJLGVBQWU7QUFFaEQsVUFBTSxZQUFZLFFBQVEsSUFBSSxnQkFBZ0I7QUFDOUMsT0FBRyxjQUFjLGNBQWMsZUFBZSx3QkFBd0IsVUFBVSxZQUFZLFlBQVksUUFBUSxDQUFDO0FBRWpILGFBQVMsZ0NBQWdDLFlBQVksSUFBSSxTQUFTO0FBQUEsRUFDcEU7QUFFQSxTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixhQUFhO0FBQ1gsV0FBSyxhQUFhLFlBQVk7QUFBQSxJQUNoQztBQUFBLElBQ0EsTUFBTSxjQUFjO0FBQ2xCLFlBQU1DLFVBQVMsT0FBTztBQUN0QixZQUFNLFdBQVcsTUFBTSwwQkFBMEI7QUFDakQsbUJBQWEsU0FBUyxTQUFTQSxPQUFNO0FBQUEsSUFDdkM7QUFBQSxFQUNGO0FBQ0Y7OztBRDNDQSxTQUFTLG1CQUFtQiwwQkFBMEI7QUFDdEQsU0FBUyxPQUFPLGNBQWMsbUJBQW1CO0FBTGpELElBQU1DLG9DQUFtQztBQU96QyxJQUFNQyxXQUFVQyxTQUFRQyxpQ0FBUztBQUNqQyxJQUFNLFNBQVNELFNBQVFELFVBQVMsS0FBSztBQUVyQyxJQUFNLFNBQVNDLFNBQVFELFVBQVMsTUFBTSxNQUFNO0FBQzVDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLFNBQVNBO0FBQUEsTUFDVCxRQUFRO0FBQUEsTUFDUixXQUFXQyxTQUFRLFFBQVEsUUFBUTtBQUFBLElBQ3JDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsZ0JBQWdCO0FBQUEsTUFDZCxZQUFZO0FBQUEsSUFDZCxDQUFDO0FBQUEsSUFDRCxrQkFBa0I7QUFBQSxJQUNsQixtQkFBbUIsRUFBRSxPQUFPLENBQUM7QUFBQSxJQUM3QixTQUFTLG1CQUFtQixFQUFFLFFBQVEsS0FBSyxDQUFDO0FBQUEsRUFDOUM7QUFBQSxFQUNBLFdBQVdBLFNBQVFELFVBQVMsUUFBUTtBQUFBLEVBQ3BDLE9BQU87QUFBQSxJQUNMLEtBQUs7QUFBQSxNQUNILFNBQVMsQ0FBQyxNQUFNO0FBQUEsTUFDaEIsT0FBT0MsU0FBUUMsbUNBQVcseUJBQXlCO0FBQUEsTUFDbkQsTUFBTTtBQUFBLE1BQ04sVUFBVTtBQUFBLElBQ1o7QUFBQSxJQUNBO0FBQUEsSUFDQSxhQUFhO0FBQUEsSUFDYixXQUFXO0FBQUEsSUFDWCxRQUFRO0FBQUEsSUFDUixzQkFBc0I7QUFBQSxJQUN0QixPQUFPO0FBQUEsSUFDUCxlQUFlO0FBQUEsTUFDYixVQUFVLENBQUMsUUFBUTtBQUFBLElBQ3JCO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUNWLENBQUM7IiwKICAibmFtZXMiOiBbInJlc29sdmUiLCAib3V0RGlyIiwgIl9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lIiwgInJvb3REaXIiLCAicmVzb2x2ZSIsICJfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSJdCn0K
