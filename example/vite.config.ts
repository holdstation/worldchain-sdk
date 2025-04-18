import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Watch for changes in node_modules
      usePolling: true,
      // Include node_modules in the watch list
      ignored: ["!**/node_modules/**"],
    },
  },
});
