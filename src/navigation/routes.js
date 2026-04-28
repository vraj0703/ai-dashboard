/**
 * routes.js — HTTP routes for ai-dashboard.
 *
 * Owns:
 *  - /health                       service status
 *  - /api/meta                     brand, tagline, organs registry view
 *  - /api/organs/health            aggregate health of all organs
 *  - /api/organs/:organ/health     single organ health
 *  - /api/network/events           tail of network log
 *  - /api/network/stream           SSE feed of network events
 *  - /api/<organ>/*                proxy passthrough for each organ in registry
 *  - static files                  HTML pages + shared assets (with optional --static-extra dir)
 */

const path = require("path");
const fs = require("fs");
const express = require("express");
const { UnknownOrganError } = require("../domain/exceptions");

const PKG_VERSION = (() => {
  try { return require("../../package.json").version; }
  catch (_) { return "0.0.0"; }
})();

/**
 * @param {import('express').Application} app
 * @param {object} deps
 * @param {import('../presentation/state_management/controllers/dashboard_controller').DashboardController} deps.dashboard
 * @param {string[]} [deps.staticExtras] — additional dirs to mount alongside the bundled static files
 */
function registerRoutes(app, { dashboard, staticExtras = [] }) {
  // ─── Static files ───
  // Extras first so consumer overrides bundled assets when filenames collide
  for (const dir of staticExtras) {
    if (dir && fs.existsSync(dir)) app.use(express.static(dir));
  }
  const bundledStatic = path.join(__dirname, "..", "presentation", "pages", "static");
  app.use(express.static(bundledStatic));

  // ─── Service health ───
  app.get("/health", (req, res) => {
    res.json({
      status: "running",
      service: "ai-dashboard",
      version: PKG_VERSION,
      port: dashboard.config?.port ?? dashboard.registry?.meta?.port,
      brand: dashboard.config?.brand ?? dashboard.registry?.meta?.brand,
      organs: dashboard.organNames(),
      network_log_size: dashboard.eventCount(),
    });
  });

  // ─── Meta (registry view, used by client to render brand/tiles) ───
  app.get("/api/meta", (req, res) => {
    res.json({ ...dashboard.meta(), version: PKG_VERSION });
  });

  // ─── Organ health ───
  app.get("/api/organs/health", async (req, res) => {
    try {
      const all = await dashboard.aggregateHealth();
      res.json(all);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/organs/:organ/health", async (req, res) => {
    try {
      const status = await dashboard.organHealth(req.params.organ);
      res.json(status);
    } catch (err) {
      if (err instanceof UnknownOrganError) return res.status(404).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Network log API ───
  app.get("/api/network/events", (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    res.json({ count: dashboard.eventCount(), events: dashboard.tailEvents(limit) });
  });

  app.get("/api/network/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    const unsubscribe = dashboard.subscribeEvents((event) => {
      try { res.write(`data: ${JSON.stringify(event.toJSON ? event.toJSON() : event)}\n\n`); } catch (_) {}
    });
    req.on("close", () => { try { unsubscribe(); } catch (_) {} });
  });

  // ─── Organ proxies — registered per organ in the registry ───
  for (const organ of dashboard.organNames()) {
    const prefix = `/api/${organ}`;
    app.all(`${prefix}/*splat`, async (req, res) => {
      const sub = req.originalUrl.slice(prefix.length); // keeps query string
      const start = Date.now();
      try {
        const result = await dashboard.proxy(organ, sub, {
          method: req.method,
          headers: req.method !== "GET" && req.is("application/json")
            ? { "Content-Type": "application/json" } : {},
          body: req.method !== "GET" && req.body ? JSON.stringify(req.body) : undefined,
        });
        dashboard.logEvent({
          method: req.method,
          path: req.originalUrl,
          target: `${organ}${sub}`,
          status: result.status,
          duration: Date.now() - start,
          error: result.ok ? null : `HTTP ${result.status}`,
        });
        res.status(result.status).json(result.data);
      } catch (err) {
        dashboard.logEvent({
          method: req.method,
          path: req.originalUrl,
          target: `${organ}${sub}`,
          status: 503,
          duration: Date.now() - start,
          error: err.message || String(err),
        });
        res.status(503).json({ error: err.message || String(err), organ });
      }
    });
  }
}

module.exports = { registerRoutes };
