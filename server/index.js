import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateDecision, POLICY_VERSION } from "../shared/decision-engine.js";

const root = fileURLToPath(new URL("../dist", import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const maxBodyBytes = 32_000;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
};

function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(payload));
}

async function parseBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBodyBytes) throw new Error("Request too large.");
  }
  return JSON.parse(body || "{}");
}

async function serveStatic(req, res) {
  const rawPath = new URL(req.url, "http://localhost").pathname;
  const requested = rawPath === "/" ? "/index.html" : rawPath;
  const safePath = normalize(requested).replace(/^[/\\]+/, "");
  let filePath = join(root, safePath);
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, "index.html");
  } catch {
    filePath = join(root, "index.html");
  }
  const data = await readFile(filePath);
  res.writeHead(200, {
    "content-type": mime[extname(filePath)] || "application/octet-stream",
    "cache-control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
  });
  res.end(data);
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/api/health") {
      return json(res, 200, { status: "ok", service: "next-best-ask-api", policy: POLICY_VERSION });
    }
    if (req.method === "POST" && req.url === "/api/decision") {
      const payload = await parseBody(req);
      return json(res, 200, evaluateDecision(payload));
    }
    if (req.url?.startsWith("/api/")) return json(res, 404, { error: "Not found." });
    return await serveStatic(req, res);
  } catch (error) {
    const status = error.code === "INVALID_CONTEXT" || error instanceof SyntaxError ? 400 : 500;
    return json(res, status, { error: status === 400 ? error.message : "Unexpected service error." });
  }
});

server.listen(port, host, () => {
  process.stdout.write(`Next Best Ask listening on http://${host}:${port}\n`);
});
