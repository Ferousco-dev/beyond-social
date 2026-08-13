import { createServer, type Server } from "node:http";

import { logger } from "./logger.js";

/**
 * A port to knock on.
 *
 * A poll loop with no listener looks identical to a crashed process from the
 * outside, so every host wants something to probe and several will not accept a
 * deploy without one. This reports whether the loop is still turning rather
 * than only that the process exists: a worker whose loop has stopped is exactly
 * the failure worth catching, and it would answer a bare liveness check
 * perfectly happily.
 */
export function createHealthServer(port: number, isRunning: () => boolean): Server {
  const server = createServer((request, response) => {
    if (request.method === "GET" && (request.url === "/health" || request.url === "/")) {
      const running = isRunning();
      response.writeHead(running ? 200 : 503, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: running ? "ok" : "stopping" }));
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "not_found" }));
  });

  server.listen(port, () => {
    logger.info("health server listening", { port });
  });

  return server;
}
