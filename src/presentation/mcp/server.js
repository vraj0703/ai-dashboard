/**
 * MCP server — exposes ai-dashboard read-only operator primitives as MCP tools.
 *
 * Wraps the same DI container the HTTP server uses. AI Agent CLIs
 * (Claude Code, Cursor, Codex) connect via stdio and call these tools
 * directly — no HTTP layer in between.
 *
 * Three tools:
 *   dashboard_health        — aggregate health of every organ in the registry
 *   dashboard_organ_health  — health of a single organ
 *   dashboard_tail_events   — most recent network events from the proxy log
 *
 * Adding a tool: register it here + document it in the README.
 */

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");

const { DashboardController } = require("../state_management/controllers/dashboard_controller");

/**
 * Build a configured McpServer wrapping the given container.
 *
 * @param {object} deps
 * @param {object} deps.container - the DI container from src/di/container.js
 * @param {object} [deps.info]    - { name, version }
 * @returns {McpServer}
 */
function createMcpServer({ container, info = {} }) {
  const dashboard = new DashboardController(container);

  const server = new McpServer({
    name: info.name || "ai-dashboard",
    version: info.version || "0.1.0",
  });

  // ── dashboard_health ─────────────────────────────────────────
  server.registerTool(
    "dashboard_health",
    {
      title: "Aggregate organ health",
      description:
        "Fetch /health from every organ in the configured registry in parallel. Down/error organs are reported as such — the call never fails just because one organ is down. Returns a map of organ name -> status.",
      inputSchema: {},
    },
    async () => {
      const all = await dashboard.aggregateHealth();
      return {
        content: [{ type: "text", text: JSON.stringify(all, null, 2) }],
      };
    },
  );

  // ── dashboard_organ_health ───────────────────────────────────
  server.registerTool(
    "dashboard_organ_health",
    {
      title: "Single organ health",
      description:
        "Fetch /health from one specific organ. Use dashboard_health if you want all of them at once.",
      inputSchema: {
        organ: z.string().describe("Organ name as registered in the registry (e.g. 'mind', 'memory')"),
      },
    },
    async (args) => {
      const status = await dashboard.organHealth(args.organ);
      return {
        content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
      };
    },
  );

  // ── dashboard_tail_events ────────────────────────────────────
  server.registerTool(
    "dashboard_tail_events",
    {
      title: "Tail proxy network events",
      description:
        "Read the most recent N entries from the network event log (calls proxied through the dashboard to organs). Newest first.",
      inputSchema: {
        limit: z.number().int().positive().max(500).optional().describe("Max events to return (1-500, default 100)"),
      },
    },
    async (args) => {
      const events = dashboard.tailEvents(args.limit);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ count: events.length, events }, null, 2),
        }],
      };
    },
  );

  // ── dashboard_meta ───────────────────────────────────────────
  server.registerTool(
    "dashboard_meta",
    {
      title: "Dashboard registry view",
      description:
        "Return the brand, tagline, organ list, and proxy paths the dashboard is configured with. Useful for an agent to discover what organs exist before calling dashboard_health.",
      inputSchema: {},
    },
    async () => {
      return {
        content: [{ type: "text", text: JSON.stringify(dashboard.meta(), null, 2) }],
      };
    },
  );

  return server;
}

/**
 * Connect an McpServer to stdio and start handling requests.
 * Returns when the connection closes (client disconnects).
 */
async function startStdio(server) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

module.exports = { createMcpServer, startStdio };
