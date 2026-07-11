import http from "node:http";
import { fileURLToPath } from "node:url";
import { createConfig } from "./config.js";
import { createOrbApp } from "./app.js";

const config = createConfig({ cwd: fileURLToPath(new URL("..", import.meta.url)) });
const app = createOrbApp(config);
await app.seedAdmin();

const server = http.createServer(async (incoming, outgoing) => {
  const origin = `http://${incoming.headers.host || `${config.host}:${config.port}`}`;
  const request = new Request(new URL(incoming.url || "/", origin), { method: incoming.method, headers: incoming.headers, body: ["GET", "HEAD"].includes(incoming.method || "GET") ? undefined : incoming, duplex: "half" });
  const response = await app.fetch(request), headers = Object.fromEntries(response.headers); const setCookies = response.headers.getSetCookie?.() || []; if (setCookies.length) headers["set-cookie"] = setCookies; outgoing.writeHead(response.status, headers); outgoing.end(Buffer.from(await response.arrayBuffer()));
});

server.listen(config.port, config.host, () => console.log(`Orb Arena API listening on http://${config.host}:${config.port}`));
const shutdown = () => server.close(() => { app.close(); process.exit(0); });
process.on("SIGINT", shutdown); process.on("SIGTERM", shutdown);
