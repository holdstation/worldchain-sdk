import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vite.dev/config/
export default defineConfig({
  server: {
    watch: {
      // Watch for changes in node_modules
      usePolling: true,
      // Include node_modules in the watch list
      ignored: ["!**/node_modules/**"],
    },
  },
  plugins: [react(), nodePolyfills()],
  resolve: {
    alias: {
      jsbi: path.resolve(__dirname, "node_modules/jsbi/dist/jsbi-cjs.js"),
    },
  },
});
