import { createServer, type Server } from "node:http";

import { logger } from "./logger";

/**
 * Minimal HTTP server exposing a liveness endpoint so container orchestrators
 * and uptime checks can confirm the worker process is running. BullMQ job
 * processors are registered separately once the video pipeline lands.
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
    logger.info("Worker health server listening", { port });
  });

  return server;
}
