import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const telemetryTarget = process.env["VITE_TELEMETRY_PROXY_TARGET"] ?? "http://localhost:3000";
const agentTarget = process.env["VITE_AGENT_PROXY_TARGET"] ?? "http://localhost:3002";

export default defineConfig({
  plugins: [react()],
  resolve: { conditions: ["development", "browser"] },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: telemetryTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/agent-api": {
        target: agentTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/agent-api/, ""),
      },
    },
  },
});
