import { createServer, type Server } from "node:http";

import { logger } from "./logger";

/**
 * Minimal HTTP server exposing a liveness endpoint so container orchestrators
 * and uptime checks can confirm the mail process is running. It reports only
 * that the process is up: a service with no provider key is still alive, and
 * whether it can send is answered by the delivery rows, not by this endpoint.
 */
export function createHealthServer(port: number): Server {
  const server = createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "not_found" }));
  });

  server.listen(port, () => {
    logger.info("Mail health server listening", { port });
  });

  return server;
}
