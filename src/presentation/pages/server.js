/**
 * server.js — Express HTTP server for ai-dashboard.
 */

const express = require("express");
const { registerRoutes } = require("../../navigation/routes");

/**
 * @param {object} deps
 * @param {import('../state_management/controllers/dashboard_controller').DashboardController} deps.dashboard
 * @param {number} deps.port
 * @param {string} [deps.host]
 * @param {string[]} [deps.staticExtras]
 */
function createServer({ dashboard, port, host = "127.0.0.1", staticExtras = [] }) {
  const app = express();
  app.use(express.json({ limit: "5mb" }));

  // Request logging (skip /health and the network API itself)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path !== "/health" && !req.path.startsWith("/api/network")) {
        console.log(`[http] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
      }
    });
    next();
  });

  registerRoutes(app, { dashboard, staticExtras });

  return {
    app,
    listen: () => new Promise((resolve) => {
      const server = app.listen(port, host, () => {
        console.log(`[ai-dashboard] listening on http://${host}:${port}`);
        resolve(server);
      });
    }),
  };
}

module.exports = { createServer };
