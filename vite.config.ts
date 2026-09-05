import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { evaluateDecision } from "./shared/decision-engine.js";

function decisionApi(): Plugin {
  return {
    name: "next-best-ask-api",
    configureServer(server) {
      server.middlewares.use("/api/health", (_req, res) => {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ status: "ok", service: "next-best-ask-api", mode: "vite" }));
      });
      server.middlewares.use("/api/decision", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end();
        }
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          try {
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify(evaluateDecision(JSON.parse(body || "{}"))));
          } catch (error) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request." }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), decisionApi()],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: { target: "es2022" },
});
